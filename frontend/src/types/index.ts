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
  backgroundUrl?: string | null;
}

export interface SummonerProfileResponse {
  summoner: SummonerData | null;
  ranks: SummonerRank[];
  isStale: boolean;
  isUpdating: boolean;
  status: 'cached' | 'fetching' | 'not_found';
}

export interface LpPoint {
  date: string;
  timestamp: number;
  tier: string;
  rank: string;
  leaguePoints: number;
  totalLp: number;
  delta: number;
  win?: boolean;
}

export interface LpHistorySummary {
  queueType: string;
  currentTier: string;
  currentRank: string;
  currentLp: number;
  netDeltaLp: number;
  peakTier: string;
  peakRank: string;
  peakLp: number;
  longestWinStreak: number;
  points: LpPoint[];
}

export interface PlayedWithTeammate {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  championName?: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
}

export interface MatchLpChange {
  delta: number;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
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
  wardsPlaced: number;
  wardsKilled: number;
  controlWards: number;
  goldEarned: number;
  items: number[];
  spells: number[];
  primaryRune: number | null;
  secondaryStyle: number | null;
  teamPosition?: string | null;
  killParticipation?: number;
  damageShare?: number;
  totalHeal?: number;
  goldSpent?: number;
  score?: DeepLolScore;
  lpChange?: MatchLpChange | null;
}

export interface DeepLolScore {
  score: number;
  rank: number;
  isMvp: boolean;
  isAce: boolean;
  tierRating: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface ScoreTimelinePoint {
  minute: number;
  blueScore: number;
  redScore: number;
  diff: number;
  playerScores: Record<string, number>;
}

export interface TeamTotals {
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  damage: number;
}

export interface FormattedMatch {
  matchId: string;
  gameDuration: number;
  gameCreation: number;
  queueId: number;
  queueName: string;
  win: boolean;
  participant: MatchParticipant;
  blueTeam: MatchParticipant[];
  redTeam: MatchParticipant[];
  blueTeamTotals?: TeamTotals;
  redTeamTotals?: TeamTotals;
  maxDamage?: number;
  lpChange?: MatchLpChange | null;
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
  avgDamage?: number;
  avgDamageTaken?: number;
  avgGold?: number;
  avgVisionScore?: number;
  doubleKills?: number;
  tripleKills?: number;
  quadraKills?: number;
  pentaKills?: number;
  maxKills?: number;
  maxDeaths?: number;
  roles?: Record<string, number>;
  primaryRole?: string;
}

// Challenges Types
export interface FormattedChallengeItem {
  challengeId: number;
  name: string;
  description: string;
  category: string;
  level: string;
  value: number;
  percentile: number;
  achievedTime?: number;
  iconUrl: string;
  isCapstone: boolean;
  thresholds?: Record<string, number>;
  nextThreshold?: {
    tier: string;
    value: number;
  } | null;
}

export interface ChallengeCategoryProgress {
  category: string;
  name: string;
  level: string;
  current: number;
  max: number;
  percentile: number;
  progressPercent: number;
  iconUrl: string;
}

export interface FormattedPlayerChallenges {
  totalPoints: {
    level: string;
    current: number;
    max: number;
    percentile: number;
    progressPercent: number;
    crystalIconUrl: string;
  };
  categoryPoints: Record<string, ChallengeCategoryProgress>;
  challenges: FormattedChallengeItem[];
  preferences?: {
    title?: string;
    bannerAccent?: string;
    challengeIds?: number[];
  };
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

// Live Game Types
export interface LiveGameParticipant {
  puuid: string;
  riotId: string;
  summonerName: string;
  teamId: number;
  championId: number;
  championName: string;
  teamPosition?: string | null;
  spell1Id: number;
  spell2Id: number;
  profileIconId: number;
  primaryRune: number | null;
  secondaryStyle: number | null;
  rank?: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winrate: number;
  } | null;
  championStats?: {
    games: number;
    wins: number;
    losses: number;
    winrate: number;
  } | null;
}

export interface BannedChampion {
  championId: number;
  championName: string;
  teamId: number;
  pickTurn: number;
}

export interface LiveGameData {
  gameId: number;
  gameStartTime: number;
  gameLength: number;
  mapId: number;
  queueId: number;
  queueName: string;
  gameMode: string;
  blueTeam: LiveGameParticipant[];
  redTeam: LiveGameParticipant[];
  bans: BannedChampion[];
}

export interface LiveGameResponse {
  inGame: boolean;
  game?: LiveGameData;
  message?: string;
}

// Dedicated Match Page Types (League of Graphs style)
export interface ObjectiveDetail {
  first: boolean;
  kills: number;
}

export interface TeamMatchDetail {
  teamId: number;
  win: boolean;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalGold: number;
  totalDamage: number;
  bans: Array<{ championId: number; championName: string; pickTurn: number }>;
  objectives: {
    baron: ObjectiveDetail;
    dragon: ObjectiveDetail;
    riftHerald: ObjectiveDetail;
    horde: ObjectiveDetail; // voidgrubs
    tower: ObjectiveDetail;
    inhibitor: ObjectiveDetail;
  };
  dragonTypes?: string[];
}

export interface MatchDetailResponse {
  matchId: string;
  cluster: string;
  gameDuration: number;
  gameCreation: number;
  gameMode: string;
  gameVersion: string;
  queueId: number;
  queueName: string;
  blueTeam: TeamMatchDetail;
  redTeam: TeamMatchDetail;
  participants: MatchParticipant[];
  maxDamage: number;
  maxDamageTaken: number;
  goldAdvantageTimeline: Array<{
    minute: number;
    blueGold: number;
    redGold: number;
    diff: number;
  }>;
  scoreTimeline?: ScoreTimelinePoint[];
  lpChange?: MatchLpChange | null;
}
