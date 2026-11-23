import championPositionsRaw from '@/lib/championPositions.json';

let currentDDragonVersion = '16.23.1';
let cachedVersionsList: string[] = [];
let lastVersionFetchTime = 0;
const VERSION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = 'rifthero_ddragon_version';
const STORAGE_TIME_KEY = 'rifthero_ddragon_version_time';
const VERSIONS_LIST_KEY = 'rifthero_ddragon_versions_list';

/**
 * Returns the currently active DDragon game version.
 */
export function getDDragonVersion(): string {
  // If in browser and cached in localStorage, restore if newer
  if (typeof window !== 'undefined' && lastVersionFetchTime === 0) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        currentDDragonVersion = stored;
        lastVersionFetchTime = Number(localStorage.getItem(STORAGE_TIME_KEY) || '0');
      }
    } catch {}
  }
  return currentDDragonVersion;
}

export function getDDragonVersionsList(): string[] {
  if (cachedVersionsList.length === 0 && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(VERSIONS_LIST_KEY);
      if (stored) {
        cachedVersionsList = JSON.parse(stored);
      }
    } catch {}
  }
  return cachedVersionsList;
}

export function getMajorMinorPatch(fullVersion?: string): string {
  const v = fullVersion || getDDragonVersion();
  const parts = v.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : v;
}

/**
 * Returns the previous patch dynamically according to versions.json (e.g. '16.22' when latest is '16.23').
 */
export function getPreviousDDragonPatch(): string {
  const list = getDDragonVersionsList();
  if (list && list.length > 0) {
    const patches: string[] = [];
    for (const v of list) {
      const p = v.split('.').slice(0, 2).join('.');
      if (!patches.includes(p)) patches.push(p);
    }
    if (patches.length > 1) return patches[1];
    if (patches.length > 0) return patches[0];
  }

  // Dynamic fallback: subtract 1 from minor version of current DDragon version
  const current = getDDragonVersion();
  const parts = current.split('.');
  if (parts.length >= 2) {
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    if (!isNaN(major) && !isNaN(minor) && minor > 1) {
      return `${major}.${minor - 1}`;
    }
    return `${parts[0]}.${parts[1]}`;
  }
  return '16.22';
}

/**
 * Update the active DDragon game version.
 */
export function setDDragonVersion(version: string) {
  if (version && version !== currentDDragonVersion) {
    currentDDragonVersion = version;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, version);
        localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());
        window.dispatchEvent(new CustomEvent('rifthero:ddragon-version', { detail: version }));
      } catch {}
    }
  }
}

/**
 * Fetches the latest game version directly from Riot's DDragon API:
 * https://ddragon.leagueoflegends.com/api/versions.json
 */
export async function updateDDragonVersion(force = false): Promise<string> {
  const now = Date.now();
  if (!force && now - lastVersionFetchTime < VERSION_CACHE_TTL && currentDDragonVersion) {
    return currentDDragonVersion;
  }

  // Check localStorage if not forced
  if (typeof window !== 'undefined' && !force) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedTime = Number(localStorage.getItem(STORAGE_TIME_KEY) || '0');
      if (stored && now - storedTime < VERSION_CACHE_TTL) {
        currentDDragonVersion = stored;
        lastVersionFetchTime = storedTime;
        return stored;
      }
    } catch {}
  }

  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', {
      cache: 'no-cache',
    });
    if (res.ok) {
      const versions = (await res.json()) as string[];
      if (Array.isArray(versions) && versions.length > 0 && versions[0]) {
        cachedVersionsList = versions;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(VERSIONS_LIST_KEY, JSON.stringify(versions));
          } catch {}
        }
        const latest = versions[0];
        setDDragonVersion(latest);
        lastVersionFetchTime = now;
        return latest;
      }
    }
  } catch (err) {
    console.warn('[DDragon] Failed to fetch latest game version, keeping:', currentDDragonVersion);
  }

  return currentDDragonVersion;
}

