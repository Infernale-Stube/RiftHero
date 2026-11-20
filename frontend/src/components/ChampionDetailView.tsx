'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  SlidersHorizontal,
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

const ALL_RARITIES = ['Regular', 'Epic', 'Legendary', 'Mythic', 'Transcendent'] as const;
type RarityTier = (typeof ALL_RARITIES)[number];

const RARITY_COLORS: Record<RarityTier, string> = {
  Regular: '#2E8D4C',
  Epic: '#0FAEB6',
  Legendary: '#DB1523',
  Mythic: '#B034B6',
  Transcendent: '#C7A8DD',
};

export default function ChampionDetailView({ slug }: ChampionDetailViewProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<DDragonChampionDetail | null>(null);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [tierInfo, setTierInfo] = useState<TierListChampionItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpellIndex, setSelectedSpellIndex] = useState<number>(-1); // -1 = passive, 0 = Q, 1 = W, 2 = E, 3 = R
  const [selectedSkinIndex, setSelectedSkinIndex] = useState<number>(0);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'build'>('overview');

  // Interactive Rarity Filters for Skin Timeline (User requirement: clickable, strikethrough when disabled)
  const [enabledRarities, setEnabledRarities] = useState<Set<string>>(
    () => new Set(['Regular', 'Epic', 'Legendary', 'Mythic', 'Transcendent'])
  );

  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    // 1. Fetch champion detail from our backend database/cache (with fallback to client DDragon with Meraki enrichment)
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
    const nextIdx = (selectedSkinIndex + 1) % skins.length;
    setSelectedSkinIndex(nextIdx);
    scrollThumbnailIntoView(nextIdx);
  };

  const handlePrevSkin = () => {
    if (skins.length === 0) return;
    const prevIdx = (selectedSkinIndex - 1 + skins.length) % skins.length;
    setSelectedSkinIndex(prevIdx);
    scrollThumbnailIntoView(prevIdx);
  };

  const scrollThumbnailIntoView = (idx: number) => {
    if (!thumbnailStripRef.current) return;
    const items = thumbnailStripRef.current.children;
    if (items && items[idx]) {
      (items[idx] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  // Toggle Rarity Filter in Timeline
  const toggleRarity = (rarity: string) => {
    setEnabledRarities((prev) => {
      const next = new Set(prev);
      if (next.has(rarity)) {
        next.delete(rarity);
      } else {
        next.add(rarity);
      }
      return next;
    });
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
    const hpregen = Math.round((s.hpregen + s.hpregenperlevel * mult) * 10) / 10;
    const mpregen = s.mpregen > 0 ? Math.round((s.mpregen + s.mpregenperlevel * mult) * 10) / 10 : 0;
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

  // Base Champion Release Year (fallback if skin releaseYear is missing)
  const champBaseYear = useMemo(() => {
    const relStr = data?.storeData?.releaseDate || data?.releaseDate;
    if (relStr) {
      const y = new Date(relStr).getFullYear();
      if (!isNaN(y) && y >= 2009) return y;
    }
    return 2011;
  }, [data]);

  // Group non-base skins by release year & rarity for the Skin Timeline (Base skin excluded per LoLDB)
  const timelineData = useMemo(() => {
    if (!skins || skins.length === 0) return [];

    const map = new Map<
      number,
      Map<string, { tier: string; rarityColor: string; skins: DDragonSkin[] }>
    >();

    for (const s of skins) {
      if (s.num === 0) continue; // Base skin excluded from timeline per LoLDB & screenshot

      // Accurate year: use releaseYear or parse releaseDate, or fallback to champion release year
      let year = s.releaseYear;
      if (!year && s.releaseDate) {
        const parsed = new Date(s.releaseDate).getFullYear();
        if (!isNaN(parsed) && parsed >= 2009) year = parsed;
      }
      if (!year) year = champBaseYear;

      const tier = s.rarity || 'Regular';
      const rarityColor =
        s.rarityColor || RARITY_COLORS[tier as RarityTier] || '#2E8D4C';

      // Skip if this rarity is currently toggled off by the user filter!
      if (!enabledRarities.has(tier)) continue;

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
  }, [skins, enabledRarities, champBaseYear]);

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
    return '1,575';
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
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 animate-pulse space-y-6">
        <div className="h-5 w-40 bg-white/5 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-4">
            <div className="h-28 rounded-2xl bg-white/5" />
            <div className="h-32 rounded-2xl bg-white/5" />
            <div className="h-64 rounded-2xl bg-white/5" />
          </div>
          <div className="lg:col-span-6 space-y-4">
            <div className="h-[360px] rounded-2xl bg-white/5" />
            <div className="h-16 rounded-xl bg-white/5" />
          </div>
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#06080b]/75 via-[#06080b]/90 to-[#06080b]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation (Exact LoLDB Style: Homepage / Champions / Champion) */}
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Link href={`/${locale}`} className="hover:text-amber-400 transition-colors">
            {t('championWiki.breadcrumbHome')}
          </Link>
          <span className="text-zinc-600">/</span>
          <Link href={`/${locale}/champions`} className="hover:text-amber-400 transition-colors">
            {t('championWiki.breadcrumbChampions')}
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-amber-400 font-semibold">{data.name}</span>
        </nav>

        {/* Subnav Tabs: Overview / Build (LoLDB Style) */}
        <div className="flex items-center gap-6 border-b border-white/10 pb-0.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`pb-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 ${
              activeSubTab === 'overview'
                ? 'border-amber-400 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('build')}
            className={`pb-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 ${
              activeSubTab === 'build'
                ? 'border-amber-400 text-white shadow-sm'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Build
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MAIN 2-COLUMN HERO AREA (Exact LoLDB Layout from Screenshot media_1795174016268_37174975.jpg) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT COLUMN: Profile Header + Badges + Brief Bio + Compact Base Stats   */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Champion Profile Header with Badges */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                {/* Circular Champion Portrait Avatar with subtle ring */}
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)] bg-zinc-950">
                  <Image
                    src={getChampionIconUrl(data.id, version)}
                    alt={data.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover scale-110"
                    priority
                    unoptimized
                  />
                </div>

                <div className="flex flex-col min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                    {data.name}
                  </h1>
                  <p className="text-sm font-semibold text-amber-400 capitalize mt-0.5">
                    {data.title}
                  </p>
                </div>
              </div>

              {/* LoLDB-Style Badges Row: BE, RP, SKINS, RELEASED, LEADERBOARD */}
              <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                {/* Currency: Blue Essence */}
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-bold text-cyan-300 shadow-sm">
                  <Coins className="h-3 w-3 text-cyan-400" />
                  <span>{beCost}</span>
                </div>

                {/* Currency: RP */}
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 font-bold text-yellow-300 shadow-sm">
                  <Gem className="h-3 w-3 text-yellow-400" />
                  <span>{rpCost}</span>
                </div>

                {/* Total Skins Badge */}
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold text-zinc-300 shadow-sm">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider">SKINS</span>
                  <span className="text-amber-400">{skins.length}</span>
                  <ExternalLink className="h-3 w-3 text-zinc-500" />
                </div>

                {/* Release Date Badge */}
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold text-zinc-300 shadow-sm">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider">RELEASED</span>
                  <span className="text-zinc-200">{formattedReleaseDate}</span>
                </div>

                {/* Leaderboard Badge */}
                <Link
                  href={`/${locale}/tier-list`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-bold text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm"
                >
                  <span className="text-[10px] uppercase tracking-wider">LEADERBOARD</span>
                  <span className="text-xs text-amber-400">View</span>
                  <ExternalLink className="h-3 w-3 text-amber-400" />
                </Link>
              </div>
            </div>

            {/* Brief Bio Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/85 p-5 shadow-xl backdrop-blur-md">
              <h2 className="text-sm font-bold text-white mb-2">Brief Bio</h2>
              <p className="text-xs text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
                {data.lore || data.blurb}
              </p>
            </div>

            {/* Base Stats Card (Compact 2-Column Layout matching screenshot) */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/85 p-5 shadow-xl backdrop-blur-md space-y-3">
              {/* Header: Base Stats and LVL Indicator */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <h2 className="text-sm font-bold text-white">Base Stats</h2>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    LVL
                  </span>
                  <span className="text-lg font-black text-[#fb923c] [text-shadow:0_0_12px_rgba(251,146,60,0.6)]">
                    {selectedLevel}
                  </span>
                </div>
              </div>

              {/* 18 Diamond Level Buttons with Milestone numbers 1, 6, 11, 16, 18 */}
              <div className="px-1 pb-2 border-b border-white/[0.06]">
                <div className="flex mb-1">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
                    const isMilestone = lvl === 1 || lvl === 6 || lvl === 11 || lvl === 16 || lvl === 18;
                    const isCurrent = lvl === selectedLevel;
                    return (
                      <div key={lvl} className="flex justify-center flex-1">
                        {isMilestone && (
                          <span
                            className={`text-[8px] font-bold tabular-nums select-none ${
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

                <div className="flex gap-[3px] items-center">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
                    const isSelected = selectedLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        title={`Level ${lvl}`}
                        onClick={() => setSelectedLevel(lvl)}
                        className="relative flex-1 flex justify-center items-center h-5 cursor-pointer group outline-none"
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

              {/* 10 Stat Rows: EXACT 2 Columns of 5 stats matching screenshot */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
                {/* ----------------- COLUMN 1 (Left 5 stats) ----------------- */}
                {/* 1. HEALTH */}
                <div className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    HEALTH
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.hp ?? data.stats.hp) / 2800) * 100)}%`,
                        boxShadow: '0 0 5px #ef444450',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    +{data.stats.hpperlevel}/lvl
                  </span>
                  <span className="text-xs font-bold tabular-nums text-red-400 shrink-0 w-9 text-right">
                    {calcStats?.hp ?? data.stats.hp}
                  </span>
                </div>

                {/* ----------------- COLUMN 2 (Right 5 stats) ----------------- */}
                {/* 2. MANA */}
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    MANA
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${data.stats.mp > 0 ? Math.min(100, ((calcStats?.mp ?? data.stats.mp) / 2000) * 100) : 0}%`,
                        boxShadow: '0 0 5px #3b82f650',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    {data.stats.mp > 0 ? `+${data.stats.mpperlevel}/lvl` : '-'}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-blue-400 shrink-0 w-9 text-right">
                    {data.stats.mp > 0 ? (calcStats?.mp ?? data.stats.mp) : '0'}
                  </span>
                </div>

                {/* 3. ATTACK DMG */}
                <div className="flex items-center gap-2">
                  <Swords className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    ATTACK DMG
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.ad ?? data.stats.attackdamage) / 160) * 100)}%`,
                        boxShadow: '0 0 5px #f9731650',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    +{data.stats.attackdamageperlevel}/lvl
                  </span>
                  <span className="text-xs font-bold tabular-nums text-orange-400 shrink-0 w-9 text-right">
                    {calcStats?.ad ?? data.stats.attackdamage}
                  </span>
                </div>

                {/* 4. ATK SPEED */}
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    ATK SPEED
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (parseFloat(calcStats?.as ?? String(data.stats.attackspeed)) / 1.5) * 100)}%`,
                        boxShadow: '0 0 5px #eab30850',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    +{data.stats.attackspeedperlevel}%/lvl
                  </span>
                  <span className="text-xs font-bold tabular-nums text-yellow-400 shrink-0 w-9 text-right">
                    {calcStats?.as ?? data.stats.attackspeed}
                  </span>
                </div>

                {/* 5. ARMOR */}
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    ARMOR
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.armor ?? data.stats.armor) / 120) * 100)}%`,
                        boxShadow: '0 0 5px #f59e0b50',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    +{data.stats.armorperlevel}/lvl
                  </span>
                  <span className="text-xs font-bold tabular-nums text-amber-400 shrink-0 w-9 text-right">
                    {calcStats?.armor ?? data.stats.armor}
                  </span>
                </div>

                {/* 6. MAGIC RESIST */}
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    MAGIC RESIST
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.mr ?? data.stats.spellblock) / 90) * 100)}%`,
                        boxShadow: '0 0 5px #a855f750',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    +{data.stats.spellblockperlevel}/lvl
                  </span>
                  <span className="text-xs font-bold tabular-nums text-purple-400 shrink-0 w-9 text-right">
                    {calcStats?.mr ?? data.stats.spellblock}
                  </span>
                </div>

                {/* 7. HP REGEN */}
                <div className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    HP REGEN
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((calcStats?.hpregen ?? data.stats.hpregen) / 25) * 100)}%`,
                        boxShadow: '0 0 5px #10b98150',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    +{data.stats.hpregenperlevel}/lvl
                  </span>
                  <span className="text-xs font-bold tabular-nums text-emerald-400 shrink-0 w-9 text-right">
                    {calcStats?.hpregen ?? data.stats.hpregen}
                  </span>
                </div>

                {/* 8. MANA REGEN */}
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    MANA REGEN
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${data.stats.mp > 0 ? Math.min(100, ((calcStats?.mpregen ?? data.stats.mpregen) / 25) * 100) : 0}%`,
                        boxShadow: '0 0 5px #06b6d450',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">
                    {data.stats.mp > 0 ? `+${data.stats.mpregenperlevel}/lvl` : '-'}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-cyan-400 shrink-0 w-9 text-right">
                    {data.stats.mp > 0 ? (calcStats?.mpregen ?? data.stats.mpregen) : '0'}
                  </span>
                </div>

                {/* 9. MOVE SPEED */}
                <div className="flex items-center gap-2">
                  <Wind className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    MOVE SPEED
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (data.stats.movespeed / 400) * 100)}%`,
                        boxShadow: '0 0 5px #38bdf850',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">Flat</span>
                  <span className="text-xs font-bold tabular-nums text-sky-400 shrink-0 w-9 text-right">
                    {data.stats.movespeed}
                  </span>
                </div>

                {/* 10. ATK RANGE */}
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    ATK RANGE
                  </span>
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (data.stats.attackrange / 700) * 100)}%`,
                        boxShadow: '0 0 5px #94a3b850',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 w-11 text-right">Flat</span>
                  <span className="text-xs font-bold tabular-nums text-slate-300 shrink-0 w-9 text-right">
                    {data.stats.attackrange}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Splash Art Card + Skin Thumbnail Strip (Matching LoLDB)    */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            {/* Top Bar above Splash Art: Chromas toggle & mode pills */}
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <span className="h-3.5 w-3.5 rounded-full border border-white/20 bg-gradient-to-tr from-cyan-400 via-purple-400 to-amber-400 inline-block" />
                <span>No Chromas</span>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/10 p-0.5">
                <button
                  type="button"
                  disabled
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold text-zinc-500 cursor-not-allowed opacity-50"
                >
                  Chromas
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/10 text-white shadow-sm"
                >
                  Splash Art
                </button>
              </div>
            </div>

            {/* Main Spotlight Splash Art Card */}
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/[0.08] bg-black shadow-2xl group">
              <Image
                src={getChampionSkinSplashUrl(data.id, activeSkin?.num ?? 0)}
                alt={activeSkin?.name ?? data.name}
                fill
                className="object-cover object-top brightness-95 group-hover:scale-[1.02] transition-transform duration-700"
                priority
                unoptimized
              />

              {/* Top-Left Skin Name Pill Badge (e.g. "Base Skin" or active skin name) */}
              <div className="absolute top-4 left-4 z-10">
                <div className="rounded-lg bg-black/70 border border-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-md shadow-md">
                  {activeSkin?.num === 0
                    ? 'Base Skin'
                    : activeSkin?.name === 'default'
                    ? t('championWiki.defaultSkin')
                    : activeSkin?.name}
                </div>
              </div>

              {/* Prev / Next Chevrons on Splash hover */}
              <button
                type="button"
                onClick={handlePrevSkin}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-amber-500 hover:text-black transition-all cursor-pointer backdrop-blur-sm opacity-0 group-hover:opacity-100 shadow-lg"
                title="Vorheriger Skin"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNextSkin}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-amber-500 hover:text-black transition-all cursor-pointer backdrop-blur-sm opacity-0 group-hover:opacity-100 shadow-lg"
                title="Nächster Skin"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Divider: ─── CHAMPION NAME ─── */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-amber-500/50" />
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                {data.name}
              </span>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-amber-500/30 to-amber-500/50" />
            </div>

            {/* Horizontal Thumbnail Strip with Left/Right arrows */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={handlePrevSkin}
                className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div
                ref={thumbnailStripRef}
                className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none scroll-smooth flex-1"
                style={{ scrollbarWidth: 'none' }}
              >
                {skins.map((skin, idx) => {
                  const isSelected = selectedSkinIndex === idx;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => {
                        setSelectedSkinIndex(idx);
                        scrollThumbnailIntoView(idx);
                      }}
                      className={`relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-md scale-105'
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

              <button
                type="button"
                onClick={handleNextSkin}
                className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Counter centered: 1 / 22 */}
            <div className="text-center text-xs font-mono font-bold text-zinc-500">
              {selectedSkinIndex + 1} / {skins.length}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SKIN TIMELINE (Clickable Filter Legend with Strikethrough & Timeline Grid) */}
        {/* ========================================================================= */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-black text-white">{t('championWiki.skinTimeline')}</h2>
            </div>

            {/* Interactive Clickable Legend Filters (User Requirement: crossed out when deactivated) */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold select-none">
              {ALL_RARITIES.map((tier) => {
                const isEnabled = enabledRarities.has(tier);
                const color = RARITY_COLORS[tier];
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleRarity(tier)}
                    className={`flex items-center gap-1.5 transition-all cursor-pointer ${
                      isEnabled
                        ? 'opacity-100 text-zinc-200 hover:text-white'
                        : 'opacity-40 text-zinc-500 line-through hover:opacity-60'
                    }`}
                    title={isEnabled ? `${tier} ausblenden` : `${tier} einblenden`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full transition-transform"
                      style={{
                        backgroundColor: color,
                        boxShadow: isEnabled ? `0 0 8px ${color}80` : 'none',
                        transform: isEnabled ? 'scale(1)' : 'scale(0.8)',
                      }}
                    />
                    <span>{t(`championWiki.${tier.toLowerCase()}` as any) || tier}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizontal Timeline Scroll Canvas */}
          <div className="overflow-x-auto pb-4 scrollbar-thin">
            <div className="relative min-w-[860px] h-[280px] bg-black/40 rounded-2xl border border-white/[0.06] p-4 flex">
              {/* Left Y-Axis: Rarity Icons from Top (Transcendent) to Bottom (Regular) */}
              <div className="w-14 shrink-0 flex flex-col justify-between py-2 items-center border-r border-white/[0.06]">
                {/* Transcendent */}
                <div
                  className={`flex items-center justify-center h-8 transition-opacity ${
                    enabledRarities.has('Transcendent') ? 'opacity-100' : 'opacity-25'
                  }`}
                  title="Transcendent"
                >
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#C7A8DD] bg-[#C7A8DD]/40 shadow-[0_0_8px_#C7A8DD]" />
                </div>
                {/* Mythic */}
                <div
                  className={`flex items-center justify-center h-8 transition-opacity ${
                    enabledRarities.has('Mythic') ? 'opacity-100' : 'opacity-25'
                  }`}
                  title="Mythic"
                >
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#B034B6] bg-[#B034B6]/40 shadow-[0_0_8px_#B034B6]" />
                </div>
                {/* Legendary */}
                <div
                  className={`flex items-center justify-center h-8 transition-opacity ${
                    enabledRarities.has('Legendary') ? 'opacity-100' : 'opacity-25'
                  }`}
                  title="Legendary"
                >
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#DB1523] bg-[#DB1523]/40 shadow-[0_0_8px_#DB1523]" />
                </div>
                {/* Epic */}
                <div
                  className={`flex items-center justify-center h-8 transition-opacity ${
                    enabledRarities.has('Epic') ? 'opacity-100' : 'opacity-25'
                  }`}
                  title="Epic"
                >
                  <span className="h-3.5 w-3.5 rotate-45 border border-[#0FAEB6] bg-[#0FAEB6]/40 shadow-[0_0_8px_#0FAEB6]" />
                </div>
                {/* Regular */}
                <div
                  className={`flex items-center justify-center h-8 transition-opacity ${
                    enabledRarities.has('Regular') ? 'opacity-100' : 'opacity-25'
                  }`}
                  title="Regular"
                >
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
                {timelineData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                    Keine Skins für die ausgewählten Filterkriterien vorhanden.
                  </div>
                ) : (
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
                                  if (idx !== -1) {
                                    setSelectedSkinIndex(idx);
                                    scrollThumbnailIntoView(idx);
                                  }
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABILITIES & FAQ SECTION                                                   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Abilities Skillset */}
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
          </div>

          {/* Right Column: FAQ Section */}
          <div className="lg:col-span-5 flex flex-col gap-4">
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
  );
}
