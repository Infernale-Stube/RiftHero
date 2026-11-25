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
  price?: number | string;
  currency?: 'RP' | 'AS' | 'BE' | 'ME' | string;
  isLegacy?: boolean;
  skinLines?: string[];
  mythicCost?: any;
}

let tableChecked = false;

/**
 * Ensures the dedicated champions table exists in PostgreSQL.
 */
export async function ensureChampionTableExists(): Promise<void> {
  // Managed by Prisma schema
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
export interface LoldbSkinDetailResult {
  slug: string;
  name?: string;
  tier?: string;
  cost?: number | string;
  price?: number | string;
  currency?: string;
  isLegacy?: boolean;
  releaseDate?: string;
  mythicCost?: any;
}

const skinDetailCache = new Map<string, LoldbSkinDetailResult>();

/**
 * Fetches skin info directly from the single skin detail page (/skins/[slug]) from LoLDB.
 * If mythicCost has a cost, it takes the price and currency directly from mythicCost.
 */
export async function fetchLoldbSkinDetail(skinName: string): Promise<LoldbSkinDetailResult | null> {
  const clean = skinName
    .toLowerCase()
    .replace(/k\/da/gi, 'kda')
    .replace(/['’.]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (skinDetailCache.has(clean)) {
    return skinDetailCache.get(clean)!;
  }

  try {
    const res = await fetch(`https://loldb.info/skins/${clean}`, {
      headers: { RSC: '1', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = await res.text();

    // 1. Check for mythicCost
    let mythicCost: any = null;
    const mIdx = text.indexOf('"mythicCost":');
    if (mIdx !== -1 && !text.slice(mIdx, mIdx + 20).includes('"mythicCost":null')) {
      const start = mIdx + '"mythicCost":'.length;
      let depth = 0;
      let end = -1;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
      if (end !== -1) {
        try {
          mythicCost = JSON.parse(text.slice(start, end));
        } catch {}
      }
    }

    // 2. Parse main skin properties from RSC text
    let rawPrice: string | null = null;
    const pMatch = text.match(/"price":"([^"]+)"/);
    if (pMatch) rawPrice = pMatch[1];

    let tier: string | null = null;
    const tMatch = text.match(/"tier":"([^"]+)"/);
    if (tMatch) tier = tMatch[1];

    let isLegacy = false;
    const legMatch = text.match(/"isLegacy":(true|false)/);
    if (legMatch) isLegacy = legMatch[1] === 'true';

    let releaseDate: string | null = null;
    const rMatch = text.match(/"releaseDate":"([^"]+)"/);
    if (rMatch) {
      const dt = new Date(rMatch[1]);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        releaseDate = `${y}-${mm}-${dd}`;
      } else {
        releaseDate = rMatch[1];
      }
    }

    let cost: number | string = 975;
    let price: number | string = 975;
    let currency = 'RP';

    if (mythicCost && typeof mythicCost.cost === 'number') {
      cost = mythicCost.cost;
      price = mythicCost.cost;
      currency = mythicCost.currency || 'ME';
    } else if (rawPrice) {
      const pLower = rawPrice.toLowerCase();
      if (pLower.includes('free')) {
        cost = 0;
        price = 0;
        currency = 'RP';
      } else if (pLower.includes('n/a')) {
        cost = 'N/A';
        price = 'N/A';
        currency = 'RP';
      } else if (rawPrice.includes('AS')) {
        const num = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10);
        cost = isNaN(num) ? rawPrice : num;
        price = cost;
        currency = 'AS';
      } else if (rawPrice.includes('BE')) {
        const num = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10);
        cost = isNaN(num) ? rawPrice : num;
        price = cost;
        currency = 'BE';
      } else {
        const num = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) {
          cost = num;
          price = num;
        } else {
          cost = rawPrice;
          price = rawPrice;
        }
        currency = 'RP';
      }
    }

    const detail: LoldbSkinDetailResult = {
      slug: clean,
      name: skinName,
      tier: tier || undefined,
      cost,
      price,
      currency,
      isLegacy,
      releaseDate: releaseDate || undefined,
      mythicCost,
    };

    skinDetailCache.set(clean, detail);
    return detail;
  } catch {
    return null;
  }
}

