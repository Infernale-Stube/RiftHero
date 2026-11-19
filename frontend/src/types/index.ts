export interface SummonerRank {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winrate: number;
}

export interface SummonerData {
  id: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
  platform: string;
  profileIconId: number;
  summonerLevel: number;
  lastFetchedAt: string | null;
}

export interface SummonerProfileResponse {
  summoner: SummonerData | null;
  ranks: SummonerRank[];
  isStale: boolean;
  isUpdating: boolean;
  status: 'cached' | 'fetching' | 'not_found';
}

export interface MatchParticipant {
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  champLevel: number;
  teamId: number;
  win: boolean;
  role: string | null;
  lane: string | null;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  cs: number;
  csPerMinute: number;
  visionScore: number;
  goldEarned: number;
  items: number[];
  spells: number[];
  primaryRune: number | null;
  secondaryStyle: number | null;
}

export interface TeamMember {
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
}

export interface FormattedMatch {
  matchId: string;
  gameDuration: number;
  gameCreation: number;
  queueId: number;
  queueName: string;
  win: boolean;
  participant: MatchParticipant;
  blueTeam: TeamMember[];
  redTeam: TeamMember[];
}

export interface ChampionStatSummary {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  avgCs: number;
  avgCsPerMin: number;
}

export interface RecentSummoner {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
  profileIconId: number;
  summonerLevel: number;
  lastFetchedAt?: string;
  soloRank: {
    tier: string;
    rank: string;
    leaguePoints: number;
  } | null;
}

export interface RecentSearchItem {
  gameName: string;
  tagLine: string;
  region: string;
  profileIconId?: number;
  timestamp: number;
}
