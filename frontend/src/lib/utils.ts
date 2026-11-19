import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export function formatTimeAgo(timestamp: number | string): string {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'vor wenigen Sekunden';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.floor(diffHours / 24);
  return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
}

export function getKdaColor(kda: number): string {
  if (kda >= 5.0) return 'text-orange-400 font-bold';
  if (kda >= 4.0) return 'text-sky-400 font-semibold';
  if (kda >= 3.0) return 'text-emerald-400 font-medium';
  if (kda >= 2.0) return 'text-slate-200';
  return 'text-slate-400';
}

export function getWinrateColor(winrate: number): string {
  if (winrate >= 60) return 'text-emerald-400 font-bold';
  if (winrate >= 50) return 'text-sky-400 font-medium';
  return 'text-slate-400';
}
