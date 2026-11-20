import { prisma } from '../db/prisma';
import { getChampionNameById, getDDragonPatches, getLatestDDragonVersion } from '../riot/ddragon';
import championPositionsRaw from '../riot/championPositions.json';
import championMetadataRaw from '../riot/championMetadata.json';

const championMetadataMap = championMetadataRaw as Record<string, any>;

const championPositionsMap = championPositionsRaw as Record<
  string,
  {
    id: string;
    name: string;
    title: string;
    role: string;
    class: string;
    difficulty: number;
    recommendedPositions: string[];
  }
>;

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

// In-memory cache for ultra-fast <1ms responses
let memoryCache: {
  patch: string;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
  championsRoster?: Record<string, any>;
  championDetails?: Record<string, any>;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in-memory refresh
export const MIN_NEW_PATCH_MATCHES = 30;
export const META_WORKER_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let tableChecked = false;

/**
 * Ensures the dedicated meta_snapshots table exists in PostgreSQL.
 */
export async function ensureMetaTableExists(): Promise<void> {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS meta_snapshots (
        id TEXT PRIMARY KEY DEFAULT 'active',
        patch TEXT NOT NULL,
        "totalMatches" INTEGER NOT NULL DEFAULT 0,
        "metaPicksJson" JSONB NOT NULL,
        "tierListJson" JSONB NOT NULL,
        "championsJson" JSONB,
        "championDetailsJson" JSONB,
        "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE meta_snapshots ADD COLUMN IF NOT EXISTS "championsJson" JSONB;
      ALTER TABLE meta_snapshots ADD COLUMN IF NOT EXISTS "championDetailsJson" JSONB;
    `);
    tableChecked = true;
  } catch (err) {
    console.warn('[MetaWorker] Table check warning:', (err as Error).message);
  }
}

function mapSkinRarity(rawRarity?: string): { rarity: string; rarityColor: string } {
  if (!rawRarity) return { rarity: 'Regular', rarityColor: '#22c55e' };
  const r = rawRarity.toLowerCase().replace(/[^a-z]/g, '');
  if (r === 'ktranscendent' || r.includes('transcendent')) {
    return { rarity: 'Transcendent', rarityColor: '#a855f7' };
  }
  if (r === 'kexalted' || r.includes('exalted')) {
    return { rarity: 'Exalted', rarityColor: '#f43f5e' };
  }
  if (r === 'kultimate' || r.includes('ultimate')) {
    return { rarity: 'Ultimate', rarityColor: '#eab308' };
  }
  if (r === 'kmythic' || r.includes('mythic') || r.includes('prestige')) {
    return { rarity: 'Mythic', rarityColor: '#d946ef' };
  }
  if (r === 'klegendary' || r.includes('legendary')) {
    return { rarity: 'Legendary', rarityColor: '#ef4444' };
  }
  if (r === 'kepic' || r.includes('epic')) {
    return { rarity: 'Epic', rarityColor: '#06b6d4' };
  }
  return { rarity: 'Regular', rarityColor: '#22c55e' };
}

function normalizeSkinName(name: string, champName: string): string {
  return (name || '')
    .toLowerCase()
    .replace(new RegExp(champName.toLowerCase(), 'g'), '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Builds localized champion rosters and full champion details (de & en) enriched with:
 * - DDragon base info & full details (spells, passives, stats, lore, skins)
 * - Positional info & classes (from championPositions)
 * - Meraki store pricing (Blue Essence / RP), release dates, skin rarities & release years
 * - Live Meta Analytics (winrate, pickrate, banrate, tier, rank, score, games)
 * Everything is precomputed and saved directly in PostgreSQL, eliminating all external Riot calls on page views!
 */
async function buildChampionRostersAndDetails(
  ddragonVersion: string,
  tierList: TierListChampion[]
): Promise<{
  rosters: { de: any[]; en: any[]; version: string };
  details: { de: Record<string, any>; en: Record<string, any> };
}> {
  const tierMap = new Map<string, TierListChampion>();
  for (const t of tierList) {
    tierMap.set(t.name.toLowerCase().replace(/[^a-z0-9]/g, ''), t);
  }

  // 1. Fetch Meraki champions catalog for store pricing (BE/RP), release dates, and skin rarities
  const merakiMap = new Map<string, any>();
  try {
    const merakiRes = await fetch(
      'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json'
    );
    if (merakiRes.ok) {
      const merakiJson = (await merakiRes.json()) as Record<string, any>;
      for (const [k, v] of Object.entries(merakiJson)) {
        merakiMap.set(k.toLowerCase().replace(/[^a-z0-9]/g, ''), v);
        if (v.id) merakiMap.set(String(v.id), v);
        if (v.key) merakiMap.set(String(v.key), v);
        if (v.name) merakiMap.set(v.name.toLowerCase().replace(/[^a-z0-9]/g, ''), v);
      }
    }
  } catch (err) {
    console.warn('[MetaService] Meraki fetch warning (will use defaults):', (err as Error).message);
  }

  const langs = ['de_DE', 'en_US'] as const;
  const rosters: { de: any[]; en: any[] } = { de: [], en: [] };
  const details: { de: Record<string, any>; en: Record<string, any> } = { de: {}, en: {} };

  for (const lang of langs) {
    const key = lang.startsWith('de') ? 'de' : 'en';
    try {
      const res = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/${lang}/championFull.json`
      );
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json && json.data) {
          const champEntries = Object.values(json.data) as any[];

          for (const champ of champEntries) {
            const posMeta = championPositionsMap[champ.id];
            const cleanName = champ.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanId = champ.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanKey = String(champ.key);
            const metaTier = tierMap.get(cleanName) || tierMap.get(cleanId) || null;

            // Meraki and local bundle match for store pricing and release dates
            const metaChamp =
              championMetadataMap[cleanId] || championMetadataMap[cleanName] || championMetadataMap[cleanKey] || null;
            const merakiChamp =
              merakiMap.get(cleanId) || merakiMap.get(cleanName) || merakiMap.get(cleanKey) || null;

            const storePrice = {
              ip: metaChamp?.be ?? merakiChamp?.price?.blueEssence ?? 4800,
              rp: metaChamp?.rp ?? merakiChamp?.price?.rp ?? 880,
              releaseDate: metaChamp?.d ?? merakiChamp?.releaseDate ?? '2012-01-01',
            };

            const metaBlock = metaTier
              ? {
                  tier: metaTier.tier,
                  winrate: metaTier.winrate,
                  winrateNum: metaTier.winrateNum,
                  pickrate: metaTier.pickrate,
                  pickrateNum: metaTier.pickrateNum,
                  banrate: metaTier.banrate,
                  banrateNum: metaTier.banrateNum,
                  rank: metaTier.rank,
                  score: metaTier.score,
                  games: metaTier.games,
                }
              : null;

            // Process skins: filter out chromas, match with Meraki for timeline, rarities, and release years
            const rawSkins = Array.isArray(champ.skins) ? champ.skins : [];
            const processedSkins = rawSkins
              .filter((s: any) => s.parentSkin === undefined || s.parentSkin === null)
              .map((s: any) => {
                const baseYear = storePrice.releaseDate
                  ? new Date(storePrice.releaseDate).getFullYear()
                  : 2011;

                if (s.num === 0) {
                  return {
                    id: String(s.id),
                    num: 0,
                    name: s.name,
                    rarity: 'Regular',
                    rarityColor: '#2E8D4C',
                    releaseDate: storePrice.releaseDate,
                    releaseYear: isNaN(baseYear) ? 2011 : baseYear,
                    cost: 0,
                  };
                }

                // 1. Primary match: Bundled verified championMetadata or Meraki numeric Skin ID
                const skinMeta = metaChamp?.s?.[String(s.id)];
                let matchedMerakiSkin = merakiChamp?.skins?.find(
                  (m: any) => String(m.id) === String(s.id)
                );

                // 2. Fallback: normalized name matching
                if (!skinMeta && !matchedMerakiSkin) {
                  const ddNorm = normalizeSkinName(s.name, champ.name);
                  matchedMerakiSkin = merakiChamp?.skins?.find(
                    (m: any) => normalizeSkinName(m.name, champ.name) === ddNorm
                  );
                }

                // 3. Known special cases (Hall of Legends / Ultimate variants)
                let relDate = skinMeta?.d || matchedMerakiSkin?.release;
                let rarityRaw = skinMeta?.r || matchedMerakiSkin?.rarity;
                let skinYear = skinMeta?.y;

                if (!skinMeta && !matchedMerakiSkin) {
                  if (String(s.id) === '103086') {
                    // Immortalized Legend Ahri (2024 Hall of Legends)
                    relDate = '2024-06-12';
                    skinYear = 2024;
                    rarityRaw = 'Transcendent';
                  } else if (String(s.id) === '147002' || String(s.id) === '147003') {
                    // Seraphine K/DA ALL OUT variants
                    relDate = '2020-10-29';
                    skinYear = 2020;
                    rarityRaw = 'Transcendent';
                  } else {
                    relDate = storePrice.releaseDate;
                  }
                }

                const rarityInfo = mapSkinRarity(rarityRaw);
                const dObj = relDate ? new Date(relDate) : null;
                const relYear = skinYear || (dObj && !isNaN(dObj.getFullYear()) ? dObj.getFullYear() : (baseYear || 2012));

                const finalCost =
                  typeof skinMeta?.c === 'number'
                    ? skinMeta.c
                    : matchedMerakiSkin?.cost
                    ? parseInt(String(matchedMerakiSkin.cost), 10) || 975
                    : 975;

                return {
                  id: String(s.id),
                  num: s.num,
                  name: s.name,
                  rarity: rarityInfo.rarity,
                  rarityColor: rarityInfo.rarityColor,
                  releaseDate: relDate || storePrice.releaseDate,
                  releaseYear: relYear,
                  cost: finalCost,
                };
              });

            // 1. Roster Item (for /champions list)
            const rosterItem = {
              id: champ.id,
              key: champ.key,
              name: champ.name,
              title: champ.title,
              blurb: champ.blurb,
              info: champ.info,
              image: champ.image,
              tags: champ.tags,
              partype: champ.partype,
              stats: champ.stats,
              role: posMeta?.role || 'Top',
              class: posMeta?.class || champ.tags?.[0] || 'Fighter',
              difficulty: posMeta?.difficulty ?? champ.info?.difficulty ?? 5,
              recommendedPositions: posMeta?.recommendedPositions || ['Top'],
              storeData: storePrice,
              releaseDate: storePrice.releaseDate,
              meta: metaBlock,
            };
            rosters[key].push(rosterItem);

            // 2. Full Detail Item (for /champions/:slug)
            const detailItem = {
              id: champ.id,
              key: champ.key,
              name: champ.name,
              title: champ.title,
              blurb: champ.blurb,
              lore: champ.lore || champ.blurb,
              info: champ.info,
              image: champ.image,
              tags: champ.tags,
              partype: champ.partype,
              stats: champ.stats,
              spells: champ.spells || [],
              passive: champ.passive || null,
              allytips: champ.allytips || [],
              enemytips: champ.enemytips || [],
              skins: processedSkins,
              role: posMeta?.role || 'Top',
              class: posMeta?.class || champ.tags?.[0] || 'Fighter',
              difficulty: posMeta?.difficulty ?? champ.info?.difficulty ?? 5,
              recommendedPositions: posMeta?.recommendedPositions || ['Top'],
              storeData: storePrice,
              releaseDate: storePrice.releaseDate,
              meta: metaBlock,
            };

            // Index by lowercase id and clean name for O(1) instant lookup
            details[key][cleanId] = detailItem;
            details[key][cleanName] = detailItem;
          }
        }
      }
    } catch (err) {
      console.warn(`[MetaService] Failed to fetch DDragon championFull for ${lang}:`, (err as Error).message);
    }
  }

  return {
    rosters: { ...rosters, version: ddragonVersion },
    details,
  };
}