/**
 * Synchronizes the complete skin database (2,000+ skins) directly from LoLDB /skins catalog.
 * Uses the Next.js RSC Data stream to fetch all skins, exact release dates, rarity and RP pricing in 1 single request.
 */
export async function syncLoldbSkins(): Promise<void> {
  if (globalSkinMap.size > 0) return;
  try {
    const res = await fetch('https://loldb.info/skins', {
      headers: { RSC: '1' },
      signal: AbortSignal.timeout(15000),
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
        price: cost,
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
        const skinNum = Number(s.id) % 1000;
        if (!isNaN(skinNum)) {
          map.set(String(skinNum), info);
        }
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
    const res = await fetch('https://loldb.info/api/champions', {
      signal: AbortSignal.timeout(15000),
    });
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
        `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/${lang}/championFull.json`,
        { signal: AbortSignal.timeout(25000) }
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
            if (!skinsLookup && loldbChamp?.slug && globalSkinMap.size === 0) {
              skinsLookup = (await fetchLoldbChampionSkins(loldbChamp.slug)) || undefined;
            }

            const baseYear = storePrice.releaseDate
              ? new Date(storePrice.releaseDate).getFullYear()
              : 2011;
            const currentYear = new Date().getFullYear();

            const processedSkins = await Promise.all(
              rawSkins
                .filter((s: any) => s.parentSkin === undefined || s.parentSkin === null)
                .map(async (s: any) => {
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
                      price: 0,
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

                  const englishSkinName = skinInfo?.name || s.name || '';
                  const rarityRawInitial = skinInfo?.rarity || 'Regular';
                  const upperRarity = rarityRawInitial.toUpperCase();

                  // Enrich Mythic/Transcendent/Exalted skins during background worker sync so runtime API needs 0 external HTTP calls
                  let detail = skinDetailCache.get(
                    englishSkinName
                      .toLowerCase()
                      .replace(/k\/da/gi, 'kda')
                      .replace(/['’.]/g, '')
                      .replace(/&/g, 'and')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '')
                  );
                  if (
                    !detail &&
                    (upperRarity.includes('MYTHIC') ||
                      upperRarity.includes('TRANSCENDENT') ||
                      upperRarity.includes('EXALTED'))
                  ) {
                    detail = (await fetchLoldbSkinDetail(englishSkinName)) ?? undefined;
                  }

                  const rarityRaw = detail?.tier || rarityRawInitial;
                  const rarityInfo = mapSkinRarity(rarityRaw);

                  const relDate = detail?.releaseDate || skinInfo?.releaseDate || `${currentYear}`;
                  let relYear = currentYear;
                  if (relDate) {
                    const dt = new Date(relDate);
                    if (!isNaN(dt.getTime())) relYear = dt.getFullYear();
                  }

                  const cost = detail?.cost ?? skinInfo?.cost ?? 975;
                  const price = detail?.price ?? skinInfo?.price ?? cost;
                  const currency = detail?.currency || skinInfo?.currency || 'RP';
                  const isLegacy =
                    detail?.isLegacy !== undefined ? detail.isLegacy : Boolean(skinInfo?.isLegacy);

                  return {
                    id: String(s.id),
                    num: s.num,
                    name: s.name,
                    rarity: rarityInfo.rarity,
                    rarityColor: rarityInfo.rarityColor,
                    releaseDate: relDate,
                    releaseYear: relYear,
                    cost,
                    price,
                    currency,
                    isLegacy,
                    ...(detail?.mythicCost ? { mythicCost: detail.mythicCost } : {}),
                    skinLines: skinInfo?.skinLines || [],
                  };
                })
            );

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
              championId: Number(champ.key),
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
              allytips: champ.allytips || [],
              enemytips: champ.enemytips || [],
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
  if (!row) return false;
  return Boolean(row.nameDe && row.nameEn);
}

// In-memory cache for fast (<1ms) reads: slot -> memory object
const championMemoryCache = new Map<'current' | 'previous', { data: ChampionSnapshotMemory; timestamp: number }>();
const championLoadInFlight = new Map<'current' | 'previous', Promise<ChampionSnapshotMemory>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let isChampionSyncRunning = false;

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
  if (isChampionSyncRunning) {
    console.log('[ChampionWorker] Champion sync already in progress, awaiting/reusing existing cache...');
    const cached = championMemoryCache.get('current');
    if (cached) return cached.data;
  }
  isChampionSyncRunning = true;
  try {
    const ddragonVersion = await getLatestDDragonVersion(force);
    const patch = ddragonVersion.split('.').slice(0, 2).join('.');

    console.log(`[ChampionWorker] Syncing individual champions for version ${ddragonVersion} (Patch ${patch})...`);

    const { rosters, details } = await buildChampionRostersAndDetails(ddragonVersion);
    const championsCount = rosters.de?.length || rosters.en?.length || 0;
    const now = new Date();

    // Save every champion as its own row in the champions table
    const champList = rosters.de.length > 0 ? rosters.de : rosters.en;

    const chunkSize = 25;
    for (let i = 0; i < champList.length; i += chunkSize) {
      const chunk = champList.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((c) => {
          const cleanId = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          const dataDe = details.de[cleanId] || null;
          const dataEn = details.en[cleanId] || null;

          const nameDe = dataDe?.name || c.name;
          const nameEn = dataEn?.name || c.name;
          const titleDe = dataDe?.title || c.title;
          const titleEn = dataEn?.title || c.title;
          const blurbDe = dataDe?.blurb || dataDe?.lore || null;
          const blurbEn = dataEn?.blurb || dataEn?.lore || null;
          const loreDe = dataDe?.lore || dataDe?.blurb || null;
          const loreEn = dataEn?.lore || dataEn?.blurb || null;

          const champId = Number(c.key);
          const stats = dataEn?.stats || dataDe?.stats || c.stats || {};
          const hp = stats.hp ?? 0;
          const hpPerLevel = stats.hpperlevel ?? 0;
          const mp = stats.mp ?? 0;
          const mpPerLevel = stats.mpperlevel ?? 0;
          const moveSpeed = stats.movespeed ?? 0;
          const armor = stats.armor ?? 0;
          const armorPerLevel = stats.armorperlevel ?? 0;
          const spellBlock = stats.spellblock ?? 0;
          const spellBlockPerLevel = stats.spellblockperlevel ?? 0;
          const attackRange = stats.attackrange ?? 0;
          const hpRegen = stats.hpregen ?? 0;
          const hpRegenPerLevel = stats.hpregenperlevel ?? 0;
          const mpRegen = stats.mpregen ?? 0;
          const mpRegenPerLevel = stats.mpregenperlevel ?? 0;
          const crit = stats.crit ?? 0;
          const critPerLevel = stats.critperlevel ?? 0;
          const attackDamage = stats.attackdamage ?? 0;
          const attackDamagePerLevel = stats.attackdamageperlevel ?? 0;
          const attackSpeed = stats.attackspeed ?? 0;
          const attackSpeedPerLevel = stats.attackspeedperlevel ?? 0;

          const key = c.id; // DDragon ID (e.g. "Aatrox", "LeeSin", "KogMaw", "MasterYi", "MonkeyKing")
          const partype = dataDe?.partype || dataEn?.partype || c.partype || 'Mana';
          const spellsDe = dataDe?.spells || null;
          const spellsEn = dataEn?.spells || null;
          const passiveDe = dataDe?.passive || null;
          const passiveEn = dataEn?.passive || null;
          const skins = (dataDe?.skins && dataDe.skins.length > 0) ? dataDe.skins : (dataEn?.skins || null);
          const allytips = dataDe?.allytips || dataEn?.allytips || [];
          const enemytips = dataDe?.enemytips || dataEn?.enemytips || [];

          return prisma.champion.upsert({
            where: { id: champId },
            create: {
              id: champId,
              key,
              nameDe,
              nameEn,
              titleDe,
              titleEn,
              blurbDe,
              blurbEn,
              loreDe,
              loreEn,
              image: c.image,
              role: c.role || null,
              positions: c.positions || [],
              tags: c.tags || [],
              difficulty: c.difficulty ?? 5,
              classes: c.classes || [],
              releaseDate: c.releaseDate || null,
              partype,
              patch,
              version: ddragonVersion,
              spellsDe: spellsDe as any,
              spellsEn: spellsEn as any,
              passiveDe: passiveDe as any,
              passiveEn: passiveEn as any,
              skins: skins as any,
              allytips,
              enemytips,
              hp,
              hpPerLevel,
              mp,
              mpPerLevel,
              moveSpeed,
              armor,
              armorPerLevel,
              spellBlock,
              spellBlockPerLevel,
              attackRange,
              hpRegen,
              hpRegenPerLevel,
              mpRegen,
              mpRegenPerLevel,
              crit,
              critPerLevel,
              attackDamage,
              attackDamagePerLevel,
              attackSpeed,
              attackSpeedPerLevel,
              createdAt: now,
              updatedAt: now,
            },
            update: {
              key,
              nameDe,
              nameEn,
              titleDe,
              titleEn,
              blurbDe,
              blurbEn,
              loreDe,
              loreEn,
              image: c.image,
              role: c.role || null,
              positions: c.positions || [],
              tags: c.tags || [],
              difficulty: c.difficulty ?? 5,
              classes: c.classes || [],
              releaseDate: c.releaseDate || null,
              partype,
              patch,
              version: ddragonVersion,
              spellsDe: spellsDe as any,
              spellsEn: spellsEn as any,
              passiveDe: passiveDe as any,
              passiveEn: passiveEn as any,
              skins: skins as any,
              allytips,
              enemytips,
              hp,
              hpPerLevel,
              mp,
              mpPerLevel,
              moveSpeed,
              armor,
              armorPerLevel,
              spellBlock,
              spellBlockPerLevel,
              attackRange,
              hpRegen,
              hpRegenPerLevel,
              mpRegen,
              mpRegenPerLevel,
              crit,
              critPerLevel,
              attackDamage,
              attackDamagePerLevel,
              attackSpeed,
              attackSpeedPerLevel,
              updatedAt: now,
            },
          });
        })
      );
    }

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
      `⚡ [ChampionWorker] Champions table successfully updated (${championsCount} individual champion rows, version ${ddragonVersion}, patch ${patch}).`
    );
    return memoryObj;
  } finally {
    isChampionSyncRunning = false;
  }
}

/**
 * Loads the active precomputed champions from memory or 'champions' table.
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

  const existingPromise = championLoadInFlight.get(slot);
  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = (async (): Promise<ChampionSnapshotMemory> => {
    try {
      const rows = await prisma.champion.findMany();
      if (rows && rows.length > 0) {
        const first = rows[0];
        const version = first.version || '15.1.1';
        const patch = first.patch || version.split('.').slice(0, 2).join('.');

        const rosters: { de: any[]; en: any[] } = { de: [], en: [] };
        const details: { de: Record<string, any>; en: Record<string, any> } = { de: {}, en: {} };

        for (const row of rows) {
          const champKey = String(row.id);
          const ddragonKey = (row.key && row.key.trim().length > 0) ? row.key.trim() : (row.nameEn || '').replace(/[^a-zA-Z0-9]/g, '');
          const cleanDDragon = ddragonKey.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanNameDe = (row.nameDe || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanNameEn = (row.nameEn || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          const stats = {
            hp: row.hp,
            hpperlevel: row.hpPerLevel,
            mp: row.mp,
            mpperlevel: row.mpPerLevel,
            movespeed: row.moveSpeed,
            armor: row.armor,
            armorperlevel: row.armorPerLevel,
            spellblock: row.spellBlock,
            spellblockperlevel: row.spellBlockPerLevel,
            attackrange: row.attackRange,
            hpregen: row.hpRegen,
            hpregenperlevel: row.hpRegenPerLevel,
            mpregen: row.mpRegen,
            mpregenperlevel: row.mpRegenPerLevel,
            crit: row.crit,
            critperlevel: row.critPerLevel,
            attackdamage: row.attackDamage,
            attackdamageperlevel: row.attackDamagePerLevel,
            attackspeed: row.attackSpeed,
            attackspeedperlevel: row.attackSpeedPerLevel,
          };

          const defaultSkin = {
            id: '0',
            num: 0,
            name: 'default',
            rarity: 'Regular',
            rarityColor: '#2E8D4C',
            releaseDate: row.releaseDate || '2012-01-01',
            releaseYear: row.releaseDate ? parseInt(row.releaseDate.slice(0, 4), 10) || 2012 : 2012,
            cost: 0,
            price: 0,
            currency: 'RP',
            isLegacy: false,
          };

          const rawSpellsDe = Array.isArray(row.spellsDe) && (row.spellsDe as any[]).length > 0 ? (row.spellsDe as any[]) : (Array.isArray(row.spellsEn) ? (row.spellsEn as any[]) : []);
          const rawSpellsEn = Array.isArray(row.spellsEn) && (row.spellsEn as any[]).length > 0 ? (row.spellsEn as any[]) : rawSpellsDe;
          const passiveDe = (row.passiveDe as any) || (row.passiveEn as any) || null;
          const passiveEn = (row.passiveEn as any) || (row.passiveDe as any) || null;
          const skins = Array.isArray(row.skins) && (row.skins as any[]).length > 0 ? (row.skins as any[]) : [defaultSkin];

          // Lightweight roster entries (no spells/passive/lore/skins/stats) so /api/champions stays tiny (~40 KB instead of multi-MB)
          const rosterDe = {
            id: ddragonKey,
            key: champKey,
            championId: row.id,
            name: row.nameDe,
            title: row.titleDe,
            image: row.image,
            role: row.role || 'Mid',
            positions: row.positions || [],
            tags: row.tags || [],
            difficulty: row.difficulty ?? 5,
            classes: row.classes || [],
            releaseDate: row.releaseDate || '',
            meta: null,
          };

          const rosterEn = {
            id: ddragonKey,
            key: champKey,
            championId: row.id,
            name: row.nameEn,
            title: row.titleEn,
            image: row.image,
            role: row.role || 'Mid',
            positions: row.positions || [],
            tags: row.tags || [],
            difficulty: row.difficulty ?? 5,
            classes: row.classes || [],
            releaseDate: row.releaseDate || '',
            meta: null,
          };

          const champDe = {
            ...rosterDe,
            blurb: row.blurbDe || '',
            lore: row.loreDe || '',
            stats,
            spells: rawSpellsDe,
            skins,
            passive: passiveDe,
            partype: row.partype || 'Mana',
            info: { attack: 5, defense: 5, magic: 5, difficulty: row.difficulty ?? 5 },
            allytips: row.allytips || [],
            enemytips: row.enemytips || [],
          };

          const champEn = {
            ...rosterEn,
            blurb: row.blurbEn || '',
            lore: row.loreEn || '',
            stats,
            spells: rawSpellsEn,
            skins,
            passive: passiveEn,
            partype: row.partype || 'Mana',
            info: { attack: 5, defense: 5, magic: 5, difficulty: row.difficulty ?? 5 },
            allytips: row.allytips || [],
            enemytips: row.enemytips || [],
          };

          rosters.de.push(rosterDe);
          rosters.en.push(rosterEn);

          details.de[champKey] = champDe;
          details.de[cleanDDragon] = champDe;
          details.de[cleanNameDe] = champDe;
          details.de[cleanNameEn] = champDe;

          details.en[champKey] = champEn;
          details.en[cleanDDragon] = champEn;
          details.en[cleanNameDe] = champEn;
          details.en[cleanNameEn] = champEn;

          // Custom aliases for special names
          if (cleanDDragon === 'monkeyking' || cleanNameEn === 'wukong') {
            details.de['wukong'] = champDe;
            details.en['wukong'] = champEn;
            details.de['monkeyking'] = champDe;
            details.en['monkeyking'] = champEn;
          }
          if (cleanDDragon === 'nunu' || cleanNameEn.includes('nunu')) {
            details.de['nunu'] = champDe;
            details.en['nunu'] = champEn;
            details.de['nunuwillump'] = champDe;
            details.en['nunuwillump'] = champEn;
          }
        }

        rosters.de.sort((a, b) => a.name.localeCompare(b.name));
        rosters.en.sort((a, b) => a.name.localeCompare(b.name));

        const memoryObj: ChampionSnapshotMemory = {
          id: 'current',
          version,
          patch,
          championsCount: rows.length,
          championsRoster: rosters as any,
          championDetails: details as any,
          timestamp: Date.now(),
        };

        championMemoryCache.set(slot, { data: memoryObj, timestamp: Date.now() });
        return memoryObj;
      }
    } catch (err) {
      console.warn('[ChampionService] Champions table read error:', (err as Error).message);
    }

    // If table is empty or error occurs, return empty roster (do NOT fetch external DDragon on client request!)
    return {
      id: slot,
      version: '',
      patch: '',
      championsCount: 0,
      championsRoster: { de: [], en: [] },
      championDetails: { de: {}, en: {} },
      timestamp: now,
    };
  })().finally(() => {
    championLoadInFlight.delete(slot);
  });

  championLoadInFlight.set(slot, loadPromise);
  return loadPromise;
}

/**
 * Empties the champions table and flushes all champion/skin in-memory caches.
 */
export async function clearChampionSnapshots(): Promise<{ count: number }> {
  championMemoryCache.clear();
  loldbSkinsCache.clear();
  loldbCatalogMap.clear();
  globalSkinMap.clear();

  const result = await prisma.champion.deleteMany({});
  console.log(`🧹 [ChampionService] Emptied champions table (${result.count} records removed).`);
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

  // Direct database fallback if not yet present in snapshot cache
  if (!cached) {
    const isNum = !isNaN(Number(slug));
    const allRows = await prisma.champion.findMany().catch(() => []);
    const dbRow = allRows.find((r) => {
      const k = (r.key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const en = (r.nameEn || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const de = (r.nameDe || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        (k && k === cleanTarget) ||
        (en && en === cleanTarget) ||
        (de && de === cleanTarget) ||
        (isNum && r.id === Number(slug))
      );
    });

    if (dbRow) {
      const champKey = String(dbRow.id);
      const ddragonKey = (dbRow.key && dbRow.key.trim().length > 0) ? dbRow.key.trim() : (dbRow.nameEn || '').replace(/[^a-zA-Z0-9]/g, '');
      const rawSpellsDe = Array.isArray(dbRow.spellsDe) && (dbRow.spellsDe as any[]).length > 0 ? (dbRow.spellsDe as any[]) : (Array.isArray(dbRow.spellsEn) ? (dbRow.spellsEn as any[]) : []);
      const rawSpellsEn = Array.isArray(dbRow.spellsEn) && (dbRow.spellsEn as any[]).length > 0 ? (dbRow.spellsEn as any[]) : rawSpellsDe;
      const passiveDe = (dbRow.passiveDe as any) || (dbRow.passiveEn as any) || null;
      const passiveEn = (dbRow.passiveEn as any) || (dbRow.passiveDe as any) || null;
      const defaultSkin = {
        id: '0',
        num: 0,
        name: 'default',
        rarity: 'Regular',
        rarityColor: '#2E8D4C',
        releaseDate: dbRow.releaseDate || '2012-01-01',
        releaseYear: dbRow.releaseDate ? parseInt(dbRow.releaseDate.slice(0, 4), 10) || 2012 : 2012,
        cost: 0,
        price: 0,
        currency: 'RP',
        isLegacy: false,
      };
      const skins = Array.isArray(dbRow.skins) && (dbRow.skins as any[]).length > 0 ? (dbRow.skins as any[]) : [defaultSkin];

      cached = {
        id: ddragonKey,
        key: champKey,
        championId: dbRow.id,
        name: langKey === 'de' ? dbRow.nameDe : dbRow.nameEn,
        title: langKey === 'de' ? dbRow.titleDe : dbRow.titleEn,
        blurb: (langKey === 'de' ? dbRow.blurbDe : dbRow.blurbEn) || '',
        lore: (langKey === 'de' ? dbRow.loreDe : dbRow.loreEn) || '',
        image: dbRow.image,
        role: dbRow.role || 'Mid',
        positions: dbRow.positions || [],
        tags: dbRow.tags || [],
        difficulty: dbRow.difficulty ?? 5,
        classes: dbRow.classes || [],
        releaseDate: dbRow.releaseDate || '',
        stats: {
          hp: dbRow.hp,
          hpperlevel: dbRow.hpPerLevel,
          mp: dbRow.mp,
          mpperlevel: dbRow.mpPerLevel,
          movespeed: dbRow.moveSpeed,
          armor: dbRow.armor,
          armorperlevel: dbRow.armorPerLevel,
          spellblock: dbRow.spellBlock,
          spellblockperlevel: dbRow.spellBlockPerLevel,
          attackrange: dbRow.attackRange,
          hpregen: dbRow.hpRegen,
          hpregenperlevel: dbRow.hpRegenPerLevel,
          mpregen: dbRow.mpRegen,
          mpregenperlevel: dbRow.mpRegenPerLevel,
          crit: dbRow.crit,
          critperlevel: dbRow.critPerLevel,
          attackdamage: dbRow.attackDamage,
          attackdamageperlevel: dbRow.attackDamagePerLevel,
          attackspeed: dbRow.attackSpeed,
          attackspeedperlevel: dbRow.attackSpeedPerLevel,
        },
        spells: langKey === 'de' ? rawSpellsDe : rawSpellsEn,
        skins,
        passive: langKey === 'de' ? passiveDe : passiveEn,
        partype: dbRow.partype || 'Mana',
        info: { attack: 5, defense: 5, magic: 5, difficulty: dbRow.difficulty ?? 5 },
        allytips: dbRow.allytips || [],
        enemytips: dbRow.enemytips || [],
        meta: null,
      };
    }
  }

  if (cached) {
    const cleanName = (cached.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const metaStats =
      metaSnapshot?.championStats?.[cleanName] || metaSnapshot?.championStats?.[cleanTarget] || null;

    const enrichedChampion = {
      ...cached,
      stats: cached.stats || {},
      spells: Array.isArray(cached.spells) ? cached.spells : [],
      skins: Array.isArray(cached.skins) ? cached.skins : [],
      passive: cached.passive || null,
      partype: cached.partype || 'Mana',
      info: cached.info || { attack: 5, defense: 5, magic: 5, difficulty: cached.difficulty ?? 5 },
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
      version: snapshot.version || '15.1.1',
      patch: snapshot.patch || '15.1',
      slot,
      champion: enrichedChampion,
    };
  }

  return {
    version: snapshot.version || '15.1.1',
    patch: snapshot.patch || '15.1',
    slot,
    champion: null,
  };
}

/**
 * Returns all skins or skins for a specific champion directly from PostgreSQL/memory cache (zero live HTTP calls).
 */
export async function getAllSkins(championSlug?: string): Promise<{
  totalSkins: number;
  skins: LoldbSkinInfo[];
}> {
  const snapshot = await loadActiveChampionSnapshot('current');

  if (championSlug) {
    const cleanKey = championSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const champ =
      snapshot.championDetails?.de?.[cleanKey] ||
      snapshot.championDetails?.en?.[cleanKey] ||
      null;
    const list: LoldbSkinInfo[] = Array.isArray(champ?.skins) ? champ.skins : [];
    return {
      totalSkins: list.length,
      skins: list,
    };
  }

  const allSkins: LoldbSkinInfo[] = [];
  const seen = new Set<string>();
  const detailsMap = snapshot.championDetails?.en || snapshot.championDetails?.de || {};
  for (const champ of Object.values(detailsMap) as any[]) {
    if (!Array.isArray(champ?.skins)) continue;
    for (const s of champ.skins) {
      const idKey = String(s.id ?? s.name);
      if (!seen.has(idKey)) {
        seen.add(idKey);
        allSkins.push(s);
      }
    }
  }
  return {
    totalSkins: allSkins.length,
    skins: allSkins,
  };
}
