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

  const isSecondGroup = group.groupId > 1;

  let colorClasses = '';
  if (group.size === 2) {
    colorClasses = isSecondGroup
      ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
      : 'bg-violet-500/15 border-violet-500/35 text-violet-300';
  } else if (group.size === 3) {
    colorClasses = isSecondGroup
      ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300'
      : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300';
  } else if (group.size === 4) {
    colorClasses = 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300';
  } else {
    // 5-Stack
    colorClasses = 'bg-rose-500/15 border-rose-500/35 text-rose-300';
  }

  const tooltip =
    locale === 'de'
      ? `${group.label} (${group.gamesTogether} gemeinsame Matches in der Datenbank)`
      : `${group.label} (${group.gamesTogether} shared matches in database)`;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded px-1 py-0.2 text-[9px] font-black border tracking-tight shadow-sm cursor-help select-none shrink-0 ${colorClasses} ${className}`}
        title={tooltip}
      >
        <Users className="h-2.5 w-2.5 mr-0.5 shrink-0 opacity-80" />
        {group.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black border tracking-tight shadow-sm cursor-help select-none shrink-0 ${colorClasses} ${className}`}
      title={tooltip}
    >
      <Users className="h-3 w-3 shrink-0 opacity-85" />
      <span>{group.label}</span>
    </span>
  );
}
