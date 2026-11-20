'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Swords,
  Heart,
  Zap,
  Activity,
  Wind,
  Target,
  Clock,
  Layers,
  Award,
  HelpCircle,
  Coins,
  Gem,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  fetchDDragonChampionDetail,
  DDragonChampionDetail,
  DDragonSkin,
  getChampionIconUrl,
  getChampionSkinSplashUrl,
  getChampionPassiveIconUrl,
  getChampionSpellIconUrl,
  getPositionIconUrl,
  getMajorMinorPatch,
  getDDragonVersion,
  PositionKey,
} from '@/lib/ddragon';
import { fetchChampionDetailApi, fetchTierList, TierListChampionItem } from '@/lib/api';
import championPositionsRaw from '@/lib/championPositions.json';

interface ChampionPosInfo {
  id: string;
  name: string;
  title: string;
  role: string;
  class: string;
  difficulty: number;
  recommendedPositions: string[];
}

const championPositionsMap = championPositionsRaw as Record<string, ChampionPosInfo>;

interface ChampionDetailViewProps {
  slug: string;
}

export default function ChampionDetailView({ slug }: ChampionDetailViewProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<DDragonChampionDetail | null>(null);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [tierInfo, setTierInfo] = useState<TierListChampionItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpellIndex, setSelectedSpellIndex] = useState<number>(-1); // -1 = passive, 0 = Q, 1 = W, 2 = E, 3 = R
  const [selectedSkinIndex, setSelectedSkinIndex] = useState<number>(0);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'abilities' | 'skins'>('overview');

  useEffect(() => {
    setIsLoading(true);
    // 1. Fetch champion detail from our backend database/cache (with fallback to client DDragon)
    fetchChampionDetailApi(slug, locale)
      .then((res) => {
        if (res && res.champion) {
          setData(res.champion);
          if (res.version) setVersion(res.version);
          return;
        }
        return fetchDDragonChampionDetail(slug, locale).then((fallback) => {
          setData(fallback.champion);
          if (fallback.version) setVersion(fallback.version);
        });
      })
      .catch(() => {
        return fetchDDragonChampionDetail(slug, locale).then((fallback) => {
          setData(fallback.champion);
          if (fallback.version) setVersion(fallback.version);
        });
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 2. Fetch tier list to display live meta stats if available
    fetchTierList()
      .then((tierRes) => {
        if (tierRes && tierRes.champions) {
          const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = tierRes.champions.find(
            (c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSlug
          );
          if (match) setTierInfo(match);
        }
      })
      .catch(() => {});
  }, [slug, locale]);

  const patchString = getMajorMinorPatch(version);

  // Position & class metadata
  const metaPos = useMemo(() => {
    if (!data) return null;
    return championPositionsMap[data.id] || null;
  }, [data]);

  const primaryRole = metaPos?.recommendedPositions?.[0] || metaPos?.role || 'Top';
  const posKey: PositionKey = (() => {
    const up = primaryRole.toUpperCase();
    if (up === 'TOP') return 'TOP';
    if (up === 'JUNGLE') return 'JUNGLE';
    if (up === 'MIDDLE' || up === 'MID') return 'MID';
    if (up === 'BOTTOM' || up === 'BOT' || up === 'ADC') return 'ADC';
    if (up === 'SUPPORT') return 'SUPPORT';
    return 'TOP';
  })();

  // Filter out chromas (entries with parentSkin)
  const skins = useMemo(() => {
    if (!data?.skins) return [];
    return data.skins.filter((s) => s.parentSkin === undefined || s.parentSkin === null);
  }, [data?.skins]);

  const activeSkin = skins[selectedSkinIndex] || skins[0] || data?.skins?.[0];

  const handleNextSkin = () => {
    if (skins.length === 0) return;
    setSelectedSkinIndex((prev) => (prev + 1) % skins.length);
  };

  const handlePrevSkin = () => {
    if (skins.length === 0) return;
    setSelectedSkinIndex((prev) => (prev - 1 + skins.length) % skins.length);
  };

  // Recalculate stats dynamically for selected level 1..18 using Riot's exact formula
  const calcStats = useMemo(() => {
    if (!data?.stats) return null;
    const s = data.stats;
    const lvl = selectedLevel;
    const mult = lvl === 1 ? 0 : (lvl - 1) * (0.7025 + 0.0175 * (lvl - 1));

    const hp = Math.round(s.hp + s.hpperlevel * mult);
    const mp = s.mp > 0 ? Math.round(s.mp + s.mpperlevel * mult) : 0;
    const ad = Math.round((s.attackdamage + s.attackdamageperlevel * mult) * 10) / 10;
    const armor = Math.round((s.armor + s.armorperlevel * mult) * 10) / 10;
    const mr = Math.round((s.spellblock + s.spellblockperlevel * mult) * 10) / 10;
    const hpregen = Math.round((s.hpregen + s.hpregenperlevel * mult) * 100) / 100;
    const mpregen = s.mpregen > 0 ? Math.round((s.mpregen + s.mpregenperlevel * mult) * 100) / 100 : 0;
    const as = s.attackspeed * (1 + (s.attackspeedperlevel / 100) * mult);

    return {
      hp,
      mp,
      ad,
      armor,
      mr,
      hpregen,
      mpregen,
      as: as.toFixed(3),
      movespeed: s.movespeed,
      range: s.attackrange,
    };
  }, [data?.stats, selectedLevel]);

  // Group non-base skins by release year & rarity for the Skin Timeline
  const timelineData = useMemo(() => {
    if (!skins || skins.length === 0) return [];

    const map = new Map<
      number,
      Map<string, { tier: string; rarityColor: string; skins: DDragonSkin[] }>
    >();

    for (const s of skins) {
      if (s.num === 0) continue; // Base skin excluded from timeline per LoLDB / user screenshot
      const year = s.releaseYear || (s.releaseDate ? new Date(s.releaseDate).getFullYear() : 2020);
      const tier = s.rarity || 'Regular';
      const rarityColor =
        s.rarityColor ||
        (tier === 'Epic'
          ? '#0FAEB6'
          : tier === 'Legendary'
          ? '#DB1523'
          : tier === 'Mythic'
          ? '#B034B6'
          : tier === 'Transcendent'
          ? '#C7A8DD'
          : '#2E8D4C');

      if (!map.has(year)) {
        map.set(year, new Map());
      }
      const yearMap = map.get(year)!;
      if (!yearMap.has(tier)) {
        yearMap.set(tier, { tier, rarityColor, skins: [] });
      }
      yearMap.get(tier)!.skins.push(s);
    }

    const sortedYears = Array.from(map.keys()).sort((a, b) => a - b);
    return sortedYears.map((year) => {
      const tierMap = map.get(year)!;
      return {
        year,
        nodes: Array.from(tierMap.values()),
      };
    });
  }, [skins]);

  // Formatted release date for FAQ & Hero
  const formattedReleaseDate = useMemo(() => {
    const dStr = data?.storeData?.releaseDate || data?.releaseDate;
    if (!dStr) return locale === 'de' ? 'Unbekannt' : 'Unknown';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dStr;
    }
  }, [data, locale]);

  // Store Pricing (Blue Essence & RP)
  const beCost = useMemo(() => {
    if (data?.storeData?.ip) {
      return Number(data.storeData.ip).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US');
    }
    return '1.575';
  }, [data, locale]);

  const rpCost = useMemo(() => {
    if (data?.storeData?.rp) {
      return Number(data.storeData.rp).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US');
    }
    return '790';
  }, [data, locale]);

  // Non-base skins count (for FAQ)
  const nonBaseSkinsCount = useMemo(() => {
    const nb = skins.filter((s) => s.num !== 0);
    return nb.length > 0 ? nb.length : skins.length;
  }, [skins]);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 animate-pulse space-y-6">
        <div className="h-5 w-40 bg-white/5 rounded-md" />
        <div className="h-64 sm:h-80 w-full rounded-3xl bg-white/5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl bg-white/5" />
          <div className="h-64 rounded-2xl bg-white/5 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
        <Shield className="h-16 w-16 text-zinc-600 mb-4 opacity-40" />
        <h1 className="text-2xl font-black text-white mb-2">{t('common.error')}</h1>
        <p className="text-zinc-400 mb-6">
          Champion &quot;{slug}&quot; konnte nicht im Data Dragon für Patch {patchString} gefunden werden.
        </p>
        <Link
          href={`/${locale}/champions`}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-5 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-500/30 transition-all shadow-md"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t('championWiki.backToList')}</span>
        </Link>
      </div>
    );
  }

  const selectedSpell = selectedSpellIndex === -1 ? null : data.spells[selectedSpellIndex];

  return (
    <div className="relative min-h-screen">
      {/* Ambient Blurred Background (matching LoLDB hero atmosphere) */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none">
        <Image
          src={getChampionSkinSplashUrl(data.id, activeSkin?.num ?? 0)}
          alt={data.name}
          fill
          className="object-cover object-top blur-3xl opacity-20 brightness-75 scale-110 transition-all duration-700"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06080b]/70 via-[#06080b]/90 to-[#06080b]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation (LoLDB inspired) */}
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Link href={`/${locale}`} className="hover:text-amber-400 transition-colors">
            {t('championWiki.breadcrumbHome')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
          <Link href={`/${locale}/champions`} className="hover:text-amber-400 transition-colors">
            {t('championWiki.breadcrumbChampions')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="text-amber-400 font-semibold">{data.name}</span>
        </nav>

        {/* Section Navigation Tabs (Overview / Abilities / Skins) */}
        <div className="flex items-center gap-1 border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`-mb-px px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'overview'
                ? 'border-amber-400 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('championWiki.tabOverview')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('abilities')}
            className={`-mb-px px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'abilities'
                ? 'border-amber-400 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('championWiki.tabAbilities')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skins')}
            className={`-mb-px px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'skins'
                ? 'border-amber-400 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('championWiki.tabSkins')} ({skins.length})
          </button>
        </div>

        {/* Hero Header Card (LoLDB Style Profile) */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5 sm:gap-6">
              {/* Circular Champion Portrait Avatar */}
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-full overflow-hidden border-2 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)] bg-zinc-950">
                <Image
                  src={getChampionIconUrl(data.id, version)}
                  alt={data.name}
                  width={100}
                  height={100}
                  className="h-full w-full object-cover scale-110"
                  priority
                  unoptimized
                />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                    {data.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    <span>Patch {patchString}</span>
                  </span>
                </div>

                <p className="text-base sm:text-lg text-amber-300 font-medium capitalize">
                  {data.title}
                </p>

                {/* LoLDB-Style Tags & Quick Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  {/* Currency: Blue Essence (From Store Data API) */}
                  <div className="inline-flex items-stretch rounded-md border border-cyan-500/30 bg-cyan-500/10 overflow-hidden shadow-sm">
                    <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-cyan-400 uppercase border-r border-cyan-500/20">
                      <Coins className="h-3 w-3 text-cyan-400" />
                      <span>BE</span>
                    </span>
                    <span className="flex items-center px-2 py-1 text-[10px] font-extrabold text-cyan-300">
                      {beCost}
                    </span>
                  </div>

                  {/* Currency: RP (From Store Data API) */}
                  <div className="inline-flex items-stretch rounded-md border border-yellow-500/30 bg-yellow-500/10 overflow-hidden shadow-sm">
                    <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-yellow-400 uppercase border-r border-yellow-500/20">
                      <Gem className="h-3 w-3 text-yellow-400" />
                      <span>RP</span>
                    </span>
                    <span className="flex items-center px-2 py-1 text-[10px] font-extrabold text-yellow-300">
                      {rpCost}
                    </span>
                  </div>

                  {/* Role / Lane Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                    <Image
                      src={getPositionIconUrl(posKey)}
                      alt={primaryRole}
                      width={12}
                      height={12}
                      className="h-3 w-3 object-contain opacity-90"
                      unoptimized
                    />
                    <span>{primaryRole}</span>
                  </div>

                  {/* Class Badge */}
                  <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-zinc-300 uppercase">
                    {metaPos?.class || data.tags?.[0] || 'Fighter'}
                  </div>

                  {/* Difficulty Badge */}
                  <div className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400">
                    <span>Diff {metaPos?.difficulty ?? data.info?.difficulty ?? 5}/10</span>
                  </div>

                  {/* Total Unique Skins Badge (Chromas excluded) */}
                  <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                    <Layers className="h-3 w-3 text-amber-400" />
                    <span>{skins.length} Skins</span>
                  </div>

                  {/* Live Meta Tier (from database meta snapshots) */}
                  {(tierInfo || data.meta) && (
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/10 px-2.5 py-1 text-[10px] font-extrabold text-amber-300 shadow-sm">
                      <Award className="h-3 w-3 text-amber-400" />
                      <span>Tier {tierInfo?.tier || data.meta?.tier}</span>
                      <span className="text-zinc-400 font-normal">
                        ({tierInfo?.winrate || data.meta?.winrate} WR)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Overview Bars: Attack / Defense / Magic / Difficulty */}
            <div className="flex items-center gap-4 bg-black/40 rounded-2xl p-4 border border-white/[0.05] shrink-0">
              <div className="flex flex-col gap-1.5 w-32 sm:w-36 text-xs">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-semibold">Attack</span>
                  <span className="text-orange-400 font-bold">{data.info?.attack ?? 5}/10</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                    style={{ width: `${(data.info?.attack ?? 5) * 10}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] mt-0.5">
                  <span className="text-zinc-400 font-semibold">Defense</span>
                  <span className="text-emerald-400 font-bold">{data.info?.defense ?? 5}/10</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${(data.info?.defense ?? 5) * 10}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] mt-0.5">
                  <span className="text-zinc-400 font-semibold">Magic</span>
                  <span className="text-purple-400 font-bold">{data.info?.magic ?? 5}/10</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full"
                    style={{ width: `${(data.info?.magic ?? 5) * 10}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center pl-4 border-l border-white/10 shrink-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('championWiki.difficulty')}
                </span>
                <span className="text-2xl font-black text-amber-400 mt-0.5">
                  {metaPos?.difficulty ?? data.info?.difficulty ?? 5}
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold">/ 10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Spotlight: Interactive Splash Art Banner */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[460px] rounded-3xl overflow-hidden border border-white/[0.08] bg-black shadow-2xl group">
          <Image
            src={getChampionSkinSplashUrl(data.id, activeSkin?.num ?? 0)}
            alt={activeSkin?.name ?? data.name}
            fill
            className="object-cover object-top brightness-95 group-hover:scale-[1.02] transition-transform duration-700"
            priority
            unoptimized
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 opacity-60" />

          {/* Left / Right Carousel Controls */}
          <button
            type="button"
            onClick={handlePrevSkin}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white hover:bg-amber-500 hover:text-black hover:scale-105 transition-all cursor-pointer backdrop-blur-sm shadow-lg"
            title="Vorheriger Skin"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNextSkin}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white hover:bg-amber-500 hover:text-black hover:scale-105 transition-all cursor-pointer backdrop-blur-sm shadow-lg"
            title="Nächster Skin"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Bottom Banner Label & Counter */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between pointer-events-none">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Skin Artwork
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-lg flex items-center gap-2">
                <span>{activeSkin?.name === 'default' ? t('championWiki.defaultSkin') : activeSkin?.name}</span>
                {activeSkin?.rarity && activeSkin.rarity !== 'Regular' && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full border uppercase font-bold"
                    style={{
                      color: activeSkin.rarityColor || '#0FAEB6',
                      borderColor: activeSkin.rarityColor || '#0FAEB6',
                      backgroundColor: `${activeSkin.rarityColor || '#0FAEB6'}15`,
                    }}
                  >
                    {activeSkin.rarity}
                  </span>
                )}
              </h2>
            </div>
            <div className="rounded-full bg-black/70 border border-white/10 px-3 py-1 text-xs font-mono font-bold text-zinc-300 backdrop-blur-md">
              {selectedSkinIndex + 1} / {skins.length}
            </div>
          </div>
        </div>

        {/* Thumbnail Selector Strip for Skins (Chromas excluded) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {skins.map((skin, idx) => {
            const isSelected = selectedSkinIndex === idx;
            return (
              <button
                key={skin.id}
                type="button"
                onClick={() => setSelectedSkinIndex(idx)}
                className={`relative h-14 w-24 shrink-0 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-lg scale-105'
                    : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                }`}
              >
                <Image
                  src={getChampionSkinSplashUrl(data.id, skin.num)}
                  alt={skin.name}
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* SKIN TIMELINE COMPONENT (Matching User Screenshot media_1795172589124_0db79b5d.png) */}
        {/* ========================================================================= */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-black text-white">{t('championWiki.skinTimeline')}</h2>
            </div>

            {/* Legend for Rarities */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#2E8D4C' }} />
                <span className="text-zinc-300">{t('championWiki.regular')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#0FAEB6' }} />
                <span className="text-zinc-300">{t('championWiki.epic')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#DB1523' }} />
                <span className="text-zinc-300">{t('championWiki.legendary')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#B034B6' }} />
                <span className="text-zinc-300">{t('championWiki.mythic')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#C7A8DD' }} />
                <span className="text-zinc-300">{t('championWiki.transcendent')}</span>
              </div>
            </div>
          </div>

          {/* Horizontal Timeline Scroll Canvas */}
          <div className="overflow-x-auto pb-4 scrollbar-thin">
            <div className="relative min-w-[860px] h-[280px] bg-black/40 rounded-2xl border border-white/[0.06] p-4 flex">
              {/* Left Y-Axis: Rarity Icons from Top (Transcendent) to Bottom (Regular) */}
              <div className="w-14 shrink-0 flex flex-col justify-between py-2 items-center border-r border-white/[0.06]">
                {/* Transcendent */}
                <div className="flex items-center justify-center h-8" title="Transcendent">
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#C7A8DD] bg-[#C7A8DD]/40 shadow-[0_0_8px_#C7A8DD]" />
                </div>
                {/* Mythic */}
                <div className="flex items-center justify-center h-8" title="Mythic">
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#B034B6] bg-[#B034B6]/40 shadow-[0_0_8px_#B034B6]" />
                </div>
                {/* Legendary */}
                <div className="flex items-center justify-center h-8" title="Legendary">
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#DB1523] bg-[#DB1523]/40 shadow-[0_0_8px_#DB1523]" />
                </div>
                {/* Epic */}
                <div className="flex items-center justify-center h-8" title="Epic">
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#0FAEB6] bg-[#0FAEB6]/40 shadow-[0_0_8px_#0FAEB6]" />
                </div>
                {/* Regular */}
                <div className="flex items-center justify-center h-8" title="Regular">
                  <span className="h-3.5 w-3.5 rounded-full border border-[#2E8D4C] bg-[#2E8D4C]/40 shadow-[0_0_8px_#2E8D4C]" />
                </div>
                {/* Spacer matching bottom baseline */}
                <div className="h-6" />
              </div>

              {/* Main Timeline Grid */}
              <div className="relative flex-1 h-full pl-2">
                {/* 5 Horizontal Guideline Dashes for the 5 tiers */}
                <div className="absolute inset-x-0 top-[20px] border-b border-dashed border-white/[0.05] pointer-events-none" />
                <div className="absolute inset-x-0 top-[68px] border-b border-dashed border-white/[0.05] pointer-events-none" />
                <div className="absolute inset-x-0 top-[116px] border-b border-dashed border-white/[0.05] pointer-events-none" />
                <div className="absolute inset-x-0 top-[164px] border-b border-dashed border-white/[0.05] pointer-events-none" />
                <div className="absolute inset-x-0 top-[212px] border-b border-dashed border-white/[0.05] pointer-events-none" />

                {/* Bottom X-Axis baseline */}
                <div className="absolute inset-x-0 bottom-6 border-b border-white/[0.1] pointer-events-none" />

                {/* Year Columns & Nodes */}
                <div className="absolute inset-x-0 inset-y-0 flex">
                  {timelineData.map((col) => (
                    <div
                      key={col.year}
                      className="relative flex-1 flex flex-col justify-between items-center h-full group/col"
                    >
                      {/* Vertical connector guide down to diamond marker */}
                      <div className="absolute inset-x-0 top-0 bottom-6 flex justify-center pointer-events-none">
                        <div className="w-[1px] h-full bg-gradient-to-b from-white/[0.02] via-white/[0.06] to-white/[0.2]" />
                      </div>

                      {/* Nodes positioned at their tier height */}
                      <div className="relative w-full h-[224px]">
                        {col.nodes.map((node) => {
                          const yTop =
                            node.tier === 'Transcendent'
                              ? 2
                              : node.tier === 'Mythic'
                              ? 50
                              : node.tier === 'Legendary'
                              ? 98
                              : node.tier === 'Epic'
                              ? 146
                              : 194;

                          const isCurrentActive = node.skins.some((s) => s.num === activeSkin?.num);

                          return (
                            <div
                              key={node.tier}
                              className="absolute left-1/2 -translate-x-1/2 group cursor-pointer z-10"
                              style={{ top: `${yTop}px` }}
                              onClick={() => {
                                const targetSkin = node.skins[0];
                                const idx = skins.findIndex((s) => s.id === targetSkin.id);
                                if (idx !== -1) setSelectedSkinIndex(idx);
                              }}
                            >
                              {/* Circular Avatar */}
                              <div
                                className={`relative h-10 w-10 rounded-full overflow-hidden transition-all duration-200 group-hover:scale-125 ${
                                  isCurrentActive
                                    ? 'ring-2 ring-white scale-110'
                                    : 'hover:ring-2 hover:ring-amber-400'
                                }`}
                                style={{
                                  border: `2.5px solid ${node.rarityColor}`,
                                  boxShadow: `0 0 14px ${node.rarityColor}90`,
                                }}
                              >
                                <Image
                                  src={getChampionSkinSplashUrl(data.id, node.skins[0].num)}
                                  alt={node.skins[0].name}
                                  fill
                                  className="object-cover object-top"
                                  unoptimized
                                />
                              </div>

                              {/* Multi-skin counter badge (matching user screenshot green bubble '2') */}
                              {node.skins.length > 1 && (
                                <div
                                  className="absolute -top-1 -right-1.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-md pointer-events-none"
                                  style={{
                                    backgroundColor: node.rarityColor,
                                    border: '1.5px solid #0c1017',
                                  }}
                                >
                                  {node.skins.length}
                                </div>
                              )}

                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none min-w-[150px]">
                                <div className="rounded-xl bg-black/95 border border-white/20 p-2.5 text-center shadow-2xl backdrop-blur-md">
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-wider block"
                                    style={{ color: node.rarityColor }}
                                  >
                                    {node.tier}
                                  </span>
                                  {node.skins.map((sk) => (
                                    <span
                                      key={sk.id}
                                      className="text-xs font-black text-white block mt-0.5 truncate"
                                    >
                                      {sk.name === 'default' ? t('championWiki.defaultSkin') : sk.name}
                                    </span>
                                  ))}
                                  <span className="text-[10px] text-zinc-400 block mt-1">
                                    {node.skins[0].releaseDate || col.year}
                                  </span>
                                </div>
                                <div className="w-2 h-2 rotate-45 bg-black/95 border-r border-b border-white/20 -mt-1" />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Diamond Marker & Year Label */}
                      <div className="flex flex-col items-center justify-center h-6 z-10">
                        <div className="w-2 h-2 rotate-45 bg-amber-400/80 shadow-[0_0_6px_rgba(251,146,60,0.6)] mb-1" />
                        <span className="text-[10px] font-mono font-bold text-zinc-400 group-hover/col:text-amber-400 transition-colors">
                          {col.year}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Content Grid: Left (Stats & Lore) + Right (Abilities Kit) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (5 Cols): Stats, Lore, Tips */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* ========================================================================= */}
            {/* INTERACTIVE BASE STATS WITH LEVEL 1-18 SELECTOR (LoLDB Style) */}
            {/* ========================================================================= */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md space-y-4">
              {/* Header with Title and LVL Indicator */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  <h2 className="text-base font-extrabold text-white">
                    {t('championWiki.baseStats')}
                  </h2>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                    LVL
                  </span>
                  <span className="text-xl font-bold tabular-nums leading-none text-[#fb923c] [text-shadow:0_0_14px_rgba(251,146,60,0.55)]">
                    {selectedLevel}
                  </span>
                </div>
              </div>

              {/* Level 1-18 Interactive Selector Diamond Bar */}
              <div className="px-1 pb-3 border-b border-white/[0.06]">
                {/* Milestone labels above buttons: 1, 6, 11, 16, 18 */}
                <div className="flex mb-1.5">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
                    const isMilestone = lvl === 1 || lvl === 6 || lvl === 11 || lvl === 16 || lvl === 18;
                    const isCurrent = lvl === selectedLevel;
                    return (
                      <div key={lvl} className="flex justify-center flex-1">
                        {isMilestone && (
                          <span
                            className={`text-[8px] font-bold tabular-nums select-none transition-colors ${
                              isCurrent ? 'text-amber-400 font-extrabold' : 'text-white/20'
                            }`}
                          >
                            {lvl}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 18 Clickable Diamond Buttons */}
                <div className="flex gap-[3px] items-center">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
                    const isSelected = selectedLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        title={`Level ${lvl}`}
                        onClick={() => setSelectedLevel(lvl)}
                        className="relative flex-1 flex justify-center items-center h-6 cursor-pointer group outline-none"
                      >
                        <div
                          className={`transition-all duration-150 rotate-45 ${
                            isSelected
                              ? 'w-2.5 h-2.5 bg-[#fb923c] shadow-[0_0_0_1.5px_rgba(251,146,60,0.4),0_0_10px_rgba(251,146,60,0.7)] scale-110'
                              : 'w-1.5 h-1.5 bg-white/10 group-hover:bg-[#fb923c]/50 group-hover:scale-125'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 10 Calculated Stat Rows in 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* 1. Health */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold">
                      <Heart className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">{t('championWiki.hp')}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-red-400">
                      {calcStats?.hp ?? data.stats.hp}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.hp ?? data.stats.hp) / 2800) * 100)}%`,
                        boxShadow: '0 0 5px #ef444450',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    +{data.stats.hpperlevel}/lvl
                  </span>
                </div>

                {/* 2. Resource (Mana / Energy) */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">
                        {data.partype || t('championWiki.mana')}
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-blue-400">
                      {data.stats.mp > 0 ? (calcStats?.mp ?? data.stats.mp) : '0'}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${data.stats.mp > 0 ? Math.min(100, ((calcStats?.mp ?? data.stats.mp) / 2000) * 100) : 0}%`,
                        boxShadow: '0 0 5px #3b82f650',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    {data.stats.mp > 0 ? `+${data.stats.mpperlevel}/lvl` : 'No Cost'}
                  </span>
                </div>

                {/* 3. Attack Damage */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                      <Swords className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">{t('championWiki.attackDamage')}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-orange-400">
                      {calcStats?.ad ?? data.stats.attackdamage}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.ad ?? data.stats.attackdamage) / 160) * 100)}%`,
                        boxShadow: '0 0 5px #f9731650',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    +{data.stats.attackdamageperlevel}/lvl
                  </span>
                </div>

                {/* 4. Attack Speed */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                      <Activity className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">{t('championWiki.attackSpeed')}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-yellow-400">
                      {calcStats?.as ?? data.stats.attackspeed}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (parseFloat(calcStats?.as ?? String(data.stats.attackspeed)) / 1.5) * 100)}%`,
                        boxShadow: '0 0 5px #eab30850',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    +{data.stats.attackspeedperlevel}%/lvl
                  </span>
                </div>

                {/* 5. Armor */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Shield className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">{t('championWiki.armor')}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-amber-400">
                      {calcStats?.armor ?? data.stats.armor}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.armor ?? data.stats.armor) / 120) * 100)}%`,
                        boxShadow: '0 0 5px #f59e0b50',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    +{data.stats.armorperlevel}/lvl
                  </span>
                </div>

                {/* 6. Magic Resist */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <Shield className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">{t('championWiki.mr')}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-purple-400">
                      {calcStats?.mr ?? data.stats.spellblock}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.mr ?? data.stats.spellblock) / 90) * 100)}%`,
                        boxShadow: '0 0 5px #a855f750',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    +{data.stats.spellblockperlevel}/lvl
                  </span>
                </div>

                {/* 7. Health Regen */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <Heart className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">HP Regen</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-emerald-400">
                      {calcStats?.hpregen ?? data.stats.hpregen}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.hpregen ?? data.stats.hpregen) / 25) * 100)}%`,
                        boxShadow: '0 0 5px #10b98150',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    +{data.stats.hpregenperlevel}/lvl
                  </span>
                </div>

                {/* 8. Mana Regen */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">MP Regen</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-cyan-400">
                      {data.stats.mp > 0 ? (calcStats?.mpregen ?? data.stats.mpregen) : '0'}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${data.stats.mp > 0 ? Math.min(100, ((calcStats?.mpregen ?? data.stats.mpregen) / 25) * 100) : 0}%`,
                        boxShadow: '0 0 5px #06b6d450',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    {data.stats.mp > 0 ? `+${data.stats.mpregenperlevel}/lvl` : '-'}
                  </span>
                </div>

                {/* 9. Movement Speed */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                      <Wind className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">{t('championWiki.movementSpeed')}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-sky-400">
                      {data.stats.movespeed}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (data.stats.movespeed / 400) * 100)}%`,
                        boxShadow: '0 0 5px #38bdf850',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">Flat</span>
                </div>

                {/* 10. Attack Range */}
                <div className="flex flex-col rounded-xl bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <Target className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">{t('championWiki.range')}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-300">
                      {data.stats.attackrange}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (data.stats.attackrange / 700) * 100)}%`,
                        boxShadow: '0 0 5px #94a3b850',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 text-right">
                    {data.stats.attackrange > 300 ? 'Fernkampf' : 'Nahkampf'}
                  </span>
                </div>
              </div>
            </div>

            {/* Lore & Biography */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-base font-extrabold text-white mb-3 pb-3 border-b border-white/[0.06]">
                {t('championWiki.lore')}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
                {data.lore}
              </p>
            </div>

            {/* Gameplay Tips (if available) */}
            {((data.allytips && data.allytips.length > 0) || (data.enemytips && data.enemytips.length > 0)) && (
              <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                  <Award className="h-4 w-4 text-amber-400" />
                  <h2 className="text-base font-extrabold text-white">
                    {t('championWiki.tips')}
                  </h2>
                </div>

                {data.allytips && data.allytips.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                      {t('championWiki.allyTips')}
                    </span>
                    <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1.5">
                      {data.allytips.map((tip, i) => (
                        <li key={i} className="leading-relaxed">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.enemytips && data.enemytips.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.04]">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">
                      {t('championWiki.enemyTips')}
                    </span>
                    <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1.5">
                      {data.enemytips.map((tip, i) => (
                        <li key={i} className="leading-relaxed">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (7 Cols): Abilities Skillset & LoLDB FAQ */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 sm:p-8 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {t('championWiki.abilities')}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Wähle eine Fähigkeit aus, um Skalierungen, Abklingzeiten und Effekte anzuzeigen.
                  </p>
                </div>
                <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Skillset
                </span>
              </div>

              {/* Spell Selector Buttons: Passive, Q, W, E, R */}
              <div className="flex items-center gap-3 sm:gap-4 mb-6 overflow-x-auto pb-2">
                {/* Passive */}
                <button
                  type="button"
                  onClick={() => setSelectedSpellIndex(-1)}
                  className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                    selectedSpellIndex === -1
                      ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.3)] scale-105'
                      : 'border-white/10 bg-black/40 hover:border-white/20'
                  }`}
                >
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-white/10">
                    <Image
                      src={getChampionPassiveIconUrl(data.passive.image.full, version)}
                      alt={data.passive.name}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    {t('championWiki.passive')}
                  </span>
                </button>

                {/* Spells Q, W, E, R */}
                {data.spells.map((spell, idx) => {
                  const keys = ['Q', 'W', 'E', 'R'];
                  const isSelected = selectedSpellIndex === idx;
                  return (
                    <button
                      key={spell.id}
                      type="button"
                      onClick={() => setSelectedSpellIndex(idx)}
                      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.3)] scale-105'
                          : 'border-white/10 bg-black/40 hover:border-white/20'
                      }`}
                    >
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-white/10">
                        <Image
                          src={getChampionSpellIconUrl(spell.image.full, version)}
                          alt={spell.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">
                        {keys[idx]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Ability Details Card */}
              <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 flex flex-col gap-3.5">
                {selectedSpellIndex === -1 ? (
                  // Passive Details
                  <>
                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                        {t('championWiki.passive')}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {data.passive.name}
                      </h3>
                    </div>
                    <div
                      className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal"
                      dangerouslySetInnerHTML={{ __html: data.passive.description }}
                    />
                  </>
                ) : selectedSpell ? (
                  // Q, W, E, R Details
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                          {['Q', 'W', 'E', 'R'][selectedSpellIndex]}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white">
                          {selectedSpell.name}
                        </h3>
                      </div>

                      {/* Cooldown, Cost & Range */}
                      <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 flex-wrap">
                        {selectedSpell.cooldownBurn && selectedSpell.cooldownBurn !== '0' && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            <span>{selectedSpell.cooldownBurn}s CD</span>
                          </div>
                        )}
                        {selectedSpell.costBurn && selectedSpell.costBurn !== '0' && (
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-sky-400" />
                            <span>
                              {selectedSpell.costBurn} {data.partype || 'Mana'}
                            </span>
                          </div>
                        )}
                        {selectedSpell.rangeBurn && selectedSpell.rangeBurn !== '0' && (
                          <div className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-rose-400" />
                            <span>{selectedSpell.rangeBurn} Range</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rich Description */}
                    <div
                      className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal"
                      dangerouslySetInnerHTML={{
                        __html: selectedSpell.description || selectedSpell.tooltip,
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* FAQ SECTION (Matching User Screenshot media_1795172589127_c99ea92c.png) */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question 1: Release Date */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-5 shadow-lg backdrop-blur-md space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <HelpCircle className="h-4 w-4" />
                  <h3 className="text-sm font-bold text-white">
                    {t('championWiki.detailFaqRelease', { name: data.name })}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t('championWiki.detailFaqReleaseDesc', {
                    name: data.name,
                    date: formattedReleaseDate,
                  })}
                </p>
              </div>

              {/* Question 2: Role / Lane */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-5 shadow-lg backdrop-blur-md space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <HelpCircle className="h-4 w-4" />
                  <h3 className="text-sm font-bold text-white">
                    {t('championWiki.detailFaqRole', { name: data.name })}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t('championWiki.detailFaqRoleDesc', {
                    name: data.name,
                    role: primaryRole,
                    flex:
                      metaPos?.recommendedPositions && metaPos.recommendedPositions.length > 1
                        ? ` und ${metaPos.recommendedPositions.slice(1).join(', ')}`
                        : '',
                  })}
                </p>
              </div>

              {/* Question 3: Skins Count */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-5 shadow-lg backdrop-blur-md space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Layers className="h-4 w-4" />
                  <h3 className="text-sm font-bold text-white">
                    {t('championWiki.detailFaqSkins', { name: data.name })}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t('championWiki.detailFaqSkinsDesc', {
                    name: data.name,
                    count: nonBaseSkinsCount,
                  })}
                </p>
              </div>

              {/* Question 4: Store Pricing (BE & RP) */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-5 shadow-lg backdrop-blur-md space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Coins className="h-4 w-4" />
                  <h3 className="text-sm font-bold text-white">
                    {t('championWiki.detailFaqCost', { name: data.name })}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t('championWiki.detailFaqCostDesc', {
                    name: data.name,
                    be: beCost,
                    rp: rpCost,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
