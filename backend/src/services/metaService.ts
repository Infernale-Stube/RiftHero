import { prisma } from '../db/prisma';

export interface MetaChampion {
  name: string;
  tier: 'S+' | 'S' | 'A';
  winrate: string;
  pickrate: string;
  banrate: string;
  role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  games?: number;
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
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function getMetaChampions(): Promise<{ patch: string; champions: Record<string, MetaChampion[]> }> {
  const PREVIOUS_PATCH = '14.23';
  const now = Date.now();

  if (cachedMeta && now - cachedMeta.timestamp < CACHE_TTL_MS && cachedMeta.patch === PREVIOUS_PATCH) {
    return { patch: PREVIOUS_PATCH, champions: cachedMeta.data };
  }

  const result: Record<string, MetaChampion[]> = {
    TOP: [],
    JUNGLE: [],
    MID: [],
    ADC: [],
    SUPPORT: [],
  };

  try {
    // Purely dynamic database aggregation from recent ranked matches (queueId 420 = Solo, 440 = Flex)
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
      LIMIT 100;
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
            const winrateNum = (item.wins / Math.max(1, item.games)) * 100;
            const pickrateNum = (item.games / Math.max(1, totalRoleGames)) * 100;
            const tier: 'S+' | 'S' | 'A' =
              winrateNum >= 52.0 && pickrateNum >= 12.0
                ? 'S+'
                : winrateNum >= 50.0
                ? 'S'
                : 'A';

            return {
              name: item.championName,
              tier,
              winrate: `${winrateNum.toFixed(1)}%`,
              pickrate: `${pickrateNum.toFixed(1)}%`,
              banrate: '—',
              role: role as any,
              games: item.games,
            };
          });

          // Sort by winrate descending, take top 4
          computed.sort((a, b) => parseFloat(b.winrate) - parseFloat(a.winrate));
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
    patch: PREVIOUS_PATCH,
  };

  return { patch: PREVIOUS_PATCH, champions: result };
}