/**
 * Dynamically resolves which patch to use for meta & tier list analytics:
 * - If the latest patch has enough matches (>= MIN_NEW_PATCH_MATCHES), switch to the latest patch.
 * - If there are not enough matches on the new patch, stay on the previous patch from versions.json.
 * - If neither has data, fallback to any available matches in the database.
 */
export async function resolveActiveMetaPatch(): Promise<{
  patch: string;
  isNewPatch: boolean;
  matchCount: number;
}> {
  const patches = await getDDragonPatches();
  const latestPatch = patches[0] || '16.23';
  const previousPatch = patches[1] || '16.22';

  try {
    // 1. Check match count on the latest patch
    const latestCount = await prisma.match.count({
      where: {
        queueId: { in: [420, 440] },
        gameVersion: { startsWith: latestPatch },
      },
    });

    if (latestCount >= MIN_NEW_PATCH_MATCHES) {
      // Sufficient data collected -> automatically switch to the new patch!
      return { patch: latestPatch, isNewPatch: true, matchCount: latestCount };
    }

    // 2. Check match count on the previous patch
    const prevCount = await prisma.match.count({
      where: {
        queueId: { in: [420, 440] },
        gameVersion: { startsWith: previousPatch },
      },
    });

    if (prevCount > 0) {
      // Too few matches on new patch, but previous patch has data -> serve previous patch!
      return { patch: previousPatch, isNewPatch: false, matchCount: prevCount };
    }

    // 3. If latest has some matches (even if < 30) but previous has none
    if (latestCount > 0) {
      return { patch: latestPatch, isNewPatch: true, matchCount: latestCount };
    }

    // 4. Fallback: check most recent ranked match in DB if neither latest nor previous matches exist
    const recentMatch = await prisma.match.findFirst({
      where: { queueId: { in: [420, 440] } },
      select: { gameVersion: true },
      orderBy: { gameCreation: 'desc' },
    });

    if (recentMatch?.gameVersion) {
      const parts = recentMatch.gameVersion.split('.');
      if (parts.length >= 2) {
        const fallbackPatch = `${parts[0]}.${parts[1]}`;
        const fbCount = await prisma.match.count({
          where: {
            queueId: { in: [420, 440] },
            gameVersion: { startsWith: fallbackPatch },
          },
        });
        return { patch: fallbackPatch, isNewPatch: false, matchCount: fbCount };
      }
    }
  } catch (err) {
    console.warn('[MetaService] Error determining active meta patch:', (err as Error).message);
  }

  // Fallback when DB has no matches or is unreachable
  return { patch: previousPatch, isNewPatch: false, matchCount: 0 };
}

