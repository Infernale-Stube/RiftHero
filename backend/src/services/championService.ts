import { prisma } from '../db/prisma';
import { getLatestDDragonVersion } from '../riot/ddragon';
import championPositionsRaw from '../riot/championPositions.json';
import { getMetaSnapshot } from './metaService';

const championPositionsMap = (championPositionsRaw as unknown) as Record<
  string,
  { role?: string; positions?: string[]; recommendedPositions?: string[]; classes?: string[]; class?: string }
>;

export interface ChampionRecord {
  id: string;
  key: string;
  name: string;
  title: string;
  image: string;
  role?: string;
  positions: string[];
  tags: string[];
  difficulty: number;
  classes?: string[];
  releaseDate?: string;
  storeData?: {
    ip: number;
    rp: number;
    releaseDate?: string;
  };
  meta?: any;
}

export interface ChampionSnapshotMemory {
  id: 'current' | 'previous' | 'active';
  version: string;
  patch: string;
  championsCount: number;
  championsRoster?: Record<string, any>;
  championDetails?: Record<string, any>;
  timestamp: number;
}

export interface LoldbSkinInfo {
  id: string;
  num?: number;
  name: string;
  rarity: string;
  officialRarity?: string;
  releaseYear: number;
  releaseDate?: string;
  cost: number | string;
  currency?: 'RP' | 'AS' | 'BE' | string;
  isLegacy?: boolean;
  skinLines?: string[];
}

let tableChecked = false;

/**
 * Ensures the dedicated champion_snapshots table exists in PostgreSQL.
 */
export async function ensureChampionTableExists(): Promise<void> {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS champion_snapshots (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL DEFAULT '16.23.1',
        patch TEXT NOT NULL,
        "championsCount" INTEGER NOT NULL DEFAULT 0,
        "championsJson" JSONB NOT NULL,
        "championDetailsJson" JSONB,
        "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    tableChecked = true;
  } catch (err) {
    console.warn('[ChampionService] Table check warning:', (err as Error).message);
  }
}

export const ensureMetaTableExists = ensureChampionTableExists;

