'use client';

import { useEffect } from 'react';
import { updateDDragonVersion } from '@/lib/ddragon';

/**
 * Periodically verifies and syncs the active game version from
 * https://ddragon.leagueoflegends.com/api/versions.json
 * ensuring all champion, item, spell, and icon images run on the newest patch.
 */
export default function DDragonVersionSync() {
  useEffect(() => {
    // Initial fetch on mount
    updateDDragonVersion();

    // Periodic check every 30 minutes
    const interval = setInterval(() => {
      updateDDragonVersion();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
