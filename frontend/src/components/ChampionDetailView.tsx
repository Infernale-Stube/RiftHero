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
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  fetchDDragonChampionDetail,
  DDragonChampionDetail,
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

  // Filter out chromas (entries with parentSkin or chroma recolor variants)
  const skins = useMemo(() => {
    if (!data?.skins) return [];
    return data.skins.filter((s) => s.parentSkin === undefined || s.parentSkin === null);
  }, [data?.skins]);

  const activeSkin = skins[selectedSkinIndex] || skins[0] || data.skins[0];

  const handleNextSkin = () => {
    if (skins.length === 0) return;
    setSelectedSkinIndex((prev) => (prev + 1) % skins.length);
  };

  const handlePrevSkin = () => {
    if (skins.length === 0) return;
    setSelectedSkinIndex((prev) => (prev - 1 + skins.length) % skins.length);
  };

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
                  {/* Currency: Blue Essence */}
                  <div className="inline-flex items-stretch rounded-md border border-cyan-500/30 bg-cyan-500/10 overflow-hidden shadow-sm">
                    <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-cyan-400 uppercase border-r border-cyan-500/20">
                      <Coins className="h-3 w-3 text-cyan-400" />
                      <span>BE</span>
                    </span>
                    <span className="flex items-center px-2 py-1 text-[10px] font-extrabold text-cyan-300">
                      2,400
                    </span>
                  </div>

                  {/* Currency: RP */}
                  <div className="inline-flex items-stretch rounded-md border border-yellow-500/30 bg-yellow-500/10 overflow-hidden shadow-sm">
                    <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-yellow-400 uppercase border-r border-yellow-500/20">
                      <Gem className="h-3 w-3 text-yellow-400" />
                      <span>RP</span>
                    </span>
                    <span className="flex items-center px-2 py-1 text-[10px] font-extrabold text-yellow-300">
                      880
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

                  {/* Live Meta Tier (from tier list table) */}
                  {tierInfo && (
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-extrabold shadow-sm ${
                        tierInfo.tier === 'S+'
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : tierInfo.tier === 'S'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : tierInfo.tier === 'A'
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-zinc-800 border-white/10 text-zinc-300'
                      }`}
                    >
                      <span>Tier {tierInfo.tier}</span>
                      <span className="opacity-75 font-semibold">• {tierInfo.winrate} WR</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Combat Ratings Bars */}
            <div className="flex items-center gap-4 rounded-2xl bg-black/40 border border-white/[0.06] p-4 backdrop-blur-md shrink-0 shadow-lg">
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-semibold">Attack</span>
                  <span className="text-amber-400 font-bold">{data.info?.attack ?? 5}/10</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                    style={{ width: `${(data.info?.attack ?? 5) * 10}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] mt-0.5">
                  <span className="text-zinc-400 font-semibold">Defense</span>
                  <span className="text-sky-400 font-bold">{data.info?.defense ?? 5}/10</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full"
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
              <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-lg">
                {activeSkin?.name === 'default' ? t('championWiki.defaultSkin') : activeSkin?.name}
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

        {/* Main 2-Column Content Grid: Left (Stats & Lore) + Right (Abilities Kit) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (5 Cols): Stats, Lore, Tips */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Base Statistics (Basis-Attribute zum aktuellen Patch) */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  <h2 className="text-base font-extrabold text-white">
                    {t('championWiki.baseStats')}
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Patch {patchString}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* HP */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                    <Heart className="h-3.5 w-3.5" />
                    <span>{t('championWiki.hp')}</span>
                  </div>
                  <span className="text-base font-black text-white">{data.stats.hp}</span>
                  <span className="text-[10px] text-zinc-500">
                    +{data.stats.hpperlevel} {t('championWiki.perLevel')}
                  </span>
                </div>

                {/* Mana / Resource */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold mb-1">
                    <Zap className="h-3.5 w-3.5" />
                    <span>{data.partype || t('championWiki.mana')}</span>
                  </div>
                  <span className="text-base font-black text-white">
                    {data.stats.mp > 0 ? data.stats.mp : '0'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {data.stats.mp > 0 ? `+${data.stats.mpperlevel} ${t('championWiki.perLevel')}` : 'Keine Kosten'}
                  </span>
                </div>

                {/* Attack Damage */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-orange-400 font-bold mb-1">
                    <Swords className="h-3.5 w-3.5" />
                    <span>{t('championWiki.attackDamage')}</span>
                  </div>
                  <span className="text-base font-black text-white">{data.stats.attackdamage}</span>
                  <span className="text-[10px] text-zinc-500">
                    +{data.stats.attackdamageperlevel} {t('championWiki.perLevel')}
                  </span>
                </div>

                {/* Armor */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <Shield className="h-3.5 w-3.5" />
                    <span>{t('championWiki.armor')}</span>
                  </div>
                  <span className="text-base font-black text-white">{data.stats.armor}</span>
                  <span className="text-[10px] text-zinc-500">
                    +{data.stats.armorperlevel} {t('championWiki.perLevel')}
                  </span>
                </div>

                {/* Magic Resist */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1">
                    <Shield className="h-3.5 w-3.5" />
                    <span>{t('championWiki.mr')}</span>
                  </div>
                  <span className="text-base font-black text-white">{data.stats.spellblock}</span>
                  <span className="text-[10px] text-zinc-500">
                    +{data.stats.spellblockperlevel} {t('championWiki.perLevel')}
                  </span>
                </div>

                {/* Attack Speed */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-yellow-400 font-bold mb-1">
                    <Activity className="h-3.5 w-3.5" />
                    <span>{t('championWiki.attackSpeed')}</span>
                  </div>
                  <span className="text-base font-black text-white">{data.stats.attackspeed}</span>
                  <span className="text-[10px] text-zinc-500">
                    +{data.stats.attackspeedperlevel}% {t('championWiki.perLevel')}
                  </span>
                </div>

                {/* Movement Speed */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                    <Wind className="h-3.5 w-3.5" />
                    <span>{t('championWiki.movementSpeed')}</span>
                  </div>
                  <span className="text-base font-black text-white">{data.stats.movespeed}</span>
                  <span className="text-[10px] text-zinc-500">Basiswert</span>
                </div>

                {/* Range */}
                <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
                    <Target className="h-3.5 w-3.5" />
                    <span>{t('championWiki.range')}</span>
                  </div>
                  <span className="text-base font-black text-white">{data.stats.attackrange}</span>
                  <span className="text-[10px] text-zinc-500">
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

          {/* Right Column (7 Cols): Abilities Skillset */}
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

            {/* LoLDB-Style FAQ Section for Champion Subpage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question 1: Role / Lane */}
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

              {/* Question 2: Skins Count */}
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
                    count: skins.length,
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
