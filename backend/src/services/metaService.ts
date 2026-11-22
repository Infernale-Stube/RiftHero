import { prisma } from '../db/prisma';
import { getChampionNameById, getDDragonPatches, getLatestDDragonVersion } from '../riot/ddragon';
import championPositionsRaw from '../riot/championPositions.json';

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

export interface ChampionSnapshotMemory {
  version: string;
  patch: string;
  championsCount: number;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
  championsRoster?: Record<string, any>;
  championDetails?: Record<string, any>;
  timestamp: number;
}

// In-memory cache for ultra-fast <1ms responses
let memoryCache: ChampionSnapshotMemory | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in-memory refresh
export const MIN_NEW_PATCH_MATCHES = 30;
export const META_WORKER_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let tableChecked = false;

/**
 * Ensures the dedicated champion_snapshots table exists in PostgreSQL.
 * Seamlessly renames legacy meta_snapshots table if present.
 */
export async function ensureMetaTableExists(): Promise<void> {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_snapshots')
           AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'champion_snapshots') THEN
          ALTER TABLE meta_snapshots RENAME TO champion_snapshots;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS champion_snapshots (
        id TEXT PRIMARY KEY DEFAULT 'active',
        version TEXT NOT NULL DEFAULT '16.23.1',
        patch TEXT NOT NULL,
        "championsCount" INTEGER NOT NULL DEFAULT 0,
        "championsJson" JSONB NOT NULL,
        "championDetailsJson" JSONB,
        "metaPicksJson" JSONB,
        "tierListJson" JSONB,
        "totalMatches" INTEGER NOT NULL DEFAULT 0,
        "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE champion_snapshots ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '16.23.1';
      ALTER TABLE champion_snapshots ADD COLUMN IF NOT EXISTS "championsCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE champion_snapshots ADD COLUMN IF NOT EXISTS "championsJson" JSONB;
      ALTER TABLE champion_snapshots ADD COLUMN IF NOT EXISTS "championDetailsJson" JSONB;
      ALTER TABLE champion_snapshots ADD COLUMN IF NOT EXISTS "metaPicksJson" JSONB;
      ALTER TABLE champion_snapshots ADD COLUMN IF NOT EXISTS "tierListJson" JSONB;
      ALTER TABLE champion_snapshots ADD COLUMN IF NOT EXISTS "totalMatches" INTEGER NOT NULL DEFAULT 0;
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

interface LoldbSkinInfo {
  id: string;
  num?: number;
  name: string;
  rarity: string;
  officialRarity?: string;
  releaseYear: number;
  releaseDate: string;
  cost: number | string;
}

// Global in-memory maps for LoLDB data
const loldbCatalogMap = new Map<string, any>();
const loldbSkinsCache = new Map<string, Map<string, LoldbSkinInfo>>();

async function syncLoldbCatalog(): Promise<void> {
  if (loldbCatalogMap.size > 0) return;
  try {
    const res = await fetch('https://loldb.info/api/champions');
    if (res.ok) {
      const json = (await res.json()) as any;
      const rawList = json?.data || [];
      // Strictly filter out non-standard TFT/Jade variants that overwrite standard champions
      const list = rawList.filter((c: any) => !c.id.startsWith('Jade_') && !c.id.startsWith('TFT_'));
      for (const v of list) {
        const cleanId = v.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanSlug = (v.slug || v.id).toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanName = v.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        loldbCatalogMap.set(cleanId, v);
        loldbCatalogMap.set(cleanSlug, v);
        loldbCatalogMap.set(cleanName, v);
        if (v.championId) loldbCatalogMap.set(String(v.championId), v);
      }
    }
  } catch (err) {
    console.warn('[MetaService] LoLDB catalog fetch warning:', (err as Error).message);
  }
}

async function fetchLoldbChampionSkins(slug: string): Promise<Map<string, LoldbSkinInfo> | null> {
  const cleanKey = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (loldbSkinsCache.has(cleanKey)) {
    return loldbSkinsCache.get(cleanKey)!;
  }

  await syncLoldbCatalog();
  const loldbEntry = loldbCatalogMap.get(cleanKey);
  const actualSlug = loldbEntry?.slug || loldbEntry?.id || (slug.charAt(0).toUpperCase() + slug.slice(1));

  try {
    const res = await fetch(`https://loldb.info/champions/${actualSlug}`, {
      headers: {
        RSC: '1',
        'Next-Router-State-Tree':
          '%5B%22%22%2C%7B%22children%22%3A%5B%22champions%22%2C%7B%22children%22%3A%5B%22' +
          actualSlug +
          '%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
      },
    });
    if (!res.ok) return null;
    const txt = await res.text();
    const idx = txt.lastIndexOf('"skins":');
    if (idx === -1) return null;
    const arrStart = txt.indexOf('[', idx);
    if (arrStart === -1) return null;

    let depth = 0;
    let endIdx = -1;
    for (let j = arrStart; j < txt.length; j++) {
      if (txt[j] === '[') depth++;
      else if (txt[j] === ']') {
        depth--;
        if (depth === 0) {
          endIdx = j + 1;
          break;
        }
      }
    }
    if (endIdx === -1) return null;
    const skins = JSON.parse(txt.slice(arrStart, endIdx));
    const skinMap = new Map<string, LoldbSkinInfo>();
    const currentYear = new Date().getFullYear();

    for (const s of skins) {
      const skinId = String(s.communityDragonId || s.id || (s.skinNum !== undefined ? s.skinNum : ''));
      let cost: number | string = 975;
      if (typeof s.price === 'string') {
        if (s.price.toLowerCase().includes('free')) cost = 0;
        else if (s.price.toLowerCase().includes('special')) cost = 'Special';
        else {
          const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num)) cost = num;
          else cost = s.price;
        }
      } else if (typeof s.costRP === 'number') {
        cost = s.costRP;
      }

      const releaseYear =
        s.releaseYear || (s.releaseDate ? parseInt(s.releaseDate.slice(0, 4), 10) : currentYear);
      const releaseDate = s.releaseDate || `${releaseYear}-01-01`;

      const info: LoldbSkinInfo = {
        id: skinId,
        num: s.skinNum,
        name: s.name,
        rarity: s.rarity || 'Regular',
        officialRarity: s.rarityTier ? `k${s.rarityTier}` : 'kNoRarity',
        releaseYear,
        releaseDate,
        cost,
      };

      skinMap.set(skinId, info);
      if (s.skinNum !== undefined) {
        skinMap.set(String(s.skinNum), info);
      }
      if (s.name) {
        skinMap.set(s.name.toLowerCase().replace(/[^a-z0-9]/g, ''), info);
      }
    }
    loldbSkinsCache.set(cleanKey, skinMap);
    if (actualSlug) {
      loldbSkinsCache.set(actualSlug.toLowerCase().replace(/[^a-z0-9]/g, ''), skinMap);
    }
    return skinMap;
  } catch (err) {
    console.warn(`[Loldb] Failed to fetch skins for ${slug}:`, (err as Error).message);
    return null;
  }
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

  // 1. Ensure live LoLDB champions catalog is synced (with TFT/Jade filtered out)
  await syncLoldbCatalog();

  // 1b. Pre-fetch all champion skins from LoLDB in parallel batches (concurrency 15)
  const standardChamps = Array.from(new Set(Array.from(loldbCatalogMap.values())));
  const concurrency = 15;
  for (let i = 0; i < standardChamps.length; i += concurrency) {
    const chunk = standardChamps.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (c: any) => {
        const slug = c.slug || c.id;
        const key = (c.id || c.slug).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!loldbSkinsCache.has(key)) {
          await fetchLoldbChampionSkins(slug);
        }
      })
    );
  }

  // Seed in-memory skins cache from existing PostgreSQL snapshot if not already fetched
  try {
    const existing = await prisma.championSnapshot.findUnique({
      where: { id: 'active' },
      select: { championDetailsJson: true },
    });
    if (existing && existing.championDetailsJson) {
      const detailsMap = existing.championDetailsJson as Record<string, Record<string, any>>;
      const source = detailsMap['en'] || detailsMap['de'] || {};
      for (const [champKey, champ] of Object.entries(source)) {
        if (Array.isArray(champ.skins) && !loldbSkinsCache.has(champKey)) {
          const skinMap = new Map<string, LoldbSkinInfo>();
          for (const s of champ.skins) {
            skinMap.set(String(s.id), {
              id: String(s.id),
              num: s.num,
              name: s.name,
              rarity: s.rarity || 'Regular',
              releaseYear: s.releaseYear || 2026,
              releaseDate: s.releaseDate || '2026-01-01',
              cost: s.cost ?? 975,
            });
            if (s.num !== undefined) {
              skinMap.set(String(s.num), skinMap.get(String(s.id))!);
            }
          }
          loldbSkinsCache.set(champKey, skinMap);
        }
      }
    }
  } catch {}

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
            const cleanName = champ.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanId = champ.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanKey = String(champ.key);
            const posMeta = championPositionsMap[champ.id];
            const metaTier = tierMap.get(cleanName) || tierMap.get(cleanId) || null;

            // Live LoLDB match for store pricing, release dates, and positions
            const loldbChamp =
              loldbCatalogMap.get(cleanId) ||
              loldbCatalogMap.get(cleanName) ||
              loldbCatalogMap.get(cleanKey) ||
              null;

            const loldbIsoDate = loldbChamp?.storeData?.releaseDate
              ? loldbChamp.storeData.releaseDate.split('T')[0]
              : null;

            const storePrice = {
              ip: loldbChamp?.storeData?.ip ?? 4800,
              rp: loldbChamp?.storeData?.rp ?? 880,
              releaseDate: loldbIsoDate || '2012-01-01',
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

            // Process skins: filter out chromas, match with LoLDB for timeline, rarities, and release years
            const rawSkins = Array.isArray(champ.skins) ? champ.skins : [];
            let skinsLookup = loldbSkinsCache.get(cleanId) || loldbSkinsCache.get(cleanName);
            if (!skinsLookup && loldbChamp?.slug) {
              skinsLookup = (await fetchLoldbChampionSkins(loldbChamp.slug)) || undefined;
            }

            const baseYear = storePrice.releaseDate
              ? new Date(storePrice.releaseDate).getFullYear()
              : 2011;
            const currentYear = new Date().getFullYear();

            const processedSkins = rawSkins
              .filter((s: any) => s.parentSkin === undefined || s.parentSkin === null)
              .map((s: any) => {
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

                const normName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const skinInfo =
                  skinsLookup?.get(String(s.id)) ||
                  skinsLookup?.get(String(s.num)) ||
                  skinsLookup?.get(normName);
                const rarityRaw = skinInfo?.rarity || 'Regular';
                const rarityInfo = mapSkinRarity(rarityRaw);
                const relYear =
                  skinInfo?.releaseYear || (isNaN(baseYear) ? currentYear : baseYear);
                const relDate = skinInfo?.releaseDate || `${relYear}-01-01`;
                const cost = skinInfo?.cost ?? 975;

                return {
                  id: String(s.id),
                  num: s.num,
                  name: s.name,
                  rarity: rarityInfo.rarity,
                  rarityColor: rarityInfo.rarityColor,
                  releaseDate: relDate,
                  releaseYear: relYear,
                  cost,
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
              role: loldbChamp?.role || posMeta?.role || 'Top',
              class: loldbChamp?.class || posMeta?.class || champ.tags?.[0] || 'Fighter',
              difficulty: loldbChamp?.difficulty ?? posMeta?.difficulty ?? champ.info?.difficulty ?? 5,
              recommendedPositions: loldbChamp?.recommendedPositions || posMeta?.recommendedPositions || ['Top'],
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
 * and stores the pre-aggregated results into the dedicated 'champion_snapshots' table.
 */
export async function computeAndSaveMetaAnalysis(): Promise<ChampionSnapshotMemory> {
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
    const championsCount = rosters.de?.length || rosters.en?.length || 0;

    // 4. Save precomputed results into dedicated 'champion_snapshots' database table
    await prisma.championSnapshot.upsert({
      where: { id: 'active' },
      update: {
        version: ddragonVersion,
        patch,
        championsCount,
        championsJson: rosters as any,
        championDetailsJson: details as any,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        totalMatches: totalMatchesAnalyzed,
        computedAt: new Date(),
      },
      create: {
        id: 'active',
        version: ddragonVersion,
        patch,
        championsCount,
        championsJson: rosters as any,
        championDetailsJson: details as any,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        totalMatches: totalMatchesAnalyzed,
        computedAt: new Date(),
      },
    });

    console.log(
      `✅ [MetaWorker] Analysis completed for Patch ${patch} (Version ${ddragonVersion}). Saved ${championsCount} champions and ${totalMatchesAnalyzed} match analytics to 'champion_snapshots'.`
    );

    // Update in-memory cache
    memoryCache = {
      version: ddragonVersion,
      patch,
      championsCount,
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
    let fallbackVersion = '16.23.1';
    try {
      fallbackVersion = await getLatestDDragonVersion();
      const res = await buildChampionRostersAndDetails(fallbackVersion, []);
      fallbackRosters = res.rosters;
      fallbackDetails = res.details;
    } catch (e) {
      console.warn('[MetaWorker] Fallback rosters build error:', (e as Error).message);
    }

    const fallbackCount = fallbackRosters?.de?.length || fallbackRosters?.en?.length || 0;

    memoryCache = {
      version: fallbackVersion,
      patch,
      championsCount: fallbackCount,
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
 * Loads the active precomputed snapshot from memory or 'champion_snapshots' table.
 * Instant lookup (<1ms), zero query lag for the user!
 */
async function loadActiveSnapshot(): Promise<ChampionSnapshotMemory> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache;
  }

  await ensureMetaTableExists();

  try {
    const row = await prisma.championSnapshot.findUnique({
      where: { id: 'active' },
    });

    if (row && row.championsJson) {
      memoryCache = {
        version: row.version,
        patch: row.patch,
        championsCount: row.championsCount,
        totalMatches: row.totalMatches,
        metaPicks: (row.metaPicksJson as any) || { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
        tierList: (row.tierListJson as any) || [],
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
 * Instant response time (<2ms) directly from PostgreSQL table 'champion_snapshots'.
 */
export async function getChampionsRoster(locale = 'de'): Promise<{
  version: string;
  patch: string;
  totalMatches: number;
  championsCount: number;
  champions: any[];
}> {
  const snapshot = await loadActiveSnapshot();
  const langKey = toLangKey(locale);
  const rosterData = snapshot.championsRoster;
  const list = rosterData?.[langKey] || rosterData?.de || rosterData?.en || [];

  return {
    version: snapshot.version || rosterData?.version || snapshot.patch,
    patch: snapshot.patch,
    totalMatches: snapshot.totalMatches,
    championsCount: snapshot.championsCount || list.length,
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
      version: snapshot.version || snapshot.championsRoster?.version || snapshot.patch,
      patch: snapshot.patch,
      champion: cached,
    };
  }

  // Check alternative language in snapshot as fallback
  const altLangKey = langKey === 'de' ? 'en' : 'de';
  const altCached = snapshot.championDetails?.[altLangKey]?.[cleanTarget];
  if (altCached) {
    return {
      version: snapshot.version || snapshot.championsRoster?.version || snapshot.patch,
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
  const ddragonVersion = snapshot.version || snapshot.championsRoster?.version || (await getLatestDDragonVersion());

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

          // Enrich with dynamic LoLDB skin release dates, rarities, and store costs
          let skinsLookup = loldbSkinsCache.get(cleanTarget);
          if (!skinsLookup) {
            await syncLoldbCatalog();
            const entry = loldbCatalogMap.get(cleanTarget);
            const actualSlug = entry?.slug || entry?.id || champId;
            skinsLookup = (await fetchLoldbChampionSkins(actualSlug)) || undefined;
          }

          const relDateFinal = champData.releaseDate || '2012-01-01';
          const relYearFinal = new Date(relDateFinal).getFullYear();
          const currentYear = new Date().getFullYear();

          champData.storeData = champData.storeData || {
            ip: 4800,
            rp: 880,
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
            const normName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const skinInfo =
              skinsLookup?.get(String(s.id)) ||
              skinsLookup?.get(String(s.num)) ||
              skinsLookup?.get(normName);
            const skinRarity = skinInfo?.rarity || 'Regular';
            const rarityInfo = mapSkinRarity(skinRarity);
            const finalYear =
              skinInfo?.releaseYear || (isNaN(relYearFinal) ? currentYear : relYearFinal);
            const relDate = skinInfo?.releaseDate || `${finalYear}-01-01`;
            const finalCost = skinInfo?.cost ?? 975;

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
      const existing = await prisma.championSnapshot.findUnique({
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
