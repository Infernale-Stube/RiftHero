'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Shield,
  Swords,
  Wand2,
  Crosshair,
  HeartHandshake,
  Skull,
  RotateCcw,
  X,
  Footprints,
  Coins,
  MapPin,
  SlidersHorizontal,
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
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  getDDragonVersion,
  getItemIconUrl,
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

// Gold values per stat for Gold Efficiency calculation
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

function renderItemDescription(rawDesc: string): string {
  if (!rawDesc) return '';
  return rawDesc
    .replace(/<mainText>/gi, '<div class="space-y-2">')
    .replace(/<\/mainText>/gi, '</div>')
    .replace(/<stats>/gi, '<div class="py-2 my-1.5 border-y border-white/[0.08] text-xs text-zinc-200 font-medium space-y-1">')
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

// Coordinate segment for SVG lines
interface LineCoord {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Visual Build Path Tree matching League of Legends in-game shop and LoLDB.
 * Orthogonal SVG connection lines branch from root item to Level 1 components and Level 2 sub-components.
 */
function ItemBuildTree({
  item,
  itemMap,
  version,
  onItemClick,
}: {
  item: ItemRosterItem;
  itemMap: Map<string, ItemRosterItem>;
  version: string;
  onItemClick: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const level1Refs = useRef<Map<string, HTMLElement>>(new Map());
  const level2Refs = useRef<Map<string, HTMLElement>>(new Map());
  const [lines, setLines] = useState<LineCoord[]>([]);

  // Structure components
  const { level1, level2 } = useMemo(() => {
    const rawFrom = item.from || [];
    const l1 = rawFrom.map((id) => itemMap.get(id)).filter(Boolean) as ItemRosterItem[];
    const l2 = new Map<string, ItemRosterItem[]>();

    for (const comp of l1) {
      const subFrom = comp.from || [];
      const subItems = subFrom.map((id) => itemMap.get(id)).filter(Boolean) as ItemRosterItem[];
      if (subItems.length > 0) {
        l2.set(comp.id, subItems);
      }
    }

    return { level1: l1, level2: l2 };
  }, [item, itemMap]);

  const updateLines = useCallback(() => {
    const container = containerRef.current;
    const rootEl = rootRef.current;
    if (!container || !rootEl || level1.length === 0) {
      setLines([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const getPt = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        cx: rect.left - containerRect.left + rect.width / 2,
        top: rect.top - containerRect.top,
        bottom: rect.bottom - containerRect.top,
      };
    };

    const newLines: LineCoord[] = [];
    const rootPt = getPt(rootEl);
    const l1Pts: { key: string; pt: ReturnType<typeof getPt> }[] = [];

    level1Refs.current.forEach((el, key) => {
      if (el) {
        l1Pts.push({ key, pt: getPt(el) });
      }
    });
    l1Pts.sort((a, b) => a.pt.cx - b.pt.cx);

    if (l1Pts.length > 0) {
      const midY = (rootPt.bottom + l1Pts[0].pt.top) / 2;
      // Vertical line down from root to midY
      newLines.push({ x1: rootPt.cx, y1: rootPt.bottom, x2: rootPt.cx, y2: midY });

      // Horizontal bar between leftmost and rightmost level 1 children
      const minX = l1Pts[0].pt.cx;
      const maxX = l1Pts[l1Pts.length - 1].pt.cx;
      if (minX < maxX) {
        newLines.push({ x1: minX, y1: midY, x2: maxX, y2: midY });
      }

      // Vertical line down to each level 1 child
      for (const { pt } of l1Pts) {
        newLines.push({ x1: pt.cx, y1: midY, x2: pt.cx, y2: pt.top });
      }

      // Level 2 sub-components connections
      for (const { key: parentKey, pt: parentPt } of l1Pts) {
        const l2Pts: ReturnType<typeof getPt>[] = [];
        level2Refs.current.forEach((subEl, subKey) => {
          if (subEl && subKey.startsWith(`${parentKey}:`)) {
            l2Pts.push(getPt(subEl));
          }
        });
        l2Pts.sort((a, b) => a.cx - b.cx);

        if (l2Pts.length > 0) {
          const subMidY = (parentPt.bottom + l2Pts[0].top) / 2;
          // Line from parent down to subMidY
          newLines.push({ x1: parentPt.cx, y1: parentPt.bottom, x2: parentPt.cx, y2: subMidY });

          const subMinX = l2Pts[0].cx;
          const subMaxX = l2Pts[l2Pts.length - 1].cx;
          if (subMinX < subMaxX) {
            newLines.push({ x1: subMinX, y1: subMidY, x2: subMaxX, y2: subMidY });
          }
          for (const subPt of l2Pts) {
            newLines.push({ x1: subPt.cx, y1: subMidY, x2: subPt.cx, y2: subPt.top });
          }
        }
      }
    }

    setLines(newLines);
  }, [level1]);

  useEffect(() => {
    level1Refs.current.clear();
    level2Refs.current.clear();

    const t = setTimeout(() => {
      updateLines();
    }, 40);

    const ro = new ResizeObserver(() => {
      updateLines();
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateLines);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', updateLines);
    };
  }, [item.id, level1, updateLines]);

  if (level1.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-amber-400 bg-black/80 shadow-md">
          <Image
            src={getItemIconUrl(item.id, version)}
            alt={item.name}
            fill
            sizes="48px"
            className="object-cover"
            unoptimized
          />
        </div>
        <span className="text-[11px] font-black text-amber-300 mt-1.5">{item.gold.total}g</span>
        <p className="text-[11px] text-zinc-500 italic mt-2">Basis-Gegenstand (keine Vorstufen)</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative py-2 w-full overflow-hidden">
      {/* SVG Recipe Lines (LoL in-game shop / LoLDB style) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ overflow: 'visible' }}
        aria-hidden="true"
      >
        {lines.map((l, idx) => (
          <line
            key={idx}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Root Item Node */}
      <div className="flex justify-center pb-8">
        <div ref={rootRef} className="flex flex-col items-center">
          <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-amber-400 bg-black/80 shadow-lg">
            <Image
              src={getItemIconUrl(item.id, version)}
              alt={item.name}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          </div>
          <span className="text-[11px] font-black text-amber-300 mt-1 flex items-center gap-0.5">
            <Coins className="h-2.5 w-2.5 text-amber-400" />
            {item.gold.total}
          </span>
        </div>
      </div>

      {/* Level 1 Component Nodes */}
      <div className="flex items-start justify-center gap-3 w-full">
        {level1.map((comp, idx) => {
          const compKey = `${comp.id}-${idx}`;
          const subItems = level2.get(comp.id) || [];

          return (
            <div key={compKey} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => onItemClick(comp.id)}
                className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
                title={`Zu ${comp.name} wechseln`}
              >
                <div
                  ref={(el) => {
                    if (el) level1Refs.current.set(compKey, el);
                    else level1Refs.current.delete(compKey);
                  }}
                  className="relative h-10 w-10 rounded-lg overflow-hidden border border-white/20 bg-black/70 group-hover:border-amber-400 transition-colors shadow"
                >
                  <Image
                    src={getItemIconUrl(comp.id, version)}
                    alt={comp.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <span className="text-[10px] font-bold text-zinc-300 group-hover:text-amber-300 mt-0.5 flex items-center gap-0.5">
                  <Coins className="h-2.5 w-2.5 text-amber-400" />
                  {comp.gold.total}
                </span>
              </button>

              {/* Level 2 Sub-components */}
              {subItems.length > 0 && (
                <div className="flex gap-1.5 pt-8">
                  {subItems.map((sub, sIdx) => {
                    const subKey = `${compKey}:${sub.id}-${sIdx}`;
                    return (
                      <button
                        key={subKey}
                        type="button"
                        onClick={() => onItemClick(sub.id)}
                        className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
                        title={`Zu ${sub.name} wechseln`}
                      >
                        <div
                          ref={(el) => {
                            if (el) level2Refs.current.set(subKey, el);
                            else level2Refs.current.delete(subKey);
                          }}
                          className="relative h-8 w-8 rounded-md overflow-hidden border border-white/10 group-hover:border-amber-400 transition-all shadow-sm"
                        >
                          <Image
                            src={getItemIconUrl(sub.id, version)}
                            alt={sub.name}
                            fill
                            sizes="32px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <span className="text-[9px] font-semibold text-zinc-400 group-hover:text-amber-300 mt-0.5 flex items-center gap-0.5">
                          <Coins className="h-2 w-2 text-amber-400" />
                          {sub.gold.total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ItemsListView() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();

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
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        console.warn('[ItemsListView] Failed to load items from database API:', err);
        setItems([]);
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
    if (statDef.tagMatches && statDef.tagMatches.some((t) => item.tags.some((it) => it.toLowerCase() === t.toLowerCase()))) {
      return true;
    }
    if (statDef.rawStatKeys && statDef.rawStatKeys.some((k) => item.stats && item.stats[k])) {
      return true;
    }
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
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation - Exactly Analog to /champions */}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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

        {/* Role Filter Tabs - Analog to /champions & LoLDB */}
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

        {/* Filter Summary & Active Badges (without patch notice) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span>
              {t('itemsWiki.showingCount', {
                filtered: filteredItems.length,
                total: items.length,
              }) || `Zeige ${filteredItems.length} von ${items.length} Items`}
            </span>
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
                    className="hover:text-white ml-0.5 cursor-pointer"
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
                    className="hover:text-white ml-0.5 cursor-pointer"
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
                    className="hover:text-white ml-0.5 cursor-pointer"
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
          className="sticky top-20 hidden lg:flex w-48 xl:w-52 shrink-0 flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 shadow-xl backdrop-blur-md max-h-[calc(100vh-100px)] overflow-y-auto"
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
                  className="rounded-full bg-white/10 p-1 text-zinc-400 hover:text-white cursor-pointer"
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
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-all cursor-pointer ${
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
                    className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    {t('itemsWiki.clearStats') || 'Zurücksetzen'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileStatsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-xs font-bold text-black hover:bg-amber-400 cursor-pointer"
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

        {/* Right Detail Inspector Panel - Desktop (LoLDB / In-game Shop Style) */}
        {activeItem && (
          <aside
            className="hidden lg:flex w-[320px] xl:w-[360px] shrink-0 sticky top-20 flex-col rounded-2xl border border-white/[0.08] bg-[#0c1017]/95 p-5 shadow-2xl backdrop-blur-md max-h-[calc(100vh-100px)] overflow-y-auto space-y-5 animate-in fade-in slide-in-from-right-4 duration-200"
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

            {/* Visual Build Path / Recipe Tree (Exact In-game / LoLDB Tree Graph) */}
            <div className="space-y-3 border-b border-white/[0.06] pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {t('itemsWiki.buildPathTitle') || 'Rezeptbaum & Baupfad'}
              </span>

              <ItemBuildTree
                item={activeItem}
                itemMap={itemMap}
                version={version}
                onItemClick={(id) => setActiveItemId(id)}
              />
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
                className="h-8 w-8 rounded-full bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* In-game Recipe Tree in Mobile Drawer */}
            <div className="space-y-2 border-b border-white/[0.08] pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {t('itemsWiki.buildPathTitle') || 'Rezeptbaum & Baupfad'}
              </span>
              <ItemBuildTree
                item={activeItem}
                itemMap={itemMap}
                version={version}
                onItemClick={(id) => setActiveItemId(id)}
              />
            </div>

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
