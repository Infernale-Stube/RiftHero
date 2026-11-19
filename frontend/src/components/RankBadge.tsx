import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankBadgeProps {
  tier?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CHALLENGER: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-400/50' },
  GRANDMASTER: { bg: 'bg-rose-600/20', text: 'text-rose-400', border: 'border-rose-500/50' },
  MASTER: { bg: 'bg-purple-600/20', text: 'text-purple-300', border: 'border-purple-400/50' },
  DIAMOND: { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-400/50' },
  EMERALD: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-400/50' },
  PLATINUM: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-400/50' },
  GOLD: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-400/50' },
  SILVER: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/50' },
  BRONZE: { bg: 'bg-amber-800/20', text: 'text-amber-600', border: 'border-amber-700/50' },
  IRON: { bg: 'bg-zinc-600/20', text: 'text-zinc-400', border: 'border-zinc-500/50' },
  UNRANKED: { bg: 'bg-slate-800/40', text: 'text-slate-400', border: 'border-slate-700' },
};

export default function RankBadge({ tier = 'UNRANKED', size = 'md', className }: RankBadgeProps) {
  const upper = tier.toUpperCase();
  const theme = TIER_COLORS[upper] || TIER_COLORS.UNRANKED;

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-base',
  }[size];

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  }[size];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl border transition-all shadow-sm',
        sizeClasses,
        theme.bg,
        theme.border,
        className
      )}
    >
      <Shield className={cn(iconSizes, theme.text)} />
    </div>
  );
}
