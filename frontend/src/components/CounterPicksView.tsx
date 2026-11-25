'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from '@/lib/api';
import {
  CounterPickMetaResponse,
  CounterPickChampionResponse,
  CounterPickMatchupEntry,
} from '@/types';

type SortField = 'enemyName' | 'vsWr' | 'd1' | 'd2' | 'allWr' | 'games';

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

function formatDelta(val: number | null): string {
  if (val === null) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function getWinrateColor(wr: number | null): string {
  if (wr === null) return 'text-zinc-500';
  if (wr >= 53) return 'text-emerald-400';
  if (wr >= 50.5) return 'text-emerald-300';
  if (wr <= 47) return 'text-rose-400';
  if (wr <= 49.5) return 'text-rose-300';
  return 'text-zinc-200';
}

function getDeltaColor(val: number | null): string {
  if (val === null) return 'text-zinc-500';
  if (val > 0.5) return 'text-emerald-400';
  if (val < -0.5) return 'text-rose-400';
  return 'text-zinc-300';
}

export default function CounterPicksView() {
  const { locale } = useTranslation();
  const isDe = locale === 'de';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const [champSearch, setChampSearch] = useState('');
  const [champMenuOpen, setChampMenuOpen] = useState(false);
  const [enemySearch, setEnemySearch] = useState('');
  const [onlyWithData, setOnlyWithData] = useState(false);
  const [sortField, setSortField] = useState<SortField>('vsWr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [data, setData] = useState<CounterPickChampionResponse | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load metadata (champions from Champion table, patches, tiers, roles)
  useEffect(() => {
    setIsLoadingMeta(true);
    fetchCounterPickMeta(locale)
      .then((m) => {
        if (!m) return;
        setMeta(m);
        if (!selectedChampion && m.champions.length > 0) {
          const briar = m.champions.find((c) => c.key.toLowerCase() === 'briar');
          setSelectedChampion((briar || m.champions[0]).key);
        }
      })
      .finally(() => setIsLoadingMeta(false));
  }, [locale]);

  // Keep URL query synchronized
  useEffect(() => {
    if (!selectedChampion) return;
    const params = new URLSearchParams();
    params.set('champion', selectedChampion);
    params.set('tier', selectedTier);
    if (selectedRole) params.set('role', selectedRole);
    if (selectedSlot === 'previous') params.set('slot', 'previous');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedChampion, selectedTier, selectedRole, selectedSlot, pathname, router]);

  // Load CounterPicks for selected champion + tier + role + slot
  useEffect(() => {
    if (!selectedChampion) return;
    setIsLoadingData(true);
    fetchChampionCounterPicks({
      champion: selectedChampion,
      tier: selectedTier,
      role: selectedRole || undefined,
      slot: selectedSlot,
      locale,
    })
      .then((res) => {
        setData(res);
        if (res && !selectedRole) {
          setSelectedRole(res.role);
        }
      })
      .finally(() => setIsLoadingData(false));
  }, [selectedChampion, selectedTier, selectedRole, selectedSlot, locale]);

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

      // Always keep null entries at the bottom regardless of sort direction
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

  const activeChamp = data?.champion || meta?.champions.find((c) => c.key === selectedChampion);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: 'CounterPicks' }]} />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
            <Crosshair className="h-3.5 w-3.5" />
            <span>
              {isDe
                ? `Patch ${data?.patch || currentPatchLabel} • Lolalytics CounterPicks`
                : `Patch ${data?.patch || currentPatchLabel} • Lolalytics CounterPicks`}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {isDe ? 'Champion CounterPicks' : 'Champion CounterPicks'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-2xl">
            {isDe
              ? 'Stündlich aktualisierte Matchup-Daten pro Tier, Rolle und Patch gegen jeden Champion aus der Datenbank.'
              : 'Hourly updated matchup analytics per tier, role, and patch against every champion in the database.'}
          </p>
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
              {isDe ? 'Aktueller Patch' : 'Current Patch'} ({currentPatchLabel})
            </span>
          </button>

          <button
            type="button"
            disabled={!previousAvailable}
            onClick={() => previousAvailable && setSelectedSlot('previous')}
            title={
              previousAvailable
                ? `Patch ${previousPatchLabel}`
                : isDe
                ? 'Wird automatisch befüllt, sobald der nächste Patch erscheint'
                : 'Automatically populated once the next patch releases'
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
              {isDe ? 'Vorheriger Patch' : 'Previous Patch'}
              {previousPatchLabel ? ` (${previousPatchLabel})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Champion Selector + Role Tabs + Tier Dropdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 shadow-xl">
        {/* Champion Picker Dropdown */}
        <div className="lg:col-span-4 relative">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            {isDe ? 'Champion auswählen' : 'Select Champion'}
          </label>
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
                <div className="h-8 w-8 rounded-lg bg-zinc-800 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {activeChamp?.name || (isLoadingMeta ? '...' : 'Champion')}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {activeChamp?.title || ''}
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
          </button>

          {champMenuOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-white/10 bg-[#0b0e14] p-3 shadow-2xl">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={champSearch}
                  onChange={(e) => setChampSearch(e.target.value)}
                  placeholder={isDe ? 'Champion suchen...' : 'Search champion...'}
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
            {isDe ? 'Rolle / Lane' : 'Role / Lane'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => {
              const shareObj = data?.roleShares?.find((s) => s.role === r.key);
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
                  {shareObj?.roleShare !== null && shareObj?.roleShare !== undefined && (
                    <span className="text-[10px] text-zinc-500 font-semibold">
                      {shareObj.roleShare.toFixed(0)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier Selector */}
        <div className="lg:col-span-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            {isDe ? 'Rang / Tier' : 'Rank / Tier'}
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

      {/* Champion Overall Stats Banner */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {isDe ? 'Tier Ø-WR' : 'Tier Avg WR'}
            </div>
            <div className="mt-1 text-2xl font-black text-zinc-200">
              {data.stats.avgWinrate !== null ? `${data.stats.avgWinrate.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {isDe ? 'Rollen-Anteil' : 'Role Share'}
            </div>
            <div className="mt-1 text-2xl font-black text-amber-300">
              {data.stats.roleShare !== null ? `${data.stats.roleShare.toFixed(1)}%` : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {isDe ? 'Matchups mit Daten' : 'Matchups w/ Data'}
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              {data.stats.totalMatchupsWithData}{' '}
              <span className="text-sm font-semibold text-zinc-500">
                / {data.stats.totalChampions}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* No Data Yet Notice */}
      {data && !data.hasData && !isLoadingData && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-200 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <span>
            {isDe
              ? 'Für diese Kombination (Champion / Tier / Rolle / Patch) liegen noch keine gescrapten Daten vor. Der stündliche CounterPick-Worker befüllt die Tabelle automatisch.'
              : 'No scraped data available for this combination yet. The hourly CounterPick worker populates the table automatically.'}
          </span>
        </div>
      )}

      {/* Strongest vs & Countered By Highlight Cards */}
      {data && (data.strongestCounters.length > 0 || data.weakestCounters.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strongest Against */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-[#0c1017] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-emerald-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {isDe
                    ? `${data.champion.name} ist stark gegen`
                    : `${data.champion.name} is Strong Against`}
                </span>
              </h2>
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
                      <div className="text-xs font-bold text-white truncate">{m.enemyName}</div>
                      <div className="text-[10px] text-zinc-400">
                        {m.games?.toLocaleString()} {isDe ? 'Spiele' : 'Games'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-emerald-400">
                      {m.vsWr?.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-zinc-400">Δ2 {formatDelta(m.d2)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Countered By */}
          <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/20 to-[#0c1017] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-rose-300 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                <span>
                  {isDe
                    ? `${data.champion.name} wird gecountert von`
                    : `${data.champion.name} is Countered By`}
                </span>
              </h2>
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
                      <div className="text-xs font-bold text-white truncate">{m.enemyName}</div>
                      <div className="text-[10px] text-zinc-400">
                        {m.games?.toLocaleString()} {isDe ? 'Spiele' : 'Games'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-rose-400">
                      {m.vsWr?.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-zinc-400">Δ2 {formatDelta(m.d2)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Matchup Table (Every Champion from Champion Table) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {isDe
                ? `Alle Matchups (${displayedMatchups.length} Champions)`
                : `All Matchups (${displayedMatchups.length} Champions)`}
            </h2>
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
              <span>
                {isDe ? 'Nur Matchups mit Daten' : 'Only matchups with data'}
              </span>
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={enemySearch}
                onChange={(e) => setEnemySearch(e.target.value)}
                placeholder={isDe ? 'Gegner filtern...' : 'Filter opponent...'}
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
                    <span>{isDe ? 'Gegner-Champion' : 'Opponent Champion'}</span>
                    {renderSortIcon('enemyName')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('vsWr')}
                    className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                  >
                    <span>{isDe ? 'Winrate vs' : 'Winrate vs'}</span>
                    {renderSortIcon('vsWr')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('d1')}
                    className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                  >
                    <span>Δ1</span>
                    {renderSortIcon('d1')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('d2')}
                    className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                  >
                    <span>Δ2</span>
                    {renderSortIcon('d2')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('allWr')}
                    className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                  >
                    <span>{isDe ? 'Ø Gegner WR' : 'Avg Enemy WR'}</span>
                    {renderSortIcon('allWr')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('games')}
                    className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                  >
                    <span>{isDe ? 'Spiele' : 'Games'}</span>
                    {renderSortIcon('games')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-sm">
              {isLoadingData ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    {isDe ? 'Lade CounterPick-Daten...' : 'Loading CounterPick data...'}
                  </td>
                </tr>
              ) : displayedMatchups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    {isDe ? 'Keine Matchups gefunden.' : 'No matchups found.'}
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
                          <div className="text-[11px] text-zinc-500 truncate">{m.enemyTitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`py-2.5 px-4 text-right font-black ${getWinrateColor(m.vsWr)}`}>
                      {m.vsWr !== null ? `${m.vsWr.toFixed(2)}%` : <span className="text-zinc-600 font-mono text-xs font-normal">null</span>}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-semibold ${getDeltaColor(m.d1)}`}>
                      {m.d1 !== null ? formatDelta(m.d1) : <span className="text-zinc-600 font-mono text-xs font-normal">null</span>}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-semibold ${getDeltaColor(m.d2)}`}>
                      {m.d2 !== null ? formatDelta(m.d2) : <span className="text-zinc-600 font-mono text-xs font-normal">null</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-300 font-medium">
                      {m.allWr !== null ? `${m.allWr.toFixed(2)}%` : <span className="text-zinc-600 font-mono text-xs font-normal">null</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-400 font-medium">
                      {m.games !== null ? m.games.toLocaleString() : <span className="text-zinc-600 font-mono text-xs font-normal">null</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
