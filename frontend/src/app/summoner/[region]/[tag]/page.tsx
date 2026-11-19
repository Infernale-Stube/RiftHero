'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  fetchSummonerProfile,
  fetchSummonerMatches,
  fetchChampionStats,
  fetchLiveGame,
} from '@/lib/api';
import {
  SummonerProfileResponse,
  FormattedMatch,
  ChampionStatSummary,
  LiveGameResponse,
} from '@/types';
import SummonerHeader from '@/components/SummonerHeader';
import ChampionStats from '@/components/ChampionStats';
import MatchHistory from '@/components/MatchHistory';
import LiveGameView from '@/components/LiveGameView';
import AutoRefreshWatcher from '@/components/AutoRefreshWatcher';

export default function SummonerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const region = (params?.region as string) || 'euw';
  const tag = (params?.tag as string) || '';

  const initialTab = searchParams.get('tab') === 'live' ? 'live' : 'matches';
  const [activeTab, setActiveTab] = useState<'matches' | 'live'>(initialTab);

  const [profileData, setProfileData] = useState<SummonerProfileResponse | null>(null);
  const [matches, setMatches] = useState<FormattedMatch[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [champStats, setChampStats] = useState<ChampionStatSummary[]>([]);
  const [activeQueue, setActiveQueue] = useState<string>('all');

  // Live Game State
  const [liveData, setLiveData] = useState<LiveGameResponse | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Profile
  const loadProfile = useCallback(async () => {
    if (!region || !tag) return;
    try {
      const data = await fetchSummonerProfile(region, tag);
      setProfileData(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden des Profils');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [region, tag]);

  // Load Initial Matches & Champion Stats
  const loadMatchesAndStats = useCallback(async (queue: string) => {
    if (!region || !tag) return;
    setIsLoadingMatches(true);
    try {
      const [matchesRes, statsRes] = await Promise.all([
        fetchSummonerMatches(region, tag, queue, 20, 0),
        fetchChampionStats(region, tag, queue),
      ]);
      setMatches(matchesRes.matches);
      setTotalMatches(matchesRes.total);
      setChampStats(statsRes);
    } catch (err: any) {
      console.error('Failed to load matches/stats:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [region, tag]);

  // Load More Matches (Pagination)
  const handleLoadMore = async () => {
    if (isLoadingMore || matches.length >= totalMatches) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchSummonerMatches(region, tag, activeQueue, 20, matches.length);
      setMatches((prev) => [...prev, ...res.matches]);
      setTotalMatches(res.total);
    } catch (err) {
      console.error('Failed to load more matches:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load Live Game
  const loadLiveGame = useCallback(async () => {
    if (!region || !tag) return;
    setIsLoadingLive(true);
    try {
      const res = await fetchLiveGame(region, tag);
      setLiveData(res);
    } catch (err) {
      console.error('Failed to load live game:', err);
    } finally {
      setIsLoadingLive(false);
    }
  }, [region, tag]);

  useEffect(() => {
    loadProfile();
    loadLiveGame(); // Check silently if live game is currently ongoing
  }, [loadProfile, loadLiveGame]);

  useEffect(() => {
    if (profileData?.summoner) {
      loadMatchesAndStats(activeQueue);
    }
  }, [profileData?.summoner, activeQueue, loadMatchesAndStats]);

  useEffect(() => {
    if (activeTab === 'live') {
      loadLiveGame();
    }
  }, [activeTab, loadLiveGame]);

  const handleQueueChange = (queue: string) => {
    setActiveQueue(queue);
  };

  const handleRefreshCompleted = () => {
    loadProfile();
    loadMatchesAndStats(activeQueue);
  };

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-hextech-blue mb-4" />
        <h2 className="text-lg font-bold text-slate-200">Profil wird geladen...</h2>
        <p className="text-xs text-slate-500 mt-1">PostgreSQL & Riot API Überprüfung</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-8 shadow-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400 mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Profil konnte nicht geladen werden</h2>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  // If summoner was never seen before and is currently being fetched by the worker
  if (!profileData?.summoner) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="rounded-2xl border border-hextech-blue/30 bg-black/60 p-8 max-w-md shadow-2xl backdrop-blur-md">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-hextech-blue mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Neuer Spieler wird erfasst
          </h2>
          <p className="text-sm text-slate-300 mb-4">
            Dieses Profil ist noch nicht in PostgreSQL gespeichert. Der Worker ruft gerade Matches und Liga-Ränge über die Riot Production API ab.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-300">
            <span className="h-2 w-2 rounded-full bg-hextech-blue animate-ping" />
            <span>High-Priority Ingestion läuft...</span>
          </div>
        </div>

        <AutoRefreshWatcher
          region={region}
          tag={tag}
          isUpdating={true}
          onRefreshCompleted={handleRefreshCompleted}
        />
      </div>
    );
  }

  const { gameName, tagLine } = profileData.summoner;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Auto-Refresh Background Watcher */}
      <AutoRefreshWatcher
        region={region}
        tag={tag}
        isUpdating={profileData.isUpdating}
        onRefreshCompleted={handleRefreshCompleted}
      />

      {/* Summoner Header (Breadcrumb, Avatar, Level, Riot ID, Rank Cards, Section Tabs) */}
      <div className="mb-8">
        <SummonerHeader
          summoner={profileData.summoner}
          ranks={profileData.ranks}
          isUpdating={profileData.isUpdating}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isLive={liveData?.inGame || false}
        />
      </div>

      {/* Main Content Area based on Active Tab */}
      {activeTab === 'live' ? (
        <div className="w-full">
          <LiveGameView
            region={region}
            gameName={gameName}
            tagLine={tagLine}
            liveData={liveData}
            isLoading={isLoadingLive}
            onRefresh={loadLiveGame}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Champion Overview Sidebar */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6">
            <ChampionStats stats={champStats} />
          </div>

          {/* Right Column: Match History with Details & "Mehr anzeigen" Pagination */}
          <div className="lg:col-span-8 xl:col-span-8">
            <MatchHistory
              matches={matches}
              region={region}
              activeQueue={activeQueue}
              onQueueChange={handleQueueChange}
              isLoading={isLoadingMatches}
              total={totalMatches}
              hasMore={matches.length < totalMatches}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
            />
          </div>
        </div>
      )}
    </div>
  );
}
