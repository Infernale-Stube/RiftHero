'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Crosshair,
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Swords,
  History,
  ChevronDown,
  Filter,
  Clock,
  Users,
  Check,
  X,
  Plus,
  Trash2,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  getChampionIconUrl,
  getPositionIconUrl,
  PositionKey,
} from '@/lib/ddragon';
import {
  fetchCounterPickMeta,
  fetchChampionCounterPicks,
  fetchPoolCounterPicks,
} from '@/lib/api';
import {
  CounterPickMetaResponse,
  CounterPickChampionResponse,
  CounterPickMatchupEntry,
  CounterPickPoolResponse,
  CounterPickChampionSummary,
} from '@/types';

type SortField = 'enemyName' | 'vsWr' | 'games';
type PoolRoleFilter = 'ALL' | PositionKey;

const POOL_STORAGE_KEY = 'rifthero_champion_pool';

const ROLES: Array<{ key: string; labelDe: string; labelEn: string; posKey: PositionKey }> = [
  { key: 'top', labelDe: 'Top', labelEn: 'Top', posKey: 'TOP' },
  { key: 'jungle', labelDe: 'Jungle', labelEn: 'Jungle', posKey: 'JUNGLE' },
  { key: 'middle', labelDe: 'Mid', labelEn: 'Mid', posKey: 'MID' },
  { key: 'bottom', labelDe: 'ADC', labelEn: 'ADC', posKey: 'ADC' },
  { key: 'support', labelDe: 'Support', labelEn: 'Support', posKey: 'SUPPORT' },
];

const TIER_LABELS: Record<string, { de: string; en: string }> = {
  all: { de: 'Alle Ränge', en: 'All Ranks' },
  emerald_plus: { de: 'Smaragd+', en: 'Emerald+' },
  diamond_plus: { de: 'Diamant+', en: 'Diamond+' },
  platinum_plus: { de: 'Platin+', en: 'Platinum+' },
  gold_plus: { de: 'Gold+', en: 'Gold+' },
  master_plus: { de: 'Master+', en: 'Master+' },
  d2_plus: { de: 'Diamant 2+', en: 'Diamond 2+' },
  iron: { de: 'Eisen', en: 'Iron' },
  bronze: { de: 'Bronze', en: 'Bronze' },
  silver: { de: 'Silber', en: 'Silver' },
  gold: { de: 'Gold', en: 'Gold' },
  platinum: { de: 'Platin', en: 'Platinum' },
  emerald: { de: 'Smaragd', en: 'Emerald' },
  diamond: { de: 'Diamant', en: 'Diamond' },
  master: { de: 'Master', en: 'Master' },
  grandmaster: { de: 'Grandmaster', en: 'Grandmaster' },
  challenger: { de: 'Challenger', en: 'Challenger' },
};

const TIER_ORDER = [
  'all',
  'emerald_plus',
  'diamond_plus',
  'platinum_plus',
  'gold_plus',
  'master_plus',
  'd2_plus',
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'challenger',
];

function getWinrateColor(wr: number | null): string {
  if (wr === null) return 'text-zinc-500';
  if (wr >= 53) return 'text-emerald-400';
  if (wr >= 50.5) return 'text-emerald-300';
  if (wr <= 47) return 'text-rose-400';
  if (wr <= 49.5) return 'text-rose-300';
  return 'text-zinc-200';
}

function matchesPoolRole(champ: CounterPickChampionSummary, roleFilter: PoolRoleFilter): boolean {
  if (roleFilter === 'ALL') return true;
  const positions = [...(champ.positions || []), champ.role || ''].map((p) =>
    p.toUpperCase().trim()
  );
  if (roleFilter === 'TOP') return positions.includes('TOP');
  if (roleFilter === 'JUNGLE') return positions.includes('JUNGLE');
  if (roleFilter === 'MID') return positions.includes('MID') || positions.includes('MIDDLE');
  if (roleFilter === 'ADC')
    return positions.includes('ADC') || positions.includes('BOTTOM') || positions.includes('BOT');
  if (roleFilter === 'SUPPORT')
    return positions.includes('SUPPORT') || positions.includes('UTILITY');
  return true;
}