export function mapSkinRarity(rawRarity?: string): { rarity: string; rarityColor: string } {
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

// Global in-memory maps for LoLDB data
const loldbCatalogMap = new Map<string, any>();
const loldbSkinsCache = new Map<string, Map<string, LoldbSkinInfo>>();
const globalSkinMap = new Map<string, LoldbSkinInfo>();

/**
 * Synchronizes the complete skin database (2,000+ skins) directly from LoLDB /skins catalog.
 * Uses the Next.js RSC Data stream to fetch all skins, exact release dates, rarity and RP pricing in 1 single request.
 */
export async function syncLoldbSkins(): Promise<void> {
  if (globalSkinMap.size > 0) return;
  try {
    const res = await fetch('https://loldb.info/skins', {
      headers: { RSC: '1' },
    });
    if (!res.ok) return;
    const text = await res.text();
    const marker = '"allSkins":[';
    const startIdx = text.indexOf(marker);
    if (startIdx === -1) return;

    const arrStart = startIdx + marker.length - 1;
    let depth = 0;
    let endIdx = -1;
    for (let j = arrStart; j < text.length; j++) {
      if (text[j] === '[') depth++;
      else if (text[j] === ']') {
        depth--;
        if (depth === 0) {
          endIdx = j + 1;
          break;
        }
      }
    }
    if (endIdx === -1) return;

    const raw = text.slice(arrStart, endIdx).replace(/"\$undefined"/g, 'null');
    const skins = JSON.parse(raw);

    for (const s of skins) {
      let releaseDate: string | undefined;
      let releaseYear: number = new Date().getFullYear();
      if (s.releaseDate) {
        const dt = new Date(s.releaseDate);
        if (!isNaN(dt.getTime())) {
          releaseYear = dt.getFullYear();
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          releaseDate = `${releaseYear}-${mm}-${dd}`;
        }
      }

      let cost: number | string = 975;
      let currency = 'RP';
      if (typeof s.price === 'string') {
        const pLower = s.price.toLowerCase();
        if (pLower.includes('free')) {
          cost = 0;
          currency = 'RP';
        } else if (pLower.includes('n/a')) {
          cost = 'N/A';
          currency = 'RP';
        } else if (s.price.includes('AS')) {
          const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10);
          cost = isNaN(num) ? s.price : num;
          currency = 'AS';
        } else if (s.price.includes('BE')) {
          const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10);
          cost = isNaN(num) ? s.price : num;
          currency = 'BE';
        } else {
          const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num)) cost = num;
          else cost = s.price;
          currency = 'RP';
        }
      }

      const isLegacy = Boolean(s.isLegacy);

      const info: LoldbSkinInfo = {
        id: String(s.id),
        name: s.name,
        rarity: s.tier || 'Regular',
        officialRarity: s.tier ? `k${s.tier}` : 'kNoRarity',
        releaseYear,
        releaseDate: releaseDate || `${releaseYear}-01-01`,
        cost,
        currency,
        isLegacy,
        skinLines: s.skinLineNames || [],
      };

      // Store in global ID map
      globalSkinMap.set(String(s.id), info);

      // Also categorize by champion key
      const champKey = (s.champion || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (champKey) {
        if (!loldbSkinsCache.has(champKey)) {
          loldbSkinsCache.set(champKey, new Map<string, LoldbSkinInfo>());
        }
        const map = loldbSkinsCache.get(champKey)!;
        map.set(String(s.id), info);
        if (s.name) {
          map.set(s.name.toLowerCase().replace(/[^a-z0-9]/g, ''), info);
        }
      }
    }
    console.log(`[ChampionService] Synced ${globalSkinMap.size} skins directly from LoLDB /skins catalog.`);
  } catch (err) {
    console.warn('[ChampionService] LoLDB /skins catalog fetch warning:', (err as Error).message);
  }
}

/**
 * Synchronizes champion store pricing (Blue Essence, RP) and release dates from LoLDB API.
 */
export async function syncLoldbCatalog(): Promise<void> {
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
    console.warn('[ChampionService] LoLDB catalog fetch warning:', (err as Error).message);
  }
}

export async function fetchLoldbChampionSkins(slug: string): Promise<Map<string, LoldbSkinInfo> | null> {
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
      let currency = 'RP';
      if (typeof s.price === 'string') {
        const pLower = s.price.toLowerCase();
        if (pLower.includes('free')) {
          cost = 0;
          currency = 'RP';
        } else if (pLower.includes('special')) {
          cost = 'Special';
          currency = 'RP';
        } else if (s.price.includes('AS')) {
          const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10);
          cost = isNaN(num) ? s.price : num;
          currency = 'AS';
        } else if (s.price.includes('BE')) {
          const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10);
          cost = isNaN(num) ? s.price : num;
          currency = 'BE';
        } else {
          const num = parseInt(s.price.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num)) cost = num;
          else cost = s.price;
          currency = 'RP';
        }
      } else if (typeof s.costRP === 'number') {
        cost = s.costRP;
        currency = 'RP';
      }

      const isLegacy = Boolean(s.isLegacy);

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
        currency,
        isLegacy,
        skinLines: s.skinLines || [],
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
    console.warn(`[ChampionService] Failed to fetch skins for ${slug}:`, (err as Error).message);
    return null;
  }
}

/**
 * Builds localized champion rosters and full champion details (de & en) enriched with:
 * - DDragon base info & full details (spells, passives, stats, lore, skins)
 * - Positional info & classes (from championPositions)
 * - LoLDB store pricing (Blue Essence / RP), release dates, skin rarities & exact release dates
 */
