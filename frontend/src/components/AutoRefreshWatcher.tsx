'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { fetchSummonerStatus } from '@/lib/api';

interface AutoRefreshWatcherProps {
  region: string;
  tag: string;
  isUpdating: boolean;
  onRefreshCompleted?: () => void;
}

export default function AutoRefreshWatcher({
  region,
  tag,
  isUpdating: initialUpdating,
  onRefreshCompleted,
}: AutoRefreshWatcherProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(initialUpdating);
  const [justCompleted, setJustCompleted] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setUpdating(initialUpdating);
  }, [initialUpdating]);

  useEffect(() => {
    if (!updating) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    let checks = 0;
    const maxChecks = 40; // 40 * 2.5s = 100 seconds timeout

    pollIntervalRef.current = setInterval(async () => {
      checks++;
      try {
        const { status } = await fetchSummonerStatus(region, tag);
        if (status === 'completed' || status === 'not_found' || checks >= maxChecks) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setUpdating(false);
          setJustCompleted(true);

          if (onRefreshCompleted) {
            onRefreshCompleted();
          } else {
            router.refresh();
          }

          setTimeout(() => {
            setJustCompleted(false);
          }, 4000);
        }
      } catch (e) {
        // network retry
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [updating, region, tag, router, onRefreshCompleted]);

  if (!updating && !justCompleted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {updating ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-hextech-blue/50 bg-rift-950/95 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <RefreshCw className="h-4 w-4 animate-spin text-hextech-blue" />
          <span>Profil & Matches werden im Hintergrund aktualisiert...</span>
        </div>
      ) : justCompleted ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/50 bg-rift-950/95 px-4 py-2.5 text-xs font-semibold text-emerald-400 shadow-2xl backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Profil erfolgreich aktualisiert!</span>
        </div>
      ) : null}
    </div>
  );
}