export function normalizeChampionNameForDDragon(championName?: string | null): string {
  if (!championName) return 'Aatrox';
  const mapping: Record<string, string> = {
    Wukong: 'MonkeyKing',
    FiddleSticks: 'Fiddlesticks',
    LeBlanc: 'Leblanc',
    "Cho'Gath": 'Chogath',
    "Kai'Sa": 'Kaisa',
    "Kha'Zix": 'Khazix',
    "Vel'Koz": 'Velkoz',
    "Bel'Veth": 'Belveth',
    "K'Sante": 'KSante',
    'Renata Glasc': 'Renata',
    RenataGlasc: 'Renata',
    'Nunu & Willump': 'Nunu',
  };
  return mapping[championName] || championName;
}

export function getProfileIconUrl(iconId: number, version?: string): string {
  const v = version || getDDragonVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/profileicon/${iconId}.png`;
}

export function getChampionIconUrl(championName: string, version?: string): string {
  if (!championName) return '';
  const clean = normalizeChampionNameForDDragon(championName);
  const v = version || getDDragonVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${clean}.png`;
}

export function getChampionIconByIdUrl(championId: number): string {
  if (!championId || championId <= 0) return '';
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

export function getChampionSplashUrl(championName?: string | null): string {
  const clean = normalizeChampionNameForDDragon(championName);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${clean}_0.jpg`;
}

export function getChampionLoadingUrl(championName?: string | null, skinNum: number | string = 0): string {
  const clean = normalizeChampionNameForDDragon(championName);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${clean}_${skinNum}.jpg`;
}

export function getChampionPassiveIconUrl(imageInput?: any, version?: string): string {
  if (!imageInput) return '';
  if (typeof imageInput === 'string') {
    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      return imageInput;
    }
    const v = version || getDDragonVersion();
    return `https://ddragon.leagueoflegends.com/cdn/${v}/img/passive/${imageInput}`;
  }
  const full = imageInput.full || '';
  if (!full) return '';
  if (full.startsWith('http://') || full.startsWith('https://')) {
    return full;
  }
  const v = version || getDDragonVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/passive/${full}`;
}

export function getChampionSpellIconUrl(imageInput?: any, version?: string): string {
  if (!imageInput) return '';
  if (typeof imageInput === 'string') {
    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      return imageInput;
    }
    const v = version || getDDragonVersion();
    return `https://ddragon.leagueoflegends.com/cdn/${v}/img/spell/${imageInput}`;
  }
  const full = imageInput.full || '';
  if (!full) return '';
  if (full.startsWith('http://') || full.startsWith('https://')) {
    return full;
  }
  const v = version || getDDragonVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/spell/${full}`;
}

export function getChampionSkinSplashUrl(championId: string, skinNum: number): string {
  const clean = normalizeChampionNameForDDragon(championId);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${clean}_${skinNum}.jpg`;
}

export function getChampionSkinLoadingUrl(championId: string, skinNum: number): string {
  const clean = normalizeChampionNameForDDragon(championId);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${clean}_${skinNum}.jpg`;
}

export interface DDragonChampionSummary {
  version: string;
  id: string; // e.g. "Aatrox"
  key: string; // e.g. "266"
  name: string; // e.g. "Aatrox"
  title: string; // e.g. "the Darkin Blade"
  blurb: string;
  info: { attack: number; defense: number; magic: number; difficulty: number };
  image: { full: string; sprite: string; group: string };
  tags: string[]; // ["Fighter", "Tank"]
  partype: string;
  stats: Record<string, number>;
}

export interface DDragonSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  cooldownBurn: string;
  costBurn: string;
  rangeBurn: string;
  image: { full: string };
}

export interface DDragonSkin {
  id: string;
  num: number;
  name: string;
  chromas: boolean;
  parentSkin?: number;
  rarity?: 'Regular' | 'Epic' | 'Legendary' | 'Mythic' | 'Transcendent' | 'Exalted' | string;
  rarityColor?: string;
  releaseDate?: string;
  releaseYear?: number;
  cost?: number | string;
  price?: number | string;
  currency?: 'RP' | 'AS' | 'BE' | 'ME' | string;
  isLegacy?: boolean;
}

export interface DDragonChampionDetail extends DDragonChampionSummary {
  lore: string;
  skins: DDragonSkin[];
  spells: DDragonSpell[];
  passive: {
    name: string;
    description: string;
    image: { full: string };
  };
  allytips?: string[];
  enemytips?: string[];
  storeData?: { ip: number; rp: number; releaseDate?: string };
  releaseDate?: string;
  meta?: {
    tier?: string;
    winrate?: string;
    winrateNum?: number;
    pickrate?: string;
    pickrateNum?: number;
    banrate?: string;
    banrateNum?: number;
    rank?: number;
    score?: number;
    games?: number;
  } | null;
}

export function toDDragonLocale(locale = 'de'): 'de_DE' | 'en_US' {
  const l = (locale || '').toLowerCase().replace(/[^a-z]/g, '');
  return l.startsWith('en') ? 'en_US' : 'de_DE';
}

export async function fetchDDragonChampionsList(locale = 'de'): Promise<{
  version: string;
  champions: DDragonChampionSummary[];
}> {
  const v = getDDragonVersion();
  const lang = toDDragonLocale(locale);
  try {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/${lang}/champion.json`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.data) {
        const champs = Object.values(data.data) as DDragonChampionSummary[];
        champs.sort((a, b) => a.name.localeCompare(b.name));
        return { version: data.version || v, champions: champs };
      }
    }
  } catch (err) {
    console.warn('[DDragon] Error fetching champions list:', err);
  }
  return { version: v, champions: [] };
}

