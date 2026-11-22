'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
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
  Calendar,
  Maximize2,
  X,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
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
import {
  fetchChampionDetailApi,
  fetchChampionsRosterApi,
  fetchChampionSkinsApi,
  ChampionRosterItem,
  fetchTierList,
  TierListChampionItem,
} from '@/lib/api';
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

const LOLDB_RARITY_ORDER = [
  'Regular',
  'Epic',
  'Legendary',
  'Mythic',
  'Ultimate',
  'Transcendent',
  'Exalted',
] as const;
type RarityTier = (typeof LOLDB_RARITY_ORDER)[number];

const LOLDB_RARITY_RANKS: Record<string, number> = {
  Regular: 1,
  Epic: 2,
  Legendary: 3,
  Mythic: 4,
  Ultimate: 5,
  Transcendent: 6,
  Exalted: 7,
};

const LOLDB_RARITY_COLORS: Record<string, string> = {
  Regular: '#2E8D4C',
  Epic: '#0FAEB6',
  Legendary: '#DB1523',
  Mythic: '#B034B6',
  Ultimate: '#EA8617',
  Exalted: '#C5D8B0',
  Transcendent: '#C7A8DD',
};

const LOLDB_RARITY_ICONS: Record<string, string> = {
  Regular:
    'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/summoner-icon-rare.png',
  Epic:
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/epic.png',
  Legendary:
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/legendary.png',
  Ultimate:
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/ultimate.png',
  Mythic:
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/mythic.png',
  Transcendent:
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/cn-gem-11.png',
  Exalted:
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/exalted.png',
};

const ALL_RARITIES = LOLDB_RARITY_ORDER;
const RARITY_COLORS = LOLDB_RARITY_COLORS;

function getRarityGemIconUrl(tier: RarityTier | string): string | null {
  return LOLDB_RARITY_ICONS[tier] ?? null;
}

const BE_ICON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/icon-be-150.png';
const RP_ICON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/icon-rp-72.png';
const ANCIENT_SPARK_ICON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/currency/icons/ancient_spark.svg';
const MYTHIC_ESSENCE_ICON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/currency/icons/mythic.svg';
const LEGACY_ICON_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/summoner-icon/icon-legacy.png';

interface TimelineSkinData {
  id: string;
  num: number;
  name: string;
  year: number;
  date?: string;
  rank: number;
  tier: string;
  image: string;
  price?: string | number;
  currency?: string;
  isLegacy?: boolean;
}

