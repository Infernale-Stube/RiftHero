import {
  SummonerProfileResponse,
  FormattedMatch,
  ChampionStatSummary,
  RecentSummoner,
  LiveGameResponse,
  MatchDetailResponse,
  LpHistorySummary,
  PlayedWithTeammate,
  FormattedPlayerChallenges,
  SummonerMasteriesResponse,
  ItemsRosterResponse,
  ItemRosterItem,
  SummonerSearchResult,
  GameMetadataBundle,
} from '@/types';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://api:4000/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || '/api';
}

export async function fetchSummonerProfile(
  region: string,
  tag: string
): Promise<SummonerProfileResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      return {
        summoner: null,
        ranks: [],
        isStale: true,
        isUpdating: false,
        status: 'not_found',
      };
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Fehler beim Laden des Profils (Status ${res.status})`);
  }

  return await res.json();
}

export async function fetchSummonerStatus(
  region: string,
  tag: string
): Promise<{ status: string }> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/status`, {
    cache: 'no-store',
  });
  if (!res.ok) return { status: 'not_found' };
  return await res.json();
}

export async function triggerSummonerRefresh(
  region: string,
  tag: string
): Promise<{ status: string; message?: string }> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/refresh`, {
    method: 'POST',
    cache: 'no-store',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Fehler beim Starten der Aktualisierung');
  }
  return await res.json();
}

export async function fetchSummonerMatches(
  region: string,
  tag: string,
  queue?: string,
  limit = 10,
  offset = 0
): Promise<{ matches: FormattedMatch[]; total: number }> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (queue && queue !== 'all') params.set('queue', queue);
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());

  const res = await fetch(
    `${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/matches?${params.toString()}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    return { matches: [], total: 0 };
  }

  return await res.json();
}

export async function fetchChampionStats(
  region: string,
  tag: string,
  queue?: string
): Promise<ChampionStatSummary[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (queue && queue !== 'all') params.set('queue', queue);

  const res = await fetch(
    `${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/champion-stats?${params.toString()}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    return [];
  }

  return await res.json();
}

export async function fetchRecentSummoners(limit = 10): Promise<RecentSummoner[]> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/summoners/recent?limit=${limit}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchLiveGame(
  region: string,
  tag: string
): Promise<LiveGameResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/live-game`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      try {
        const errorData = await res.json();
        if (errorData?.message) {
          return { inGame: false, message: errorData.message };
        }
      } catch {
        // ignore JSON parse error
      }
      return {
        inGame: false,
        message: `API-Status: ${res.status} (${res.statusText || 'Keine Antwort vom Server'}).`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      inGame: false,
      message: `Netzwerkfehler beim Abrufen des Live-Spiels: ${err?.message || 'Server nicht erreichbar'}.`,
    };
  }
}

export async function fetchMatchDetails(
  region: string,
  matchId: string
): Promise<MatchDetailResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/matches/${region}/${encodeURIComponent(matchId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch match details for ${matchId}:`, err);
    return null;
  }
}

export async function fetchLpHistory(
  region: string,
  tag: string,
  queue = 'RANKED_SOLO_5x5'
): Promise<LpHistorySummary | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(
      `${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/lp-history?queue=${encodeURIComponent(queue)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPlayedWith(
  region: string,
  tag: string,
  limit = 5
): Promise<PlayedWithTeammate[]> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(
      `${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/played-with?limit=${limit}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchSummonerChallenges(
  region: string,
  tag: string
): Promise<FormattedPlayerChallenges | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(
      `${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/challenges`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch challenges:', err);
    return null;
  }
}

export async function fetchSummonerMasteries(
  region: string,
  tag: string
): Promise<SummonerMasteriesResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(
      `${baseUrl}/summoners/${region}/${encodeURIComponent(tag)}/masteries`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch masteries:', err);
    return null;
  }
}

export interface MetaChampionItem {
  name: string;
  tier: 'S+' | 'S' | 'A' | 'B';
  winrate: string;
  pickrate: string;
  banrate: string;
  role: string;
  games?: number;
  wins?: number;
  losses?: number;
}

export interface MetaChampionsResponse {
  patch: string;
  champions: Record<string, MetaChampionItem[]>;
}

export async function fetchMetaChampions(): Promise<MetaChampionsResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/meta/champions`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface TierListChampionItem {
  rank: number;
  name: string;
  role: string;
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  winrate: string;
  winrateNum: number;
  pickrate: string;
  pickrateNum: number;
  banrate: string;
  banrateNum: number;
  games: number;
  wins: number;
  losses: number;
  score: number;
}

export interface TierListResponse {
  patch: string;
  totalMatches: number;
  champions: TierListChampionItem[];
}

export async function fetchTierList(role?: string): Promise<TierListResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const url = role && role !== 'ALL' ? `${baseUrl}/meta/tier-list?role=${role}` : `${baseUrl}/meta/tier-list`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface ChampionRosterItem {
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  info: { attack: number; defense: number; magic: number; difficulty: number };
  image: { full: string; sprite: string; group: string };
  tags: string[];
  partype: string;
  stats: Record<string, number>;
  role: string;
  class: string;
  difficulty: number;
  recommendedPositions: string[];
  releaseDate?: string;
  storeData?: {
    ip: number;
    rp: number;
    releaseDate: string;
  };
  meta?: {
    tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
    winrate: string;
    winrateNum: number;
    pickrate: string;
    pickrateNum: number;
    banrate: string;
    banrateNum: number;
    rank: number;
    score: number;
    games: number;
  } | null;
}

export interface ChampionsRosterResponse {
  version: string;
  patch: string;
  totalMatches: number;
  champions: ChampionRosterItem[];
}

export async function fetchChampionsRosterApi(locale = 'de'): Promise<ChampionsRosterResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/champions?locale=${locale}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchChampionDetailApi(
  slug: string,
  locale = 'de'
): Promise<{
  version: string;
  patch: string;
  champion: any;
} | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/champions/${encodeURIComponent(slug)}?locale=${locale}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchChampionSkinsApi(
  champion: string
): Promise<{
  totalSkins: number;
  skins: any[];
} | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/skins/${encodeURIComponent(champion)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchItemsRosterApi(locale = 'de'): Promise<ItemsRosterResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/items?locale=${locale}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchItemDetailApi(
  id: string,
  locale = 'de'
): Promise<{
  version: string;
  patch: string;
  item: ItemRosterItem | null;
} | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/items/${encodeURIComponent(id)}?locale=${locale}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchSummonersApi(
  query: string,
  region?: string,
  limit = 6
): Promise<SummonerSearchResult[]> {
  if (!query || !query.trim()) return [];
  const baseUrl = getApiBaseUrl();
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
    });
    if (region && region.toLowerCase() !== 'all') {
      params.set('region', region);
    }
    const res = await fetch(`${baseUrl}/search?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Failed to search summoners:', err);
    return [];
  }
}

export async function fetchGameMetadata(): Promise<GameMetadataBundle | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/meta/game-data`, {
      cache: 'default',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch game metadata from API:', err);
    return null;
  }
}