export function mapSkinRarityClient(rawRarity?: string): { rarity: string; rarityColor: string } {
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


export async function fetchDDragonChampionDetail(
  slugOrName: string,
  locale = 'de'
): Promise<{
  version: string;
  champion: DDragonChampionDetail | null;
}> {
  const v = getDDragonVersion();
  const lang = toDDragonLocale(locale);

  // 1. Try directly with normalized name
  const candidateId = normalizeChampionNameForDDragon(slugOrName);

  try {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/${lang}/champion/${candidateId}.json`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.data && data.data[candidateId]) {
        let champ = data.data[candidateId];
        if (champ && Array.isArray(champ.skins)) {
          champ.skins = champ.skins.filter(
            (s: DDragonSkin) => s.parentSkin === undefined || s.parentSkin === null
          );
        }
        return { version: data.version || v, champion: champ };
      }
    }
  } catch {}

  // 2. If not found directly, fetch champions index and find case-insensitive match
  try {
    const { champions } = await fetchDDragonChampionsList(locale);
    const targetSlug = slugOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = champions.find((c) => {
      const cId = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cId === targetSlug || cName === targetSlug;
    });

    if (found) {
      const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/${lang}/champion/${found.id}.json`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data && data.data[found.id]) {
          let champ = data.data[found.id];
          if (champ && Array.isArray(champ.skins)) {
            champ.skins = champ.skins.filter(
              (s: DDragonSkin) => s.parentSkin === undefined || s.parentSkin === null
            );
          }
          return { version: data.version || v, champion: champ };
        }
      }
    }
  } catch (err) {
    console.warn('[DDragon] Error finding champion detail:', err);
  }

  return { version: v, champion: null };
}

