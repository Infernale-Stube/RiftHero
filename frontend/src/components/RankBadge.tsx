import Image from 'next/image';
import { cn } from '@/lib/utils';

interface RankBadgeProps {
  tier?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

export const TIER_COLORS: Record<string, { text: string; border: string; glow: string }> = {
  CHALLENGER: { text: 'text-amber-300', border: 'border-amber-400/50', glow: 'shadow-amber-500/20' },
  GRANDMASTER: { text: 'text-rose-400', border: 'border-rose-500/50', glow: 'shadow-rose-500/20' },
  MASTER: { text: 'text-purple-300', border: 'border-purple-400/50', glow: 'shadow-purple-500/20' },
  DIAMOND: { text: 'text-sky-300', border: 'border-sky-400/50', glow: 'shadow-sky-500/20' },
  EMERALD: { text: 'text-emerald-300', border: 'border-emerald-400/50', glow: 'shadow-emerald-500/20' },
  PLATINUM: { text: 'text-teal-300', border: 'border-teal-400/50', glow: 'shadow-teal-500/20' },
  GOLD: { text: 'text-yellow-400', border: 'border-yellow-400/50', glow: 'shadow-yellow-500/20' },
  SILVER: { text: 'text-slate-300', border: 'border-slate-400/50', glow: 'shadow-slate-400/20' },
  BRONZE: { text: 'text-amber-600', border: 'border-amber-700/50', glow: 'shadow-amber-700/20' },
  IRON: { text: 'text-zinc-400', border: 'border-zinc-500/50', glow: 'shadow-zinc-500/20' },
  UNRANKED: { text: 'text-slate-500', border: 'border-slate-800', glow: 'shadow-none' },
};

export function getRankEmblemUrl(tier = 'UNRANKED'): string {
  const clean = tier.toLowerCase();
  const validTiers = [
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
  const target = validTiers.includes(clean) ? clean : 'unranked';
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${target}.png`;
}

export default function RankBadge({
  tier = 'UNRANKED',
  size = 'md',
  className,
  showGlow = false,
}: RankBadgeProps) {
  const upper = tier.toUpperCase();
  const theme = TIER_COLORS[upper] || TIER_COLORS.UNRANKED;

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }[size];

  const imageDimensions = {
    sm: 24,
    md: 40,
    lg: 64,
    xl: 96,
  }[size];

  return (
    <div
      className={cn(
        'relative shrink-0 flex items-center justify-center select-none',
        sizeClasses,
        showGlow && `drop-shadow-[0_0_12px_${theme.glow}]`,
        className
      )}
      title={tier}
    >
      <Image
        src={getRankEmblemUrl(tier)}
        alt={tier}
        width={imageDimensions}
        height={imageDimensions}
        className="h-full w-full object-contain filter drop-shadow-md"
        unoptimized
      />
    </div>
  );
}
