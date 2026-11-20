let cachedVersion = '16.23.1';
let lastFetchedVersion = 0;
const VERSION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const championIdMap = new Map<number, string>();
let championsFetched = false;
let schedulerInterval: NodeJS.Timeout | null = null;

export async function getLatestDDragonVersion(force = false): Promise<string> {
  const now = Date.now();
  if (!force && now - lastFetchedVersion < VERSION_CACHE_TTL && cachedVersion) {
    return cachedVersion;
  }

  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (res.ok) {
      const versions = (await res.json()) as string[];
      if (Array.isArray(versions) && versions.length > 0 && versions[0]) {
        const latest = versions[0];
        if (latest !== cachedVersion) {
          console.log(`[DDragon] Active game version updated: ${cachedVersion} -> ${latest}`);
          cachedVersion = latest;
          championsFetched = false;
          championIdMap.clear();
        }
        lastFetchedVersion = now;
      }
    }
  } catch (err) {
    console.warn('[DDragon] Failed to fetch latest version, using fallback:', cachedVersion);
  }

  return cachedVersion;
}

/**
 * Periodically polls https://ddragon.leagueoflegends.com/api/versions.json
 * to ensure all image URLs (champions, items, spells, icons) and champion maps use the latest game patch.
 */
export function initDDragonScheduler(intervalMs = 30 * 60 * 1000): void {
  // Initial background update
  getLatestDDragonVersion(true)
    .then((v) => {
      console.log(`[DDragon] Periodic version checker initialized. Active version: ${v}`);
      loadChampionIdMap().catch(() => {});
    })
    .catch((err) => {
      console.warn('[DDragon] Initial version check error:', err);
    });

  if (!schedulerInterval) {
    schedulerInterval = setInterval(async () => {
      try {
        await getLatestDDragonVersion(true);
      } catch (err) {
        console.warn('[DDragon] Scheduled version check failed:', err);
      }
    }, intervalMs);
    schedulerInterval.unref();
  }
}

export async function loadChampionIdMap(): Promise<Map<number, string>> {
  if (championsFetched && championIdMap.size > 0) {
    return championIdMap;
  }

  try {
    const version = await getLatestDDragonVersion();
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.data) {
        for (const champ of Object.values(data.data) as any[]) {
          const numKey = parseInt(champ.key, 10);
          if (!isNaN(numKey)) {
            championIdMap.set(numKey, champ.id); // e.g. 103 -> "Ahri"
          }
        }
        championsFetched = true;
      }
    }
  } catch (err) {
    console.warn('[DDragon] Failed to load champion.json, will use fallback ids');
  }

  return championIdMap;
}

export async function getChampionNameById(championId: number): Promise<string> {
  if (!championsFetched) {
    await loadChampionIdMap();
  }
  return championIdMap.get(championId) || `Champion_${championId}`;
}

export function getProfileIconUrl(iconId: number, version = cachedVersion): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function getChampionIconUrl(championName: string, version = cachedVersion): string {
  let cleanName = championName;
  if (cleanName === 'FiddleSticks') cleanName = 'Fiddlesticks';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${cleanName}.png`;
}

export function getItemIconUrl(itemId: number, version = cachedVersion): string {
  if (!itemId || itemId === 0) return '';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

export const SPELL_MAP: Record<number, string> = {
  1: 'SummonerBoost',      // Cleanse
  3: 'SummonerExhaust',    // Exhaust
  4: 'SummonerFlash',      // Flash
  6: 'SummonerHaste',      // Ghost
  7: 'SummonerHeal',       // Heal
  11: 'SummonerSmite',     // Smite
  12: 'SummonerTeleport',  // Teleport
  14: 'SummonerDot',       // Ignite
  21: 'SummonerBarrier',   // Barrier
  32: 'SummonerSnowball',  // Mark / Snowball
};

export function getSpellIconUrl(spellId: number, version = cachedVersion): string {
  const key = SPELL_MAP[spellId] || 'SummonerFlash';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${key}.png`;
}
