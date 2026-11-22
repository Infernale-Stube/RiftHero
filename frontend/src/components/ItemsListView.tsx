'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Shield,
  Swords,
  Wand2,
  Crosshair,
  HeartHandshake,
  Skull,
  Layers,
  RotateCcw,
  X,
  Footprints,
  Package,
  Coins,
  MapPin,
  SlidersHorizontal,
  ArrowUpRight,
  GitFork,
  Info,
  Sparkles,
  Zap,
  Clock,
  Flame,
  Droplet,
  ShieldAlert,
  ShieldCheck,
  HeartPulse,
  Anchor,
  Waves,
  LayoutGrid,
  ChevronRight,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  getMajorMinorPatch,
  getDDragonVersion,
  getItemIconUrl,
  fetchDDragonItemsList,
} from '@/lib/ddragon';
import { fetchItemsRosterApi } from '@/lib/api';
import { ItemRosterItem } from '@/types';

type RoleFilter = 'All' | 'Fighter' | 'Marksman' | 'Assassin' | 'Mage' | 'Tank' | 'Support';
type MapFilter = '11' | '12' | '30' | 'ALL';
type SortOption = 'gold-desc' | 'gold-asc' | 'name-asc' | 'name-desc';

interface RoleOption {
  key: RoleFilter;
  labelKey: string;
  fallbackLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_OPTIONS: RoleOption[] = [
  { key: 'All', labelKey: 'itemsWiki.roleAll', fallbackLabel: 'Alle Rollen', icon: LayoutGrid },
  { key: 'Fighter', labelKey: 'itemsWiki.roleFighter', fallbackLabel: 'Kämpfer', icon: Swords },
  { key: 'Marksman', labelKey: 'itemsWiki.roleMarksman', fallbackLabel: 'Schützen', icon: Crosshair },
  { key: 'Assassin', labelKey: 'itemsWiki.roleAssassin', fallbackLabel: 'Assassinen', icon: Skull },
  { key: 'Mage', labelKey: 'itemsWiki.roleMage', fallbackLabel: 'Magier', icon: Wand2 },
  { key: 'Tank', labelKey: 'itemsWiki.roleTank', fallbackLabel: 'Tanks', icon: Shield },
  { key: 'Support', labelKey: 'itemsWiki.roleSupport', fallbackLabel: 'Unterstützer', icon: HeartHandshake },
];

interface StatDefinition {
  id: string;
  labelDe: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  tagMatches?: string[];
  rawStatKeys?: string[];
}

interface StatGroup {
  labelDe: string;
  labelEn: string;
  stats: StatDefinition[];
}

const STAT_GROUPS: StatGroup[] = [
  {
    labelDe: 'Angriff',
    labelEn: 'Attack',
    stats: [
      {
        id: 'Attack Damage',
        labelDe: 'Angriffsschaden',
        labelEn: 'Attack Damage',
        icon: Swords,
        color: '#f97316',
        tagMatches: ['Damage'],
        rawStatKeys: ['FlatPhysicalDamageMod'],
      },
      {
        id: 'Attack Speed',
        labelDe: 'Angriffstempo',
        labelEn: 'Attack Speed',
        icon: Zap,
        color: '#fb923c',
        tagMatches: ['AttackSpeed'],
        rawStatKeys: ['PercentAttackSpeedMod'],
      },
      {
        id: 'Critical Strike Chance',
        labelDe: 'Krit. Trefferchance',
        labelEn: 'Critical Strike',
        icon: Crosshair,
        color: '#f43f5e',
        tagMatches: ['CriticalStrike'],
        rawStatKeys: ['FlatCritChanceMod'],
      },
      {
        id: 'Lethality',
        labelDe: 'Tödlichkeitsfaktor',
        labelEn: 'Lethality',
        icon: Skull,
        color: '#ef4444',
        tagMatches: ['ArmorPenetration'],
        rawStatKeys: [],
      },
      {
        id: 'Life Steal',
        labelDe: 'Lebensraub',
        labelEn: 'Life Steal',
        icon: Flame,
        color: '#f87171',
        tagMatches: ['LifeSteal'],
        rawStatKeys: ['PercentLifeStealMod'],
      },
    ],
  },
  {
    labelDe: 'Magie',
    labelEn: 'Magic',
    stats: [
      {
        id: 'Ability Power',
        labelDe: 'Fähigkeitsstärke',
        labelEn: 'Ability Power',
        icon: Wand2,
        color: '#a855f7',
        tagMatches: ['SpellDamage'],
        rawStatKeys: ['FlatMagicDamageMod'],
      },
      {
        id: 'Ability Haste',
        labelDe: 'Fähigkeitstempo',
        labelEn: 'Ability Haste',
        icon: Clock,
        color: '#818cf8',
        tagMatches: ['CooldownReduction'],
        rawStatKeys: ['FlatAbilityHaste'],
      },
      {
        id: 'Magic Penetration',
        labelDe: 'Magiedurchdringung',
        labelEn: 'Magic Pen',
        icon: Sparkles,
        color: '#38bdf8',
        tagMatches: ['MagicPenetration'],
        rawStatKeys: [],
      },
      {
        id: 'Omnivamp',
        labelDe: 'Omnivampirismus',
        labelEn: 'Omnivamp',
        icon: Flame,
        color: '#ec4899',
        tagMatches: ['SpellVamp'],
        rawStatKeys: [],
      },
      {
        id: 'Mana',
        labelDe: 'Mana',
        labelEn: 'Mana',
        icon: Droplet,
        color: '#60a5fa',
        tagMatches: ['Mana'],
        rawStatKeys: ['FlatMPPoolMod'],
      },
    ],
  },
  {
    labelDe: 'Verteidigung',
    labelEn: 'Defense',
    stats: [
      {
        id: 'Health',
        labelDe: 'Leben',
        labelEn: 'Health',
        icon: Shield,
        color: '#4ade80',
        tagMatches: ['Health'],
        rawStatKeys: ['FlatHPPoolMod'],
      },
      {
        id: 'Armor',
        labelDe: 'Rüstung',
        labelEn: 'Armor',
        icon: ShieldAlert,
        color: '#facc15',
        tagMatches: ['Armor'],
        rawStatKeys: ['FlatArmorMod'],
      },
      {
        id: 'Magic Resist',
        labelDe: 'Magieresistenz',
        labelEn: 'Magic Resist',
        icon: ShieldCheck,
        color: '#c084fc',
        tagMatches: ['SpellBlock'],
        rawStatKeys: ['FlatSpellBlockMod'],
      },
      {
        id: 'Health Regen',
        labelDe: 'Lebensregeneration',
        labelEn: 'Health Regen',
        icon: HeartPulse,
        color: '#86efac',
        tagMatches: ['HealthRegen'],
        rawStatKeys: ['FlatHPRegenMod'],
      },
      {
        id: 'Tenacity',
        labelDe: 'Zähigkeit',
        labelEn: 'Tenacity',
        icon: Anchor,
        color: '#2dd4bf',
        tagMatches: ['Tenacity'],
        rawStatKeys: [],
      },
    ],
  },
  {
    labelDe: 'Nützlichkeit',
    labelEn: 'Utility',
    stats: [
      {
        id: 'Move Speed',
        labelDe: 'Lauftempo',
        labelEn: 'Move Speed',
        icon: Footprints,
        color: '#a3e635',
        tagMatches: ['Boots', 'NonbootsMovement'],
        rawStatKeys: ['FlatMovementSpeedMod', 'PercentMovementSpeedMod'],
      },
      {
        id: 'Mana Regen',
        labelDe: 'Manaregeneration',
        labelEn: 'Mana Regen',
        icon: Waves,
        color: '#38bdf8',
        tagMatches: ['ManaRegen'],
        rawStatKeys: [],
      },
    ],
  },
];

// Gold value map per stat for Gold Efficiency calculation
const STAT_GOLD_VALUE: Record<string, number> = {
  FlatPhysicalDamageMod: 35, // 35g / 1 AD
  FlatMagicDamageMod: 20, // 20g / 1 AP
  FlatHPPoolMod: 2.67, // 400g / 150 HP
  FlatArmorMod: 20, // 300g / 15 Armor
  FlatSpellBlockMod: 20, // 400g / 20 MR
  FlatMPPoolMod: 1.4, // 350g / 250 Mana
  PercentAttackSpeedMod: 25, // 300g / 12% AS
  FlatCritChanceMod: 40, // 600g / 15% Crit
  FlatMovementSpeedMod: 12, // 300g / 25 MS
  PercentLifeStealMod: 25, // Vampiric Scepter
  FlatHPRegenMod: 36, // Rejuvenation Bead
  FlatAbilityHaste: 50, // Glowing Mote: 250g / 5 AH
};

/**
 * Calculates Gold Efficiency in percent
 */
function calculateGoldEfficiency(item: ItemRosterItem): number | null {
  if (!item.gold.purchasable || item.gold.total <= 0) return null;
  if (item.tags.includes('Consumable') || item.tags.includes('Trinket')) return null;

  let totalStatWorth = 0;
  let hasValidStat = false;

  if (item.stats) {
    for (const [key, val] of Object.entries(item.stats)) {
      const rate = STAT_GOLD_VALUE[key];
      if (rate && val && val > 0) {
        totalStatWorth += (val < 1 && (key.includes('Percent') || key.includes('Crit')) ? val * 100 : val) * rate;
        hasValidStat = true;
      }
    }
  }

  // Also check parsed formatted stats
  if (!hasValidStat && item.formattedStats) {
    for (const st of item.formattedStats) {
      const numMatch = st.value.match(/([0-9]+)/);
      if (numMatch) {
        const val = parseInt(numMatch[1], 10);
        const nameLower = st.name.toLowerCase();
        if (nameLower.includes('angriffsschaden') || nameLower.includes('attack damage')) {
          totalStatWorth += val * 35;
          hasValidStat = true;
        } else if (nameLower.includes('fähigkeit') || nameLower.includes('ability power')) {
          totalStatWorth += val * 20;
          hasValidStat = true;
        } else if (nameLower.includes('leben') || nameLower.includes('health')) {
          totalStatWorth += val * 2.67;
          hasValidStat = true;
        } else if (nameLower.includes('rüstung') || nameLower.includes('armor')) {
          totalStatWorth += val * 20;
          hasValidStat = true;
        } else if (nameLower.includes('magieresistenz') || nameLower.includes('magic resist')) {
          totalStatWorth += val * 20;
          hasValidStat = true;
        } else if (nameLower.includes('tempo') || nameLower.includes('speed')) {
          totalStatWorth += val * 25;
          hasValidStat = true;
        }
      }
    }
  }

  if (!hasValidStat || totalStatWorth <= 0) return null;
  return Math.round((totalStatWorth / item.gold.total) * 100);
}

/**
 * Transforms DDragon XML-style tags into styled HTML
 */
function renderItemDescription(rawDesc: string): string {
  if (!rawDesc) return '';
  return rawDesc
    .replace(/<mainText>/gi, '<div class="space-y-2">')
    .replace(/<\/mainText>/gi, '</div>')
    .replace(/<stats>/gi, '<div class="py-2.5 my-2 border-y border-white/[0.08] text-xs text-zinc-200 font-medium space-y-1">')
    .replace(/<\/stats>/gi, '</div>')
    .replace(/<attention>/gi, '<span class="text-amber-300 font-bold">')
    .replace(/<\/attention>/gi, '</span>')
    .replace(/<passive>/gi, '<span class="inline-flex items-center gap-1 rounded bg-amber-500/15 text-amber-300 font-bold px-1.5 py-0.5 text-[11px] mr-1.5 border border-amber-500/30">PASSIV: ')
    .replace(/<\/passive>/gi, '</span>')
    .replace(/<active>/gi, '<span class="inline-flex items-center gap-1 rounded bg-cyan-500/15 text-cyan-300 font-bold px-1.5 py-0.5 text-[11px] mr-1.5 border border-cyan-500/30">AKTIV: ')
    .replace(/<\/active>/gi, '</span>')
    .replace(/<physicalDamage>/gi, '<span class="text-orange-400 font-semibold">')
    .replace(/<\/physicalDamage>/gi, '</span>')
    .replace(/<magicDamage>/gi, '<span class="text-sky-400 font-semibold">')
    .replace(/<\/magicDamage>/gi, '</span>')
    .replace(/<trueDamage>/gi, '<span class="text-zinc-100 font-semibold">')
    .replace(/<\/trueDamage>/gi, '</span>')
    .replace(/<speed>/gi, '<span class="text-lime-400 font-semibold">')
    .replace(/<\/speed>/gi, '</span>')
    .replace(/<shield>/gi, '<span class="text-yellow-400 font-semibold">')
    .replace(/<\/shield>/gi, '</span>')
    .replace(/<healing>/gi, '<span class="text-emerald-400 font-semibold">')
    .replace(/<\/healing>/gi, '</span>')
    .replace(/<rules>/gi, '<span class="text-zinc-400 text-[11px] italic block mt-1">')
    .replace(/<\/rules>/gi, '</span>')
    .replace(/<scaleAP>/gi, '<span class="text-cyan-400 font-medium">')
    .replace(/<\/scaleAP>/gi, '</span>')
    .replace(/<scaleAD>/gi, '<span class="text-orange-400 font-medium">')
    .replace(/<\/scaleAD>/gi, '</span>')
    .replace(/<scaleHealth>/gi, '<span class="text-emerald-400 font-medium">')
    .replace(/<\/scaleHealth>/gi, '</span>')
    .replace(/<status>/gi, '<span class="text-purple-400 font-medium">')
    .replace(/<\/status>/gi, '</span>')
    .replace(/<keywordMajor>/gi, '<span class="text-amber-200 font-bold">')
    .replace(/<\/keywordMajor>/gi, '</span>')
    .replace(/<lifeSteal>/gi, '<span class="text-rose-400 font-medium">')
    .replace(/<\/lifeSteal>/gi, '</span>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Extracts raw stats into formatted name/value pairs if formattedStats is empty
 */
function parseStatsFromItem(item: ItemRosterItem, isDe = true): { name: string; value: string; color: string }[] {
  if (item.formattedStats && item.formattedStats.length > 0) {
    return item.formattedStats.map((st) => ({
      name: st.name,
      value: st.value,
      color: st.color || '#f59e0b',
    }));
  }

  const list: { name: string; value: string; color: string }[] = [];
  const statMap: Record<string, { de: string; en: string; color: string; isPercent?: boolean }> = {
    FlatPhysicalDamageMod: { de: 'Angriffsschaden', en: 'Attack Damage', color: '#f97316' },
    FlatMagicDamageMod: { de: 'Fähigkeitsstärke', en: 'Ability Power', color: '#38bdf8' },
    FlatArmorMod: { de: 'Rüstung', en: 'Armor', color: '#facc15' },
    FlatSpellBlockMod: { de: 'Magieresistenz', en: 'Magic Resist', color: '#c084fc' },
    FlatHPPoolMod: { de: 'Leben', en: 'Health', color: '#4ade80' },
    FlatMPPoolMod: { de: 'Mana', en: 'Mana', color: '#60a5fa' },
    PercentAttackSpeedMod: { de: 'Angriffstempo', en: 'Attack Speed', color: '#fb923c', isPercent: true },
    FlatCritChanceMod: { de: 'Krit. Trefferchance', en: 'Critical Strike Chance', color: '#f43f5e', isPercent: true },
    FlatMovementSpeedMod: { de: 'Lauftempo', en: 'Move Speed', color: '#a3e635' },
    PercentMovementSpeedMod: { de: 'Lauftempo', en: 'Move Speed', color: '#a3e635', isPercent: true },
    FlatHPRegenMod: { de: 'Lebensregeneration', en: 'Health Regen', color: '#86efac' },
    PercentLifeStealMod: { de: 'Lebensraub', en: 'Life Steal', color: '#f87171', isPercent: true },
    FlatAbilityHaste: { de: 'Fähigkeitstempo', en: 'Ability Haste', color: '#818cf8' },
  };

  if (item.stats) {
    for (const [k, v] of Object.entries(item.stats)) {
      if (v === undefined || v === null || v === 0) continue;
      const def = statMap[k];
      if (def) {
        const valStr = def.isPercent
          ? `${v > 0 ? '+' : ''}${Math.round(v * (v < 1 ? 100 : 1))}%`
          : `${v > 0 ? '+' : ''}${v}`;
        list.push({
          name: isDe ? def.de : def.en,
          value: valStr,
          color: def.color,
        });
      }
    }
  }

  return list;
}

// 6 LoLDB Tier Section Ordering
const TIER_ORDER: ('legendary' | 'epic' | 'basic' | 'starter' | 'boots' | 'consumable')[] = [
  'legendary',
  'epic',
  'basic',
  'starter',
  'boots',
  'consumable',
];

export default function ItemsListView() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState<ItemRosterItem[]>([]);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('All');
  const [selectedStats, setSelectedStats] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapFilter>('11'); // Summoner's Rift default
  const [sortBy, setSortBy] = useState<SortOption>('gold-desc');
  const [onlyPurchasable, setOnlyPurchasable] = useState(true);

  // Active / Selected Item for Detail Inspector
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Mobile Stat Filter Drawer toggle
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);

  // Hover Tooltip State
  const [hoveredItem, setHoveredItem] = useState<{
    item: ItemRosterItem;
    x: number;
    y: number;
  } | null>(null);

  const isDe = locale !== 'en';
  const patchString = getMajorMinorPatch(version);

  // Quick lookup map
  const itemMap = useMemo(() => {
    const map = new Map<string, ItemRosterItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  // Load items data with DDragon fallback
  useEffect(() => {
    setIsLoading(true);
    fetchItemsRosterApi(locale)
      .then((res) => {
        if (res && res.items && res.items.length > 0) {
          setItems(res.items);
          if (res.version) setVersion(res.version);
          return;
        }
        return fetchDDragonItemsList(locale).then((fb) => {
          setItems(fb.items);
          if (fb.version) setVersion(fb.version);
        });
      })
      .catch(() => {
        return fetchDDragonItemsList(locale).then((fb) => {
          setItems(fb.items);
          if (fb.version) setVersion(fb.version);
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [locale]);

  // Read URL query params on mount
  useEffect(() => {
    const q = searchParams.get('search');
    const r = searchParams.get('role');
    const itId = searchParams.get('item');
    const st = searchParams.getAll('stat');

    if (q) setSearchQuery(q);
    if (r && ['All', 'Fighter', 'Marksman', 'Assassin', 'Mage', 'Tank', 'Support'].includes(r)) {
      setSelectedRole(r as RoleFilter);
    }
    if (st && st.length > 0) {
      setSelectedStats(st);
    }
    if (itId) {
      setActiveItemId(itId);
    }
  }, [searchParams]);

  // Sync activeItemId when items load
  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    return itemMap.get(activeItemId) || null;
  }, [activeItemId, itemMap]);

  // Toggle stat in multi-select
  const handleToggleStat = useCallback((statId: string) => {
    setSelectedStats((prev) =>
      prev.includes(statId) ? prev.filter((s) => s !== statId) : [...prev, statId]
    );
  }, []);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedRole('All');
    setSelectedStats([]);
    setSelectedMap('11');
    setSortBy('gold-desc');
    setOnlyPurchasable(true);
    setActiveItemId(null);
  }, []);

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedRole !== 'All' ||
    selectedStats.length > 0 ||
    selectedMap !== '11' ||
    sortBy !== 'gold-desc' ||
    !onlyPurchasable;

  // Check if an item provides a specific stat definition
  const itemMatchesStat = useCallback((item: ItemRosterItem, statDef: StatDefinition): boolean => {
    // Check tags
    if (statDef.tagMatches && statDef.tagMatches.some((t) => item.tags.some((it) => it.toLowerCase() === t.toLowerCase()))) {
      return true;
    }
    // Check rawStats
    if (statDef.rawStatKeys && statDef.rawStatKeys.some((k) => item.stats && item.stats[k])) {
      return true;
    }
    // Check description or plaintext
    const fullText = (item.description + ' ' + (item.plaintext || '')).toLowerCase();
    if (fullText.includes(statDef.id.toLowerCase())) {
      return true;
    }
    if (statDef.id === 'Lethality' && (fullText.includes('tödlichkeitsfaktor') || fullText.includes('lethality') || fullText.includes('rüstungsdurchdringung'))) {
      return true;
    }
    if (statDef.id === 'Magic Penetration' && (fullText.includes('magiedurchdringung') || fullText.includes('magic penetration'))) {
      return true;
    }
    if (statDef.id === 'Omnivamp' && (fullText.includes('omnivamp') || fullText.includes('omnivampirismus'))) {
      return true;
    }
    if (statDef.id === 'Tenacity' && (fullText.includes('zähigkeit') || fullText.includes('tenacity'))) {
      return true;
    }
    return false;
  }, []);

  // Filter & Sort items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = items.filter((item) => {
      // 1. Purchasable filter
      if (onlyPurchasable && !item.inStore) {
        return false;
      }

      // 2. Map filter
      if (selectedMap !== 'ALL') {
        if (item.maps && item.maps[selectedMap] === false) {
          return false;
        }
      }

      // 3. Search query
      if (q) {
        const nameMatch = item.name.toLowerCase().includes(q);
        const colloqMatch = (item.colloq || '').toLowerCase().includes(q);
        const plaintextMatch = (item.plaintext || '').toLowerCase().includes(q);
        const tagMatch = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!nameMatch && !colloqMatch && !plaintextMatch && !tagMatch) {
          return false;
        }
      }

      // 4. Role filter (LoLDB Algorithm)
      if (selectedRole !== 'All') {
        const tags = item.tags || [];
        const stats = item.stats || {};
        const fullDesc = (item.description || '').toLowerCase();

        const isMage =
          tags.some((t) => ['SpellDamage', 'Mana'].includes(t)) ||
          Boolean(stats.FlatMagicDamageMod) ||
          fullDesc.includes('fähigkeitsstärke') ||
          fullDesc.includes('ability power');

        const isMarksman =
          tags.some((t) => ['CriticalStrike', 'AttackSpeed'].includes(t)) ||
          Boolean(stats.FlatCritChanceMod) ||
          Boolean(stats.PercentAttackSpeedMod) ||
          Boolean(stats.PercentLifeStealMod);

        const isAssassin =
          fullDesc.includes('lethality') ||
          fullDesc.includes('tödlichkeitsfaktor') ||
          tags.some((t) => ['ArmorPenetration'].includes(t));

        const isTank =
          tags.some((t) => ['Health', 'Armor', 'SpellBlock'].includes(t)) ||
          Boolean(stats.FlatArmorMod) ||
          Boolean(stats.FlatSpellBlockMod) ||
          Boolean(stats.FlatHPPoolMod);

        const isSupport =
          tags.some((t) => ['SpellVamp', 'ManaRegen', 'HealthRegen', 'GoldPer', 'Vision'].includes(t)) ||
          fullDesc.includes('gold') ||
          fullDesc.includes('heilen und schild') ||
          fullDesc.includes('heal and shield');

        const isFighter =
          tags.some((t) => ['Damage', 'Health'].includes(t)) && !isMage && !isAssassin;

        const roles: RoleFilter[] = [];
        if (isMage) roles.push('Mage');
        if (isMarksman) roles.push('Marksman');
        if (isAssassin) roles.push('Assassin');
        if (isFighter) roles.push('Fighter');
        if (isTank) roles.push('Tank');
        if (isSupport) roles.push('Support');

        if (!roles.includes(selectedRole)) {
          return false;
        }
      }

      // 5. Stat filters (LoLDB: Any selected stat match)
      if (selectedStats.length > 0) {
        const matchesAnyStat = selectedStats.some((statId) => {
          for (const grp of STAT_GROUPS) {
            const def = grp.stats.find((s) => s.id === statId);
            if (def && itemMatchesStat(item, def)) {
              return true;
            }
          }
          return false;
        });

        if (!matchesAnyStat) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'gold-desc':
          return b.gold.total - a.gold.total || a.name.localeCompare(b.name);
        case 'gold-asc':
          return a.gold.total - b.gold.total || a.name.localeCompare(b.name);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return list;
  }, [items, searchQuery, selectedRole, selectedStats, selectedMap, sortBy, onlyPurchasable, itemMatchesStat]);

  // Group items by Tier
  const tierBuckets = useMemo(() => {
    const buckets: Record<string, ItemRosterItem[]> = {
      legendary: [],
      epic: [],
      basic: [],
      starter: [],
      boots: [],
      consumable: [],
    };

    for (const item of filteredItems) {
      const t = item.tier || 'basic';
      if (buckets[t]) {
        buckets[t].push(item);
      } else {
        buckets.basic.push(item);
      }
    }

    return buckets;
  }, [filteredItems]);

  // Close active item on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveItemId(null);
        setHoveredItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper for Tier section title
  const getTierSectionTitle = (tier: string) => {
    switch (tier) {
      case 'legendary':
        return t('itemsWiki.tierLegendaries') || 'LEGENDÄRE GEGENSTÄNDE';
      case 'epic':
        return t('itemsWiki.tierEpics') || 'EPISCHE GEGENSTÄNDE';
      case 'basic':
        return t('itemsWiki.tierBasics') || 'BASISGEGENSTÄNDE';
      case 'starter':
        return t('itemsWiki.tierStarters') || 'STARTGEGENSTÄNDE';
      case 'boots':
        return t('itemsWiki.tierBootsPlural') || 'STIEFEL';
      case 'consumable':
        return t('itemsWiki.tierConsumablesPlural') || 'VERBRAUCHSGÜTER';
      default:
        return tier.toUpperCase();
    }
  };

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation - Analog to /champions */}
      <Breadcrumbs items={[{ label: t('nav.items') || 'Items' }]} />

      {/* Filter Bar - Exactly Analog to /champions Glassmorphic Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
        {/* Top Controls: Search Input + Map + Sort + Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="group relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 transition-colors group-focus-within:text-amber-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('itemsWiki.searchPlaceholder') || 'Item suchen (z.B. Rabadon, Infinity Edge, IE)...'}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-9 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                title="Suche leeren"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Map Selector */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-zinc-400 shrink-0 hidden md:block" />
            <select
              value={selectedMap}
              onChange={(e) => setSelectedMap(e.target.value as MapFilter)}
              className="h-10 rounded-xl border border-white/[0.08] bg-[#121721] px-3 text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-amber-400/60 transition-colors cursor-pointer"
            >
              <option value="11">{t('itemsWiki.mapSR') || "Kluft der Beschwörer (5v5)"}</option>
              <option value="12">{t('itemsWiki.mapARAM') || 'ARAM (Heulende Schlucht)'}</option>
              <option value="30">{t('itemsWiki.mapArena') || 'Arena'}</option>
              <option value="ALL">{t('itemsWiki.mapAll') || 'Alle Karten & Modi'}</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 rounded-xl border border-white/[0.08] bg-[#121721] px-3 text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-amber-400/60 transition-colors cursor-pointer"
          >
            <option value="gold-desc">{t('itemsWiki.sortGoldDesc') || 'Gold: Höchste zuerst'}</option>
            <option value="gold-asc">{t('itemsWiki.sortGoldAsc') || 'Gold: Günstigste zuerst'}</option>
            <option value="name-asc">{t('itemsWiki.sortNameAsc') || 'Name (A - Z)'}</option>
            <option value="name-desc">{t('itemsWiki.sortNameDesc') || 'Name (Z - A)'}</option>
          </select>

          {/* Mobile Stat Filter Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileStatsOpen(!isMobileStatsOpen)}
            className={`flex lg:hidden h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer ${
              selectedStats.length > 0
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                : 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{t('itemsWiki.statFilters') || 'Attribute'}</span>
            {selectedStats.length > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-black">
                {selectedStats.length}
              </span>
            )}
          </button>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer shadow-sm"
              title={t('itemsWiki.resetFilters') || 'Filter zurücksetzen'}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Role Filter Tabs - Exactly Matching /champions & LoLDB */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {ROLE_OPTIONS.map((role) => {
              const Icon = role.icon;
              const isActive = selectedRole === role.key;
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setSelectedRole(role.key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05]'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span>{t(role.labelKey) || role.fallbackLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Only Purchasable Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-white transition-colors py-1">
            <input
              type="checkbox"
              checked={onlyPurchasable}
              onChange={(e) => setOnlyPurchasable(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>{t('itemsWiki.onlyPurchasable') || 'Nur Shop-Items'}</span>
          </label>
        </div>

        {/* Filter Summary & Active Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>
              {t('itemsWiki.showingCount', {
                count: filteredItems.length,
              }) || `${filteredItems.length} Gegenstände`}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500">Patch {patchString}</span>
          </div>

          {/* Active Filter Badges */}
          {isFilterActive && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedRole !== 'All' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {selectedRole}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('All')}
                    className="hover:text-white ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedStats.map((st) => (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300"
                >
                  {st}
                  <button
                    type="button"
                    onClick={() => handleToggleStat(st)}
                    className="hover:text-white ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  "{searchQuery}"
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-white ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: Left Stat Sidebar + Center Tier Grid + Right Detail Panel */}
      <div className="flex items-start gap-5 w-full">
        {/* Left Stat Sidebar - Desktop */}
        <aside
          className="sticky top-20 hidden lg:flex w-52 shrink-0 flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 shadow-xl backdrop-blur-md max-h-[calc(100vh-100px)] overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t('itemsWiki.statFilters') || 'Attribute'}
            </span>
            {selectedStats.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStats([])}
                className="text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                {t('itemsWiki.clearStats') || 'Leeren'}
              </button>
            )}
          </div>

          {STAT_GROUPS.map((group) => (
            <div key={group.labelEn} className="space-y-1.5">
              <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {isDe ? group.labelDe : group.labelEn}
              </p>
              <div className="flex flex-col gap-1">
                {group.stats.map((stat) => {
                  const Icon = stat.icon;
                  const isSelected = selectedStats.includes(stat.id);
                  return (
                    <button
                      key={stat.id}
                      type="button"
                      onClick={() => handleToggleStat(stat.id)}
                      className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border border-amber-400/50 bg-amber-400/15 text-amber-300 font-semibold shadow-sm'
                          : 'border border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: stat.color }} />
                      <span className="truncate">{isDe ? stat.labelDe : stat.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Mobile Stat Filter Drawer (Modal Overlay) */}
        {isMobileStatsOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0c1017] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                  <span>{t('itemsWiki.statFilters') || 'Attribute filtern'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileStatsOpen(false)}
                  className="rounded-full bg-white/10 p-1 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {STAT_GROUPS.map((group) => (
                <div key={group.labelEn} className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    {isDe ? group.labelDe : group.labelEn}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.stats.map((stat) => {
                      const Icon = stat.icon;
                      const isSelected = selectedStats.includes(stat.id);
                      return (
                        <button
                          key={stat.id}
                          type="button"
                          onClick={() => handleToggleStat(stat.id)}
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-all ${
                            isSelected
                              ? 'border border-amber-400/50 bg-amber-400/15 text-amber-300 font-semibold'
                              : 'border border-white/[0.06] bg-white/[0.02] text-zinc-400'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: stat.color }} />
                          <span className="truncate">{isDe ? stat.labelDe : stat.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
                {selectedStats.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStats([])}
                    className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/10"
                  >
                    {t('itemsWiki.clearStats') || 'Zurücksetzen'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileStatsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-xs font-bold text-black hover:bg-amber-400"
                >
                  {t('common.done') || 'Fertig'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Center: Items Grid Grouped by Tiers (LoLDB Style) */}
        <main className="flex-1 min-w-0 space-y-8">
          {isLoading ? (
            /* Loading Skeleton */
            <div className="space-y-8">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="h-5 w-44 bg-white/10 rounded animate-pulse" />
                  <div className="flex flex-wrap gap-2.5">
                    {[...Array(14)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 w-16 rounded-xl border border-white/[0.06] bg-zinc-900/50 animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            TIER_ORDER.map((tierKey) => {
              const bucketItems = tierBuckets[tierKey];
              if (!bucketItems || bucketItems.length === 0) return null;

              return (
                <section key={tierKey} className="space-y-3">
                  {/* Tier Section Header (LoLDB Style) */}
                  <div className="flex items-center gap-3">
                    <h2 className="text-[11px] sm:text-xs font-black tracking-[0.15em] text-zinc-300 uppercase">
                      {getTierSectionTitle(tierKey)}
                    </h2>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                      {bucketItems.length}
                    </span>
                    <div className="h-px flex-1 bg-white/[0.08]" />
                  </div>

                  {/* Tier Item Cards Grid */}
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {bucketItems.map((item) => {
                      const isSelected = activeItemId === item.id;
                      const iconUrl = getItemIconUrl(item.id, version);
                      const isLegacy = !item.inStore;

                      return (
                        <div
                          key={item.id}
                          className="relative"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredItem({
                              item,
                              x: rect.right + 12,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveItemId(item.id === activeItemId ? null : item.id);
                            }}
                            className={`group relative flex flex-col items-center gap-1 p-1 rounded-xl transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0b0e14] bg-amber-500/10 scale-105'
                                : 'hover:scale-105'
                            } ${isLegacy ? 'opacity-55' : ''}`}
                          >
                            {/* Item Icon */}
                            <div
                              className={`relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-xl border transition-all ${
                                isSelected
                                  ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                                  : 'border-white/[0.1] bg-black/60 group-hover:border-white/30 group-hover:shadow-md'
                              }`}
                            >
                              <Image
                                src={iconUrl}
                                alt={item.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>

                            {/* Gold Total Tag below Item */}
                            {item.gold.total > 0 ? (
                              <span className="text-[12px] font-black text-[#d0a85d] tracking-tight group-hover:text-amber-300 transition-colors">
                                {item.gold.total}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-zinc-500">0</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 rounded-2xl border border-white/[0.06] bg-[#0c1017]/50">
              <Shield className="h-12 w-12 text-zinc-600 mb-3 opacity-40" />
              <p className="text-lg font-bold text-zinc-300 mb-1">
                {t('itemsWiki.noItemsFound') || 'Keine Items gefunden'}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mb-4">
                {searchQuery
                  ? `Keine Treffer für "${searchQuery}". Überprüfe deine Rechtschreibung oder setze den Filter zurück.`
                  : 'Aktuell sind keine Gegenstände für diese Filterauswahl verfügbar.'}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t('itemsWiki.resetFilters') || 'Filter zurücksetzen'}</span>
              </button>
            </div>
          )}
        </main>

        {/* Right Detail Inspector Panel - Desktop (LoLDB Style) */}
        {activeItem && (
          <aside
            className="hidden lg:flex w-[340px] xl:w-[380px] shrink-0 sticky top-20 flex-col rounded-2xl border border-white/[0.08] bg-[#0c1017]/95 p-5 shadow-2xl backdrop-blur-md max-h-[calc(100vh-100px)] overflow-y-auto space-y-5 animate-in fade-in slide-in-from-right-4 duration-200"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            {/* Inspector Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="relative h-14 w-14 rounded-xl overflow-hidden border-2 border-amber-400/70 bg-black/80 shadow-lg shrink-0">
                  <Image
                    src={getItemIconUrl(activeItem.id, version)}
                    alt={activeItem.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-white leading-tight truncate">
                    {activeItem.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {activeItem.gold.total > 0 && (
                      <div className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 text-xs font-black text-amber-300">
                        <Coins className="h-3 w-3 text-amber-400" />
                        <span>{activeItem.gold.total}g</span>
                      </div>
                    )}
                    {(() => {
                      const eff = calculateGoldEfficiency(activeItem);
                      if (eff === null) return null;
                      const effColor =
                        eff >= 100
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : eff >= 75
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30';
                      return (
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${effColor}`}>
                          {eff}% eff.
                        </span>
                      );
                    })()}
                  </div>
                  {activeItem.gold.sell > 0 && (
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {t('itemsWiki.sellValue') || 'Verkaufswert'}: {activeItem.gold.sell}g
                    </p>
                  )}
                </div>
              </div>

              {/* Close Panel Button */}
              <button
                type="button"
                onClick={() => setActiveItemId(null)}
                className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title={t('itemsWiki.close') || 'Schließen'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Visual Build Path / Recipe Tree (Interactive LoLDB Tree Graph) */}
            <div className="space-y-3 border-b border-white/[0.06] pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {t('itemsWiki.buildPathTitle') || 'Rezeptbaum & Baupfad'}
              </span>

              {/* Tree Container */}
              <div className="flex flex-col items-center py-2 space-y-4">
                {/* Root Item Node */}
                <div className="flex flex-col items-center">
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-amber-400 bg-black/80 shadow-md">
                    <Image
                      src={getItemIconUrl(activeItem.id, version)}
                      alt={activeItem.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-[11px] font-black text-amber-300 mt-1">
                    {activeItem.gold.total}g
                  </span>
                </div>

                {/* Direct Components (Level 1) */}
                {activeItem.from && activeItem.from.length > 0 ? (
                  <div className="w-full flex flex-col items-center">
                    {/* SVG Branching Lines */}
                    <div className="relative w-full h-4 flex justify-center">
                      <div className="w-0.5 h-full bg-amber-500/40" />
                    </div>

                    <div className="flex flex-wrap items-start justify-center gap-4 w-full">
                      {activeItem.from.map((compChildId, idx) => {
                        const compItem = itemMap.get(compChildId);
                        const compIconUrl = getItemIconUrl(compChildId, version);
                        const compName = compItem?.name || `Item ${compChildId}`;
                        const compGold = compItem?.gold?.total ?? 0;
                        const subComponents = compItem?.from || [];

                        return (
                          <div key={`${compChildId}-${idx}`} className="flex flex-col items-center">
                            {/* Component Button */}
                            <button
                              type="button"
                              onClick={() => setActiveItemId(compChildId)}
                              className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
                              title={`Zu ${compName} wechseln`}
                            >
                              <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-white/20 bg-black/60 group-hover:border-amber-400 transition-colors shadow">
                                <Image
                                  src={compIconUrl}
                                  alt={compName}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-300 group-hover:text-amber-300 mt-0.5">
                                {compGold}g
                              </span>
                            </button>

                            {/* Sub-components (Level 2) */}
                            {subComponents.length > 0 && (
                              <div className="flex flex-col items-center mt-2">
                                <div className="w-0.5 h-2 bg-white/20 mb-1" />
                                <div className="flex items-center gap-1.5">
                                  {subComponents.map((subId, subIdx) => {
                                    const subItem = itemMap.get(subId);
                                    const subIcon = getItemIconUrl(subId, version);
                                    return (
                                      <button
                                        key={`${subId}-${subIdx}`}
                                        type="button"
                                        onClick={() => setActiveItemId(subId)}
                                        className="relative h-7 w-7 rounded-md overflow-hidden border border-white/10 hover:border-amber-400 transition-all cursor-pointer shadow-sm hover:scale-110"
                                        title={subItem?.name || `Item ${subId}`}
                                      >
                                        <Image
                                          src={subIcon}
                                          alt={subItem?.name || ''}
                                          fill
                                          sizes="28px"
                                          className="object-cover"
                                          unoptimized
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">
                    {t('itemsWiki.noRecipe') || 'Basis-Gegenstand (keine Vorstufen)'}
                  </p>
                )}
              </div>
            </div>

            {/* Upgrades Into / Builds Into */}
            {activeItem.into && activeItem.into.length > 0 && (
              <div className="space-y-2.5 border-b border-white/[0.06] pb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {t('itemsWiki.buildsInto') || 'Ausbauten / Baut zu'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeItem.into.map((intoId) => {
                    const upgrade = itemMap.get(intoId);
                    if (!upgrade) return null;
                    return (
                      <button
                        key={intoId}
                        type="button"
                        onClick={() => setActiveItemId(intoId)}
                        className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 hover:border-amber-400/50 hover:bg-white/[0.06] transition-all cursor-pointer text-left"
                      >
                        <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/60">
                          <Image
                            src={getItemIconUrl(intoId, version)}
                            alt={upgrade.name}
                            fill
                            sizes="32px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 pr-1.5">
                          <p className="text-xs font-bold text-white group-hover:text-amber-300 truncate max-w-[120px]">
                            {upgrade.name}
                          </p>
                          <p className="text-[10px] font-black text-amber-400">
                            {upgrade.gold.total}g
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats Breakdown */}
            {(() => {
              const parsedStats = parseStatsFromItem(activeItem, isDe);
              if (parsedStats.length === 0) return null;
              return (
                <div className="space-y-2 border-b border-white/[0.06] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {t('itemsWiki.statsTitle') || 'Attribute & Werte'}
                  </span>
                  <div className="space-y-1.5">
                    {parsedStats.map((st, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                      >
                        <span className="text-zinc-300 font-medium">{st.name}</span>
                        <span className="font-bold" style={{ color: st.color }}>
                          {st.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Effects & Passives */}
            {activeItem.description && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {t('itemsWiki.effectsTitle') || 'Passiv- & Aktiv-Effekte'}
                </span>
                <div
                  className="rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs text-zinc-300 leading-relaxed space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: renderItemDescription(activeItem.description),
                  }}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Mobile Item Details Drawer (When item is clicked on mobile screen) */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-3 sm:p-4 bg-black/80 backdrop-blur-md lg:hidden animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-[#111723] via-[#0b0e14] to-[#080b0f] p-5 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative h-14 w-14 rounded-xl overflow-hidden border-2 border-amber-400 bg-black/80 shadow-md shrink-0">
                  <Image
                    src={getItemIconUrl(activeItem.id, version)}
                    alt={activeItem.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-white truncate">{activeItem.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black text-amber-300">
                      {activeItem.gold.total}g
                    </span>
                    {(() => {
                      const eff = calculateGoldEfficiency(activeItem);
                      if (eff === null) return null;
                      return (
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400">
                          {eff}% eff.
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveItemId(null)}
                className="h-8 w-8 rounded-full bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Recipe Tree in Mobile Drawer */}
            {activeItem.from && activeItem.from.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {t('itemsWiki.buildPathTitle') || 'Rezept / Vorstufen'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {activeItem.from.map((cId) => {
                    const c = itemMap.get(cId);
                    return (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => setActiveItemId(cId)}
                        className="flex items-center gap-2 p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-left hover:border-amber-400/50"
                      >
                        <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                          <Image
                            src={getItemIconUrl(cId, version)}
                            alt={c?.name || ''}
                            fill
                            sizes="32px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{c?.name || cId}</p>
                          <p className="text-[10px] font-semibold text-amber-400">{c?.gold.total}g</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description in Mobile Drawer */}
            {activeItem.description && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {t('itemsWiki.effectsTitle') || 'Effekte'}
                </span>
                <div
                  className="rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs text-zinc-300 leading-relaxed space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: renderItemDescription(activeItem.description),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip (LoLDB Style Instant Preview) */}
      {hoveredItem && !activeItem && (
        <div
          className="fixed z-50 pointer-events-none hidden lg:block w-72 rounded-xl border border-white/15 bg-[#00060d]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-100"
          style={{
            left: Math.min(hoveredItem.x, window.innerWidth - 320),
            top: Math.min(hoveredItem.y, window.innerHeight - 280),
          }}
        >
          <div className="flex items-start gap-2.5 mb-2.5">
            <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-white/20 shrink-0 bg-black/70">
              <Image
                src={getItemIconUrl(hoveredItem.item.id, version)}
                alt={hoveredItem.item.name}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#f0e6d3] leading-tight truncate">
                {hoveredItem.item.name}
              </p>
              {hoveredItem.item.gold.total > 0 && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-[#d0a85d]">
                    {hoveredItem.item.gold.total}g
                  </span>
                  {(() => {
                    const eff = calculateGoldEfficiency(hoveredItem.item);
                    if (eff === null) return null;
                    return (
                      <span className="text-[10px] text-zinc-400">
                        ({eff}% Effizient)
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Formatted stats preview */}
          {(() => {
            const parsedStats = parseStatsFromItem(hoveredItem.item, isDe);
            if (parsedStats.length === 0) return null;
            return (
              <div className="space-y-0.5 border-t border-white/[0.08] pt-2 mb-2">
                {parsedStats.slice(0, 4).map((st, i) => (
                  <p key={i} className="text-xs text-zinc-300">
                    <span className="font-semibold text-white">{st.value}</span> {st.name}
                  </p>
                ))}
              </div>
            );
          })()}

          {/* Plaintext / passive snippet */}
          {hoveredItem.item.plaintext && (
            <p className="text-[11px] text-zinc-400 line-clamp-2 italic pt-1 border-t border-white/[0.06]">
              {hoveredItem.item.plaintext}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
