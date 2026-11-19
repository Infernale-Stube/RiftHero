const DDRAGON_VERSION = '14.23.1';

export function getProfileIconUrl(iconId: number, version = DDRAGON_VERSION): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function getChampionIconUrl(championName: string, version = DDRAGON_VERSION): string {
  if (!championName) return '';
  let clean = championName;
  if (clean === 'FiddleSticks') clean = 'Fiddlesticks';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${clean}.png`;
}

export function getItemIconUrl(itemId: number, version = DDRAGON_VERSION): string {
  if (!itemId || itemId === 0) return '';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
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

export function getSpellIconUrl(spellId: number, version = DDRAGON_VERSION): string {
  const key = SPELL_MAP[spellId] || 'SummonerFlash';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${key}.png`;
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
