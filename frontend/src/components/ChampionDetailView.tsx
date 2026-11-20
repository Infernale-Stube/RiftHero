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
  Coins,
  Gem,
  Droplet,
  Droplets,
  CircleDot,
  Palette,
  RotateCcw,
  Award,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  fetchDDragonChampionDetail,
  enrichChampionWithMeraki,
  DDragonChampionDetail,
  DDragonSkin,
  getChampionIconUrl,
  getChampionSkinSplashUrl,
  getChampionLoadingUrl,
  getChampionPassiveIconUrl,
  getChampionSpellIconUrl,
  getPositionIconUrl,
  getMajorMinorPatch,
  getDDragonVersion,
  PositionKey,
  mapSkinRarityClient,
} from '@/lib/ddragon';
import { fetchChampionDetailApi, fetchTierList, TierListChampionItem } from '@/lib/api';
import championPositionsRaw from '@/lib/championPositions.json';
import championMetadataRaw from '@/lib/championMetadata.json';

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

const ALL_RARITIES = [
  'Transcendent',
  'Exalted',
  'Ultimate',
  'Mythic',
  'Legendary',
  'Epic',
  'Regular',
] as const;
type RarityTier = (typeof ALL_RARITIES)[number];

const RARITY_COLORS: Record<RarityTier, string> = {
  Transcendent: '#a855f7',
  Exalted: '#f43f5e',
  Ultimate: '#eab308',
  Mythic: '#d946ef',
  Legendary: '#ef4444',
  Epic: '#06b6d4',
  Regular: '#22c55e',
};