let isAnalysisRunning = false;

/**
 * Worker task: Runs every 6h to compute Meta Picks & Tier List from match data
 * and stores the pre-aggregated results into the dedicated 'meta_snapshots' table.
 */
export async function computeAndSaveMetaAnalysis(): Promise<{
  patch: string;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
}> {
  if (isAnalysisRunning) {
    if (memoryCache) return memoryCache;
  }

  isAnalysisRunning = true;
  await ensureMetaTableExists();

  try {
    const { patch } = await resolveActiveMetaPatch();
    const patchFilter = `${patch}%`;
    console.log(`[MetaWorker] Starting 6h periodic analysis for patch ${patch}...`);

    // 1. Gather ban statistics from matches on this patch
    const banCounts = new Map<string, number>();
    const matchesWithBans = await prisma.match.findMany({
      where: {
        queueId: { in: [420, 440] },
        gameVersion: { startsWith: patch },
      },
      select: { teamsJson: true },
      take: 400,
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

    // 2. Query participant performance by position and champion for this patch
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
        AND m."gameVersion" LIKE ${patchFilter}
        AND p."teamPosition" IS NOT NULL
        AND p."teamPosition" != ''
        AND p."championName" IS NOT NULL
      GROUP BY p."teamPosition", p."championName"
      ORDER BY games DESC;
    `;

    const metaPicks: Record<string, MetaChampion[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      ADC: [],
      SUPPORT: [],
    };

    let tierList: TierListChampion[] = [];

    if (rawStats && rawStats.length > 0) {
      const byRole: Record<string, typeof rawStats> = {
        TOP: [],
        JUNGLE: [],
        MID: [],
        ADC: [],
        SUPPORT: [],
      };

      const totalGamesByRole = new Map<string, number>();

      for (const row of rawStats) {
        const canonical = POSITION_MAP[row.teamPosition.toUpperCase()] || 'MID';
        totalGamesByRole.set(canonical, (totalGamesByRole.get(canonical) || 0) + row.games);
        if (byRole[canonical]) {
          byRole[canonical].push(row);
        }
      }

      // Build Meta Picks (Top 4 per lane)
      for (const [role, items] of Object.entries(byRole)) {
        if (items.length > 0) {
          const totalRoleGames = totalGamesByRole.get(role) || 1;
          const computed: MetaChampion[] = items.map((champ) => {
            const winrateNum = (champ.wins / Math.max(1, champ.games)) * 100;
            const pickrateNum = (champ.games / totalRoleGames) * 100;
            const bans = banCounts.get(champ.championName) || 0;
            const banrateNum = totalMatchesAnalyzed > 0 ? (bans / totalMatchesAnalyzed) * 100 : 0;

            const score = (winrateNum - 40) * 4 + pickrateNum * 1.5;
            const tier: 'S+' | 'S' | 'A' | 'B' =
              score >= 70 || (winrateNum >= 53.0 && pickrateNum >= 8.0)
                ? 'S+'
                : score >= 55 || (winrateNum >= 51.5 && pickrateNum >= 5.0)
                ? 'S'
                : score >= 42 || winrateNum >= 50.0
                ? 'A'
                : 'B';

            return {
              name: champ.championName,
              tier,
              winrate: `${winrateNum.toFixed(1)}%`,
              pickrate: `${pickrateNum.toFixed(1)}%`,
              banrate: banrateNum > 0 ? `${banrateNum.toFixed(1)}%` : '0.0%',
              role: role as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT',
              games: champ.games,
              wins: champ.wins,
              losses: Math.max(0, champ.games - champ.wins),
            };
          });

          // Sort by winrate descending, then games, take top 4
          computed.sort((a, b) => parseFloat(b.winrate) - parseFloat(a.winrate) || b.games - a.games);
          metaPicks[role] = computed.slice(0, 4);
        }
      }

      // Build Full Tier List across all champions
      tierList = rawStats.map((item) => {
        const role = (POSITION_MAP[item.teamPosition.toUpperCase()] || 'MID') as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
        const wins = item.wins;
        const games = item.games;
        const losses = Math.max(0, games - wins);
        const winrateNum = (wins / Math.max(1, games)) * 100;
        const roleTotal = totalGamesByRole.get(role) || 1;
        const pickrateNum = (games / roleTotal) * 100;
        const bans = banCounts.get(item.championName) || 0;
        const banrateNum = totalMatchesAnalyzed > 0 ? (bans / totalMatchesAnalyzed) * 100 : 0;

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

      // Sort by score descending, assign ranks
      tierList.sort((a, b) => b.score - a.score || b.winrateNum - a.winrateNum);
      tierList.forEach((c, idx) => {
        c.rank = idx + 1;
      });
    }

    // 3. Fetch & build localized champion rosters (de & en) enriched with meta stats and full champion details
    const ddragonVersion = await getLatestDDragonVersion();
    const { rosters, details } = await buildChampionRostersAndDetails(ddragonVersion, tierList);

    // 4. Save precomputed results into dedicated 'meta_snapshots' database table
    await prisma.metaSnapshot.upsert({
      where: { id: 'active' },
      update: {
        patch,
        totalMatches: totalMatchesAnalyzed,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        championsJson: rosters as any,
        championDetailsJson: details as any,
        computedAt: new Date(),
      },
      create: {
        id: 'active',
        patch,
        totalMatches: totalMatchesAnalyzed,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        championsJson: rosters as any,
        championDetailsJson: details as any,
        computedAt: new Date(),
      },
    });

    console.log(
      `✅ [MetaWorker] Analysis completed for Patch ${patch}. Analyzed ${totalMatchesAnalyzed} matches. Saved to 'meta_snapshots'.`
    );

    // Update in-memory cache
    memoryCache = {
      patch,
      totalMatches: totalMatchesAnalyzed,
      metaPicks,
      tierList,
      championsRoster: rosters,
      championDetails: details,
      timestamp: Date.now(),
    };

    return memoryCache;
  } catch (err) {
    console.warn('[MetaWorker] Analysis error:', (err as Error).message);
    const { patch } = await resolveActiveMetaPatch();

    // Ensure champion rosters and details are ALWAYS built and cached even if match analytics fail!
    let fallbackRosters: any = null;
    let fallbackDetails: any = null;
    try {
      const ddragonVersion = await getLatestDDragonVersion();
      const res = await buildChampionRostersAndDetails(ddragonVersion, []);
      fallbackRosters = res.rosters;
      fallbackDetails = res.details;
    } catch (e) {
      console.warn('[MetaWorker] Fallback rosters build error:', (e as Error).message);
    }

    memoryCache = {
      patch,
      totalMatches: 0,
      metaPicks: { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
      tierList: [],
      championsRoster: fallbackRosters,
      championDetails: fallbackDetails,
      timestamp: Date.now(),
    };

    return memoryCache;
  } finally {
    isAnalysisRunning = false;
  }
}

/**
 * Loads the active precomputed snapshot from memory or 'meta_snapshots' table.
 * Instant lookup (<1ms), zero query lag for the user!
 */
async function loadActiveSnapshot(): Promise<{
  patch: string;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
  championsRoster?: Record<string, any>;
  championDetails?: Record<string, any>;
}> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache;
  }

  await ensureMetaTableExists();

  try {
    const row = await prisma.metaSnapshot.findUnique({
      where: { id: 'active' },
    });

    if (row && row.metaPicksJson && row.tierListJson) {
      memoryCache = {
        patch: row.patch,
        totalMatches: row.totalMatches,
        metaPicks: row.metaPicksJson as any,
        tierList: row.tierListJson as any,
        championsRoster: row.championsJson as any,
        championDetails: row.championDetailsJson as any,
        timestamp: now,
      };
      return memoryCache;
    }
  } catch (err) {
    console.warn('[MetaService] Snapshot lookup error, computing on the fly:', (err as Error).message);
  }

  // If table is empty or query failed, compute immediately
  return await computeAndSaveMetaAnalysis();
}

export function toDDragonLocale(locale = 'de'): 'de_DE' | 'en_US' {
  const l = (locale || '').toLowerCase().replace(/[^a-z]/g, '');
  return l.startsWith('en') ? 'en_US' : 'de_DE';
}

export function toLangKey(locale = 'de'): 'de' | 'en' {
  const l = (locale || '').toLowerCase().replace(/[^a-z]/g, '');
  return l.startsWith('en') ? 'en' : 'de';
}

/**
 * Returns the localized champion catalog enriched with live meta stats.
 * Instant response time (<2ms) directly from PostgreSQL table 'meta_snapshots'.
 */
export async function getChampionsRoster(locale = 'de'): Promise<{
  version: string;
  patch: string;
  totalMatches: number;
  champions: any[];
}> {
  const snapshot = await loadActiveSnapshot();
  const langKey = toLangKey(locale);
  const rosterData = snapshot.championsRoster;
  const list = rosterData?.[langKey] || rosterData?.de || rosterData?.en || [];

  return {
    version: rosterData?.version || snapshot.patch,
    patch: snapshot.patch,
    totalMatches: snapshot.totalMatches,
    champions: list,
  };
}

/**
 * Returns detailed champion information (spells, passive, lore, skins)
 * cached in memory/database so the client never hits Riot's CDN directly.
 */
export async function getChampionDetail(
  slug: string,
  locale = 'de'
): Promise<{
  version: string;
  patch: string;
  champion: any;
}> {
  const snapshot = await loadActiveSnapshot();
  const langKey = toLangKey(locale);
  const cleanTarget = slug.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Direct hit in precomputed snapshot / memory cache (0ms, 0 external calls)
  const cached = snapshot.championDetails?.[langKey]?.[cleanTarget];
  if (cached) {
    return {
      version: snapshot.championsRoster?.version || snapshot.patch,
      patch: snapshot.patch,
      champion: cached,
    };
  }

  // Check alternative language in snapshot as fallback
  const altLangKey = langKey === 'de' ? 'en' : 'de';
  const altCached = snapshot.championDetails?.[altLangKey]?.[cleanTarget];
  if (altCached) {
    return {
      version: snapshot.championsRoster?.version || snapshot.patch,
      patch: snapshot.patch,
      champion: altCached,
    };
  }

  // 2. Fallback on demand if somehow snapshot was missing this champion
  const lang = toDDragonLocale(locale);
  const list = snapshot.championsRoster?.[langKey] || [];
  const found = list.find((c: any) => {
    const cId = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cId === cleanTarget || cName === cleanTarget;
  });

  const champId = found?.id || slug;
  const ddragonVersion = snapshot.championsRoster?.version || (await getLatestDDragonVersion());

  try {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/${lang}/champion/${champId}.json`);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.data && data.data[champId]) {
        const champData = data.data[champId];
        // Filter out chromas from skins (chromas have parentSkin property in DDragon)
        if (champData && Array.isArray(champData.skins)) {
          champData.skins = champData.skins.filter(
            (s: any) => s.parentSkin === undefined || s.parentSkin === null
          );

          // Enrich with bundled championMetadata or Meraki skin release dates, rarities, and store costs
          const metaChamp =
            championMetadataMap[cleanTarget] ||
            championMetadataMap[champId.toLowerCase().replace(/[^a-z0-9]/g, '')] ||
            null;

          let merakiChamp: any = null;
          try {
            const merakiRes = await fetch(
              `https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/${champId}.json`
            );
            if (merakiRes.ok) {
              merakiChamp = (await merakiRes.json()) as any;
            }
          } catch (mErr) {
            console.warn('[MetaService] Meraki detail fallback error:', (mErr as Error).message);
          }

          const relDateFinal = metaChamp?.d || merakiChamp?.releaseDate || '2012-01-01';
          const relYearFinal = metaChamp?.y || (relDateFinal ? new Date(relDateFinal).getFullYear() : 2011);

          champData.storeData = {
            ip: metaChamp?.be ?? merakiChamp?.price?.blueEssence ?? 4800,
            rp: metaChamp?.rp ?? merakiChamp?.price?.rp ?? 880,
            releaseDate: relDateFinal,
          };
          champData.releaseDate = relDateFinal;

          champData.skins = champData.skins.map((s: any) => {
            if (s.num === 0) {
              return {
                ...s,
                rarity: 'Regular',
                rarityColor: '#2E8D4C',
                releaseDate: relDateFinal,
                releaseYear: isNaN(relYearFinal) ? 2011 : relYearFinal,
                cost: 0,
              };
            }
            const skinMeta = metaChamp?.s?.[String(s.id)];
            const matched = merakiChamp?.skins?.find((m: any) => String(m.id) === String(s.id));
            const skinRarity = skinMeta?.r || matched?.rarity || 'Regular';
            const rarityInfo = mapSkinRarity(skinRarity);
            const relDate = skinMeta?.d || matched?.release || relDateFinal;
            const skinYear = skinMeta?.y;
            const dObj = relDate ? new Date(relDate) : null;
            const finalYear = skinYear || (dObj && !isNaN(dObj.getFullYear()) ? dObj.getFullYear() : relYearFinal);
            const finalCost =
              typeof skinMeta?.c === 'number'
                ? skinMeta.c
                : matched?.cost
                ? parseInt(String(matched.cost), 10) || 975
                : 975;

            return {
              ...s,
              rarity: rarityInfo.rarity,
              rarityColor: rarityInfo.rarityColor,
              releaseDate: relDate,
              releaseYear: finalYear,
              cost: finalCost,
            };
          });
        }
        // Cache in memory
        if (!memoryCache) {
          memoryCache = { ...snapshot, timestamp: Date.now() };
        }
        if (!memoryCache.championDetails) {
          memoryCache.championDetails = { de: {}, en: {} };
        }
        if (!memoryCache.championDetails[langKey]) {
          memoryCache.championDetails[langKey] = {};
        }
        memoryCache.championDetails[langKey][cleanTarget] = champData;

        return {
          version: ddragonVersion,
          patch: snapshot.patch,
          champion: champData,
        };
      }
    }
  } catch (err) {
    console.warn(`[MetaService] Failed to fetch champion detail fallback for ${slug}:`, (err as Error).message);
  }

  return {
    version: ddragonVersion,
    patch: snapshot.patch,
    champion: null,
  };
}

