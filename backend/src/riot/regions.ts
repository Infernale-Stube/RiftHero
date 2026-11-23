import { PlatformId } from '@fightmegg/riot-rate-limiter';

export type SupportedRegion =
  | 'euw'
  | 'eune'
  | 'na'
  | 'kr'
  | 'br'
  | 'lan'
  | 'las'
  | 'oce'
  | 'tr'
  | 'ru'
  | 'jp'
  | 'sg'
  | 'ph'
  | 'tw'
  | 'vn'
  | 'th'
  | 'me';

export type RegionalCluster = 'europe' | 'americas' | 'asia' | 'sea';

export interface RegionConfig {
  code: SupportedRegion;
  label: string;
  platform: PlatformId;
  cluster: RegionalCluster;
}

export const REGIONS: Record<SupportedRegion, RegionConfig> = {
  euw: {
    code: 'euw',
    label: 'EU West',
    platform: PlatformId.EUW1,
    cluster: 'europe',
  },
  eune: {
    code: 'eune',
    label: 'EU Nordic & East',
    platform: PlatformId.EUNE1,
    cluster: 'europe',
  },
  na: {
    code: 'na',
    label: 'North America',
    platform: PlatformId.NA1,
    cluster: 'americas',
  },
  kr: {
    code: 'kr',
    label: 'Korea',
    platform: PlatformId.KR,
    cluster: 'asia',
  },
  br: {
    code: 'br',
    label: 'Brazil',
    platform: PlatformId.BR1,
    cluster: 'americas',
  },
  lan: {
    code: 'lan',
    label: 'Latin America North',
    platform: PlatformId.LA1,
    cluster: 'americas',
  },
  las: {
    code: 'las',
    label: 'Latin America South',
    platform: PlatformId.LA2,
    cluster: 'americas',
  },
  oce: {
    code: 'oce',
    label: 'Oceania',
    platform: PlatformId.OC1,
    cluster: 'sea',
  },
  tr: {
    code: 'tr',
    label: 'Turkey',
    platform: PlatformId.TR1,
    cluster: 'europe',
  },
  ru: {
    code: 'ru',
    label: 'Russia',
    platform: PlatformId.RU,
    cluster: 'europe',
  },
  jp: {
    code: 'jp',
    label: 'Japan',
    platform: PlatformId.JP1,
    cluster: 'asia',
  },
  sg: {
    code: 'sg',
    label: 'Singapore',
    platform: PlatformId.SG2,
    cluster: 'sea',
  },
  ph: {
    code: 'ph',
    label: 'Philippines',
    platform: PlatformId.PH2,
    cluster: 'sea',
  },
  tw: {
    code: 'tw',
    label: 'Taiwan',
    platform: PlatformId.TW2,
    cluster: 'sea',
  },
  vn: {
    code: 'vn',
    label: 'Vietnam',
    platform: PlatformId.VN2,
    cluster: 'sea',
  },
  th: {
    code: 'th',
    label: 'Thailand',
    platform: PlatformId.TH2,
    cluster: 'sea',
  },
  me: {
    code: 'me',
    label: 'Middle East',
    platform: PlatformId.ME1,
    cluster: 'europe',
  },
};

export function normalizeRegion(regionStr: string): SupportedRegion {
  const clean = regionStr.toLowerCase().trim();
  if (clean in REGIONS) {
    return clean as SupportedRegion;
  }
  // Common aliases
  if (clean === 'euw1') return 'euw';
  if (clean === 'eun1' || clean === 'eune1') return 'eune';
  if (clean === 'na1') return 'na';
  if (clean === 'korea') return 'kr';
  if (clean === 'br1') return 'br';
  if (clean === 'la1') return 'lan';
  if (clean === 'la2') return 'las';
  if (clean === 'oc1') return 'oce';
  if (clean === 'tr1') return 'tr';
  if (clean === 'ru1') return 'ru';
  if (clean === 'jp1') return 'jp';
  if (clean === 'sg2') return 'sg';
  if (clean === 'ph2') return 'ph';
  if (clean === 'tw2') return 'tw';
  if (clean === 'vn2') return 'vn';
  if (clean === 'th2') return 'th';
  if (clean === 'me1') return 'me';
  return 'euw'; // fallback default
}

export function getPlatformForRegion(region: string): PlatformId {
  const norm = normalizeRegion(region);
  return REGIONS[norm].platform;
}

export function getClusterForRegion(region: string): RegionalCluster {
  const norm = normalizeRegion(region);
  return REGIONS[norm].cluster;
}

export function getClusterForPlatform(platform: string): RegionalCluster {
  const p = platform.toUpperCase();
  if (['EUW1', 'EUN1', 'TR1', 'RU', 'ME1'].includes(p)) return 'europe';
  if (['NA1', 'BR1', 'LA1', 'LA2'].includes(p)) return 'americas';
  if (['KR', 'JP1'].includes(p)) return 'asia';
  if (['OC1', 'PH2', 'SG2', 'TH2', 'TW2', 'VN2'].includes(p)) return 'sea';
  return 'europe';
}

export const QUEUE_NAMES: Record<number, string> = {
  420: 'Ranked Solo/Duo',
  440: 'Ranked Flex',
  450: 'ARAM',
  400: 'Normal Draft',
  430: 'Normal Blind',
  490: 'Quickplay',
  1700: 'Arena',
  700: 'Clash',
};

export function getQueueName(queueId: number): string {
  return QUEUE_NAMES[queueId] || `Queue ${queueId}`;
}

export function mapQueueFilterToId(filter?: string): number[] | undefined {
  if (!filter || filter === 'all') return undefined;
  switch (filter.toLowerCase()) {
    case 'ranked_solo':
    case 'solo':
      return [420];
    case 'ranked_flex':
    case 'flex':
      return [440];
    case 'ranked_5s':
    case 'ranked5s':
    case 'ranked_premade_5x5':
      return [4, 42, 440];
    case 'aram':
      return [450];
    case 'arena':
      return [1700];
    case 'normals':
      return [400, 430, 490];
    default:
      return undefined;
  }
}

export function resolveParticipantPosition(p: any): string | null {
  const teamPos = (p.teamPosition || '').trim().toUpperCase();
  if (teamPos && teamPos !== 'INVALID' && teamPos !== 'NONE') {
    return teamPos;
  }
  const indPos = (p.individualPosition || '').trim().toUpperCase();
  if (indPos && indPos !== 'INVALID' && indPos !== 'NONE') {
    return indPos;
  }
  const lane = (p.lane || '').trim().toUpperCase();
  const role = (p.role || '').trim().toUpperCase();
  if (lane === 'BOTTOM' || lane === 'BOT') {
    if (role === 'DUO_SUPPORT' || role === 'SUPPORT') return 'UTILITY';
    if (role === 'DUO_CARRY' || role === 'CARRY') return 'BOTTOM';
  }
  if (lane && lane !== 'NONE') return lane;
  return null;
}