function getRarityGemIconUrl(tier: RarityTier): string | null {
  if (tier === 'Regular') return null;
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/${tier.toLowerCase()}.png`;
}

const BE_ICON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/icon-be-150.png';
const RP_ICON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/icon-rp-72.png';

// Formats YYYY-MM-DD into "December 14, 2011" (en) or "14. Dezember 2011" (de)
function formatReleaseDate(dateStr?: string, locale = 'de'): string {
  if (!dateStr) return locale.startsWith('en') ? 'Unknown' : 'Unbekannt';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(y, m, d));
    if (!isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(locale.startsWith('en') ? 'en-US' : 'de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    }
  }
  return dateStr;
}

export default function ChampionDetailView({ slug }: ChampionDetailViewProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<DDragonChampionDetail | null>(null);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [tierInfo, setTierInfo] = useState<TierListChampionItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Spells & Skins interaction
  const [selectedSpellIndex, setSelectedSpellIndex] = useState<number>(-1); // -1 = passive, 0 = Q, 1 = W, 2 = E, 3 = R
  const [selectedSkinIndex, setSelectedSkinIndex] = useState<number>(0);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  // Interactive Rarity Filters for Skin Timeline
  const [enabledRarities, setEnabledRarities] = useState<Set<RarityTier>>(
    () => new Set<RarityTier>(ALL_RARITIES)
  );

  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const sameYearCarouselRef = useRef<HTMLDivElement>(null);

  const scrollSameYearCarousel = (direction: 'left' | 'right') => {
    if (!sameYearCarouselRef.current) return;
    const scrollAmount = direction === 'left' ? -380 : 380;
    sameYearCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Fetch Champion Details (Instant from PostgreSQL cache / bundled metadata with DDragon fallback)
  useEffect(() => {
    setIsLoading(true);
    fetchChampionDetailApi(slug, locale)
      .then((res) => {
        if (res && res.champion) {
          setData(enrichChampionWithMeraki(res.champion));
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

    // Optional Tier List stats
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

  // Live Dynamic Official Skin Rarities from CommunityDragon
  useEffect(() => {
    if (data?.key) {
      fetch(
        `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/${data.key}.json`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((cdData) => {
          if (cdData && Array.isArray(cdData.skins)) {
            const cdMap = new Map(cdData.skins.map((s: any) => [String(s.id), s]));
            setData((prev) => {
              if (!prev || !prev.skins) return prev;
              return {
                ...prev,
                skins: prev.skins.map((s) => {
                  const cd = cdMap.get(String(s.id)) as any;
                  if (cd && cd.rarity) {
                    const mapped = mapSkinRarityClient(cd.rarity);
                    return {
                      ...s,
                      rarity: mapped.rarity,
                      rarityColor: mapped.rarityColor,
                    };
                  }
                  return s;
                }),
              };
            });
          }
        })
        .catch((err) => console.warn('[CDragon] Live skins enrichment error:', err));
    }
  }, [data?.key]);

  const patchString = getMajorMinorPatch(version);

  // Position & class metadata
  const metaPos = useMemo(() => {
    if (!data) return null;
    return championPositionsMap[data.id] || null;
  }, [data]);

  const primaryRole = metaPos?.recommendedPositions?.[0] || metaPos?.role || 'Mid';
  const posKey: PositionKey = (() => {
    const up = primaryRole.toUpperCase();
    if (up === 'TOP') return 'TOP';
    if (up === 'JUNGLE') return 'JUNGLE';
    if (up === 'MIDDLE' || up === 'MID') return 'MID';
    if (up === 'BOTTOM' || up === 'BOT' || up === 'ADC') return 'ADC';
    if (up === 'SUPPORT') return 'SUPPORT';
    return 'MID';
  })();

  const skins: DDragonSkin[] = useMemo(() => {
    if (!data || !data.skins) return [];
    return data.skins.filter((s) => s.parentSkin === undefined || s.parentSkin === null);
  }, [data]);

  const activeSkin = skins[selectedSkinIndex] || skins[0] || null;

  const activeSkinDisplayName = useMemo(() => {
    if (!activeSkin || !data) return '';
    if (activeSkin.num === 0 || activeSkin.name === 'default') {
      return locale === 'de' ? `Klassische(r) ${data.name}` : `Classic ${data.name}`;
    }
    return activeSkin.name;
  }, [activeSkin, data, locale]);

  // Selected spell
  const selectedSpell = useMemo(() => {
    if (!data || selectedSpellIndex < 0 || selectedSpellIndex >= data.spells.length) {
      return null;
    }
    return data.spells[selectedSpellIndex];
  }, [data, selectedSpellIndex]);

  // Dynamic Level Stats Calculation (League Standard Formula)
  const calcStats = useMemo(() => {
    if (!data || !data.stats) return null;
    const s = data.stats;
    const lvl = selectedLevel;
    const growthCoeff = (lvl - 1) * (0.7025 + 0.0175 * (lvl - 1));

    const calc = (base: number, growth: number) => {
      if (!growth || lvl === 1) return base;
      return Math.round((base + growth * growthCoeff) * 10) / 10;
    };

    const calcAS = (base: number, growthPercent: number) => {
      if (!growthPercent || lvl === 1) return base;
      const totalBonusPercent = (growthPercent * growthCoeff) / 100;
      return Math.round(base * (1 + totalBonusPercent) * 1000) / 1000;
    };

    return {
      hp: calc(s.hp, s.hpperlevel),
      mp: calc(s.mp, s.mpperlevel),
      ad: calc(s.attackdamage, s.attackdamageperlevel),
      armor: calc(s.armor, s.armorperlevel),
      mr: calc(s.spellblock, s.spellblockperlevel),
      as: calcAS(s.attackspeed, s.attackspeedperlevel),
      hpregen: calc(s.hpregen, s.hpregenperlevel),
      mpregen: calc(s.mpregen, s.mpregenperlevel),
    };
  }, [data, selectedLevel]);

  // Dynamic ladder tiers for Y-axis (only tiers actually present on this champion, top-to-bottom hierarchy)
  const timelineLadderTiers = useMemo<RarityTier[]>(() => {
    const present = new Set<RarityTier>();
    for (const s of skins) {
      if (s.num !== 0) {
        const raw = (s.rarity || 'Regular') as RarityTier;
        const tier = ALL_RARITIES.includes(raw) ? raw : 'Regular';
        present.add(tier);
      }
    }
    const list = ALL_RARITIES.filter((tier) => present.has(tier));
    if (list.length === 0) return ['Regular'];
    return list;
  }, [skins]);

  // Legend order (bottom-to-top hierarchy for top filters: Regular -> Epic -> Legendary -> ...)
  const timelineLegendTiers = useMemo<RarityTier[]>(() => {
    return [...timelineLadderTiers].reverse();
  }, [timelineLadderTiers]);

  // Skin Timeline Data Grouping (excludes base skin num 0)
  const timelineData = useMemo(() => {
    if (!data || !skins || skins.length === 0) return [];

    const cosmeticSkins = skins.filter((s) => s.num !== 0);
    const yearMap = new Map<number, Map<RarityTier, DDragonSkin[]>>();

    for (const s of cosmeticSkins) {
      const rawRarity = (s.rarity || 'Regular') as RarityTier;
      const tier: RarityTier = ALL_RARITIES.includes(rawRarity) ? rawRarity : 'Regular';

      if (!enabledRarities.has(tier)) continue;

      const y = s.releaseYear && !isNaN(s.releaseYear) ? s.releaseYear : 2020;
      if (!yearMap.has(y)) {
        yearMap.set(y, new Map());
      }
      const tierMap = yearMap.get(y)!;
      if (!tierMap.has(tier)) {
        tierMap.set(tier, []);
      }
      tierMap.get(tier)!.push(s);
    }

    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);

    return sortedYears.map((year) => {
      const tierMap = yearMap.get(year)!;
      const nodes = Array.from(tierMap.entries()).map(([tier, skinList]) => ({
        tier,
        rarityColor: RARITY_COLORS[tier],
        skins: skinList,
      }));
      return { year, nodes };
    });
  }, [data, skins, enabledRarities]);

  const toggleRarity = (tier: RarityTier) => {
    setEnabledRarities((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        if (next.size > 1) next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const scrollThumbnailIntoView = (index: number) => {
    if (!thumbnailStripRef.current) return;
    const container = thumbnailStripRef.current;
    const items = container.querySelectorAll<HTMLElement>('[data-skin-index]');
    if (items[index]) {
      items[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  const handlePrevSkin = () => {
    if (skins.length === 0) return;
    const prev = selectedSkinIndex > 0 ? selectedSkinIndex - 1 : skins.length - 1;
    setSelectedSkinIndex(prev);
    scrollThumbnailIntoView(prev);
  };

  const handleNextSkin = () => {
    if (skins.length === 0) return;
    const next = selectedSkinIndex < skins.length - 1 ? selectedSkinIndex + 1 : 0;
    setSelectedSkinIndex(next);
    scrollThumbnailIntoView(next);
  };

  const cleanKey = (data?.id || data?.key || slug).toLowerCase().replace(/[^a-z0-9]/g, '');
  const metaItem = (championMetadataRaw as Record<string, any>)[cleanKey];

  const rawRelDate = data?.releaseDate || metaItem?.d || data?.storeData?.releaseDate || '2011-12-14';
  const formattedReleaseDate = formatReleaseDate(rawRelDate, locale);
  const beCost = (metaItem?.be ?? data?.storeData?.ip ?? 4800).toLocaleString(
    locale.startsWith('en') ? 'en-US' : 'de-DE'
  );
  const rpCost = (metaItem?.rp ?? data?.storeData?.rp ?? 880).toLocaleString(
    locale.startsWith('en') ? 'en-US' : 'de-DE'
  );
  const nonBaseSkinsCount = skins.filter((s) => s.num !== 0).length;

  const releaseYear = useMemo(() => {
    if (rawRelDate) {
      const y = parseInt(rawRelDate.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return metaItem?.y || 2011;
  }, [rawRelDate, metaItem]);

  const sameYearChampions = useMemo(() => {
    if (!releaseYear) return [];
    const currentKey = (data?.id || data?.key || slug).toLowerCase().replace(/[^a-z0-9]/g, '');
    const metaRecords = championMetadataRaw as Record<string, any>;
    return Object.values(metaRecords)
      .filter(
        (c) =>
          c.y === releaseYear &&
          c.key.toLowerCase().replace(/[^a-z0-9]/g, '') !== currentKey
      )
      .map((c) => {
        const p =
          (championPositionsMap as any)[c.key] ||
          (championPositionsMap as any)[c.name] ||
          {};
        return {
          id: c.key,
          name: c.name,
          title: p.title || '',
          releaseDate: c.d,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [releaseYear, data?.id, data?.key, slug]);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-12 sm:px-6 lg:px-8 animate-pulse space-y-6">
        <div className="h-5 w-48 bg-white/5 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-4">
            <div className="h-28 rounded-2xl bg-white/5" />
            <div className="h-40 rounded-2xl bg-white/5" />
            <div className="h-80 rounded-2xl bg-white/5" />
          </div>
          <div className="lg:col-span-6 space-y-4">
            <div className="h-96 rounded-2xl bg-white/5" />
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
          Champion &quot;{slug}&quot; konnte nicht geladen werden.
        </p>
        <Link
          href={`/${locale}/champions`}
          className="rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-black transition-colors hover:bg-amber-400"
        >
          {t('championWiki.backToChampions')}
        </Link>
      </div>
    );
  }

  // =========================================================================
  // SUB-RENDER: PROFILE HEADER (MERGED WITH BIO & OFFICIAL CURRENCY ICONS)
  // =========================================================================
  const renderProfileHeader = () => (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/85 p-5 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] bg-zinc-950">
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

      {/* Badges Row: BE, RP, RELEASED (with official CommunityDragon icons) */}
      <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
        {/* Blue Essence */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#0acbe6]/30 bg-[#0acbe6]/10 px-2.5 py-1 font-bold text-[#0acbe6] shadow-sm">
          <Image
            src={BE_ICON_URL}
            alt="Blue Essence"
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            unoptimized
          />
          <span>{beCost}</span>
        </div>

        {/* RP */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-bold text-amber-400 shadow-sm">
          <Image
            src={RP_ICON_URL}
            alt="RP"
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            unoptimized
          />
          <span>{rpCost}</span>
        </div>

        {/* Release Date */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold text-zinc-300 shadow-sm">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-extrabold">RELEASED</span>
          <span className="text-zinc-200">{formattedReleaseDate}</span>
        </div>
      </div>

      {/* Champion Bio (merged directly inside card, no 'Brief Bio' heading) */}
      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal pt-2 border-t border-white/[0.06]">
        {data.lore || data.blurb}
      </p>
    </div>
  );

  // =========================================================================
  // SUB-RENDER: BASE STATS CARD (MATCHING LOLDB 2-COLUMN ANIMATED DESIGN)
  // =========================================================================
  const renderBaseStatsCard = () => (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/85 p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Header: Base Stats and LVL Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <h2 className="text-base font-bold text-white tracking-tight">Base Stats</h2>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            LVL
          </span>
          <span className="text-lg font-black text-amber-400 [text-shadow:0_0_12px_rgba(251,191,36,0.6)]">
            {selectedLevel}
          </span>
        </div>
      </div>

      {/* 18 Diamond Level Buttons with Milestone numbers 1, 6, 11, 16, 18 */}
      <div className="px-1 pb-3 border-b border-white/[0.06]">
        <div className="flex mb-1.5">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
            const isMilestone = lvl === 1 || lvl === 6 || lvl === 11 || lvl === 16 || lvl === 18;
            const isCurrent = lvl === selectedLevel;
            return (
              <div key={lvl} className="flex justify-center flex-1">
                {isMilestone ? (
                  <span
                    className={`text-[9px] font-bold tabular-nums select-none ${
                      isCurrent ? 'text-amber-400 font-extrabold' : 'text-zinc-500'
                    }`}
                  >
                    {lvl}
                  </span>
                ) : (
                  <span className="text-[9px] opacity-0 select-none">-</span>
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
                  className={`transition-all duration-200 rotate-45 ${
                    isSelected
                      ? 'w-2.5 h-2.5 bg-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.3),0_0_12px_rgba(251,191,36,0.8)] scale-110'
                      : 'w-1.5 h-1.5 bg-zinc-700/60 group-hover:bg-amber-400/50 group-hover:scale-125'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Stats Grid matching LolDB Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-2.5 pt-1">
        {/* Left Column (5 stats) */}
        <div className="space-y-2.5">
          {/* 1. HEALTH */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Heart className="h-3.5 w-3.5 text-[#f87171] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.hp') || 'Health'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f87171] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(10, ((calcStats?.hp ?? data.stats.hp) / 2800) * 100))}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              +{data.stats.hpperlevel}/lvl
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#f87171] tabular-nums">
              {calcStats?.hp ?? data.stats.hp}
            </span>
          </div>

          {/* 2. ATTACK DMG */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Swords className="h-3.5 w-3.5 text-[#fb923c] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.attackDamage') || 'Attack Dmg'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#fb923c] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(10, ((calcStats?.ad ?? data.stats.attackdamage) / 160) * 100))}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              +{data.stats.attackdamageperlevel}/lvl
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#fb923c] tabular-nums">
              {calcStats?.ad ?? data.stats.attackdamage}
            </span>
          </div>

          {/* 3. ARMOR */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Shield className="h-3.5 w-3.5 text-[#facc15] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.armor') || 'Armor'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#facc15] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(10, ((calcStats?.armor ?? data.stats.armor) / 130) * 100))}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              +{data.stats.armorperlevel}/lvl
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#facc15] tabular-nums">
              {calcStats?.armor ?? data.stats.armor}
            </span>
          </div>

          {/* 4. HP REGEN */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Heart className="h-3.5 w-3.5 text-[#4ade80] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.hpRegen') || 'HP Regen'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4ade80] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(10, ((calcStats?.hpregen ?? data.stats.hpregen) / 25) * 100))}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              +{data.stats.hpregenperlevel}/lvl
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#4ade80] tabular-nums">
              {calcStats?.hpregen ?? data.stats.hpregen}
            </span>
          </div>

          {/* 5. MOVE SPEED */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Wind className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.movementSpeed') || 'Move Speed'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#94a3b8] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(15, (data.stats.movespeed / 400) * 100))}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              —
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-zinc-200 tabular-nums">
              {data.stats.movespeed}
            </span>
          </div>
        </div>

        {/* Right Column (5 stats) */}
        <div className="space-y-2.5">
          {/* 1. MANA / RESOURCE */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Droplet className="h-3.5 w-3.5 text-[#60a5fa] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {data.partype || t('championWiki.mana') || 'Mana'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#60a5fa] rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${data.stats.mp > 0 ? Math.min(100, Math.max(10, ((calcStats?.mp ?? data.stats.mp) / 1800) * 100)) : 0}%`,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              {data.stats.mp > 0 ? `+${data.stats.mpperlevel}/lvl` : '—'}
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#60a5fa] tabular-nums">
              {data.stats.mp > 0 ? (calcStats?.mp ?? data.stats.mp) : 0}
            </span>
          </div>

          {/* 2. ATTACK SPEED */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Activity className="h-3.5 w-3.5 text-[#fbbf24] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.attackSpeed') || 'Atk Speed'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#fbbf24] rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(10, (((calcStats?.as ?? data.stats.attackspeed) - 0.5) / 1.0) * 100))}%`,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              +{data.stats.attackspeedperlevel}%/lvl
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#fbbf24] tabular-nums">
              {calcStats?.as ?? data.stats.attackspeed}
            </span>
          </div>

          {/* 3. MAGIC RESIST */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <CircleDot className="h-3.5 w-3.5 text-[#c084fc] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.mr') || 'Magic Resist'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c084fc] rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(10, ((calcStats?.mr ?? data.stats.spellblock) / 90) * 100))}%`,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              +{data.stats.spellblockperlevel}/lvl
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#c084fc] tabular-nums">
              {calcStats?.mr ?? data.stats.spellblock}
            </span>
          </div>

          {/* 4. MANA REGEN */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Droplets className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.manaRegen') || 'Mana Regen'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#38bdf8] rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${data.stats.mp > 0 ? Math.min(100, Math.max(10, ((calcStats?.mpregen ?? data.stats.mpregen) / 25) * 100)) : 0}%`,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              {data.stats.mp > 0 ? `+${data.stats.mpregenperlevel}/lvl` : '—'}
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-[#38bdf8] tabular-nums">
              {data.stats.mp > 0 ? (calcStats?.mpregen ?? data.stats.mpregen) : 0}
            </span>
          </div>

          {/* 5. ATK RANGE */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
              <Target className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.range') || 'Atk Range'}
              </span>
            </div>
            <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#94a3b8] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(15, (data.stats.attackrange / 700) * 100))}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 font-semibold tabular-nums">
              —
            </span>
            <span className="w-12 shrink-0 text-right text-sm font-black text-zinc-200 tabular-nums">
              {data.stats.attackrange}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-RENDER: SPOTLIGHT SPLASH CARD (SPLASH ART + CAROUSEL)
  // =========================================================================
  const renderSpotlightSplashCard = () => (
    <div className="flex flex-col gap-3">
      {/* Main Spotlight Splash Art Card (Borderless) */}
      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-black shadow-2xl group">
        <Image
          src={getChampionSkinSplashUrl(data.id, activeSkin?.num ?? 0)}
          alt={activeSkinDisplayName}
          fill
          className="object-cover object-top brightness-95 group-hover:scale-[1.02] transition-transform duration-700"
          priority
          unoptimized
        />

        {/* Top-Left Badges on Splash: Cost + Rarity */}
        <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1.5 pointer-events-none">
          {/* Top Badge: Cost */}
          <div className="flex items-center gap-1.5 rounded-lg bg-black/75 border border-white/15 px-2.5 py-1 text-xs font-black text-amber-300 backdrop-blur-md shadow-md">
            {activeSkin?.num === 0 ? (
              <span>{locale === 'de' ? 'Klassischer Skin' : 'Base Skin'}</span>
            ) : (
              <>
                <Image
                  src={RP_ICON_URL}
                  alt="RP"
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain"
                  unoptimized
                />
                <span>{activeSkin?.cost || 975} RP</span>
              </>
            )}
          </div>

          {/* Bottom Badge: Rarity */}
          <div
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-md"
            style={{
              backgroundColor: `${activeSkin?.rarityColor || '#22c55e'}33`,
              borderColor: activeSkin?.rarityColor || '#22c55e',
            }}
          >
            {getRarityGemIconUrl((activeSkin?.rarity || 'Regular') as RarityTier) ? (
              <Image
                src={getRarityGemIconUrl((activeSkin?.rarity || 'Regular') as RarityTier)!}
                alt={activeSkin?.rarity || 'Regular'}
                width={14}
                height={14}
                className="h-3.5 w-3.5 object-contain"
                unoptimized
              />
            ) : (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: activeSkin?.rarityColor || '#22c55e' }}
              />
            )}
            <span>{activeSkin?.rarity || 'Regular'}</span>
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

      {/* Skin Name Header above Thumbnails */}
      <div className="flex items-center gap-3 my-1.5">
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-amber-500/50" />
        <span className="text-xs sm:text-sm font-black tracking-widest text-amber-400 uppercase text-center px-2">
          {activeSkinDisplayName}
        </span>
        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-amber-500/30 to-amber-500/50" />
      </div>

      {/* Horizontal Thumbnail Strip with Left/Right arrows (matching LolDB) */}
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={handlePrevSkin}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/60 text-zinc-300 hover:text-amber-400 transition-all cursor-pointer mr-2 shadow-md active:scale-95"
          title="Vorheriger Skin"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={thumbnailStripRef}
          className="flex gap-2.5 overflow-x-auto py-2 scroll-smooth flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {skins.map((skin, idx) => {
            const isSelected = idx === selectedSkinIndex;
            return (
              <button
                key={skin.id}
                data-skin-index={idx}
                type="button"
                onClick={() => setSelectedSkinIndex(idx)}
                className={`group relative h-13 w-13 sm:h-14 sm:w-14 shrink-0 rounded-xl overflow-hidden transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.6)] scale-105'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                title={skin.name === 'default' ? t('championWiki.defaultSkin') : skin.name}
              >
                <Image
                  src={getChampionLoadingUrl(data.id, skin.num)}
                  alt={skin.name}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover object-top"
                  unoptimized
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNextSkin}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/60 text-zinc-300 hover:text-amber-400 transition-all cursor-pointer ml-2 shadow-md active:scale-95"
          title="Nächster Skin"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Skin Counter (Leiste/Balken removed) */}
      <div className="text-center pt-0.5">
        <span className="text-xs font-bold text-zinc-400 select-none">
          {selectedSkinIndex + 1} / {skins.length}
        </span>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-RENDER: SKIN TIMELINE CARD (FULL GRAPH MATCHING REFERENCE SCREENSHOT)
  // =========================================================================
  const renderTimelineCard = () => (
    <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-2xl backdrop-blur-md space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {t('championWiki.skinTimeline') || 'Skin Timeline'}
        </h2>

        {/* Dynamic Clickable Legend Filters with official gem icons */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold select-none">
          {timelineLegendTiers.map((tier) => {
            const isEnabled = enabledRarities.has(tier);
            const color = RARITY_COLORS[tier];
            const gemUrl = getRarityGemIconUrl(tier);
            return (
              <button
                key={tier}
                type="button"
                onClick={() => toggleRarity(tier)}
                className={`flex items-center gap-1.5 transition-all cursor-pointer ${
                  isEnabled
                    ? 'opacity-100 text-zinc-300 hover:text-white'
                    : 'opacity-40 text-zinc-600 line-through hover:opacity-60'
                }`}
                title={isEnabled ? `${tier} ausblenden` : `${tier} einblenden`}
              >
                {gemUrl ? (
                  <Image
                    src={gemUrl}
                    alt={tier}
                    width={16}
                    height={16}
                    className={`h-4 w-4 object-contain transition-all ${
                      isEnabled
                        ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                        : 'grayscale opacity-40'
                    }`}
                    unoptimized
                  />
                ) : (
                  <span
                    className="h-2.5 w-2.5 rounded-full transition-transform shrink-0"
                    style={{
                      backgroundColor: color,
                      boxShadow: isEnabled ? `0 0 8px ${color}80` : 'none',
                      transform: isEnabled ? 'scale(1)' : 'scale(0.8)',
                    }}
                  />
                )}
                <span>{tier}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Timeline Scroll Canvas */}
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div className="relative min-w-[860px] h-[280px] bg-black/40 rounded-2xl border border-white/[0.06] p-4 flex">
          {/* Left Y-Axis: Dynamic Rarity Gem Icons from Riot */}
          <div className="w-14 shrink-0 flex flex-col justify-between h-[224px] py-1 items-center border-r border-white/[0.06]">
            {timelineLadderTiers.map((tier) => {
              const isEnabled = enabledRarities.has(tier);
              const gemUrl = getRarityGemIconUrl(tier);
              return (
                <div
                  key={tier}
                  className={`flex items-center justify-center h-8 transition-opacity ${
                    isEnabled ? 'opacity-100' : 'opacity-25'
                  }`}
                  title={tier}
                >
                  {gemUrl ? (
                    <Image
                      src={gemUrl}
                      alt={tier}
                      width={22}
                      height={22}
                      className="h-5 w-5 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                      unoptimized
                    />
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-[#22c55e] bg-[#22c55e]/50 shadow-[0_0_8px_#22c55e]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Timeline Grid */}
          <div className="relative flex-1 h-full pl-2">
            {/* Dynamic horizontal dashed lines for each active tier */}
            {timelineLadderTiers.map((tier, idx) => {
              const y = (idx / (timelineLadderTiers.length - 1)) * 176 + 24;
              return (
                <div
                  key={tier}
                  className="absolute inset-x-0 border-b border-dashed border-white/[0.05] pointer-events-none"
                  style={{ top: `${y}px` }}
                />
              );
            })}
            {/* Bottom axis line */}
            <div className="absolute inset-x-0 bottom-6 border-b border-white/[0.1] pointer-events-none" />

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
                    {/* Vertical subtle line */}
                    <div className="absolute inset-x-0 top-0 bottom-6 flex justify-center pointer-events-none">
                      <div className="w-[1px] h-full bg-gradient-to-b from-white/[0.02] via-white/[0.06] to-white/[0.2]" />
                    </div>

                    {/* Nodes in this year */}
                    <div className="relative w-full h-[224px]">
                      {col.nodes.map((node) => {
                        const tierIdx = timelineLadderTiers.indexOf(node.tier);
                        const yTop = tierIdx !== -1 ? (tierIdx / (timelineLadderTiers.length - 1)) * 176 + 4 : 88;
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
                                src={getChampionLoadingUrl(data.id, node.skins[0].num)}
                                alt={node.skins[0].name}
                                fill
                                className="object-cover object-top"
                                unoptimized
                              />
                            </div>

                            {/* Badge with count if multiple skins exist in this node */}
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
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30 whitespace-nowrap">
                              <div className="rounded-lg bg-black/90 border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl backdrop-blur-md space-y-0.5">
                                {node.skins.map((s) => (
                                  <div key={s.id} className="flex items-center gap-1.5">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: node.rarityColor }}
                                    />
                                    <span>{s.name === 'default' ? t('championWiki.defaultSkin') : s.name}</span>
                                    <span className="text-[9px] text-zinc-400">({col.year})</span>
                                  </div>
                                ))}
                              </div>
                              <div className="w-1.5 h-1.5 rotate-45 bg-black border-r border-b border-white/20 -mt-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Year Label with Diamond Marker */}
                    <div className="h-6 flex flex-col items-center justify-end z-10">
                      <div className="w-2 h-2 rotate-45 bg-zinc-600 group-hover/col:bg-amber-400 transition-colors shadow-sm -mb-1" />
                      <span className="text-[10px] font-bold text-zinc-400 group-hover/col:text-amber-400 transition-colors mt-2 select-none">
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
  );

  // =========================================================================
  // SUB-RENDER: ABILITIES & PASSIVE SECTION
  // =========================================================================
  const renderAbilitiesCard = () => (
    <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-black text-white">{t('championWiki.abilities')}</h2>
        </div>
      </div>

      {/* Spell Icon Buttons (Passive, Q, W, E, R) */}
      <div className="grid grid-cols-5 gap-3">
        {/* Passive */}
        <button
          type="button"
          onClick={() => setSelectedSpellIndex(-1)}
          className={`group flex flex-col items-center gap-2 p-2 rounded-xl transition-all border cursor-pointer ${
            selectedSpellIndex === -1
              ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(251,146,60,0.3)]'
              : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
          }`}
        >
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden border border-white/10 group-hover:scale-105 transition-transform bg-zinc-900">
            <Image
              src={getChampionPassiveIconUrl(data.passive.image.full, version)}
              alt={data.passive.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <span
            className={`text-[10px] font-black uppercase tracking-wider ${
              selectedSpellIndex === -1 ? 'text-amber-400' : 'text-zinc-500'
            }`}
          >
            {t('championWiki.passive')}
          </span>
        </button>

        {/* Q, W, E, R */}
        {data.spells.map((spell, idx) => {
          const isSelected = selectedSpellIndex === idx;
          const keyLabel = ['Q', 'W', 'E', 'R'][idx];
          return (
            <button
              key={spell.id}
              type="button"
              onClick={() => setSelectedSpellIndex(idx)}
              className={`group flex flex-col items-center gap-2 p-2 rounded-xl transition-all border cursor-pointer ${
                isSelected
                  ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(251,146,60,0.3)]'
                  : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
              }`}
            >
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden border border-white/10 group-hover:scale-105 transition-transform bg-zinc-900">
                <Image
                  src={getChampionSpellIconUrl(spell.image.full, version)}
                  alt={spell.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isSelected ? 'text-amber-400' : 'text-zinc-500'
                }`}
              >
                {keyLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Spell Detail Box */}
      <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 sm:p-5 space-y-3">
        {selectedSpellIndex === -1 ? (
          <>
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <span className="rounded-md bg-zinc-800 text-zinc-300 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
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
  );

  // =========================================================================
  // SUB-RENDER: GAMEPLAY TIPS & STRATEGY (ALLY & ENEMY TIPS)
  // =========================================================================
  const renderTipsCard = () => {
    const allyTipsList = data.allytips || [];
    const enemyTipsList = data.enemytips || [];
    const hasAllyTips = allyTipsList.length > 0;
    const hasEnemyTips = enemyTipsList.length > 0;
    if (!hasAllyTips && !hasEnemyTips) return null;

    return (
      <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <Award className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg sm:text-xl font-black text-white">
            {t('championWiki.tips') || 'Tipps'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ally Tips */}
          {hasAllyTips && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="h-4 w-4" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-300">
                  {t('championWiki.allyTipsTitle', { name: data.name }) || `Tipps als ${data.name}`}
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                {allyTipsList.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Enemy Tips / Counterplay */}
          {hasEnemyTips && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Swords className="h-4 w-4" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-300">
                  {t('championWiki.enemyTipsTitle', { name: data.name }) || `Tipps gegen ${data.name}`}
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                {enemyTipsList.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDER: CHAMPIONS FROM SAME RELEASE YEAR (CAROUSEL)
  // =========================================================================
  const renderSameYearChampionsCard = () => {
    if (sameYearChampions.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {t('championWiki.championsFromYear', {
              year: releaseYear,
              count: sameYearChampions.length,
            })}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollSameYearCarousel('left')}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#0c1017] text-zinc-400 hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-all cursor-pointer"
              title="Vorherige"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollSameYearCarousel('right')}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#0c1017] text-zinc-400 hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-all cursor-pointer"
              title="Nächste"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel without visible scrollbars */}
        <div
          ref={sameYearCarouselRef}
          className="flex gap-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth py-1"
        >
          {sameYearChampions.map((champ) => (
            <Link
              key={champ.id}
              href={`/${locale}/champions/${champ.id.toLowerCase()}`}
              className="group relative h-48 w-36 sm:h-52 sm:w-40 md:h-56 md:w-44 shrink-0 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0c1017] hover:border-amber-400/50 hover:shadow-[0_0_15px_rgba(251,146,60,0.25)] transition-all cursor-pointer block"
            >
              <Image
                src={getChampionLoadingUrl(champ.id, 0)}
                alt={champ.name}
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                  {champ.name}
                </span>
                {champ.title && (
                  <span className="text-[11px] text-zinc-400 capitalize truncate mt-0.5">
                    {champ.title}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDER: FAQ SECTION (FULL-WIDTH VERTICAL LIST MATCHING LOLDB SCREENSHOT)
  // =========================================================================
  const renderFaqCard = () => (
    <div className="space-y-8 pt-6 border-t border-white/[0.08]">
      {/* 1. Release Date */}
      <div className="space-y-2">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('championWiki.detailFaqRelease', { name: data.name })}
        </h3>
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal max-w-4xl">
          {locale.startsWith('en') ? (
            <>
              {data.name} was released on <span className="font-bold text-amber-400">{formattedReleaseDate}</span>. Players could purchase them with Riot Points or Blue Essence as soon as it dropped in-game.
            </>
          ) : (
            <>
              {data.name} wurde am <span className="font-bold text-amber-400">{formattedReleaseDate}</span> veröffentlicht. Spieler konnten den Champion direkt nach Release mit Blauen Essenzen oder Riot Points erwerben.
            </>
          )}
        </p>
      </div>

      {/* 2. Lane & Class */}
      <div className="space-y-2">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('championWiki.detailFaqRole', { name: data.name })}
        </h3>
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal max-w-4xl">
          {locale.startsWith('en') ? (
            <>
              {data.name} is primarily played in the <span className="font-bold text-amber-400">{primaryRole}</span> lane and falls under the <span className="font-bold text-amber-400">{metaPos?.class || 'Mage'}</span> class. The champion&apos;s kit and playstyle make them most suited for it, where they can maximize their impact throughout the game.
            </>
          ) : (
            <>
              {data.name} wird primär auf der Position <span className="font-bold text-amber-400">{primaryRole}</span> gespielt und gehört zur Klasse <span className="font-bold text-amber-400">{metaPos?.class || 'Magier'}</span>. Das Fähigkeitenset und der Spielstil sind ideal darauf abgestimmt, um über das gesamte Spiel hinweg maximalen Einfluss zu nehmen.
            </>
          )}
        </p>
      </div>

      {/* 3. Skins Count */}
      <div className="space-y-2">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('championWiki.detailFaqSkins', { name: data.name })}
        </h3>
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal max-w-4xl">
          {locale.startsWith('en') ? (
            <>
              Currently, there are <span className="font-bold text-amber-400">{nonBaseSkinsCount} {data.name} Skins</span> available in the game. This includes all cosmetic variants released since their launch, the base skin is not included.
            </>
          ) : (
            <>
              Aktuell gibt es <span className="font-bold text-amber-400">{nonBaseSkinsCount} {data.name} Skins</span> im Spiel. Dies umfasst alle kosmetischen Varianten seit dem Release; der Basis-Skin ist nicht mitgezählt.
            </>
          )}
        </p>
      </div>

      {/* 4. Pricing (BE & RP) */}
      <div className="space-y-2">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('championWiki.detailFaqCost', { name: data.name })}
        </h3>
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal max-w-4xl">
          {locale.startsWith('en') ? (
            <>
              {data.name} costs <span className="font-bold text-[#0acbe6]">{typeof beCost === 'number' ? beCost.toLocaleString('en-US') : beCost} Blue Essence</span> or <span className="font-bold text-amber-400">{typeof rpCost === 'number' ? rpCost.toLocaleString('en-US') : rpCost} Riot Points</span>. You can purchase them from the in-game store using either currency. Blue Essence is earned through the battle pass and disenchanting champion shards, while Riot Points require real money to obtain.
            </>
          ) : (
            <>
              {data.name} kostet <span className="font-bold text-[#0acbe6]">{typeof beCost === 'number' ? beCost.toLocaleString('de-DE') : beCost} Blaue Essenzen</span> oder <span className="font-bold text-amber-400">{typeof rpCost === 'number' ? rpCost.toLocaleString('de-DE') : rpCost} Riot Points</span>. Der Champion kann im Ingame-Shop mit beiden Währungen freigeschaltet werden. Blaue Essenzen werden durch Levelaufstiege und Entzaubern von Champion-Splittern verdient, während Riot Points mit Echtgeld erworben werden.
            </>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080c] text-zinc-100 pb-20">
      <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6 lg:px-8 space-y-8">
        {/* Top Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: t('nav.champions') || 'Champions', href: `/${locale}/champions` },
            { label: data.name },
          ]}
        />

        {/* ========================================================================= */}
        {/* 2-COLUMN HERO AREA (PROFILE & STATS ON LEFT, SPOTLIGHT SPLASH ON RIGHT)    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Merged Profile & Bio Header + Animated Base Stats */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {renderProfileHeader()}
            {renderBaseStatsCard()}
          </div>

          {/* Right Column: Spotlight Splash Art + Strip */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            {renderSpotlightSplashCard()}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SKIN TIMELINE GRAPH                                                       */}
        {/* ========================================================================= */}
        {renderTimelineCard()}

        {/* ========================================================================= */}
        {/* ABILITIES & PASSIVE                                                       */}
        {/* ========================================================================= */}
        {renderAbilitiesCard()}

        {/* ========================================================================= */}
        {/* GAMEPLAY TIPS & COUNTERPLAY STRATEGY                                      */}
        {/* ========================================================================= */}
        {renderTipsCard()}

        {/* ========================================================================= */}
        {/* CHAMPIONS FROM SAME RELEASE YEAR (CAROUSEL)                               */}
        {/* ========================================================================= */}
        {renderSameYearChampionsCard()}

        {/* ========================================================================= */}
        {/* FAQ SECTION                                                               */}
        {/* ========================================================================= */}
        {renderFaqCard()}
      </div>
    </div>
  );
}
