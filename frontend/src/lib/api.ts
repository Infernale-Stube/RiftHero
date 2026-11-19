import {
  SummonerProfileResponse,
  FormattedMatch,
  ChampionStatSummary,
  RecentSummoner,
} from '@/types';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side (running inside Docker frontend container)
    return process.env.INTERNAL_API_URL || 'http://api:4000/api';
  }
  // Client-side (running in browser via Caddy reverse proxy)
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
