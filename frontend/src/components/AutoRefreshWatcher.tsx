'use client';

import { useEffect, useState, useRef } from 'react';
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
    let notFoundCount = 0;
    const maxChecks = 40; // 40 * 2.5s = 100 seconds timeout

    pollIntervalRef.current = setInterval(async () => {
      checks++;
      try {
        const { status } = await fetchSummonerStatus(region, tag);
        if (status === 'completed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setUpdating(false);

          if (onRefreshCompleted) {
            onRefreshCompleted();
          }
          return;
        }

        if (status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setUpdating(false);
          return;
        }

        if (status === 'not_found') {
          notFoundCount++;
          // Only abort after multiple consecutive not_found responses (12.5s)
          if (notFoundCount >= 5) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setUpdating(false);
            if (onRefreshCompleted) onRefreshCompleted();
          }
          return;
        }

        notFoundCount = 0;

        if (checks >= maxChecks) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setUpdating(false);
          if (onRefreshCompleted) onRefreshCompleted();
        }
      } catch (e) {
        // network retry
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [updating, region, tag, onRefreshCompleted]);

  // Completely silent background watcher as requested: no toasts or popups
  return null;
}
