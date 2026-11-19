import {
  SummonerProfileResponse,
  FormattedMatch,
  ChampionStatSummary,
  RecentSummoner,
  LiveGameResponse,
  MatchDetailResponse,
  LpHistorySummary,
  PlayedWithTeammate,
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
    throw new Error(`Failed to fetch summoner: ${res.statusText}`);
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

export async function fetchSummonerMatches(
  region: string,
  tag: string,
  queue?: string,
  limit = 20,
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
      return { inGame: false, message: 'Spieler ist nicht im Spiel oder Live-Service offline.' };
    }
    return await res.json();
  } catch {
    return { inGame: false, message: 'Fehler beim Abrufen des Live-Spiels.' };
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