/**
 * Returns top meta picks per role from the precomputed table.
 * Instant response time!
 */
export async function getMetaChampions(): Promise<{ patch: string; champions: Record<string, MetaChampion[]> }> {
  const snapshot = await loadActiveSnapshot();
  return {
    patch: snapshot.patch,
    champions: snapshot.metaPicks,
  };
}

/**
 * Returns the comprehensive LoL Tier List across all positions from the precomputed table.
 * Instant response time!
 */
export async function getFullTierList(roleFilter?: string): Promise<{
  patch: string;
  totalMatches: number;
  champions: TierListChampion[];
}> {
  const snapshot = await loadActiveSnapshot();
  let filtered = [...snapshot.tierList];

  // Filter by role if requested
  if (roleFilter && roleFilter.toUpperCase() !== 'ALL') {
    const canonicalFilter = POSITION_MAP[roleFilter.toUpperCase()] || roleFilter.toUpperCase();
    filtered = filtered.filter((c) => c.role === canonicalFilter);
    // Re-index ranks for the selected role
    filtered.forEach((c, idx) => {
      c.rank = idx + 1;
    });
  }

  return {
    patch: snapshot.patch,
    totalMatches: snapshot.totalMatches,
    champions: filtered,
  };
}

let workerTimer: NodeJS.Timeout | null = null;