export function getItemIconUrl(itemId: number | string, version?: string): string {
  if (!itemId || itemId === 0 || itemId === '0') return '';
  const v = version || getDDragonVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${itemId}.png`;
}

export async function fetchDDragonItemsList(locale = 'de'): Promise<{
  version: string;
  items: any[];
}> {
  const v = getDDragonVersion();
  const lang = toDDragonLocale(locale);
  try {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/${lang}/item.json`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.data) {
        const rawMap = data.data as Record<string, any>;
        const items = Object.entries(rawMap).map(([id, raw]: [string, any]) => {
          const tags: string[] = Array.isArray(raw.tags) ? raw.tags : [];
          const from: string[] = Array.isArray(raw.from) ? raw.from : [];
          const into: string[] = Array.isArray(raw.into) ? raw.into : [];
          const goldTotal = raw.gold?.total ?? 0;

          // LoLDB accurate tier classification
          let tier: 'basic' | 'epic' | 'legendary' | 'boots' | 'consumable' | 'starter' = 'basic';
          if (tags.includes('Consumable') || tags.includes('Trinket')) {
            tier = 'consumable';
          } else if (tags.includes('Boots')) {
            tier = 'boots';
          } else if (into.length === 0 && (from.length > 0 || goldTotal >= 2200)) {
            tier = 'legendary';
          } else if (into.length > 0 && from.length > 0) {
            tier = 'epic';
          } else if (into.length === 0 && from.length === 0 && goldTotal > 0 && goldTotal <= 950) {
            tier = 'starter';
          } else {
            tier = 'basic';
          }

          // From items refs
          const fromItems = from
            .map((compId) => {
              const comp = rawMap[compId];
              if (!comp) return null;
              return {
                id: compId,
                name: comp.name || `Item ${compId}`,
                icon: `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${compId}.png`,
                totalGold: comp.gold?.total ?? 0,
              };
            })
            .filter(Boolean);

          // Into items refs
          const intoItems = into
            .map((upId) => {
              const up = rawMap[upId];
              if (!up) return null;
              return {
                id: upId,
                name: up.name || `Item ${upId}`,
                icon: `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${upId}.png`,
                totalGold: up.gold?.total ?? 0,
              };
            })
            .filter(Boolean);

          return {
            id,
            name: raw.name || `Item ${id}`,
            plaintext: raw.plaintext || '',
            description: raw.description || '',
            colloq: raw.colloq || '',
            gold: {
              base: raw.gold?.base ?? 0,
              total: goldTotal,
              sell: raw.gold?.sell ?? 0,
              purchasable: raw.gold?.purchasable ?? true,
            },
            tags,
            categories: [],
            tier,
            depth: raw.depth ?? 1,
            maps: raw.maps || {},
            stats: raw.stats || {},
            formattedStats: [],
            from,
            into,
            fromItems,
            intoItems,
            icon: `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${id}.png`,
            inStore: raw.inStore !== false && (raw.gold?.purchasable ?? true),
            requiredChampion: raw.requiredChampion || null,
          };
        });
        return { version: data.version || v, items };
      }
    }
  } catch (err) {
    console.warn('[DDragon] Error fetching items fallback list:', err);
  }
  return { version: v, items: [] };
}


export const SPELL_MAP: Record<number, string> = {
  1: 'SummonerBoost',
  3: 'SummonerExhaust',
  4: 'SummonerFlash',
  6: 'SummonerHaste',
  7: 'SummonerHeal',
  11: 'SummonerSmite',
  12: 'SummonerTeleport',
  14: 'SummonerDot',
  21: 'SummonerBarrier',
  32: 'SummonerSnowball',
};

export function getSpellIconUrl(spellId: number, version?: string): string {
  const key = SPELL_MAP[spellId] || 'SummonerFlash';
  const v = version || getDDragonVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/spell/${key}.png`;
}

// Major Keystone Rune Icon paths
export const RUNE_MAP: Record<number, string> = {
  // Precision
  8005: 'perk-images/Styles/Precision/PressTheAttack/PressTheAttack.png',
  8008: 'perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png',
  8021: 'perk-images/Styles/Precision/FleetFootwork/FleetFootwork.png',
  8010: 'perk-images/Styles/Precision/Conqueror/Conqueror.png',
  // Domination
  8112: 'perk-images/Styles/Domination/Electrocute/Electrocute.png',
  8124: 'perk-images/Styles/Domination/Predator/Predator.png',
  8128: 'perk-images/Styles/Domination/DarkHarvest/DarkHarvest.png',
  9923: 'perk-images/Styles/Domination/HailOfBlades/HailOfBlades.png',
  // Sorcery
  8214: 'perk-images/Styles/Sorcery/SummonAery/SummonAery.png',
  8229: 'perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png',
  8230: 'perk-images/Styles/Sorcery/PhaseRush/PhaseRush.png',
  // Resolve
  8437: 'perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png',
  8439: 'perk-images/Styles/Resolve/VeteranAftershock/VeteranAftershock.png',
  8465: 'perk-images/Styles/Resolve/Guardian/Guardian.png',
  // Inspiration
  8351: 'perk-images/Styles/Inspiration/GlacialAugment/GlacialAugment.png',
  8360: 'perk-images/Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png',
  8369: 'perk-images/Styles/Inspiration/FirstStrike/FirstStrike.png',
};

// Rune Style Icons (Precision 8000, Domination 8100, Sorcery 8200, Inspiration 8300, Resolve 8400)
export const STYLE_MAP: Record<number, string> = {
  8000: 'perk-images/Styles/7201_Precision.png',
  8100: 'perk-images/Styles/7200_Domination.png',
  8200: 'perk-images/Styles/7202_Sorcery.png',
  8300: 'perk-images/Styles/7203_Whimsy.png',
  8400: 'perk-images/Styles/7204_Resolve.png',
};

export function getRuneIconUrl(runeId: number | null): string {
  if (!runeId) return '';
  const path = RUNE_MAP[runeId];
  if (!path) return '';
  return `https://ddragon.leagueoflegends.com/cdn/img/${path}`;
}