export async function buildChampionRostersAndDetails(
  ddragonVersion: string
): Promise<{
  rosters: { de: any[]; en: any[]; version: string };
  details: { de: Record<string, any>; en: Record<string, any> };
}> {
  // 1. Ensure live LoLDB champions catalog is synced (with TFT/Jade filtered out)
  await syncLoldbCatalog();

  // 1b. Fast sync of all 2000+ skins directly from LoLDB /skins catalog
  await syncLoldbSkins();

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

            // Process skins: filter out chromas, match with LoLDB for timeline, rarities, and release dates
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
                    currency: 'RP',
                    isLegacy: false,
                  };
                }

                const normName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                const skinInfo =
                  globalSkinMap.get(String(s.id)) ||
                  skinsLookup?.get(String(s.id)) ||
                  skinsLookup?.get(String(s.num)) ||
                  skinsLookup?.get(normName);

                const rarityRaw = skinInfo?.rarity || 'Regular';
                const rarityInfo = mapSkinRarity(rarityRaw);

                const relYear =
                  skinInfo?.releaseYear || (isNaN(baseYear) ? currentYear : baseYear);
                const relDate = skinInfo?.releaseDate || `${relYear}`;
                const cost = skinInfo?.cost ?? 975;
                const currency = skinInfo?.currency || (typeof cost === 'string' && cost.includes('AS') ? 'AS' : 'RP');
                const isLegacy = Boolean(skinInfo?.isLegacy);

                return {
                  id: String(s.id),
                  num: s.num,
                  name: s.name,
                  rarity: rarityInfo.rarity,
                  rarityColor: rarityInfo.rarityColor,
                  releaseDate: relDate,
                  releaseYear: relYear,
                  cost,
                  currency,
                  isLegacy,
                  skinLines: skinInfo?.skinLines || [],
                };
              });

            // 1. Roster summary entry
            const rosterEntry = {
              id: champ.id,
              key: champ.key,
              name: champ.name,
              title: champ.title,
              image: `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champ.image?.full || `${champ.id}.png`}`,
              role: posMeta?.role || loldbChamp?.role || champ.tags?.[0] || 'Mid',
              positions: posMeta?.positions || posMeta?.recommendedPositions || loldbChamp?.recommendedPositions || champ.tags || ['Mid'],
              tags: champ.tags || [],
              difficulty: champ.info?.difficulty ?? 5,
              classes: posMeta?.classes || (loldbChamp?.class ? [loldbChamp.class] : champ.tags) || [],
              releaseDate: storePrice.releaseDate,
              storeData: storePrice,
              meta: null,
            };
            rosters[key].push(rosterEntry);

            // 2. Full champion detail entry
            details[key][cleanId] = {
              id: champ.id,
              key: champ.key,
              name: champ.name,
              title: champ.title,
              blurb: champ.blurb || champ.lore || '',
              lore: champ.lore || champ.blurb || '',
              tags: champ.tags || [],
              partype: champ.partype || 'Mana',
              info: champ.info || { attack: 5, defense: 5, magic: 5, difficulty: 5 },
              stats: champ.stats || {},
              spells: (champ.spells || []).map((sp: any) => ({
                id: sp.id,
                name: sp.name,
                description: sp.description,
                tooltip: sp.tooltip,
                cooldown: sp.cooldown,
                cooldownBurn: sp.cooldownBurn,
                cost: sp.cost,
                costBurn: sp.costBurn,
                costType: sp.costType,
                range: sp.range,
                rangeBurn: sp.rangeBurn,
                image: {
                  full: sp.image?.full || (typeof sp.image === 'string' ? sp.image.split('/').pop() || '' : `${sp.id}.png`),
                },
              })),
              passive: champ.passive
                ? {
                    name: champ.passive.name,
                    description: champ.passive.description,
                    image: {
                      full: champ.passive.image?.full || (typeof champ.passive.image === 'string' ? champ.passive.image.split('/').pop() || '' : ''),
                    },
                  }
                : null,
              skins: processedSkins,
              role: posMeta?.role || loldbChamp?.role || champ.tags?.[0] || 'Mid',
              positions: posMeta?.positions || posMeta?.recommendedPositions || loldbChamp?.recommendedPositions || champ.tags || ['Mid'],
              classes: posMeta?.classes || (loldbChamp?.class ? [loldbChamp.class] : champ.tags) || [],
              releaseDate: storePrice.releaseDate,
              storeData: storePrice,
              meta: null,
            };
            // Also index by key, name and slug
            details[key][cleanName] = details[key][cleanId];
            details[key][cleanKey] = details[key][cleanId];
            if (loldbChamp?.slug) {
              const cleanSlug = loldbChamp.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
              details[key][cleanSlug] = details[key][cleanId];
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[ChampionService] Failed to load championFull for ${lang}:`, (err as Error).message);
    }
  }

  return {
    rosters: { de: rosters.de, en: rosters.en, version: ddragonVersion },
    details,
  };
}

export function isSnapshotFresh(row: any): boolean {
  if (!row || !row.championDetailsJson) return false;
  try {
    const details = row.championDetailsJson as any;
    const aatrox = details?.de?.aatrox || details?.en?.aatrox;
    if (!aatrox || !Array.isArray(aatrox.skins)) return false;
    // Check if Mecha Aatrox (num: 2 or id: '266002') has correct releaseYear 2014 and full releaseDate from LoLDB /skins
    const mecha = aatrox.skins.find((s: any) => s.num === 2 || s.id === '266002');
    if (!mecha || mecha.releaseYear !== 2014 || mecha.releaseDate !== '2014-07-23') {
      return false;
    }
    // Also check if isLegacy and currency fields are present
    if (mecha.isLegacy === undefined || mecha.currency === undefined) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// In-memory cache for fast (<1ms) reads: slot -> memory object
const championMemoryCache = new Map<'current' | 'previous', { data: ChampionSnapshotMemory; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Champion Worker task:
 * Synchronizes Champion catalog data (DDragon versions/spells/stats + LoLDB skins/pricing)
 * and stores the champion snapshot in PostgreSQL 'champion_snapshots' table.
 *
 * Patch rotation logic:
 * When a new patch arrives:
 * 1. Current data is moved into the 'previous' slot (overwriting older patch).
 * 2. New patch is saved into the 'current' slot.
 */
export async function syncChampionSnapshot(force = false): Promise<ChampionSnapshotMemory> {
  await ensureChampionTableExists();
  const ddragonVersion = await getLatestDDragonVersion(force);
  const patch = ddragonVersion.split('.').slice(0, 2).join('.');

  console.log(`[ChampionWorker] Syncing champion snapshot for version ${ddragonVersion} (Patch ${patch})...`);

  // Check existing 'current' slot in champion_snapshots
  const existingCurrent = await prisma.championSnapshot.findUnique({
    where: { id: 'current' },
  });

  if (existingCurrent && existingCurrent.patch !== patch) {
    console.log(
      `📦 [ChampionWorker] New patch detected (${existingCurrent.patch} -> ${patch}). Shifting previous champion catalog ${existingCurrent.patch} into 'previous' slot...`
    );
    await prisma.championSnapshot.upsert({
      where: { id: 'previous' },
      update: {
        version: existingCurrent.version,
        patch: existingCurrent.patch,
        championsCount: existingCurrent.championsCount,
        championsJson: existingCurrent.championsJson as any,
        championDetailsJson: existingCurrent.championDetailsJson as any,
        updatedAt: new Date(),
      },
      create: {
        id: 'previous',
        version: existingCurrent.version,
        patch: existingCurrent.patch,
        championsCount: existingCurrent.championsCount,
        championsJson: existingCurrent.championsJson as any,
        championDetailsJson: existingCurrent.championDetailsJson as any,
        updatedAt: new Date(),
      },
    });
    championMemoryCache.delete('previous');
  }

  const { rosters, details } = await buildChampionRostersAndDetails(ddragonVersion);
  const championsCount = rosters.de?.length || rosters.en?.length || 0;
  const now = new Date();

  // Save into 'current' slot
  await prisma.championSnapshot.upsert({
    where: { id: 'current' },
    update: {
      version: ddragonVersion,
      patch,
      championsCount,
      championsJson: rosters as any,
      championDetailsJson: details as any,
      updatedAt: now,
    },
    create: {
      id: 'current',
      version: ddragonVersion,
      patch,
      championsCount,
      championsJson: rosters as any,
      championDetailsJson: details as any,
      computedAt: now,
      updatedAt: now,
    },
  });

  // Also maintain 'active' slot for backwards compatibility
  await prisma.championSnapshot.upsert({
    where: { id: 'active' },
    update: {
      version: ddragonVersion,
      patch,
      championsCount,
      championsJson: rosters as any,
      championDetailsJson: details as any,
      updatedAt: now,
    },
    create: {
      id: 'active',
      version: ddragonVersion,
      patch,
      championsCount,
      championsJson: rosters as any,
      championDetailsJson: details as any,
      computedAt: now,
      updatedAt: now,
    },
  });

  const memoryObj: ChampionSnapshotMemory = {
    id: 'current',
    version: ddragonVersion,
    patch,
    championsCount,
    championsRoster: rosters as any,
    championDetails: details as any,
    timestamp: Date.now(),
  };

  championMemoryCache.set('current', { data: memoryObj, timestamp: Date.now() });

  console.log(
    `⚡ [ChampionWorker] Champion snapshot successfully updated (${championsCount} champions, version ${ddragonVersion}, patch ${patch}).`
  );
  return memoryObj;
}

/**
 * Loads the active precomputed snapshot from memory or 'champion_snapshots' table for a given slot.
 * Instant lookup (<1ms), zero query lag for the user!
 */
export async function loadActiveChampionSnapshot(
  slot: 'current' | 'previous' = 'current'
): Promise<ChampionSnapshotMemory> {
  const cached = championMemoryCache.get(slot);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  await ensureChampionTableExists();

  try {
    // Try primary slot, then fallback to 'active' for legacy
    let row = await prisma.championSnapshot.findUnique({
      where: { id: slot },
    });
    if (!row && slot === 'current') {
      row = await prisma.championSnapshot.findUnique({ where: { id: 'active' } });
    }

    if (row && row.championsJson && isSnapshotFresh(row)) {
      const memoryObj: ChampionSnapshotMemory = {
        id: (row.id as any) || slot,
        version: row.version,
        patch: row.patch,
        championsCount: row.championsCount,
        championsRoster: row.championsJson as any,
        championDetails: row.championDetailsJson as any,
        timestamp: now,
      };
      championMemoryCache.set(slot, { data: memoryObj, timestamp: now });
      return memoryObj;
    }

    if (row && !isSnapshotFresh(row) && slot === 'current') {
      console.log(
        '🔄 [ChampionService] Stored snapshot has outdated skin release years. Recomputing fresh snapshot from DDragon + LoLDB...'
      );
    }
  } catch (err) {
    console.warn('[ChampionService] Snapshot lookup error, computing on the fly:', (err as Error).message);
  }

  // If table is empty or stale, sync champions immediately
  if (slot === 'current') {
    return await syncChampionSnapshot();
  }

  return {
    id: 'previous',
    version: 'none',
    patch: 'none',
    championsCount: 0,
    championsRoster: { de: [], en: [] },
    championDetails: { de: {}, en: {} },
    timestamp: Date.now(),
  };
}

/**
 * Empties the champion_snapshots table and flushes all champion/skin in-memory caches.
 */
export async function clearChampionSnapshots(): Promise<{ count: number }> {
  championMemoryCache.clear();
  loldbSkinsCache.clear();
  loldbCatalogMap.clear();
  globalSkinMap.clear();

  await ensureChampionTableExists();
  const result = await prisma.championSnapshot.deleteMany({});
  console.log(`🧹 [ChampionService] Emptied champion_snapshots table (${result.count} records removed).`);
  return { count: result.count };
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
 * Returns the localized champion catalog dynamically enriched with live meta stats from meta_snapshots.
 * Instant response time (<2ms) directly from PostgreSQL tables.
 */
export async function getChampionsRoster(
  locale = 'de',
  slot: 'current' | 'previous' = 'current'
): Promise<{
  version: string;
  patch: string;
  slot: 'current' | 'previous';
  championsCount: number;
  champions: any[];
}> {
  const snapshot = await loadActiveChampionSnapshot(slot);
  const metaSnapshot = await getMetaSnapshot(slot).catch(() => null);
  const langKey = toLangKey(locale);
  const rosterData = snapshot.championsRoster;
  const list = rosterData?.[langKey] || rosterData?.de || rosterData?.en || [];

  // Dynamically link meta stats from meta_snapshots to each champion in the roster
  const enrichedList = list.map((c: any) => {
    const clean = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const metaStats = metaSnapshot?.championStats?.[clean] || null;
    return {
      ...c,
      meta: metaStats
        ? {
            tier: metaStats.tier,
            winrate: metaStats.winrate,
            winrateNum: metaStats.winrateNum,
            pickrate: metaStats.pickrate,
            pickrateNum: metaStats.pickrateNum,
            banrate: metaStats.banrate,
            banrateNum: metaStats.banrateNum,
            rank: metaStats.rank,
            score: metaStats.score,
            games: metaStats.games,
          }
        : null,
    };
  });

  return {
    version: snapshot.version,
    patch: snapshot.patch,
    slot,
    championsCount: enrichedList.length,
    champions: enrichedList,
  };
}

/**
 * Returns complete champion details (spells, passives, lore, stats, skins) for a specific champion slug,
 * dynamically linked with live meta stats from meta_snapshots.
 * Instant response time (<1ms).
 */
export async function getChampionDetail(
  slug: string,
  locale = 'de',
  slot: 'current' | 'previous' = 'current'
): Promise<{
  version: string;
  patch: string;
  slot: 'current' | 'previous';
  champion: any;
}> {
  const snapshot = await loadActiveChampionSnapshot(slot);
  const metaSnapshot = await getMetaSnapshot(slot).catch(() => null);
  const langKey = toLangKey(locale);
  const cleanTarget = slug.toLowerCase().replace(/[^a-z0-9]/g, '');

  let cached = snapshot.championDetails?.[langKey]?.[cleanTarget];
  if (!cached) {
    cached = snapshot.championDetails?.de?.[cleanTarget] || snapshot.championDetails?.en?.[cleanTarget];
  }

  if (cached) {
    const cleanName = (cached.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const metaStats =
      metaSnapshot?.championStats?.[cleanName] || metaSnapshot?.championStats?.[cleanTarget] || null;

    const enrichedChampion = {
      ...cached,
      meta: metaStats
        ? {
            tier: metaStats.tier,
            winrate: metaStats.winrate,
            winrateNum: metaStats.winrateNum,
            pickrate: metaStats.pickrate,
            pickrateNum: metaStats.pickrateNum,
            banrate: metaStats.banrate,
            banrateNum: metaStats.banrateNum,
            rank: metaStats.rank,
            score: metaStats.score,
            games: metaStats.games,
          }
        : null,
    };

    return {
      version: snapshot.version,
      patch: snapshot.patch,
      slot,
      champion: enrichedChampion,
    };
  }

  return {
    version: snapshot.version,
    patch: snapshot.patch,
    slot,
    champion: null,
  };
}

/**
 * Returns all skins or skins for a specific champion from the global skins catalog.
 */
export async function getAllSkins(championSlug?: string): Promise<{
  totalSkins: number;
  skins: LoldbSkinInfo[];
}> {
  await syncLoldbSkins();

  if (championSlug) {
    const cleanKey = championSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const champMap = loldbSkinsCache.get(cleanKey);
    const list = champMap ? Array.from(new Set(Array.from(champMap.values()))) : [];
    return {
      totalSkins: list.length,
      skins: list,
    };
  }

  const all = Array.from(globalSkinMap.values());
  return {
    totalSkins: all.length,
    skins: all,
  };
}
