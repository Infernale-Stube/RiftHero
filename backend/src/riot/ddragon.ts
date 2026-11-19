let cachedVersion = '14.23.1';
let lastFetchedVersion = 0;
const VERSION_CACHE_TTL = 3600 * 1000; // 1 hour

const championIdMap = new Map<number, string>();
let championsFetched = false;

export async function getLatestDDragonVersion(): Promise<string> {
  const now = Date.now();
  if (now - lastFetchedVersion < VERSION_CACHE_TTL && cachedVersion) {
    return cachedVersion;
  }

  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (res.ok) {
      const versions = (await res.json()) as string[];
      if (Array.isArray(versions) && versions.length > 0) {
        cachedVersion = versions[0];
        lastFetchedVersion = now;
      }
    }
  } catch (err) {
    console.warn('[DDragon] Failed to fetch latest version, using fallback:', cachedVersion);
  }

  return cachedVersion;
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
