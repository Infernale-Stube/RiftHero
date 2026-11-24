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

export default function PremadeBadge({
  group,
  compact = false,
  className = '',
}: PremadeBadgeProps) {
  const { locale } = useTranslation();
  if (!group || !group.size || group.size < 2) return null;

  const isSecondGroup = (group.groupId || 1) > 1;

  // Refined League palette matching RiftHero dark theme
  let colorClasses = '';
  if (group.size === 2) {
    colorClasses = isSecondGroup
      ? 'bg-sky-500/10 border-sky-500/25 text-sky-300 hover:bg-sky-500/20 hover:border-sky-500/40'
      : 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/40';
  } else if (group.size === 3) {
    colorClasses = isSecondGroup
      ? 'bg-sky-500/10 border-sky-500/25 text-sky-300 hover:bg-sky-500/20 hover:border-sky-500/40'
      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40';
  } else if (group.size === 4) {
    colorClasses = 'bg-teal-500/10 border-teal-500/25 text-teal-300 hover:bg-teal-500/20 hover:border-teal-500/40';
  } else {
    // 5-Stack
    colorClasses = 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/40';
  }

  const tooltip =
    locale === 'de'
      ? `${group.label} (${group.gamesTogether} gemeinsame Matches in der Datenbank)`
      : `${group.label} (${group.gamesTogether} shared matches in database)`;

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
      <span>{group.label}</span>
    </span>
  );
}
