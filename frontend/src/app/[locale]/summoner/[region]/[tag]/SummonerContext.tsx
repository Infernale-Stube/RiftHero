'use client';

import { createContext, useContext } from 'react';
import { SummonerProfileResponse, LiveGameResponse } from '@/types';

export interface SummonerContextValue {
  region: string;
  tag: string;
  profileData: SummonerProfileResponse | null;
  isLoadingProfile: boolean;
  error: string | null;
  liveData: LiveGameResponse | null;
  isLoadingLive: boolean;
  reloadProfile: (isSilent?: boolean) => Promise<void>;
  reloadLiveGame: (isSilent?: boolean) => Promise<LiveGameResponse | null>;
  refreshTimestamp: number;
}

export const SummonerContext = createContext<SummonerContextValue | null>(null);

export function useSummonerContext() {
  const ctx = useContext(SummonerContext);
  if (!ctx) {
    throw new Error('useSummonerContext must be used within a SummonerLayout');
  }
  return ctx;
}