export default function CounterPicksView() {
  const { t, locale } = useTranslation();
  const isDe = locale === 'de';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const champDropdownRef = useRef<HTMLDivElement>(null);

  const [meta, setMeta] = useState<CounterPickMetaResponse | null>(null);
  const [selectedChampion, setSelectedChampion] = useState<string>(
    searchParams.get('champion') || ''
  );
  const [selectedTier, setSelectedTier] = useState<string>(
    searchParams.get('tier') || 'all'
  );
  const [selectedRole, setSelectedRole] = useState<string>(
    searchParams.get('role') || ''
  );
  const [selectedSlot, setSelectedSlot] = useState<'current' | 'previous'>(
    searchParams.get('slot') === 'previous' ? 'previous' : 'current'
  );

  // Personal Champion Pool (persisted in localStorage)
  const [poolIds, setPoolIds] = useState<number[]>([]);
  const [poolLoaded, setPoolLoaded] = useState(false);
  const [isPoolEditorOpen, setIsPoolEditorOpen] = useState(false);
  const [poolSearch, setPoolSearch] = useState('');
  const [poolRoleFilter, setPoolRoleFilter] = useState<PoolRoleFilter>('ALL');

  const [champSearch, setChampSearch] = useState('');
  const [champMenuOpen, setChampMenuOpen] = useState(false);
  const [enemySearch, setEnemySearch] = useState('');
  const [onlyWithData, setOnlyWithData] = useState(true);
  const [sortField, setSortField] = useState<SortField>('vsWr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [data, setData] = useState<CounterPickChampionResponse | null>(null);
  const [poolData, setPoolData] = useState<CounterPickPoolResponse | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(false);

  // Load saved pool from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POOL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPoolIds(
            Array.from(
              new Set(parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0))
            )
          );
        }
      }
    } catch {
      // localStorage unavailable
    } finally {
      setPoolLoaded(true);
    }
  }, []);

  // Persist pool changes to localStorage
  const updatePoolIds = (updater: (prev: number[]) => number[]) => {
    setPoolIds((prev) => {
      const next = Array.from(new Set(updater(prev)));
      try {
        localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const togglePoolChampion = (championId: number) => {
    updatePoolIds((prev) =>
      prev.includes(championId) ? prev.filter((id) => id !== championId) : [...prev, championId]
    );
  };

  const clearPool = () => {
    updatePoolIds(() => []);
  };

  // Close opponent dropdown on outside click
  useEffect(() => {
    if (!champMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (champDropdownRef.current && !champDropdownRef.current.contains(e.target as Node)) {
        setChampMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [champMenuOpen]);

  // Load metadata (champions from Champion table, patches, tiers, roles)
  useEffect(() => {
    setIsLoadingMeta(true);
    fetchCounterPickMeta(locale)
      .then((m) => {
        if (m) setMeta(m);
      })
      .finally(() => setIsLoadingMeta(false));
  }, [locale]);

  // Keep URL query synchronized when a champion is selected
  useEffect(() => {
    if (!selectedChampion) {
      router.replace(pathname, { scroll: false });
      return;
    }
    const params = new URLSearchParams();
    params.set('champion', selectedChampion);
    params.set('tier', selectedTier);
    if (selectedRole) params.set('role', selectedRole);
    if (selectedSlot === 'previous') params.set('slot', 'previous');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedChampion, selectedTier, selectedRole, selectedSlot, pathname, router]);

  // Load general CounterPicks & personal Pool Recommendations in parallel
  useEffect(() => {
    if (!selectedChampion) {
      setData(null);
      setPoolData(null);
      return;
    }

    let cancelled = false;
    setIsLoadingData(true);

    fetchChampionCounterPicks({
      champion: selectedChampion,
      tier: selectedTier,
      role: selectedRole || undefined,
      slot: selectedSlot,
      locale,
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        if (res && !selectedRole) {
          setSelectedRole(res.role);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    if (poolLoaded && poolIds.length > 0) {
      setIsLoadingPool(true);
      fetchPoolCounterPicks({
        enemyChampion: selectedChampion,
        poolChampionIds: poolIds,
        tier: selectedTier,
        role: selectedRole || undefined,
        slot: selectedSlot,
        locale,
      })
        .then((res) => {
          if (!cancelled) setPoolData(res);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingPool(false);
        });
    } else {
      setPoolData(null);
      setIsLoadingPool(false);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedChampion, selectedTier, selectedRole, selectedSlot, locale, poolIds, poolLoaded]);

  const championById = useMemo(() => {
    const map = new Map<number, CounterPickChampionSummary>();
    for (const c of meta?.champions || []) {
      map.set(c.id, c);
    }
    return map;
  }, [meta]);

  const poolChampions = useMemo(() => {
    return poolIds
      .map((id) => championById.get(id))
      .filter((c): c is CounterPickChampionSummary => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [poolIds, championById]);

  const filteredPoolEditorChampions = useMemo(() => {
    const list = meta?.champions || [];
    const q = poolSearch.toLowerCase().trim();
    return list.filter((c) => {
      if (!matchesPoolRole(c, poolRoleFilter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q)
      );
    });
  }, [meta, poolSearch, poolRoleFilter]);

  const filteredChampionPicker = useMemo(() => {
    if (!meta?.champions) return [];
    const q = champSearch.toLowerCase().trim();
    if (!q) return meta.champions;
    return meta.champions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q)
    );
  }, [meta, champSearch]);

  const handleSelectChampion = (key: string) => {
    setSelectedChampion(key);
    setSelectedRole(''); // auto-select champion's primary role on switch
    setChampMenuOpen(false);
    setChampSearch('');
  };

  const handleClearChampion = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChampion('');
    setSelectedRole('');
    setChampMenuOpen(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'enemyName' ? 'asc' : 'desc');
    }
  };

  const displayedMatchups = useMemo(() => {
    if (!data?.matchups) return [];
    let list = [...data.matchups];

    if (onlyWithData) {
      list = list.filter((m) => m.vsWr !== null);
    }

    if (enemySearch.trim()) {
      const q = enemySearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.enemyName.toLowerCase().includes(q) ||
          m.enemyNameEn.toLowerCase().includes(q) ||
          m.enemyKey.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortField === 'enemyName') {
        const cmp = a.enemyName.localeCompare(b.enemyName);
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null && valB === null) return a.enemyName.localeCompare(b.enemyName);
      if (valA === null) return 1;
      if (valB === null) return -1;

      const cmp = (valA as number) - (valB as number);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [data, onlyWithData, enemySearch, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
    );
  };

  const currentPatchLabel = meta?.patches.current.patch || data?.patch || '—';
  const previousPatchLabel = meta?.patches.previous.patch;
  const previousAvailable = Boolean(meta?.patches.previous.available);

  const activeFetchedAt =
    data?.fetchedAt ||
    (selectedSlot === 'previous'
      ? meta?.patches.previous.fetchedAt
      : meta?.patches.current.fetchedAt) ||
    null;

  const formattedFetchedAt = useMemo(() => {
    if (!activeFetchedAt) return null;
    const date = new Date(activeFetchedAt);
    if (Number.isNaN(date.getTime())) return null;
    const formatted = date.toLocaleString(isDe ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return isDe ? `${formatted} Uhr` : formatted;
  }, [activeFetchedAt, isDe]);

  const activeChamp = selectedChampion
    ? data?.champion || meta?.champions.find((c) => c.key === selectedChampion)
    : null;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: t('nav.counterpicks') || 'Counter Picks' }]} />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {t('counterPicks.pageTitle')}
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-amber-400/80" />
            <span>
              {t('counterPicks.lastUpdated')}{' '}
              <span className="font-semibold text-zinc-200">
                {formattedFetchedAt || '—'}
              </span>
            </span>
          </div>
        </div>

        {/* Patch Slot Toggle (Current vs Previous) */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-1.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setSelectedSlot('current')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedSlot === 'current'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {t('counterPicks.currentPatch')} ({currentPatchLabel})
            </span>
          </button>

          <button
            type="button"
            disabled={!previousAvailable}
            onClick={() => previousAvailable && setSelectedSlot('previous')}
            title={
              previousAvailable
                ? `Patch ${previousPatchLabel}`
                : t('counterPicks.previousPatchTooltip')
            }
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              !previousAvailable
                ? 'text-zinc-600 cursor-not-allowed opacity-60'
                : selectedSlot === 'previous'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 cursor-pointer'
                : 'text-zinc-400 hover:text-white cursor-pointer'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>
              {t('counterPicks.previousPatch')}
              {previousPatchLabel ? ` (${previousPatchLabel})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Personal Champion Pool Bar & Collapsible Editor */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold text-white">
              {t('counterPicks.poolTitle')}
            </span>
            <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">
              {poolChampions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {poolChampions.length > 0 && (
              <button
                type="button"
                onClick={clearPool}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-rose-300 hover:border-rose-500/30 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t('counterPicks.poolClear')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsPoolEditorOpen((o) => !o)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                isPoolEditorOpen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/[0.05] text-zinc-200 border-white/10 hover:border-amber-500/40 hover:text-white'
              }`}
            >
              {isPoolEditorOpen ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{t('counterPicks.poolDone')}</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('counterPicks.poolEdit')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Pool Chips */}
        {poolChampions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {poolChampions.map((c) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#090c11] pl-1.5 pr-2 py-1 text-xs font-semibold text-zinc-200"
              >
                <Image
                  src={getChampionIconUrl(c.key)}
                  alt={c.name}
                  width={22}
                  height={22}
                  className="h-5 w-5 rounded-md object-cover shrink-0"
                  unoptimized
                />
                <span className="truncate max-w-[110px]">{c.name}</span>
                <button
                  type="button"
                  onClick={() => togglePoolChampion(c.id)}
                  className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                  aria-label={c.name}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          !isPoolEditorOpen && (
            <p className="text-xs text-zinc-500">{t('counterPicks.poolEmptyHint')}</p>
          )
        )}

        {/* Collapsible Champion Pool Editor */}
        {isPoolEditorOpen && (
          <div className="pt-3 border-t border-white/[0.08] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={poolSearch}
                  onChange={(e) => setPoolSearch(e.target.value)}
                  placeholder={t('counterPicks.poolSearchPlaceholder')}
                  className="w-full rounded-xl border border-white/10 bg-[#090c11] pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPoolRoleFilter('ALL')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                    poolRoleFilter === 'ALL'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#090c11] text-zinc-400 border-white/[0.06] hover:text-white'
                  }`}
                >
                  {t('counterPicks.poolAllRoles')}
                </button>
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setPoolRoleFilter(r.posKey)}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                      poolRoleFilter === r.posKey
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-[#090c11] text-zinc-400 border-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Image
                      src={getPositionIconUrl(r.posKey)}
                      alt={r.labelEn}
                      width={12}
                      height={12}
                      className="opacity-85"
                      unoptimized
                    />
                    <span>{isDe ? r.labelDe : r.labelEn}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 pr-1">
              {filteredPoolEditorChampions.map((c) => {
                const inPool = poolIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => togglePoolChampion(c.id)}
                    className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold border transition-all cursor-pointer ${
                      inPool
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40 shadow-sm'
                        : 'bg-[#090c11] text-zinc-300 border-white/[0.05] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <Image
                      src={getChampionIconUrl(c.key)}
                      alt={c.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-md object-cover shrink-0"
                      unoptimized
                    />
                    <span className="truncate flex-1">{c.name}</span>
                    {inPool && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar: Opponent Selector + Role Tabs + Tier Dropdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 shadow-xl">
        {/* Opponent Picker Dropdown */}
        <div className="lg:col-span-4 relative" ref={champDropdownRef}>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            {t('counterPicks.selectOpponent')}
          </label>
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setChampMenuOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-[#090c11] px-3.5 py-2.5 text-left hover:border-amber-500/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                {activeChamp ? (
                  <Image
                    src={getChampionIconUrl(activeChamp.key)}
                    alt={activeChamp.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg object-cover border border-white/10 shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 text-zinc-500 shrink-0">
                    <Crosshair className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {activeChamp
                      ? activeChamp.name
                      : isLoadingMeta
                      ? '...'
                      : t('counterPicks.selectOpponentPlaceholder')}
                  </div>
                  {activeChamp?.title && (
                    <div className="text-[11px] text-zinc-400 truncate">
                      {activeChamp.title}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedChampion && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClearChampion}
                    onKeyDown={(e) => e.key === 'Enter' && handleClearChampion(e as any)}
                    className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              </div>
            </button>
          </div>

          {champMenuOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-white/10 bg-[#0b0e14] p-3 shadow-2xl">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={champSearch}
                  onChange={(e) => setChampSearch(e.target.value)}
                  placeholder={t('counterPicks.searchChampion')}
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-black/50 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 pr-1">
                {filteredChampionPicker.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectChampion(c.key)}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      c.key.toLowerCase() === selectedChampion.toLowerCase()
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Image
                      src={getChampionIconUrl(c.key)}
                      alt={c.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-md object-cover shrink-0"
                      unoptimized
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Selector */}
        <div className="lg:col-span-5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            {t('counterPicks.roleLabel')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => {
              const isActive = (selectedRole || data?.role) === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setSelectedRole(r.key)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-[#090c11] text-zinc-400 border-white/[0.06] hover:text-white hover:border-white/20'
                  }`}
                >
                  <Image
                    src={getPositionIconUrl(r.posKey)}
                    alt={r.labelEn}
                    width={14}
                    height={14}
                    className="opacity-85"
                    unoptimized
                  />
                  <span>{isDe ? r.labelDe : r.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier Selector */}
        <div className="lg:col-span-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            {t('counterPicks.tierLabel')}
          </label>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-[#090c11] px-3.5 py-2.5 text-sm font-semibold text-white focus:border-amber-500/50 focus:outline-none cursor-pointer"
          >
            {TIER_ORDER.map((tierKey) => {
              const label = TIER_LABELS[tierKey];
              return (
                <option key={tierKey} value={tierKey}>
                  {isDe ? label?.de || tierKey : label?.en || tierKey}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Empty state when no opponent selected */}
      {!selectedChampion && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 px-6 py-14 text-center flex flex-col items-center gap-3 shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Crosshair className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-white">
            {t('counterPicks.emptyTitle')}
          </h2>
          <p className="text-sm text-zinc-400 max-w-md">
            {t('counterPicks.emptyDesc')}
          </p>
        </div>
      )}

      {/* PRIORITY 1: Personal Champion Pool Recommendations */}
      {selectedChampion && activeChamp && (
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/15 via-[#0c1017] to-[#0c1017] p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400 shrink-0" />
              <span>
                {t('counterPicks.poolRecTitle', { name: activeChamp.name })}
              </span>
            </h2>
            {poolIds.length > 0 && (
              <span className="text-xs font-semibold text-zinc-400">
                {ROLES.find((r) => r.key === (poolData?.role || selectedRole || data?.role))?.[
                  isDe ? 'labelDe' : 'labelEn'
                ] || ''}{' '}
                · {isDe ? TIER_LABELS[selectedTier]?.de : TIER_LABELS[selectedTier]?.en}
              </span>
            )}
          </div>

          {poolIds.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/35 p-4">
              <div>
                <div className="text-sm font-bold text-zinc-200">
                  {t('counterPicks.poolNoPoolTitle')}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {t('counterPicks.poolNoPoolDesc', { name: activeChamp.name })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPoolEditorOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('counterPicks.poolAddNow')}</span>
              </button>
            </div>
          ) : isLoadingPool ? (
            <div className="py-6 text-center text-sm text-zinc-400">
              {t('counterPicks.poolRecLoading')}
            </div>
          ) : poolData && poolData.recommendations.length > 0 ? (
            <>
              {!poolData.hasGoodMatchup && (
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    {t('counterPicks.poolNoGoodMatchup', { name: activeChamp.name })}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {poolData.recommendations.map((rec, idx) => {
                  const isTopPick = idx === 0 && rec.vsWr !== null && rec.vsWr >= 50;
                  return (
                    <div
                      key={rec.championId}
                      className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-2.5 ${
                        isTopPick
                          ? 'border-emerald-500/45 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                          : 'border-white/[0.08] bg-black/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Image
                            src={getChampionIconUrl(rec.key)}
                            alt={rec.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-xl object-cover border border-white/10 shrink-0"
                            unoptimized
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-extrabold text-white truncate">
                                {rec.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {rec.games !== null
                                ? `${rec.games.toLocaleString()} ${t('counterPicks.gamesLabel')}`
                                : t('counterPicks.poolNoMatchupData')}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-base font-black ${getWinrateColor(rec.vsWr)}`}>
                            {rec.vsWr !== null ? (
                              `${rec.vsWr.toFixed(2)}%`
                            ) : (
                              <span className="text-zinc-600 font-mono text-xs font-normal">
                                null
                              </span>
                            )}
                          </div>
                          {isTopPick && (
                            <span className="inline-block rounded-md bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 mt-0.5">
                              {t('counterPicks.poolBestPick')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
                        <span>
                          {t('counterPicks.poolChampWr')}:{' '}
                          <span className={`font-bold ${getWinrateColor(rec.championWinrate)}`}>
                            {rec.championWinrate !== null
                              ? `${rec.championWinrate.toFixed(2)}%`
                              : '—'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectChampion(rec.key)}
                          className="text-[11px] font-semibold text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          {t('counterPicks.inspectChampion')} →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* PRIORITY 2: General Counterpicks Section Header */}
      {selectedChampion && activeChamp && (
        <div className="flex items-center gap-3 pt-2">
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-300">
            {t('counterPicks.generalSectionTitle', { name: activeChamp.name })}
          </h2>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>
      )}

      {/* Champion Overall Stats Banner (Winrate, Pickrate, Banrate only) */}
      {selectedChampion && data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Winrate
            </div>
            <div className={`mt-1 text-2xl font-black ${getWinrateColor(data.stats.winrate)}`}>
              {data.stats.winrate !== null ? `${data.stats.winrate.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Pickrate
            </div>
            <div className="mt-1 text-2xl font-black text-sky-300">
              {data.stats.pickrate !== null ? `${data.stats.pickrate.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Banrate
            </div>
            <div className="mt-1 text-2xl font-black text-rose-300">
              {data.stats.banrate !== null ? `${data.stats.banrate.toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* No Data Yet Notice */}
      {selectedChampion && data && !data.hasData && !isLoadingData && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-200 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <span>{t('counterPicks.noDataNotice')}</span>
        </div>
      )}

      {/* Strongest vs & Countered By Highlight Cards */}
      {selectedChampion &&
        data &&
        (data.strongestCounters.length > 0 || data.weakestCounters.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strongest Against */}
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-[#0c1017] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-emerald-300 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    {t('counterPicks.strongAgainst', { name: data.champion.name })}
                  </span>
                </h3>
                <span className="text-[11px] font-semibold text-zinc-400">Top 6</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.strongestCounters.slice(0, 6).map((m: CounterPickMatchupEntry) => (
                  <button
                    key={m.enemyChampionId}
                    type="button"
                    onClick={() => handleSelectChampion(m.enemyKey)}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2.5 hover:border-emerald-500/40 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Image
                        src={getChampionIconUrl(m.enemyKey)}
                        alt={m.enemyName}
                        width={34}
                        height={34}
                        className="h-8 w-8 rounded-lg object-cover shrink-0"
                        unoptimized
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {m.enemyName}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {m.games?.toLocaleString()} {t('counterPicks.gamesLabel')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-emerald-400">
                        {m.vsWr?.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Countered By */}
            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/20 to-[#0c1017] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-rose-300 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  <span>
                    {t('counterPicks.counteredBy', { name: data.champion.name })}
                  </span>
                </h3>
                <span className="text-[11px] font-semibold text-zinc-400">Top 6</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.weakestCounters.slice(0, 6).map((m: CounterPickMatchupEntry) => (
                  <button
                    key={m.enemyChampionId}
                    type="button"
                    onClick={() => handleSelectChampion(m.enemyKey)}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2.5 hover:border-rose-500/40 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Image
                        src={getChampionIconUrl(m.enemyKey)}
                        alt={m.enemyName}
                        width={34}
                        height={34}
                        className="h-8 w-8 rounded-lg object-cover shrink-0"
                        unoptimized
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {m.enemyName}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {m.games?.toLocaleString()} {t('counterPicks.gamesLabel')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-rose-400">
                        {m.vsWr?.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* Full Matchup Table */}
      {selectedChampion && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 shadow-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {t('counterPicks.allMatchups', { count: displayedMatchups.length })}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setOnlyWithData((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                  onlyWithData
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/40 text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>{t('counterPicks.onlyWithData')}</span>
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={enemySearch}
                  onChange={(e) => setEnemySearch(e.target.value)}
                  placeholder={t('counterPicks.filterOpponent')}
                  className="rounded-xl border border-white/10 bg-black/50 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none w-48 sm:w-56"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-black/30 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('enemyName')}
                      className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                    >
                      <span>{t('counterPicks.colOpponent')}</span>
                      {renderSortIcon('enemyName')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('vsWr')}
                      className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                    >
                      <span>{t('counterPicks.colWinrateVs')}</span>
                      {renderSortIcon('vsWr')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('games')}
                      className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                    >
                      <span>{t('counterPicks.colGames')}</span>
                      {renderSortIcon('games')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-zinc-400">
                      {t('counterPicks.loadingData')}
                    </td>
                  </tr>
                ) : displayedMatchups.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-zinc-400">
                      {t('counterPicks.noMatchupsFound')}
                    </td>
                  </tr>
                ) : (
                  displayedMatchups.map((m) => (
                    <tr
                      key={m.enemyChampionId}
                      onClick={() => handleSelectChampion(m.enemyKey)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={getChampionIconUrl(m.enemyKey)}
                            alt={m.enemyName}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-lg object-cover border border-white/10 shrink-0"
                            unoptimized
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{m.enemyName}</div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {m.enemyTitle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-2.5 px-4 text-right font-black ${getWinrateColor(m.vsWr)}`}>
                        {m.vsWr !== null ? (
                          `${m.vsWr.toFixed(2)}%`
                        ) : (
                          <span className="text-zinc-600 font-mono text-xs font-normal">null</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400 font-medium">
                        {m.games !== null ? (
                          m.games.toLocaleString()
                        ) : (
                          <span className="text-zinc-600 font-mono text-xs font-normal">null</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
