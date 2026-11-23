import { prisma } from '../db/prisma';
import { getLatestDDragonVersion, getDDragonPatches } from '../riot/ddragon';

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

export interface ItemRecord {
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

interface ItemMemoryCache {
  version: string;
  patch: string;
  totalItems: number;
  items: {
    de: ItemRecord[];
    en: ItemRecord[];
  };
  details: {
    de: Record<string, ItemRecord>;
    en: Record<string, ItemRecord>;
  };
  tree?: any[];
  timestamp: number;
}

let itemMemoryCache: ItemMemoryCache | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes in-memory refresh
export const ITEM_WORKER_INTERVAL_MS = 60 * 60 * 1000; // Check hourly for new patch
let workerTimer: NodeJS.Timeout | null = null;
let isSyncRunning = false;
let tableChecked = false;

/**
 * Ensures the dedicated items table exists in PostgreSQL.
 */
export async function ensureItemTableExists(): Promise<void> {
  // Managed by Prisma schema
}

/**
 * Maps raw DDragon stat keys to human readable labels and UI accent colors.
 */
function formatItemStats(rawStats: Record<string, number>, isDe = true): ItemStatFormatted[] {
  if (!rawStats || typeof rawStats !== 'object') return [];
  const list: ItemStatFormatted[] = [];

  const statMap: Record<string, { labelDe: string; labelEn: string; color: string; isPercent?: boolean }> = {
    FlatPhysicalDamageMod: { labelDe: 'Angriffsschaden', labelEn: 'Attack Damage', color: '#f97316' },
    FlatMagicDamageMod: { labelDe: 'Fähigkeitsstärke', labelEn: 'Ability Power', color: '#38bdf8' },
    FlatArmorMod: { labelDe: 'Rüstung', labelEn: 'Armor', color: '#facc15' },
    FlatSpellBlockMod: { labelDe: 'Magieresistenz', labelEn: 'Magic Resist', color: '#c084fc' },
    FlatHPPoolMod: { labelDe: 'Leben', labelEn: 'Health', color: '#4ade80' },
    FlatMPPoolMod: { labelDe: 'Mana', labelEn: 'Mana', color: '#60a5fa' },
    PercentAttackSpeedMod: { labelDe: 'Angriffstempo', labelEn: 'Attack Speed', color: '#fb923c', isPercent: true },
    FlatCritChanceMod: { labelDe: 'Kritische Trefferchance', labelEn: 'Critical Strike Chance', color: '#f43f5e', isPercent: true },
    FlatMovementSpeedMod: { labelDe: 'Lauftempo', labelEn: 'Move Speed', color: '#a3e635' },
    PercentMovementSpeedMod: { labelDe: 'Lauftempo', labelEn: 'Move Speed', color: '#a3e635', isPercent: true },
    FlatHPRegenMod: { labelDe: 'Lebensregeneration', labelEn: 'Health Regen', color: '#86efac' },
    PercentLifeStealMod: { labelDe: 'Lebensraub', labelEn: 'Life Steal', color: '#f87171', isPercent: true },
    FlatAbilityHaste: { labelDe: 'Fähigkeitstempo', labelEn: 'Ability Haste', color: '#818cf8' },
  };

  for (const [key, val] of Object.entries(rawStats)) {
    if (val === undefined || val === null || val === 0) continue;
    const def = statMap[key];
    if (def) {
      const valStr = def.isPercent
        ? `${val > 0 ? '+' : ''}${Math.round(val * (val < 1 ? 100 : 1))}%`
        : `${val > 0 ? '+' : ''}${val}`;
      list.push({
        name: isDe ? def.labelDe : def.labelEn,
        value: valStr,
        color: def.color,
      });
    }
  }

  return list;
}

/**
 * Classifies an item into high-level categories for UI tab filtering.
 */
function classifyItemCategories(
  tags: string[],
  stats: Record<string, number>,
  gold: ItemGold,
  id: string,
  from: string[],
  into: string[]
): { categories: string[]; tier: 'basic' | 'epic' | 'legendary' | 'boots' | 'consumable' | 'starter' } {
  const categories = new Set<string>();
  const upperTags = (tags || []).map((t) => t.toUpperCase());

  // Category: Attack
  if (
    upperTags.some((t) => ['DAMAGE', 'ATTACKSPEED', 'CRITICALSTRIKE', 'LIFESTEAL', 'ARMORPENETRATION', 'ONHIT'].includes(t)) ||
    (stats && (stats.FlatPhysicalDamageMod || stats.PercentAttackSpeedMod || stats.FlatCritChanceMod || stats.PercentLifeStealMod))
  ) {
    categories.add('ATTACK');
  }

  // Category: Magic
  if (
    upperTags.some((t) => ['SPELLDAMAGE', 'MANA', 'MANAREGEN', 'COOLDOWNREDUCTION', 'MAGICPENETRATION', 'SPELLVAMP'].includes(t)) ||
    (stats && (stats.FlatMagicDamageMod || stats.FlatMPPoolMod))
  ) {
    categories.add('MAGIC');
  }

  // Category: Defense
  if (
    upperTags.some((t) => ['HEALTH', 'ARMOR', 'SPELLBLOCK', 'HEALTHREGEN', 'TENACITY'].includes(t)) ||
    (stats && (stats.FlatArmorMod || stats.FlatSpellBlockMod || stats.FlatHPPoolMod))
  ) {
    categories.add('DEFENSE');
  }

  // Category: Movement
  if (upperTags.some((t) => ['BOOTS', 'NONBOOTSMOVEMENT'].includes(t)) || (stats && stats.FlatMovementSpeedMod)) {
    categories.add('MOVEMENT');
  }

  // Category: Starter & Consumables
  if (
    upperTags.some((t) => ['CONSUMABLE', 'GOLDPER', 'VISION', 'TRINKET', 'LANE', 'JUNGLE'].includes(t)) ||
    gold.total <= 500
  ) {
    categories.add('STARTER_CONSUMABLE');
  }

  // Determine Tier / Depth
  let tier: 'basic' | 'epic' | 'legendary' | 'boots' | 'consumable' | 'starter' = 'basic';
  const isBoots = upperTags.includes('BOOTS');
  const isConsumable = upperTags.some((t) => ['CONSUMABLE', 'TRINKET'].includes(t));

  if (isBoots) {
    tier = 'boots';
  } else if (isConsumable) {
    tier = 'consumable';
  } else if (gold.total <= 500 && (!from || from.length === 0)) {
    tier = 'starter';
  } else if ((!into || into.length === 0) && gold.total >= 2200) {
    tier = 'legendary';
  } else if (from && from.length > 0 && into && into.length > 0) {
    tier = 'epic';
  } else if (from && from.length > 0) {
    tier = 'legendary';
  } else {
    tier = 'basic';
  }

  return {
    categories: Array.from(categories),
    tier,
  };
}

/**
 * Fetches and builds the localized item catalogs (de & en) from Riot DDragon.
 */
async function buildItemCatalogs(version: string): Promise<{
  rosters: { de: ItemRecord[]; en: ItemRecord[]; version: string; patch: string };
  details: { de: Record<string, ItemRecord>; en: Record<string, ItemRecord> };
  tree: any[];
  itemsCount: number;
}> {
  const patches = await getDDragonPatches();
  const patch = patches[0] || version.split('.').slice(0, 2).join('.');

  const langs = [
    { code: 'de_DE', key: 'de' as const },
    { code: 'en_US', key: 'en' as const },
  ];

  const rosters: { de: ItemRecord[]; en: ItemRecord[] } = { de: [], en: [] };
  const details: { de: Record<string, ItemRecord>; en: Record<string, ItemRecord> } = { de: {}, en: {} };
  let capturedTree: any[] = [];

  for (const { code, key } of langs) {
    try {
      const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/${code}/item.json`);
      if (!res.ok) {
        console.warn(`[ItemService] Failed to fetch item.json for ${code}: status ${res.status}`);
        continue;
      }

      const json = (await res.json()) as any;
      if (!json || !json.data) continue;

      if (json.tree && capturedTree.length === 0) {
        capturedTree = json.tree;
      }

      const rawItems = json.data as Record<string, any>;
      const itemMap = new Map<string, ItemRecord>();

      // 1. First pass: construct base item objects
      for (const [id, raw] of Object.entries(rawItems)) {
        const gold: ItemGold = {
          base: raw.gold?.base ?? 0,
          total: raw.gold?.total ?? 0,
          sell: raw.gold?.sell ?? 0,
          purchasable: raw.gold?.purchasable ?? true,
        };

        const stats = raw.stats || {};
        const tags = Array.isArray(raw.tags) ? raw.tags : [];
        const from = Array.isArray(raw.from) ? raw.from : [];
        const into = Array.isArray(raw.into) ? raw.into : [];
        const maps = raw.maps || {};

        const { categories, tier } = classifyItemCategories(tags, stats, gold, id, from, into);
        const formattedStats = formatItemStats(stats, key === 'de');
        const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`;

        const record: ItemRecord = {
          id,
          name: raw.name || `Item ${id}`,
          plaintext: raw.plaintext || '',
          description: raw.description || '',
          colloq: raw.colloq || '',
          gold,
          tags,
          categories,
          tier,
          depth: raw.depth ?? (from.length > 0 ? 2 : 1),
          maps,
          stats,
          formattedStats,
          from,
          into,
          icon: iconUrl,
          inStore: raw.inStore !== false && gold.purchasable !== false,
          requiredChampion: raw.requiredChampion || null,
          requiredAlly: raw.requiredAlly || null,
          consumed: raw.consumed || false,
          stacks: raw.stacks || 1,
        };

        itemMap.set(id, record);
      }

      // 2. Second pass: enrich with resolved intoItems and fromItems component references
      for (const [id, item] of itemMap.entries()) {
        if (item.from && item.from.length > 0) {
          item.fromItems = item.from
            .map((cid) => {
              const comp = itemMap.get(cid);
              if (!comp) return null;
              return {
                id: comp.id,
                name: comp.name,
                icon: comp.icon,
                totalGold: comp.gold.total,
              };
            })
            .filter((c): c is ItemComponentRef => c !== null);
        } else {
          item.fromItems = [];
        }

        if (item.into && item.into.length > 0) {
          item.intoItems = item.into
            .map((cid) => {
              const upgrade = itemMap.get(cid);
              if (!upgrade) return null;
              return {
                id: upgrade.id,
                name: upgrade.name,
                icon: upgrade.icon,
                totalGold: upgrade.gold.total,
              };
            })
            .filter((c): c is ItemComponentRef => c !== null);
        } else {
          item.intoItems = [];
        }

        details[key][id] = item;
      }

      // 3. Collect roster array sorted logically (Tier: Legendary -> Epic -> Basic, then Gold desc)
      const list = Array.from(itemMap.values());
      list.sort((a, b) => {
        // Preferred order: Legendary -> Epic -> Basic -> Boots -> Starter -> Consumable
        const tierRank: Record<string, number> = {
          legendary: 5,
          epic: 4,
          basic: 3,
          boots: 2,
          starter: 1,
          consumable: 0,
        };
        const rDiff = (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0);
        if (rDiff !== 0) return rDiff;
        if (b.gold.total !== a.gold.total) return b.gold.total - a.gold.total;
        return a.name.localeCompare(b.name);
      });

      rosters[key] = list;
    } catch (err) {
      console.error(`[ItemService] Error building items catalog for ${code}:`, err);
    }
  }

