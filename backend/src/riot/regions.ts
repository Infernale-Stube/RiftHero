import { PlatformId } from '@fightmegg/riot-rate-limiter';

export type SupportedRegion = 'euw' | 'eune' | 'na' | 'kr';

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
  if (['EUW1', 'EUN1', 'TR1', 'RU'].includes(p)) return 'europe';
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
