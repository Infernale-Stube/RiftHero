export interface SummonerRank {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winrate: number;
  peakTier?: string | null;
  peakRank?: string | null;
  peakLp?: number | null;
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
  kda?: number;
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
  heroScore?: number | null;
  score?: DeepLolScore;
  lpDelta?: number | null;
  postGameLp?: number | null;
  postGameTier?: string | null;
  postGameRank?: string | null;
  postGameTotalLp?: number | null;
  lpChange?: MatchLpChange | null;
  largestMultiKill?: number;
  doubleKills?: number;
  tripleKills?: number;
  quadraKills?: number;
  pentaKills?: number;
  gameEndedInSurrender?: boolean;
  gameEndedInEarlySurrender?: boolean;
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
  gameEndTimestamp?: number;
  queueId: number;
  queueName: string;
  win: boolean;
  isRemake?: boolean;
  isSurrender?: boolean;
  isNew?: boolean;
  participant: MatchParticipant;
  blueTeam: MatchParticipant[];
  redTeam: MatchParticipant[];
  blueTeamTotals?: TeamTotals;
  redTeamTotals?: TeamTotals;
  maxDamage?: number;
  lpChange?: MatchLpChange | null;
  teams?: any[];
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

export interface SummonerSearchResult {
  gameName: string;
  tagLine: string;
  region: string;
  profileIconId: number;
  summonerLevel: number;
  tier: string;
  rank?: string;
  leaguePoints?: number;
}

export interface RecentSearchItem {
  gameName: string;
  tagLine: string;
  region: string;
  profileIconId?: number;
  summonerLevel?: number;
  tier?: string;
  timestamp: number;
}

// Champion Mastery Types
export interface ChampionMasteryItem {
  championId: number;
  championName: string;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  tokensEarned: number;
  markRequiredForNextLevel: number;
  championSeasonMilestone?: number;
}

export interface SummonerMasteriesResponse {
  totalMasteryScore: number;
  totalMasteryPoints: number;
  masteryCount: number;
  topMasteryChampions: ChampionMasteryItem[];
  masteries: ChampionMasteryItem[];
}

// Live Game Types
export interface LiveGameParticipantMastery {
  championLevel: number;
  championPoints: number;
  tokensEarned?: number;
  championSeasonMilestone?: number;
}

export interface LiveGameParticipant {
  puuid: string;
  riotId: string;
  summonerName: string;
  summonerLevel?: number;
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
  mastery?: LiveGameParticipantMastery | null;
}

export interface BannedChampion {
  championId: number;
  championName: string;
  teamId: number;
  pickTurn: number;
}

export interface LiveGameWinProbability {
  blueWinrate: number;
  redWinrate: number;
  favoredTeam: 'blue' | 'red' | 'even';
  confidence: 'high' | 'medium' | 'low';
  factors: {
    rankDiffLp: number;
    blueAvgMmr: number;
    redAvgMmr: number;
    blueAvgWinrate: number | null;
    redAvgWinrate: number | null;
    blueChampWinrate: number | null;
    redChampWinrate: number | null;
    sideAdvantage: number;
    blueAvgMasteryPts?: number | null;
    redAvgMasteryPts?: number | null;
    blueAvgMasteryLevel?: number | null;
    redAvgMasteryLevel?: number | null;
    masteryAdvantage?: number;
    mmrAdvantage?: number;
    wrAdvantage?: number;
    champAdvantage?: number;
  };
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
  winProbability?: LiveGameWinProbability;
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
  gameEndTimestamp?: number;
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

// Items Wiki Types
export interface ItemGold {
  base: number;
  total: number;
  sell: number;
  purchasable: boolean;
}

export interface ItemComponentRef {
  id: string;
  name: string;
  icon: string;
  totalGold: number;
}

export interface ItemStatFormatted {
  name: string;
  value: string;
  color?: string;
}

export interface ItemRosterItem {
  id: string;
  name: string;
  plaintext: string;
  description: string;
  colloq: string;
  gold: ItemGold;
  tags: string[];
  categories: string[];
  tier: 'basic' | 'epic' | 'legendary' | 'boots' | 'consumable' | 'starter';
  depth: number;
  maps: Record<string, boolean>;
  stats: Record<string, number>;
  formattedStats: ItemStatFormatted[];
  from: string[];
  into: string[];
  fromItems?: ItemComponentRef[];
  intoItems?: ItemComponentRef[];
  icon: string;
  inStore: boolean;
  requiredChampion?: string | null;
  requiredAlly?: string | null;
  consumed?: boolean;
  stacks?: number;
}

export interface ItemsRosterResponse {
  version: string;
  patch: string;
  totalItems: number;
  items: ItemRosterItem[];
  tree: any[];
}