  const itemsCount = Math.max(rosters.de.length, rosters.en.length);

  return {
    rosters: { ...rosters, version, patch },
    details,
    tree: capturedTree,
    itemsCount,
  };
}

/**
 * Worker task: Checks latest DDragon version and syncs items table into PostgreSQL.
 * Precomputed data guarantees <1ms instant load times for users!
 */
export async function computeAndSaveItemSnapshot(force = false): Promise<ItemMemoryCache> {
  if (isSyncRunning && itemMemoryCache) {
    return itemMemoryCache;
  }

  isSyncRunning = true;

  try {
    const latestVersion = await getLatestDDragonVersion(force);
    const patches = await getDDragonPatches();
    const patch = patches[0] || latestVersion.split('.').slice(0, 2).join('.');

    // Check if current DB items already match this version unless forced
    if (!force) {
      const count = await prisma.item.count();
      const sample = await prisma.item.findFirst({ select: { version: true } });
      if (count > 0 && sample?.version === latestVersion) {
        console.log(`⚡ [ItemWorker] Active items catalog is up-to-date for version ${latestVersion}.`);
        return await loadActiveItemSnapshot(true);
      }
    }

    console.log(`🔄 [ItemWorker] Syncing individual items from Riot DDragon for version ${latestVersion}...`);
    const { rosters, details, tree, itemsCount } = await buildItemCatalogs(latestVersion);
    const now = new Date();

    // Save every item as its own row in the items table
    for (const item of rosters.de) {
      const dataDe = details.de[item.id] || null;
      const dataEn = details.en[item.id] || null;

      await prisma.item.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          name: item.name,
          plaintext: item.plaintext || '',
          description: item.description || '',
          goldTotal: item.gold?.total ?? 0,
          goldBase: item.gold?.base ?? 0,
          goldSell: item.gold?.sell ?? 0,
          purchasable: item.gold?.purchasable ?? true,
          tags: item.tags || [],
          categories: item.categories || [],
          tier: item.tier || 'basic',
          depth: item.depth ?? 1,
          icon: item.icon,
          from: item.from || [],
          into: item.into || [],
          inStore: item.inStore !== false,
          requiredChampion: item.requiredChampion || null,
          requiredAlly: item.requiredAlly || null,
          patch,
          version: latestVersion,
          dataDe: dataDe as any,
          dataEn: dataEn as any,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          name: item.name,
          plaintext: item.plaintext || '',
          description: item.description || '',
          goldTotal: item.gold?.total ?? 0,
          goldBase: item.gold?.base ?? 0,
          goldSell: item.gold?.sell ?? 0,
          purchasable: item.gold?.purchasable ?? true,
          tags: item.tags || [],
          categories: item.categories || [],
          tier: item.tier || 'basic',
          depth: item.depth ?? 1,
          icon: item.icon,
          from: item.from || [],
          into: item.into || [],
          inStore: item.inStore !== false,
          requiredChampion: item.requiredChampion || null,
          requiredAlly: item.requiredAlly || null,
          patch,
          version: latestVersion,
          dataDe: dataDe as any,
          dataEn: dataEn as any,
          updatedAt: now,
        },
      });
    }

    itemMemoryCache = {
      version: latestVersion,
      patch,
      totalItems: itemsCount,
      items: rosters,
      details,
      tree,
      timestamp: Date.now(),
    };

    console.log(`✅ [ItemWorker] Individual items saved to 'items' table. Total items: ${itemsCount} (Version ${latestVersion}).`);
    return itemMemoryCache;
  } catch (err) {
    console.warn('[ItemWorker] Error computing items catalog:', (err as Error).message);
    const fallbackVersion = await getLatestDDragonVersion();
    const fallbackPatch = fallbackVersion.split('.').slice(0, 2).join('.');
    return {
      version: fallbackVersion,
      patch: fallbackPatch,
      totalItems: 0,
      items: { de: [], en: [] },
      details: { de: {}, en: {} },
      tree: [],
      timestamp: Date.now(),
    };
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Loads the active items from memory or PostgreSQL 'items' table.
 * Instant lookup (<1ms), zero external Riot requests on user visits!
 */
export async function loadActiveItemSnapshot(skipCacheCheck = false): Promise<ItemMemoryCache> {
  const now = Date.now();
  if (!skipCacheCheck && itemMemoryCache && now - itemMemoryCache.timestamp < CACHE_TTL_MS) {
    return itemMemoryCache;
  }

  try {
    const rows = await prisma.item.findMany();
    if (rows && rows.length > 0) {
      const first = rows[0];
      const version = first.version || '15.1.1';
      const patch = first.patch || version.split('.').slice(0, 2).join('.');

      const rosters: { de: ItemRecord[]; en: ItemRecord[] } = { de: [], en: [] };
      const details: { de: Record<string, ItemRecord>; en: Record<string, ItemRecord> } = { de: {}, en: {} };

      for (const row of rows) {
        const dataDe = row.dataDe as any;
        const dataEn = (row.dataEn as any) || dataDe;

        if (dataDe) {
          rosters.de.push(dataDe);
          details.de[row.id] = dataDe;
        }
        if (dataEn) {
          rosters.en.push(dataEn);
          details.en[row.id] = dataEn;
        }
      }

      // Sort by tier and gold
      const tierRank: Record<string, number> = {
        legendary: 5,
        epic: 4,
        basic: 3,
        boots: 2,
        starter: 1,
        consumable: 0,
      };
      const sortFn = (a: ItemRecord, b: ItemRecord) => {
        const rDiff = (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0);
        if (rDiff !== 0) return rDiff;
        if (b.gold.total !== a.gold.total) return b.gold.total - a.gold.total;
        return a.name.localeCompare(b.name);
      };

      rosters.de.sort(sortFn);
      rosters.en.sort(sortFn);

      itemMemoryCache = {
        version,
        patch,
        totalItems: rows.length,
        items: rosters,
        details,
        tree: [],
        timestamp: now,
      };
      return itemMemoryCache;
    }
  } catch (err) {
    console.warn('[ItemService] Items table DB read failed, synchronizing immediately:', (err as Error).message);
  }

  return await computeAndSaveItemSnapshot();
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
 * Retrieves the full item roster for a given locale (de / en)
 */
export async function getItemsRoster(locale = 'de'): Promise<{
  version: string;
  patch: string;
  totalItems: number;
  items: ItemRecord[];
  tree: any[];
}> {
  const snapshot = await loadActiveItemSnapshot();
  const langKey = toLangKey(locale);
  const list = snapshot.items?.[langKey] || snapshot.items?.de || snapshot.items?.en || [];

  return {
    version: snapshot.version,
    patch: snapshot.patch,
    totalItems: list.length,
    items: list,
    tree: snapshot.tree || [],
  };
}

/**
 * Retrieves individual item detail by ID
 */
export async function getItemDetail(
  id: string,
  locale = 'de'
): Promise<{
  version: string;
  patch: string;
  item: ItemRecord | null;
}> {
  const snapshot = await loadActiveItemSnapshot();
  const langKey = toLangKey(locale);
  const detail = snapshot.details?.[langKey]?.[id] || snapshot.details?.de?.[id] || snapshot.details?.en?.[id] || null;

  return {
    version: snapshot.version,
    patch: snapshot.patch,
    item: detail,
  };
}

/**
 * Periodic Item Worker:
 * Checks on boot whether the item snapshot is missing or outdated against Riot's versions.json.
 * Continuously polls every hour to instantly detect League of Legends patch updates.
 */
export function initItemSyncWorker(intervalMs = ITEM_WORKER_INTERVAL_MS): void {
  // On startup: check if snapshot exists in table and matches latest version
  (async () => {
    try {
      await ensureItemTableExists();
      const latestVersion = await getLatestDDragonVersion();
      const count = await prisma.item.count();
      const existing = await prisma.item.findFirst({
        select: { version: true },
      });

      if (count === 0 || !existing || existing.version !== latestVersion) {
        console.log(`🔄 [ItemWorker] Stored items table is missing or outdated (${existing?.version || 'none'} vs ${latestVersion}). Synchronizing...`);
        computeAndSaveItemSnapshot().catch((err) => {
          console.warn('[ItemWorker] Initial background item sync failed:', err);
        });
      } else {
        console.log(`⚡ [ItemWorker] Stored items table is up-to-date (Version: ${existing.version}, ${count} items).`);
      }
    } catch (err) {
      console.warn('[ItemWorker] Startup check error:', (err as Error).message);
    }
  })();

  if (!workerTimer) {
    workerTimer = setInterval(async () => {
      try {
        const latestVersion = await getLatestDDragonVersion(true);
        if (itemMemoryCache && itemMemoryCache.version !== latestVersion) {
          console.log(`⏰ [ItemWorker] New game version detected (${itemMemoryCache.version} -> ${latestVersion}). Triggering items update...`);
          await computeAndSaveItemSnapshot(true);
        }
      } catch (err) {
        console.error('[ItemWorker] Periodic item sync error:', err);
      }
    }, intervalMs);
    workerTimer.unref();
  }
}