export function getStyleIconUrl(styleId: number | null): string {
  if (!styleId) return '';
  const path = STYLE_MAP[styleId];
  if (!path) return '';
  return `https://ddragon.leagueoflegends.com/cdn/img/${path}`;
}

// Official Ingame Objective Icons from CommunityDragon
const CD_MATCH_HISTORY_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-match-history/global/default';

export type ObjectiveType = 'baron' | 'dragon' | 'herald' | 'voidgrub' | 'tower' | 'inhibitor';

export function getObjectiveIconUrl(
  objective: ObjectiveType,
  team: 'blue' | 'red' | 'neutral' = 'neutral'
): string {
  const teamCode = team === 'red' ? '200' : '100';

  switch (objective) {
    case 'baron':
      return `${CD_MATCH_HISTORY_BASE}/baron-${teamCode}.png`;
    case 'dragon':
      return `${CD_MATCH_HISTORY_BASE}/dragon-${teamCode}.png`;
    case 'herald':
      return `${CD_MATCH_HISTORY_BASE}/herald-${teamCode}.png`;
    case 'voidgrub':
      return `${CD_MATCH_HISTORY_BASE}/right_icons_grub.png`;
    case 'tower':
      return `${CD_MATCH_HISTORY_BASE}/tower-${teamCode}.png`;
    case 'inhibitor':
      return `${CD_MATCH_HISTORY_BASE}/inhibitor-${teamCode}.png`;
    default:
      return `${CD_MATCH_HISTORY_BASE}/dragon-100.png`;
  }
}

export function getDragonSubtypeIconUrl(
  subType: string,
  team: 'blue' | 'red' = 'blue'
): string {
  const teamCode = team === 'red' ? '200' : '100';
  const clean = subType.toUpperCase();

  if (clean.includes('FIRE') || clean.includes('INFERNAL')) {
    return `${CD_MATCH_HISTORY_BASE}/fire-${teamCode}.png`;
  }
  if (clean.includes('WATER') || clean.includes('OCEAN')) {
    return `${CD_MATCH_HISTORY_BASE}/water-${teamCode}.png`;
  }
  if (clean.includes('EARTH') || clean.includes('MOUNTAIN')) {
    return `${CD_MATCH_HISTORY_BASE}/earth-${teamCode}.png`;
  }
  if (clean.includes('AIR') || clean.includes('CLOUD')) {
    return `${CD_MATCH_HISTORY_BASE}/air-${teamCode}.png`;
  }
  if (clean.includes('ELDER')) {
    return `${CD_MATCH_HISTORY_BASE}/elder-${teamCode}.png`;
  }
  return `${CD_MATCH_HISTORY_BASE}/dragon-${teamCode}.png`;
}

export function getDragonSubtypeName(subType: string): string {
  const clean = subType.toUpperCase();
  if (clean.includes('FIRE') || clean.includes('INFERNAL')) return 'Infernal';
  if (clean.includes('WATER') || clean.includes('OCEAN')) return 'Ocean';
  if (clean.includes('EARTH') || clean.includes('MOUNTAIN')) return 'Mountain';
  if (clean.includes('AIR') || clean.includes('CLOUD')) return 'Cloud';
  if (clean.includes('HEXTECH')) return 'Hextech';
  if (clean.includes('CHEMTECH')) return 'Chemtech';
  if (clean.includes('ELDER')) return 'Elder Dragon';
  return 'Drake';
}

