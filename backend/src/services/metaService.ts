import { prisma } from '../db/prisma';
import { getChampionNameById, getPreviousPatch } from '../riot/ddragon';

export interface MetaChampion {
  name: string;
  tier: 'S+' | 'S' | 'A' | 'B';
  winrate: string;
  pickrate: string;
  banrate: string;
  role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  games: number;
  wins: number;
  losses: number;
}

export interface TierListChampion {
  rank: number;
  name: string;
  role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
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

const POSITION_MAP: Record<string, 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'> = {
  TOP: 'TOP',
  JUNGLE: 'JUNGLE',
  MIDDLE: 'MID',
  MID: 'MID',
  BOTTOM: 'ADC',
  BOT: 'ADC',
  UTILITY: 'SUPPORT',
  SUPPORT: 'SUPPORT',
};

let cachedMeta: { data: Record<string, MetaChampion[]>; timestamp: number; patch: string } | null = null;
let cachedTierList: { data: TierListChampion[]; totalMatches: number; timestamp: number; patch: string } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Returns top meta picks per role dynamically aggregated from database matches.
 */
export async function getMetaChampions(): Promise<{ patch: string; champions: Record<string, MetaChampion[]> }> {
  const patch = await getPreviousPatch();
  const now = Date.now();

  if (cachedMeta && now - cachedMeta.timestamp < CACHE_TTL_MS && cachedMeta.patch === patch) {
    return { patch, champions: cachedMeta.data };
  }

  const result: Record<string, MetaChampion[]> = {
    TOP: [],
    JUNGLE: [],
    MID: [],
    ADC: [],
    SUPPORT: [],
  };

  try {
    // 1. Gather ban statistics from matches
    const banCounts = new Map<string, number>();
    const matchesWithBans = await prisma.match.findMany({
      where: { queueId: { in: [420, 440] } },
      select: { teamsJson: true },
      take: 250,
      orderBy: { gameCreation: 'desc' },
    });

    const totalMatchesAnalyzed = matchesWithBans.length;
    for (const m of matchesWithBans) {
      if (Array.isArray(m.teamsJson)) {
        for (const team of m.teamsJson as any[]) {
          if (Array.isArray(team?.bans)) {
            for (const ban of team.bans) {
              const cid = Number(ban?.championId);
              if (cid && cid > 0) {
                const cname = await getChampionNameById(cid);
                if (cname && !cname.startsWith('Champion_')) {
                  banCounts.set(cname, (banCounts.get(cname) || 0) + 1);
                }
              }
            }
          }
        }
      }
    }

    // 2. Query participant performance by position and champion
    const rawStats = await prisma.$queryRaw<
      Array<{
        teamPosition: string;
        championName: string;
        games: number;
        wins: number;
      }>
    >`
      SELECT
        p."teamPosition",
        p."championName",
        COUNT(*)::int as games,
        SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::int as wins
      FROM match_participants p
      JOIN matches m ON p."matchId" = m.id
      WHERE m."queueId" IN (420, 440)
        AND p."teamPosition" IS NOT NULL
        AND p."teamPosition" != ''
        AND p."championName" IS NOT NULL
      GROUP BY p."teamPosition", p."championName"
      ORDER BY games DESC
      LIMIT 120;
    `;

    if (rawStats && rawStats.length > 0) {
      const byRole: Record<string, typeof rawStats> = {
        TOP: [],
        JUNGLE: [],
        MID: [],
        ADC: [],
        SUPPORT: [],
      };

      for (const row of rawStats) {
        const canonical = POSITION_MAP[row.teamPosition.toUpperCase()];
        if (canonical && byRole[canonical]) {
          byRole[canonical].push(row);
        }
      }

      for (const [role, items] of Object.entries(byRole)) {
        if (items.length > 0) {
          const totalRoleGames = items.reduce((sum, item) => sum + item.games, 0);

          const computed: MetaChampion[] = items.map((item) => {
            const wins = item.wins;
            const games = item.games;
            const losses = Math.max(0, games - wins);
            const winrateNum = (wins / Math.max(1, games)) * 100;
            const pickrateNum = (games / Math.max(1, totalRoleGames)) * 100;
            const bans = banCounts.get(item.championName) || 0;
            const banrateNum = totalMatchesAnalyzed > 0 ? (bans / totalMatchesAnalyzed) * 100 : 0;

            const tier: 'S+' | 'S' | 'A' | 'B' =
              winrateNum >= 52.0 && pickrateNum >= 12.0
                ? 'S+'
                : winrateNum >= 50.5
                ? 'S'
                : winrateNum >= 48.0
                ? 'A'
                : 'B';

            return {
              name: item.championName,
              tier,
              winrate: `${winrateNum.toFixed(1)}%`,
              pickrate: `${pickrateNum.toFixed(1)}%`,
              banrate: banrateNum > 0 ? `${banrateNum.toFixed(1)}%` : '—',
              role: role as any,
              games,
              wins,
              losses,
            };
          });

          // Sort by winrate descending, then pickrate, take top 4
          computed.sort((a, b) => parseFloat(b.winrate) - parseFloat(a.winrate) || b.games - a.games);
          result[role] = computed.slice(0, 4);
        }
      }
    }
  } catch (err) {
    console.warn('[MetaService] Dynamic DB aggregation error:', (err as Error).message);
  }

  cachedMeta = {
    data: result,
    timestamp: now,
    patch,
  };

  return { patch, champions: result };
}