function LolDBGroupNode({
  group,
  activeSkinNum,
  onSelectSkin,
  onTooltipChange,
}: {
  group: {
    year: number;
    rank: number;
    tier: string;
    px: number;
    py: number;
    skins: TimelineSkinData[];
  };
  activeSkinNum?: number;
  onSelectSkin: (num: number) => void;
  onTooltipChange: (info: any) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredSkinName, setHoveredSkinName] = useState<string | null>(null);
  const count = group.skins.length;
  const color = LOLDB_RARITY_COLORS[group.tier] ?? '#6b7280';

  return (
    <div
      className="pointer-events-auto absolute"
      style={{
        left: group.px,
        top: group.py,
        width: 40,
        height: 40,
        transform: 'translate(-50%, -50%)',
        zIndex: isExpanded ? 50 : 10,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setHoveredSkinName(null);
        onTooltipChange(null);
      }}
    >
      {group.skins.map((skin, r) => {
        const offset = (r - (count - 1) / 2) * 44;
        const isHovered = hoveredSkinName === skin.name;
        const isSelected = skin.num === activeSkinNum;

        return (
          <div
            key={skin.id}
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: 40,
              height: 40,
              transform: `translateX(${isExpanded ? offset : 0}px)`,
              zIndex: isHovered ? 100 : count - r,
              transition: 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              setHoveredSkinName(skin.name);
              const rect = e.currentTarget.getBoundingClientRect();
              onTooltipChange({
                name: skin.name,
                tier: skin.tier,
                px: rect.left + rect.width / 2,
                py: rect.top,
                image: skin.image,
                price: skin.price,
                currency: skin.currency,
                isLegacy: skin.isLegacy,
                year: skin.year,
                date: skin.date,
              });
            }}
            onMouseLeave={() => {
              setHoveredSkinName(null);
              onTooltipChange(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSkin(skin.num);
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  isHovered || isSelected
                    ? `0 0 0 2px ${color}, 0 0 14px ${color}55`
                    : '0 0 0 0px transparent',
                transition: 'box-shadow 0.2s ease',
              }}
            />
            <img
              src={skin.image}
              alt={skin.name}
              className={`h-full w-full rounded-full object-cover transition-transform duration-200 ${
                isSelected ? 'ring-2 ring-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.8)]' : ''
              } ${isHovered ? 'scale-110' : ''}`}
              style={{ border: `3px solid ${color}` }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        );
      })}

      {!isExpanded && (
        <div
          className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold text-white shadow-md"
          style={{
            background: color,
            zIndex: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}
        >
          {count}
        </div>
      )}
    </div>
  );
}

function LolDBTooltip({ info, locale = 'de' }: { info: any; locale?: string }) {
  if (!info) return null;
  const color = LOLDB_RARITY_COLORS[info.tier] ?? '#ffffff';
  const isTop = info.py < 180;
  const clampedX =
    typeof window !== 'undefined'
      ? Math.max(148, Math.min(window.innerWidth - 148, info.px))
      : info.px;

  return (
    <div
      className="pointer-events-none fixed z-[200]"
      style={{
        left: clampedX,
        top: isTop ? info.py + 48 : info.py - 12,
        transform: isTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
    >
      {isTop && (
        <div className="flex justify-center">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: `6px solid ${color}60`,
            }}
          />
        </div>
      )}
      <div
        className="w-72 overflow-hidden rounded-xl shadow-2xl"
        style={{
          background: 'rgba(7, 8, 11, 0.97)',
          border: `1px solid ${color}40`,
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}44)` }}
        />
        <div className="flex gap-3 p-3">
          {info.image && (
            <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-black">
              <img
                src={info.image}
                alt={info.name}
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-y-0 right-0 w-5 bg-gradient-to-r from-transparent to-black/40" />
            </div>
          )}
          <div className="flex min-w-0 flex-col justify-center gap-1">
            <p className="truncate text-sm font-bold leading-tight text-white">{info.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold" style={{ color }}>
                {info.tier}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 font-mono text-[11px]">{info.year}</span>
              {info.isLegacy && (
                <>
                  <span className="text-zinc-500">•</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded shadow-sm">
                    <img
                      src={LEGACY_ICON_URL}
                      alt="Legacy"
                      className="h-3 w-3 object-contain shrink-0"
                    />
                    Legacy
                  </span>
                </>
              )}
            </div>
            {info.price && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {String(info.price).includes('AS') ? (
                  <img
                    src={ANCIENT_SPARK_ICON_URL}
                    alt="AS"
                    className="h-3.5 w-3.5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]"
                  />
                ) : String(info.price).includes('ME') ? (
                  <img
                    src={MYTHIC_ESSENCE_ICON_URL}
                    alt="ME"
                    className="h-3.5 w-3.5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(168,85,247,0.9)]"
                  />
                ) : String(info.price).includes('BE') ? (
                  <img
                    src={BE_ICON_URL}
                    alt="BE"
                    className="h-3.5 w-3.5 object-contain"
                  />
                ) : (
                  <img
                    src={RP_ICON_URL}
                    alt="RP"
                    className="h-3.5 w-3.5 object-contain"
                  />
                )}
                <span
                  className={`text-xs font-bold ${
                    String(info.price).includes('AS')
                      ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                      : String(info.price).includes('ME')
                      ? 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : String(info.price).includes('BE')
                      ? 'text-sky-300'
                      : 'text-amber-400'
                  }`}
                >
                  {info.price}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {!isTop && (
        <div className="flex justify-center">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${color}60`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// Formats YYYY-MM-DD or textual date strings into "December 14, 2011" (en) or "14. Dezember 2011" (de)
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
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat(locale.startsWith('en') ? 'en-US' : 'de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(parsed);
  }
  return dateStr;
}

export default function ChampionDetailView({ slug }: ChampionDetailViewProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<DDragonChampionDetail | null>(null);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [tierInfo, setTierInfo] = useState<TierListChampionItem | null>(null);
  const [rosterList, setRosterList] = useState<ChampionRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Spells & Skins interaction
  const [selectedSpellIndex, setSelectedSpellIndex] = useState<number>(-1); // -1 = passive, 0 = Q, 1 = W, 2 = E, 3 = R
  const [selectedSkinIndex, setSelectedSkinIndex] = useState<number>(0);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [isSplashModalOpen, setIsSplashModalOpen] = useState(false);

  // LolDB Skin Timeline State
  const [hiddenRarities, setHiddenRarities] = useState<Set<string>>(() => new Set());
  const [timelineTooltip, setTimelineTooltip] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [timelineDims, setTimelineDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 260,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading || !data) return;
    const el = timelineContainerRef.current;
    if (!el) return;

    const measure = () => {
      if (el && el.clientWidth > 0) {
        setTimelineDims((prev) => (prev.width === el.clientWidth ? prev : { width: el.clientWidth, height: 260 }));
      }
    };

    measure();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setTimelineDims((prev) => (prev.width === entry.contentRect.width ? prev : { width: entry.contentRect.width, height: 260 }));
        }
      }
    });
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isLoading, data]);

  useEffect(() => {
    const handleDismiss = () => setTimelineTooltip(null);
    window.addEventListener('scroll', handleDismiss, { passive: true });
    window.addEventListener('touchmove', handleDismiss, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleDismiss);
      window.removeEventListener('touchmove', handleDismiss);
    };
  }, []);

  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const sameYearCarouselRef = useRef<HTMLDivElement>(null);

  const scrollSameYearCarousel = (direction: 'left' | 'right') => {
    if (!sameYearCarouselRef.current) return;
    const scrollAmount = direction === 'left' ? -380 : 380;
    sameYearCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Fetch Champion Details directly from PostgreSQL database via Fastify API
  useEffect(() => {
    setIsLoading(true);
    fetchChampionDetailApi(slug, locale)
      .then((res) => {
        if (res && res.champion) {
          setData(res.champion);
          if (res.version) setVersion(res.version);
        }
      })
      .catch((err) => {
        console.error('Failed to load champion detail:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Fetch official LoLDB skin metadata (isLegacy, AS/RP prices) directly
    fetchChampionSkinsApi(slug)
      .then((skinsRes) => {
        if (skinsRes && Array.isArray(skinsRes.skins) && skinsRes.skins.length > 0) {
          const loldbMap = new Map<string, any>();
          skinsRes.skins.forEach((ls: any) => {
            if (ls.id) loldbMap.set(String(ls.id), ls);
            if (ls.num !== undefined) loldbMap.set(String(ls.num), ls);
            if (ls.name) loldbMap.set(ls.name.toLowerCase().replace(/[^a-z0-9]/g, ''), ls);
          });

          setData((prev) => {
            if (!prev || !prev.skins) return prev;
            return {
              ...prev,
              skins: prev.skins.map((s) => {
                const normName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const match =
                  loldbMap.get(String(s.id)) ||
                  loldbMap.get(String(s.num)) ||
                  loldbMap.get(normName);
                if (match) {
                  return {
                    ...s,
                    isLegacy: Boolean(match.isLegacy),
                    cost: match.cost ?? s.cost,
                    price: match.price ?? match.cost ?? s.price ?? s.cost,
                    currency: match.currency || s.currency,
                    ...(match.rarity ? { rarity: match.rarity } : {}),
                    ...(match.releaseDate ? { releaseDate: match.releaseDate } : {}),
                    ...(match.releaseYear ? { releaseYear: match.releaseYear } : {}),
                  };
                }
                return s;
              }),
            };
          });
        }
      })
      .catch((err) => console.warn('[LoLDB] Skin enrichment error:', err));

    // Load roster for "Same Year" carousel directly from PostgreSQL database
    fetchChampionsRosterApi(locale)
      .then((res) => {
        if (res && res.champions) {
          setRosterList(res.champions);
        }
      })
      .catch(() => {});

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
                  if (cd) {
                    const mapped = cd.rarity ? mapSkinRarityClient(cd.rarity) : null;
                    return {
                      ...s,
                      ...(mapped ? { rarity: mapped.rarity, rarityColor: mapped.rarityColor } : {}),
                      isLegacy: typeof s.isLegacy === 'boolean' ? s.isLegacy : Boolean(cd.isLegacy),
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

  // Filtered cosmetic skins for LolDB Timeline
  const timelineFilteredSkins = useMemo<TimelineSkinData[]>(() => {
    if (!data || !skins || skins.length === 0) return [];
    const champRelYear = data.releaseDate ? parseInt(data.releaseDate.slice(0, 4), 10) : 2011;
    return skins
      .filter((s) => s.num !== 0)
      .map((s) => {
        const rawRarity = (s.rarity || 'Regular') as string;
        const tier = LOLDB_RARITY_ORDER.includes(rawRarity as any) ? rawRarity : 'Regular';
        const year = s.releaseYear && !isNaN(s.releaseYear) ? s.releaseYear : (champRelYear || 2015);
        return {
          id: String(s.id),
          num: s.num,
          name: s.name === 'default' ? (t('championWiki.defaultSkin') || 'Base Skin') : s.name,
          year,
          date: s.releaseDate,
          rank: LOLDB_RARITY_RANKS[tier] ?? 1,
          tier,
          image: getChampionLoadingUrl(data.id, s.num),
          price:
            s.currency === 'AS' || (typeof s.cost === 'string' && s.cost.includes('AS')) || (typeof s.price === 'string' && s.price.includes('AS'))
              ? `${typeof s.price === 'number' ? s.price : typeof s.cost === 'number' ? s.cost : typeof s.cost === 'string' ? s.cost.replace(/[^0-9]/g, '') : '40'} AS`
              : s.currency === 'ME' || (typeof s.cost === 'string' && s.cost.includes('ME')) || (typeof s.price === 'string' && s.price.includes('ME'))
              ? `${typeof s.price === 'number' ? s.price : typeof s.cost === 'number' ? s.cost : typeof s.cost === 'string' ? s.cost.replace(/[^0-9]/g, '') : '150'} ME`
              : s.currency === 'BE' || (typeof s.cost === 'string' && s.cost.includes('BE')) || (typeof s.price === 'string' && s.price.includes('BE'))
              ? `${typeof s.price === 'number' ? s.price : typeof s.cost === 'number' ? s.cost : typeof s.cost === 'string' ? s.cost.replace(/[^0-9]/g, '') : ''} BE`
              : typeof s.price === 'number'
              ? `${s.price} RP`
              : typeof s.cost === 'number'
              ? `${s.cost} RP`
              : (s.price ?? s.cost) === 'Special'
              ? (locale === 'de' ? 'Spezial' : 'Special')
              : (s.price ?? s.cost) === 'N/A'
              ? (locale === 'de' ? 'Nicht im Shop' : 'Not in Shop')
              : (s.price ?? s.cost)
              ? `${s.price ?? s.cost}`
              : undefined,
          currency: s.currency,
          isLegacy: s.isLegacy,
        };
      });
  }, [data, skins, t]);

  const { singlesFlat, groupsFlat, allFlat, minYear, maxYear, maxRank, displayRankMap, hasTimelineData } = useMemo(() => {
    if (timelineFilteredSkins.length === 0) {
      return {
        singlesFlat: [],
        groupsFlat: [],
        allFlat: [],
        minYear: 2011,
        maxYear: 2026,
        maxRank: 1,
        displayRankMap: new Map<number, number>(),
        hasTimelineData: false,
      };
    }

    const years = timelineFilteredSkins.map((s) => s.year);
    const groupsMap: Record<string, TimelineSkinData[]> = {};
    timelineFilteredSkins.forEach((s) => {
      const key = `${s.year}_${s.rank}`;
      (groupsMap[key] ??= []).push(s);
    });

    const singlesFlat = Object.values(groupsMap).filter((g) => g.length === 1).map((g) => g[0]);
    const groupsFlat = Object.values(groupsMap).filter((g) => g.length >= 2);
    const presentRanks = Array.from(new Set(timelineFilteredSkins.map((s) => s.rank))).sort((a, b) => a - b);
    const displayRankMap = new Map<number, number>(presentRanks.map((rank, idx) => [rank, idx + 1]));

    return {
      singlesFlat,
      groupsFlat,
      allFlat: timelineFilteredSkins,
      minYear: Math.min(...years),
      maxYear: Math.max(...years),
      maxRank: presentRanks.length,
      displayRankMap,
      hasTimelineData: true,
    };
  }, [timelineFilteredSkins]);

  const activeLegendTiers = useMemo<string[]>(() => {
    return LOLDB_RARITY_ORDER.filter((tier) => allFlat.some((s) => s.tier === tier));
  }, [allFlat]);

  const minCanvasWidth = useMemo(() => {
    if (!hasTimelineData) return 800;
    return Math.max(760, 72 + (maxYear - minYear + 3) * 52);
  }, [hasTimelineData, minYear, maxYear]);

  const effectiveTimelineWidth = useMemo(() => {
    return Math.max(timelineDims.width || 0, minCanvasWidth);
  }, [timelineDims.width, minCanvasWidth]);

  const timelineGeometry = useMemo(() => {
    if (!hasTimelineData) {
      return {
        singles: [] as Array<TimelineSkinData & { px: number; py: number }>,
        groups: [] as Array<{
          year: number;
          rank: number;
          tier: string;
          px: number;
          py: number;
          skins: TimelineSkinData[];
        }>,
        yearLabels: [] as Array<{ year: number; px: number; py: number }>,
        rarityAxisItems: [] as Array<{ tier: string; py: number }>,
        svgGeometry: {
          baseline: 0,
          gridLines: [] as Array<{ y: number }>,
          stems: [] as Array<{ id: string; x: number; y: number; height: number; tier: string }>,
          spotlightCols: [] as Array<{ x: number; y: number; h: number }>,
          yearTicks: [] as Array<{ x: number; y: number }>,
        },
      };
    }

    const width = effectiveTimelineWidth;
    const height = timelineDims.height || 260;
    const r = minYear - 0.8;
    const a = maxYear + 0.8;
    const l = maxRank + 0.6;
    const availW = width - 48 - 24;
    const availH = height - 16 - 44;

    const getX = (year: number) => 48 + ((year - r) / (a - r)) * availW;
    const getY = (rank: number) => 16 + (1 - (displayRankMap.get(rank) ?? rank) / l) * availH;

    const baseline = getY(0);

    const singles = singlesFlat.map((s) => ({
      ...s,
      px: getX(s.year),
      py: getY(s.rank),
    }));

    const groups = groupsFlat.map((g) => ({
      year: g[0].year,
      rank: g[0].rank,
      tier: g[0].tier,
      px: getX(g[0].year),
      py: getY(g[0].rank),
      skins: g,
    }));

    const presentYears = Array.from(new Set(allFlat.map((s) => s.year))).sort((a, b) => a - b);
    const yearLabelY = baseline + 14;
    const yearLabels = presentYears.map((year) => ({
      year,
      px: getX(year),
      py: yearLabelY,
    }));

    const rarityAxisItems = activeLegendTiers.map((tier) => ({
      tier,
      py: getY(LOLDB_RARITY_RANKS[tier]),
    }));

    const gridLines = activeLegendTiers.map((tier) => ({
      y: getY(LOLDB_RARITY_RANKS[tier]),
    }));

    const spotlightCols = presentYears.map((year) => ({
      x: getX(year) - 24,
      y: 16,
      h: availH,
    }));

    const stems = [
      ...singles.map((s, idx) => ({
        id: `s-${idx}`,
        x: s.px - 0.75,
        y: s.py,
        height: Math.max(0, baseline - s.py),
        tier: s.tier,
      })),
      ...groups.map((g, idx) => ({
        id: `g-${idx}`,
        x: g.px - 0.75,
        y: g.py,
        height: Math.max(0, baseline - g.py),
        tier: g.tier,
      })),
    ];

    const yearTicks = presentYears.map((year) => ({
      x: getX(year),
      y: baseline,
    }));

    return {
      singles,
      groups,
      yearLabels,
      rarityAxisItems,
      svgGeometry: {
        baseline,
        gridLines,
        stems,
        spotlightCols,
        yearTicks,
      },
    };
  }, [effectiveTimelineWidth, timelineDims.height, hasTimelineData, singlesFlat, groupsFlat, allFlat, minYear, maxYear, maxRank, displayRankMap, activeLegendTiers]);

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

  // Lightbox keyboard navigation (Escape to close, Left/Right arrow to navigate skins)
  useEffect(() => {
    if (!isSplashModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSplashModalOpen(false);
      } else if (e.key === 'ArrowLeft') {
        if (skins.length === 0) return;
        setSelectedSkinIndex((prev) => {
          const nextIdx = prev > 0 ? prev - 1 : skins.length - 1;
          scrollThumbnailIntoView(nextIdx);
          return nextIdx;
        });
      } else if (e.key === 'ArrowRight') {
        if (skins.length === 0) return;
        setSelectedSkinIndex((prev) => {
          const nextIdx = prev < skins.length - 1 ? prev + 1 : 0;
          scrollThumbnailIntoView(nextIdx);
          return nextIdx;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSplashModalOpen, skins.length]);

  // Lock body scroll when Lightbox Modal is open
  useEffect(() => {
    if (!isSplashModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isSplashModalOpen]);

  const rawRelDate = data?.releaseDate || data?.storeData?.releaseDate || '2012-01-01';
  const formattedReleaseDate = formatReleaseDate(rawRelDate, locale);
  const beCost = (data?.storeData?.ip ?? 4800).toLocaleString(
    locale.startsWith('en') ? 'en-US' : 'de-DE'
  );
  const rpCost = (data?.storeData?.rp ?? 880).toLocaleString(
    locale.startsWith('en') ? 'en-US' : 'de-DE'
  );
  const nonBaseSkinsCount = skins.filter((s) => s.num !== 0).length;

  const releaseYear = useMemo(() => {
    if (rawRelDate) {
      const y = parseInt(rawRelDate.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return 2011;
  }, [rawRelDate]);

  const sameYearChampions = useMemo(() => {
    if (!releaseYear || rosterList.length === 0) return [];
    const currentKey = (data?.id || data?.key || slug).toLowerCase().replace(/[^a-z0-9]/g, '');
    return rosterList
      .filter((c) => {
        const cKey = (c.id || c.key).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cKey === currentKey) return false;
        const rel = c.releaseDate || c.storeData?.releaseDate;
        if (!rel) return false;
        const y = parseInt(rel.slice(0, 4), 10);
        return y === releaseYear;
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        title: c.title || '',
        releaseDate: c.releaseDate || c.storeData?.releaseDate,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [releaseYear, rosterList, data?.id, data?.key, slug]);

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
  // SUB-RENDER: FULLSCREEN SPLASH LIGHTBOX MODAL & BADGE HELPERS
  // =========================================================================
  const renderSkinCostBadge = (skin: DDragonSkin | null, extraClass = '') => {
    if (!skin) return null;
    if (skin.num === 0) {
      return (
        <div className={`flex items-center gap-1.5 rounded-lg bg-black/75 border border-white/15 px-2.5 py-1 text-xs font-black text-amber-300 backdrop-blur-md shadow-md ${extraClass}`}>
          <span>{locale === 'de' ? 'Klassischer Skin' : 'Base Skin'}</span>
        </div>
      );
    }

    const isAS = skin.currency === 'AS' || (typeof skin.cost === 'string' && skin.cost.includes('AS')) || (typeof skin.price === 'string' && skin.price.includes('AS'));
    const isME = skin.currency === 'ME' || (typeof skin.cost === 'string' && skin.cost.includes('ME')) || (typeof skin.price === 'string' && skin.price.includes('ME'));
    const isBE = skin.currency === 'BE' || (typeof skin.cost === 'string' && skin.cost.includes('BE')) || (typeof skin.price === 'string' && skin.price.includes('BE'));

    if (isAS) {
      const amount = typeof skin.price === 'number' ? skin.price : typeof skin.cost === 'number' ? skin.cost : typeof skin.cost === 'string' ? skin.cost.replace(/[^0-9]/g, '') : '40';
      return (
        <div
          className={`flex items-center gap-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400/40 px-2.5 py-1 text-xs font-black text-cyan-200 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.25)] ${extraClass}`}
          title={locale === 'de' ? 'Uralte Funken (Ancient Sparks)' : 'Ancient Sparks (AS)'}
        >
          <img
            src={ANCIENT_SPARK_ICON_URL}
            alt="AS"
            className="h-3.5 w-3.5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]"
          />
          <span>{amount} AS</span>
        </div>
      );
    }

    if (isME) {
      const amount = typeof skin.price === 'number' ? skin.price : typeof skin.cost === 'number' ? skin.cost : typeof skin.cost === 'string' ? skin.cost.replace(/[^0-9]/g, '') : '150';
      return (
        <div
          className={`flex items-center gap-1.5 rounded-lg bg-purple-950/80 border border-purple-400/40 px-2.5 py-1 text-xs font-black text-purple-200 backdrop-blur-md shadow-[0_0_12px_rgba(168,85,247,0.3)] ${extraClass}`}
          title={locale === 'de' ? 'Mythische Essenzen (Mythic Essence)' : 'Mythic Essence (ME)'}
        >
          <img
            src={MYTHIC_ESSENCE_ICON_URL}
            alt="ME"
            className="h-3.5 w-3.5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(168,85,247,0.9)]"
          />
          <span>{amount} ME</span>
        </div>
      );
    }

    if (isBE) {
      const amount = typeof skin.price === 'number' ? skin.price : typeof skin.cost === 'number' ? skin.cost : typeof skin.cost === 'string' ? skin.cost.replace(/[^0-9]/g, '') : '';
      return (
        <div
          className={`flex items-center gap-1.5 rounded-lg bg-sky-950/80 border border-sky-400/40 px-2.5 py-1 text-xs font-black text-sky-200 backdrop-blur-md shadow-md ${extraClass}`}
          title="Blue Essence"
        >
          <Image
            src={BE_ICON_URL}
            alt="BE"
            width={14}
            height={14}
            className="h-3.5 w-3.5 object-contain"
            unoptimized
          />
          <span>{amount} BE</span>
        </div>
      );
    }

    const displayCost = skin.price ?? skin.cost;
    const isNumCost = typeof displayCost === 'number';

    return (
      <div className={`flex items-center gap-1.5 rounded-lg bg-black/75 border border-white/15 px-2.5 py-1 text-xs font-black text-amber-300 backdrop-blur-md shadow-md ${extraClass}`}>
        {isNumCost && (
          <Image
            src={RP_ICON_URL}
            alt="RP"
            width={14}
            height={14}
            className="h-3.5 w-3.5 object-contain"
            unoptimized
          />
        )}
        <span>
          {isNumCost
            ? `${displayCost} RP`
            : displayCost === 'Special'
            ? (locale === 'de' ? 'Spezial' : 'Special')
            : displayCost === 'N/A'
            ? (locale === 'de' ? 'Nicht im Shop' : 'Not in Shop')
            : displayCost
            ? `${displayCost}`
            : '975 RP'}
        </span>
      </div>
    );
  };

  const renderLegacyBadge = (skin: DDragonSkin | null, extraClass = '') => {
    if (!skin?.isLegacy) return null;
    return (
      <div
        className={`flex items-center gap-1.5 rounded-lg bg-amber-950/80 border border-amber-500/40 px-2 py-1 text-xs font-bold text-amber-300 backdrop-blur-md shadow-[0_0_10px_rgba(245,158,11,0.25)] ${extraClass}`}
        title={locale === 'de' ? 'Legacy Skin (Aus dem LoL-Tresor)' : 'Legacy Skin (Vault)'}
      >
        <img
          src={LEGACY_ICON_URL}
          alt="Legacy"
          className="h-3.5 w-3.5 object-contain shrink-0"
        />
        <span>Legacy</span>
      </div>
    );
  };

  const renderSplashLightboxModal = () => {
    if (!isMounted || !isSplashModalOpen || !data) return null;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={activeSkinDisplayName}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/92 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in duration-200"
        onClick={() => setIsSplashModalOpen(false)}
      >
        {/* Top Header Bar */}
        <div
          className="w-full max-w-6xl flex items-center justify-between py-2.5 px-4 rounded-xl bg-zinc-950/80 border border-white/10 backdrop-blur-md z-10 shrink-0 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: Champion & Skin Title */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-amber-400 font-black text-sm sm:text-base tracking-wider uppercase truncate">
              {activeSkinDisplayName}
            </span>
            <span className="text-xs text-zinc-400 font-semibold shrink-0">
              ({selectedSkinIndex + 1} / {skins.length})
            </span>
          </div>

          {/* Right: Badges & Close Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {activeSkin && (
              <div className="hidden sm:flex items-center gap-2">
                {/* Cost */}
                {renderSkinCostBadge(activeSkin, 'px-2 py-0.5 text-xs')}

                {/* Rarity */}
                <div
                  className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold text-white"
                  style={{
                    backgroundColor: `${activeSkin.rarityColor || '#22c55e'}33`,
                    borderColor: activeSkin.rarityColor || '#22c55e',
                  }}
                >
                  <span>{activeSkin.rarity || 'Regular'}</span>
                </div>

                {/* Legacy Badge */}
                {renderLegacyBadge(activeSkin, 'px-2 py-0.5 text-xs')}

                {/* Release Date */}
                <div className="flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  <Calendar className="h-3 w-3 text-amber-400" />
                  <span>
                    {activeSkin.num === 0
                      ? formattedReleaseDate
                      : activeSkin.releaseDate && !activeSkin.releaseDate.endsWith('-01-01') && activeSkin.releaseDate.length > 4
                        ? formatReleaseDate(activeSkin.releaseDate, locale)
                        : activeSkin.releaseYear || releaseYear}
                  </span>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsSplashModalOpen(false)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600/80 text-white transition-colors cursor-pointer border border-white/10"
              title={locale === 'de' ? 'Schließen (Esc)' : 'Close (Esc)'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center Image Container with Navigation Arrows */}
        <div
          className="relative flex-1 w-full max-w-7xl flex items-center justify-center my-2 sm:my-3 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrevSkin}
            className="absolute left-2 sm:left-4 z-20 flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-2xl active:scale-95"
            title={locale === 'de' ? 'Vorheriger Skin (Pfeil links)' : 'Previous Skin (Left Arrow)'}
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>

          {/* Full Splash Art */}
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <img
              src={getChampionSkinSplashUrl(data.id, activeSkin?.num ?? 0)}
              alt={activeSkinDisplayName}
              className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] select-none border border-white/10"
            />
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNextSkin}
            className="absolute right-2 sm:right-4 z-20 flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-2xl active:scale-95"
            title={locale === 'de' ? 'Nächster Skin (Pfeil rechts)' : 'Next Skin (Right Arrow)'}
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </div>

        {/* Bottom Thumbnail Strip for fast switching */}
        <div
          className="w-full max-w-4xl flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-2 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {skins.map((skin, idx) => {
            const isSelected = idx === selectedSkinIndex;
            return (
              <button
                key={`modal-skin-${skin.id}`}
                type="button"
                onClick={() => {
                  setSelectedSkinIndex(idx);
                  scrollThumbnailIntoView(idx);
                }}
                className={`relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400 scale-110 shadow-lg'
                    : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
                title={skin.name === 'default' ? t('championWiki.defaultSkin') : skin.name}
              >
                <img
                  src={getChampionLoadingUrl(data.id, skin.num)}
                  alt={skin.name}
                  className="h-full w-full object-cover object-top"
                />
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );
  };

  // =========================================================================
  // SUB-RENDER: SPOTLIGHT SPLASH CARD (SPLASH ART + CAROUSEL)
  // =========================================================================
  const renderSpotlightSplashCard = () => (
    <div className="flex flex-col gap-3">
      {/* Main Spotlight Splash Art Card (Borderless & Click-to-enlarge) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsSplashModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsSplashModalOpen(true);
          }
        }}
        className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-black shadow-2xl group cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-amber-400"
        title={locale === 'de' ? 'Klicken zum Vergrößern' : 'Click to enlarge'}
      >
        <Image
          src={getChampionSkinSplashUrl(data.id, activeSkin?.num ?? 0)}
          alt={activeSkinDisplayName}
          fill
          className="object-cover object-top brightness-95 group-hover:scale-[1.02] transition-transform duration-700"
          priority
          unoptimized
        />

        {/* Top-Left Badges on Splash: Cost, Rarity & Legacy */}
        <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1.5 pointer-events-none">
          {/* Top Badge: Cost (RP / Ancient Sparks / Blue Essence) */}
          {renderSkinCostBadge(activeSkin)}

          {/* Bottom Badges Row: Rarity + Legacy */}
          <div className="flex items-center gap-1.5">
            {/* Rarity Badge */}
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

            {/* Legacy Badge */}
            {renderLegacyBadge(activeSkin)}
          </div>
        </div>

        {/* Top-Right: Release Date Badge & Enlarge Button */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Release Date / Year Badge */}
          <div className="flex items-center gap-1.5 rounded-lg bg-black/75 border border-white/15 px-2.5 py-1 text-xs font-bold text-zinc-200 backdrop-blur-md shadow-md pointer-events-none">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {activeSkin?.num === 0
                ? formattedReleaseDate
                : activeSkin?.releaseDate && !activeSkin.releaseDate.endsWith('-01-01') && activeSkin.releaseDate.length > 4
                  ? formatReleaseDate(activeSkin.releaseDate, locale)
                  : activeSkin?.releaseYear || releaseYear}
            </span>
          </div>

          {/* Enlarge / Zoom button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSplashModalOpen(true);
            }}
            className="flex items-center justify-center h-7 w-7 rounded-lg bg-black/75 border border-white/15 text-zinc-300 hover:text-amber-400 hover:bg-black/90 backdrop-blur-md shadow-md transition-all cursor-pointer group/zoom"
            title={locale === 'de' ? 'Bild vergrößern' : 'Enlarge image'}
          >
            <Maximize2 className="h-3.5 w-3.5 transition-transform group-hover/zoom:scale-110" />
          </button>
        </div>

        {/* Prev / Next Chevrons on Splash hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrevSkin();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-amber-500 hover:text-black transition-all cursor-pointer backdrop-blur-sm opacity-0 group-hover:opacity-100 shadow-lg z-20"
          title="Vorheriger Skin"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNextSkin();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-amber-500 hover:text-black transition-all cursor-pointer backdrop-blur-sm opacity-0 group-hover:opacity-100 shadow-lg z-20"
          title="Nächster Skin"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Render Lightbox Portal when open */}
      {renderSplashLightboxModal()}

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
  // SUB-RENDER: SKIN TIMELINE CARD (EXACT LOLDB ARCHITECTURE & DESIGN)
  // =========================================================================
  const renderTimelineCard = () => {
    if (!hasTimelineData) return null;

    const { baseline, gridLines, stems, spotlightCols, yearTicks } = timelineGeometry.svgGeometry;
    const { singles, groups, yearLabels, rarityAxisItems } = timelineGeometry;
    const canvasWidth = effectiveTimelineWidth;
    const height = timelineDims.height || 260;

    return (
      <section className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-2xl backdrop-blur-md">
        {/* Header matching LolDB */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
          <div className="text-lg font-semibold text-white">
            {t('championWiki.skinTimeline') || 'Skin Timeline'}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {activeLegendTiers.map((tier) => {
              const isHidden = hiddenRarities.has(tier);
              const color = LOLDB_RARITY_COLORS[tier] ?? '#fff';
              const iconUrl = LOLDB_RARITY_ICONS[tier];
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setHiddenRarities((prev) => {
                      const next = new Set(prev);
                      if (next.has(tier)) next.delete(tier);
                      else next.add(tier);
                      return next;
                    });
                  }}
                  className="flex cursor-pointer items-center gap-1.5 text-xs transition-all hover:brightness-125"
                  style={{ opacity: isHidden ? 0.35 : 1 }}
                >
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={tier}
                      width={14}
                      height={14}
                      className={`h-3.5 w-3.5 object-contain transition-all ${
                        isHidden ? 'grayscale opacity-40' : ''
                      }`}
                    />
                  ) : (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: isHidden ? '#374151' : color }}
                    />
                  )}
                  <span className={`text-[11px] font-medium transition-colors ${isHidden ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                    {tier}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable canvas container without visible scrollbars */}
        <div
          ref={timelineContainerRef}
          className="w-full overflow-x-auto rounded-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch', overflowY: 'clip' }}
        >
          <div
            className="relative rounded-xl border border-white/[0.07] bg-black/25 backdrop-blur-sm"
            style={{ height: 260, width: canvasWidth, minWidth: '100%', overflow: 'visible' }}
          >
            <svg
              className="pointer-events-none absolute inset-0 overflow-visible"
              width={canvasWidth}
              height={height}
            >
              <defs>
                {stems.map((s) => (
                  <linearGradient key={s.id} id={`stem-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LOLDB_RARITY_COLORS[s.tier] ?? '#fff'} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={LOLDB_RARITY_COLORS[s.tier] ?? '#fff'} stopOpacity="0" />
                  </linearGradient>
                ))}
                <linearGradient id="baseline-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="15%" stopColor="rgba(255,255,255,0.18)" />
                  <stop offset="85%" stopColor="rgba(255,255,255,0.18)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>

              {/* Spotlight Columns behind each active year */}
              {spotlightCols.map(({ x, y, h }, idx) => (
                <rect key={idx} x={x} y={y} width={48} height={h} fill="rgba(255,255,255,0.016)" rx={3} />
              ))}

              {/* Dashed Horizontal Grid Lines */}
              {gridLines.map(({ y }, idx) => (
                <line
                  key={idx}
                  x1={48}
                  x2={canvasWidth - 24}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.045)"
                  strokeWidth={1}
                  strokeDasharray="3 6"
                />
              ))}

              {/* Stems */}
              {stems.filter((s) => !hiddenRarities.has(s.tier)).map((s) => (
                <rect key={s.id} x={s.x} y={s.y} width={1.5} height={s.height} fill={`url(#stem-${s.id})`} />
              ))}

              {/* Baseline Line */}
              <line x1={48} x2={canvasWidth - 24} y1={baseline} y2={baseline} stroke="url(#baseline-grad)" strokeWidth={1} />

              {/* Diamond Year Ticks */}
              {yearTicks.map(({ x, y }, idx) => (
                <rect
                  key={idx}
                  x={x - 3}
                  y={y - 3}
                  width={6}
                  height={6}
                  fill="rgba(255,255,255,0.22)"
                  transform={`rotate(45, ${x}, ${y})`}
                />
              ))}
            </svg>

                {/* HTML Layer on top of SVG */}
                <div className="absolute inset-0 overflow-visible">
                  {/* Left Y-Axis: Gem Icons */}
                  {rarityAxisItems.map(({ tier, py }) => {
                    const iconUrl = LOLDB_RARITY_ICONS[tier];
                    if (!iconUrl) return null;
                    return (
                      <img
                        key={tier}
                        src={iconUrl}
                        alt={tier}
                        title={tier}
                        width={18}
                        height={18}
                        className="pointer-events-none absolute select-none object-contain"
                        style={{
                          left: 24,
                          top: py,
                          transform: 'translate(-50%, -50%)',
                          opacity: 0.5,
                          filter: `drop-shadow(0 0 4px ${LOLDB_RARITY_COLORS[tier]}66)`,
                        }}
                        draggable={false}
                      />
                    );
                  })}

                  {/* Singles */}
                  {singles.filter((s) => !hiddenRarities.has(s.tier)).map((s) => {
                    const color = LOLDB_RARITY_COLORS[s.tier] ?? '#6b7280';
                    const isSelected = s.num === activeSkin?.num;
                    const globalIdx = skins.findIndex((sk) => sk.num === s.num);

                    return (
                      <div
                        key={s.name}
                        className="absolute group/single cursor-pointer"
                        style={{
                          left: s.px - 20,
                          top: s.py - 20,
                          width: 40,
                          height: 40,
                        }}
                        onClick={() => {
                          if (globalIdx !== -1) {
                            setSelectedSkinIndex(globalIdx);
                            scrollThumbnailIntoView(globalIdx);
                          }
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTimelineTooltip({
                            name: s.name,
                            tier: s.tier,
                            px: rect.left + rect.width / 2,
                            py: rect.top,
                            image: s.image,
                            price: s.price,
                            currency: s.currency,
                            isLegacy: s.isLegacy,
                            year: s.year,
                            date: s.date,
                          });
                        }}
                        onMouseLeave={() => setTimelineTooltip(null)}
                      >
                        <div
                          className="absolute inset-0 rounded-full opacity-40 blur-[6px]"
                          style={{ background: color }}
                        />
                        <img
                          src={s.image}
                          alt={s.name}
                          className={`relative h-full w-full rounded-full object-cover transition-transform duration-200 group-hover/single:scale-115 ${
                            isSelected ? 'ring-2 ring-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.8)]' : ''
                          }`}
                          style={{
                            border: `3px solid ${color}`,
                            boxShadow: `0 0 0 1px ${color}30 inset`,
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    );
                  })}

                  {/* Groups */}
                  {groups.filter((g) => !hiddenRarities.has(g.tier)).map((g, gIdx) => (
                    <LolDBGroupNode
                      key={`${g.year}_${g.rank}_${gIdx}`}
                      group={g}
                      activeSkinNum={activeSkin?.num}
                      onSelectSkin={(num) => {
                        const idx = skins.findIndex((sk) => sk.num === num);
                        if (idx !== -1) {
                          setSelectedSkinIndex(idx);
                          scrollThumbnailIntoView(idx);
                        }
                      }}
                      onTooltipChange={setTimelineTooltip}
                    />
                  ))}

                  {/* Year Labels below Baseline */}
                  {yearLabels.map(({ year, px, py }) => (
                    <div
                      key={year}
                      className="pointer-events-none absolute font-mono text-[10px] text-white/35 select-none"
                      style={{ left: px, top: py, transform: 'translateX(-50%)' }}
                    >
                      {year}
                    </div>
                  ))}
                </div>
          </div>
        </div>

        {/* Floating Tooltip via Portal */}
        {isMounted && timelineTooltip && createPortal(<LolDBTooltip info={timelineTooltip} locale={locale} />, document.body)}
      </section>
    );
  };

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
              src={getChampionPassiveIconUrl(data.passive?.image, version)}
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
                  src={getChampionSpellIconUrl(spell.image, version)}
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
              {data.name} costs <span className="font-bold text-[#0acbe6]">{beCost} Blue Essence</span> or <span className="font-bold text-amber-400">{rpCost} Riot Points</span>. You can purchase them from the in-game store using either currency. Blue Essence is earned through the battle pass and disenchanting champion shards, while Riot Points require real money to obtain.
            </>
          ) : (
            <>
              {data.name} kostet <span className="font-bold text-[#0acbe6]">{beCost} Blaue Essenzen</span> oder <span className="font-bold text-amber-400">{rpCost} Riot Points</span>. Der Champion kann im Ingame-Shop mit beiden Währungen freigeschaltet werden. Blaue Essenzen werden durch Levelaufstiege und Entzaubern von Champion-Splittern verdient, während Riot Points mit Echtgeld erworben werden.
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