// Player Positions: TOP, JUNGLE, MID, ADC, SUPPORT
export type PositionKey = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export const POSITION_KEYS_ORDER: PositionKey[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

export const POSITION_ICONS: Record<PositionKey, string> = {
  TOP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
  JUNGLE: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
  MID: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  ADC: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
  SUPPORT: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png',
};

export const POSITION_ORDER_MAP: Record<PositionKey, number> = {
  TOP: 1,
  JUNGLE: 2,
  MID: 3,
  ADC: 4,
  SUPPORT: 5,
};

export interface TeamMemberLike {
  championName?: string;
  championId?: number;
  spell1Id?: number;
  spell2Id?: number;
  items?: number[];
  teamPosition?: string | null;
  lane?: string | null;
  role?: string | null;
}

export interface AssignedTeamSlot<T> {
  role: PositionKey;
  participant?: T;
}

export function normalizePosition(
  teamPosition?: string | null,
  role?: string | null
): PositionKey | null {
  const p = (teamPosition || '').toUpperCase().trim();
  if (p === 'TOP') return 'TOP';
  if (p === 'JUNGLE') return 'JUNGLE';
  if (p === 'MIDDLE' || p === 'MID') return 'MID';
  if (p === 'BOTTOM' || p === 'BOT' || p === 'ADC') return 'ADC';
  if (p === 'UTILITY' || p === 'SUPPORT') return 'SUPPORT';

  const r = (role || '').toUpperCase().trim();
  if (r === 'DUO_SUPPORT' || r === 'SUPPORT') return 'SUPPORT';
  if (r === 'DUO_CARRY') return 'ADC';

  return null;
}

export function getPositionIconUrl(positionKey: PositionKey): string {
  return POSITION_ICONS[positionKey];
}

export function getParticipantPosition(p: {
  teamPosition?: string | null;
  lane?: string | null;
  role?: string | null;
}): PositionKey | null {
  return normalizePosition(p.teamPosition || p.lane, p.role);
}

export function getParticipantPositionOrder(p: {
  teamPosition?: string | null;
  lane?: string | null;
  role?: string | null;
}): number {
  const pos = getParticipantPosition(p);
  return pos ? POSITION_ORDER_MAP[pos] : 6;
}

/**
 * Assigns each participant strictly to their teamPosition stored in the database.
 * No fallbacks on Smite or champion tables - strictly uses database position!
 */
export function assignTeamPositions<T extends TeamMemberLike>(team: T[]): AssignedTeamSlot<T>[] {
  const roles: PositionKey[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  if (!team || team.length === 0) {
    return roles.map((r) => ({ role: r }));
  }

  // If not standard 5-player team (e.g. Arena 2v2 or incomplete), sort by position order
  if (team.length !== 5) {
    const sorted = [...team].sort(
      (a, b) => getParticipantPositionOrder(a) - getParticipantPositionOrder(b)
    );
    return roles.map((r, idx) => ({
      role: r,
      participant: sorted[idx],
    }));
  }

  const assigned = new Map<PositionKey, T>();
  const unassigned: T[] = [];

  // Match each participant strictly by their teamPosition from the database
  for (const member of team) {
    const pos = getParticipantPosition(member);
    if (pos && !assigned.has(pos)) {
      assigned.set(pos, member);
    } else {
      unassigned.push(member);
    }
  }

  // If any slot has no match in DB (e.g. unranked or missing), fill open slots in order without guesswork
  let unassignedIdx = 0;
  return roles.map((role) => {
    const participant = assigned.get(role) || unassigned[unassignedIdx++];
    return {
      role,
      participant,
    };
  });
}

// Fast lookup map for champion positions from championPositions.json (/champions)
interface ChampPosEntry {
  role?: string;
  recommendedPositions?: string[];
}
const champPositionsMap = new Map<string, ChampPosEntry>();
Object.values(championPositionsRaw as Record<string, any>).forEach((c) => {
  if (c.id) champPositionsMap.set(String(c.id).toLowerCase().replace(/[^a-z0-9]/g, ''), c);
  if (c.name) champPositionsMap.set(String(c.name).toLowerCase().replace(/[^a-z0-9]/g, ''), c);
  if (c.key) champPositionsMap.set(String(c.key).toLowerCase().replace(/[^a-z0-9]/g, ''), c);
});

function roleStringToPositionKey(role?: string | null): PositionKey | null {
  if (!role) return null;
  const r = role.toUpperCase().trim();
  if (r === 'TOP') return 'TOP';
  if (r === 'JUNGLE') return 'JUNGLE';
  if (r === 'MIDDLE' || r === 'MID') return 'MID';
  if (r === 'BOTTOM' || r === 'BOT' || r === 'ADC') return 'ADC';
  if (r === 'SUPPORT' || r === 'UTILITY') return 'SUPPORT';
  return null;
}

/**
 * Assigns participants specifically for live games (where teamPosition is null from Riot Spectator API).
 * Restores Smite detection (spell ID 11) for Jungler and champion wiki role assignment from championPositions.json (/champions).
 * Strictly used ONLY on the live game page!
 */
export function assignLiveGameTeamPositions<T extends TeamMemberLike>(team: T[]): AssignedTeamSlot<T>[] {
  const roles: PositionKey[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  if (!team || team.length === 0) {
    return roles.map((r) => ({ role: r }));
  }

  // If not standard 5-player team (e.g. Arena 2v2 or incomplete), sort by normal position order
  if (team.length !== 5) {
    const sorted = [...team].sort(
      (a, b) => getParticipantPositionOrder(a) - getParticipantPositionOrder(b)
    );
    return roles.map((r, idx) => ({
      role: r,
      participant: sorted[idx],
    }));
  }

  const assigned = new Map<T, PositionKey>();
  const unassignedPlayers = [...team];
  const unassignedRoles = new Set<PositionKey>(roles);

  // 1. Jungler Filter: Smite (spell ID 11)
  const smitePlayers = unassignedPlayers.filter(
    (p) => p.spell1Id === 11 || p.spell2Id === 11
  );

  if (smitePlayers.length === 1) {
    const jglPlayer = smitePlayers[0];
    assigned.set(jglPlayer, 'JUNGLE');
    unassignedRoles.delete('JUNGLE');
    const idx = unassignedPlayers.indexOf(jglPlayer);
    if (idx !== -1) unassignedPlayers.splice(idx, 1);
  } else if (smitePlayers.length > 1) {
    // If multiple players have Smite, prefer the one whose champion role is JUNGLE
    const jungleChampPlayer =
      smitePlayers.find((p) => {
        const clean = (p.championName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cInfo = champPositionsMap.get(clean);
        return roleStringToPositionKey(cInfo?.role) === 'JUNGLE';
      }) || smitePlayers[0];

    assigned.set(jungleChampPlayer, 'JUNGLE');
    unassignedRoles.delete('JUNGLE');
    const idx = unassignedPlayers.indexOf(jungleChampPlayer);
    if (idx !== -1) unassignedPlayers.splice(idx, 1);
  }

  // 2. Assign remaining roles according to champion main/recommended role from /champions
  const remRoles = Array.from(unassignedRoles);

  function getPermutations<P>(arr: P[]): P[][] {
    if (arr.length <= 1) return [arr];
    const res: P[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of getPermutations(rest)) {
        res.push([arr[i], ...p]);
      }
    }
    return res;
  }

  const rolePerms = getPermutations(remRoles);
  let bestPerm = rolePerms[0] || remRoles;
  let bestScore = -1;

  for (const perm of rolePerms) {
    let score = 0;
    for (let i = 0; i < unassignedPlayers.length; i++) {
      const p = unassignedPlayers[i];
      const targetRole = perm[i];
      const clean = (p.championName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cInfo = champPositionsMap.get(clean);
      const mainPos = roleStringToPositionKey(cInfo?.role);
      const recPos = (cInfo?.recommendedPositions || []).map(roleStringToPositionKey);

      if (mainPos === targetRole) score += 20;
      else if (recPos.includes(targetRole)) score += 10;

      // Secondary hint from Riot API if available
      const apiPos = normalizePosition(p.teamPosition || p.lane, p.role);
      if (apiPos === targetRole) score += 5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPerm = perm;
    }
  }

  for (let i = 0; i < unassignedPlayers.length; i++) {
    assigned.set(unassignedPlayers[i], bestPerm[i]);
  }

  return roles.map((role) => ({
    role,
    participant: team.find((member) => assigned.get(member) === role),
  }));
}

export function calculateKda(kills: number = 0, deaths: number = 0, assists: number = 0): string {
  if (deaths === 0) return (kills + assists).toFixed(2);
  return ((kills + assists) / deaths).toFixed(2);
}