/**
 * Returns the comprehensive LoL Tier List across all positions.
 */
export async function getFullTierList(roleFilter?: string): Promise<{
  patch: string;
  totalMatches: number;
  champions: TierListChampion[];
}> {
  const patch = await getPreviousPatch();
  const now = Date.now();

  let allChampions: TierListChampion[] = [];
  let totalMatches = 0;

  if (cachedTierList && now - cachedTierList.timestamp < CACHE_TTL_MS && cachedTierList.patch === patch) {
    allChampions = cachedTierList.data;
    totalMatches = cachedTierList.totalMatches;
  } else {
    try {
      // 1. Gather ban counts
      const banCounts = new Map<string, number>();
      const matchesWithBans = await prisma.match.findMany({
        where: { queueId: { in: [420, 440] } },
        select: { teamsJson: true },
        take: 300,
        orderBy: { gameCreation: 'desc' },
      });
      totalMatches = matchesWithBans.length;

      for (const m of matchesWithBans) {
        if (Array.isArray(m.teamsJson)) {
          for (const team of m.teamsJson as any[]) {
            if (Array.isArray(team?.bans)) {
              for (const ban of team.bans) {
                const cid = Number(ban?.championId);
                if (cid && cid > 0) {
                  const cname = await getChampionNameById(cid);
                  if (cname && !cname.startsWith('Champion_')) {
                    banCounts.set(cname, (banCounts.get(cname) || 0) + 1);
                  }
                }
              }
            }
          }
        }
      }

      // 2. Query participant aggregations
      const rawStats = await prisma.$queryRaw<
        Array<{
          teamPosition: string;
          championName: string;
          games: number;
          wins: number;
        }>
      >`
        SELECT
          p."teamPosition",
          p."championName",
          COUNT(*)::int as games,
          SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::int as wins
        FROM match_participants p
        JOIN matches m ON p."matchId" = m.id
        WHERE m."queueId" IN (420, 440)
          AND p."teamPosition" IS NOT NULL
          AND p."teamPosition" != ''
          AND p."championName" IS NOT NULL
        GROUP BY p."teamPosition", p."championName"
        ORDER BY games DESC;
      `;

      if (rawStats && rawStats.length > 0) {
        // Compute total games per role
        const totalGamesByRole = new Map<string, number>();
        for (const row of rawStats) {
          const canonical = POSITION_MAP[row.teamPosition.toUpperCase()] || 'MID';
          totalGamesByRole.set(canonical, (totalGamesByRole.get(canonical) || 0) + row.games);
        }

        allChampions = rawStats.map((item) => {
          const role = (POSITION_MAP[item.teamPosition.toUpperCase()] || 'MID') as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
          const wins = item.wins;
          const games = item.games;
          const losses = Math.max(0, games - wins);
          const winrateNum = (wins / Math.max(1, games)) * 100;
          const roleTotal = totalGamesByRole.get(role) || 1;
          const pickrateNum = (games / roleTotal) * 100;
          const bans = banCounts.get(item.championName) || 0;
          const banrateNum = totalMatches > 0 ? (bans / totalMatches) * 100 : 0;

          // Composite Performance Score: 50% Winrate + 30% Pickrate + 20% Volume
          const score = Math.min(100, Math.max(0, (winrateNum - 40) * 4 + pickrateNum * 1.5 + Math.min(10, games * 0.5)));

          const tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' =
            score >= 75 || (winrateNum >= 52.5 && pickrateNum >= 10.0)
              ? 'S+'
              : score >= 62 || (winrateNum >= 51.0 && pickrateNum >= 6.0)
              ? 'S'
              : score >= 50 || winrateNum >= 49.5
              ? 'A'
              : score >= 40 || winrateNum >= 47.5
              ? 'B'
              : score >= 30
              ? 'C'
              : 'D';

          return {
            rank: 1,
            name: item.championName,
            role,
            tier,
            winrate: `${winrateNum.toFixed(1)}%`,
            winrateNum,
            pickrate: `${pickrateNum.toFixed(1)}%`,
            pickrateNum,
            banrate: banrateNum > 0 ? `${banrateNum.toFixed(1)}%` : '0.0%',
            banrateNum,
            games,
            wins,
            losses,
            score: Math.round(score * 10) / 10,
          };
        });

        // Sort overall by Score descending, then Winrate
        allChampions.sort((a, b) => b.score - a.score || b.winrateNum - a.winrateNum);
        allChampions.forEach((c, idx) => {
          c.rank = idx + 1;
        });

        cachedTierList = {
          data: allChampions,
          totalMatches,
          timestamp: now,
          patch,
        };
      }
    } catch (err) {
      console.warn('[MetaService] Tier list generation error:', (err as Error).message);
    }
  }

  // Filter by role if requested
  let filtered = allChampions;
  if (roleFilter && roleFilter.toUpperCase() !== 'ALL') {
    const canonicalFilter = POSITION_MAP[roleFilter.toUpperCase()] || roleFilter.toUpperCase();
    filtered = allChampions.filter((c) => c.role === canonicalFilter);
    // Re-index ranks for the selected role
    filtered.forEach((c, idx) => {
      c.rank = idx + 1;
    });
  }

  cachedTierList = {
    data: allChampions,
    totalMatches,
    timestamp: now,
    patch,
  };

  return {
    patch,
    totalMatches,
    champions: filtered,
  };
}
