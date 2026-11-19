'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

          if (onRefreshCompleted) {
            onRefreshCompleted();
          } else {
            router.refresh();
          }
        }
      } catch (e) {
        // network retry
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [updating, region, tag, router, onRefreshCompleted]);

  // Completely silent background watcher as requested: no toasts or popups
  return null;
}
