'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { PremadeGroupInfo } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';

interface PremadeBadgeProps {
  group?: PremadeGroupInfo | null;
  compact?: boolean;
  className?: string;
}

// 8 distinct tactical LoL colors matching RiftHero dark theme for up to 8 premade groups in a match
const GROUP_PALETTES: Record<number, string> = {
  1: 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/40',
  2: 'bg-sky-500/10 border-sky-500/25 text-sky-300 hover:bg-sky-500/20 hover:border-sky-500/40',
  3: 'bg-purple-500/10 border-purple-500/25 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40',
  4: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40',
  5: 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/40',
  6: 'bg-orange-500/10 border-orange-500/25 text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/40',
  7: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/40',
  8: 'bg-teal-500/10 border-teal-500/25 text-teal-300 hover:bg-teal-500/20 hover:border-teal-500/40',
};

export default function PremadeBadge({
  group,
  compact = false,
  className = '',
}: PremadeBadgeProps) {
  const { locale } = useTranslation();
  if (!group || !group.size || group.size < 2) return null;

  const groupId = group.groupId || 1;
  const totalGroups = group.totalGroups || (groupId > 1 ? groupId : 1);
  const showGroupNumber = totalGroups > 1;

  // Map groupId 1..8 with modulo wrap
  const colorIndex = ((groupId - 1) % 8) + 1;
  const colorClasses = GROUP_PALETTES[colorIndex] || GROUP_PALETTES[1];

  // Tooltip with group number when multiple groups exist in the match
  const groupLabelWithNum = showGroupNumber ? `${group.label} #${groupId}` : group.label;
  const tooltip =
    locale === 'de'
      ? `${groupLabelWithNum} (${group.gamesTogether} gemeinsame Matches in der Datenbank)`
      : `${groupLabelWithNum} (${group.gamesTogether} shared matches in database)`;

  // Badge text in standard view: e.g. "DUO 1", "DUO 2", "DUO 3", "DUO 4", or "DUO" if single group
  const displayLabel = showGroupNumber ? `${group.label} ${groupId}` : group.label;

  // Compact mode for tight 5v5 matchup lists (icon-only or micro-pill to prevent name truncation)
  if (compact) {
    if (group.size === 2) {
      return (
        <span
          className={`inline-flex items-center justify-center h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px] border shadow-sm cursor-help select-none shrink-0 transition-transform hover:scale-110 ${colorClasses} ${className}`}
          title={tooltip}
        >
          <Users className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 opacity-90" />
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-0.5 h-3.5 sm:h-4 px-1 rounded-[4px] border shadow-sm cursor-help select-none shrink-0 transition-transform hover:scale-110 ${colorClasses} ${className}`}
        title={tooltip}
      >
        <Users className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 opacity-90" />
        <span className="text-[8px] font-black leading-none">{group.size}</span>
      </span>
    );
  }

  // Standard mode for expanded scoreboards, match detail, and live game
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border shadow-sm cursor-help select-none shrink-0 transition-colors ${colorClasses} ${className}`}
      title={tooltip}
    >
      <Users className="h-2.5 w-2.5 shrink-0 opacity-80" />
      <span>{displayLabel}</span>
    </span>
  );
}