/**
 * Starts the periodic 6-hour Meta & Tier List background worker.
 * Checks on startup if analysis is missing or older than 6h, and schedules recurring 6h analysis.
 */
export function initMetaAnalysisWorker(intervalMs = META_WORKER_INTERVAL_MS): void {
  // On startup: check if snapshot is missing or stale (>6h)
  (async () => {
    try {
      await ensureMetaTableExists();
      const existing = await prisma.metaSnapshot.findUnique({
        where: { id: 'active' },
        select: { updatedAt: true, totalMatches: true },
      });

      const sixHoursAgo = Date.now() - intervalMs;
      if (!existing || existing.updatedAt.getTime() < sixHoursAgo) {
        console.log('🔄 [MetaWorker] Snapshot missing or older than 6h. Running background analysis...');
        computeAndSaveMetaAnalysis().catch((err) => {
          console.warn('[MetaWorker] Initial background analysis failed:', err);
        });
      } else {
        console.log(`⚡ [MetaWorker] Precomputed snapshot is fresh (${existing.totalMatches} matches). Next run in 6h.`);
      }
    } catch (err) {
      console.warn('[MetaWorker] Startup check warning:', (err as Error).message);
    }
  })();

  if (!workerTimer) {
    workerTimer = setInterval(() => {
      console.log('⏰ [MetaWorker] 6-hour interval reached. Triggering meta & tier list analysis...');
      computeAndSaveMetaAnalysis().catch((err) => {
        console.error('[MetaWorker] Periodic analysis error:', err);
      });
    }, intervalMs);
    workerTimer.unref();
  }
}
