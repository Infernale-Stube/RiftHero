'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  Sparkles,
  Shield,
  Swords,
  Heart,
  Zap,
  Activity,
  Wind,
  Target,
  Clock,
  Coins,
  BookOpen,
  Layers,
  Award,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  fetchDDragonChampionDetail,
  DDragonChampionDetail,
  getChampionIconUrl,
  getChampionSkinSplashUrl,
  getChampionPassiveIconUrl,
  getChampionSpellIconUrl,
  getMajorMinorPatch,
  getDDragonVersion,
} from '@/lib/ddragon';

interface ChampionDetailViewProps {
  slug: string;
}

export default function ChampionDetailView({ slug }: ChampionDetailViewProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<DDragonChampionDetail | null>(null);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpellIndex, setSelectedSpellIndex] = useState<number>(-1); // -1 = passive, 0 = Q, 1 = W, 2 = E, 3 = R
  const [selectedSkinIndex, setSelectedSkinIndex] = useState<number>(0);

  useEffect(() => {
    setIsLoading(true);
    fetchDDragonChampionDetail(slug, locale)
      .then((res) => {
        setData(res.champion);
        if (res.version) setVersion(res.version);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug, locale]);

  const patchString = getMajorMinorPatch(version);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 animate-pulse">
        <div className="h-6 w-32 bg-white/5 rounded-md mb-8" />
        <div className="h-80 w-full rounded-3xl bg-white/5 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl bg-white/5" />
          <div className="h-64 rounded-2xl bg-white/5 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
        <Shield className="h-16 w-16 text-zinc-600 mb-4 opacity-40" />
        <h1 className="text-2xl font-black text-white mb-2">
          {t('common.error')}
        </h1>
        <p className="text-zinc-400 mb-6">
          Champion &quot;{slug}&quot; konnte nicht im Data Dragon für Patch {patchString} gefunden werden.
        </p>
        <Link
          href={`/${locale}/champions`}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-5 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-500/30 transition-all shadow-md"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t('championWiki.backToList')}</span>
        </Link>
      </div>
    );
  }

  const selectedSpell =
    selectedSpellIndex === -1 ? null : data.spells[selectedSpellIndex];
  const activeSkin = data.skins[selectedSkinIndex] || data.skins[0];

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb Back Button */}
      <div className="mb-6">
        <Link
          href={`/${locale}/champions`}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t('championWiki.backToList')}</span>
        </Link>
      </div>

      {/* Hero Splash Header Banner */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c1017] shadow-2xl mb-8 min-h-[340px] sm:min-h-[400px] flex flex-col justify-end">
        {/* Splash Art Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src={getChampionSkinSplashUrl(data.id, activeSkin?.num ?? 0)}
            alt={data.name}
            fill
            className="object-cover object-top opacity-50 sm:opacity-60 transition-all duration-500"
            priority
            unoptimized
          />
          {/* Gradients to fade smoothly into RiftHero dark background */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1017] via-[#0c1017]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c1017] via-[#0c1017]/60 to-transparent" />
        </div>

        {/* Hero Content (Floating over bottom of banner) */}
        <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Champion Square Avatar */}
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
              <Image
                src={getChampionIconUrl(data.id, version)}
                alt={data.name}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                priority
                unoptimized
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-0.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1.5 w-fit shadow-sm">
                <Sparkles className="h-3 w-3" />
                <span>Patch {patchString}</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                {data.name}
              </h1>
              <p className="text-sm sm:text-lg text-zinc-300 font-semibold capitalize mt-0.5">
                {data.title}
              </p>

              {/* Tags & Resource */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {data.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-black/60 border border-white/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 uppercase tracking-wider"
                  >
                    {tag}
                  </span>
                ))}
                {data.partype && (
                  <span className="rounded-lg bg-black/40 border border-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                    {data.partype}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Difficulty & Combat Ratings Card */}
          <div className="flex items-center gap-4 rounded-2xl bg-black/60 border border-white/10 p-4 backdrop-blur-md shrink-0 shadow-xl">
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-semibold">Attack</span>
                <span className="text-amber-400 font-bold">{data.info?.attack ?? 5}/10</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                  style={{ width: `${(data.info?.attack ?? 5) * 10}%` }}
                />
              </div>

              <div className="flex justify-between text-xs mt-1">
                <span className="text-zinc-400 font-semibold">Defense</span>
                <span className="text-sky-400 font-bold">{data.info?.defense ?? 5}/10</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full"
                  style={{ width: `${(data.info?.defense ?? 5) * 10}%` }}
                />
              </div>

              <div className="flex justify-between text-xs mt-1">
                <span className="text-zinc-400 font-semibold">Magic</span>
                <span className="text-purple-400 font-bold">{data.info?.magic ?? 5}/10</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full"
                  style={{ width: `${(data.info?.magic ?? 5) * 10}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pl-4 border-l border-white/10 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {t('championWiki.difficulty')}
              </span>
              <span className="text-2xl font-black text-amber-400 mt-0.5">
                {data.info?.difficulty ?? 5}
              </span>
              <span className="text-[10px] text-zinc-500 font-semibold">von 10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Stats & Lore) + Right Column (Abilities & Skins) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Base Statistics (Basis-Attribute) */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
              <Activity className="h-4 w-4 text-amber-400" />
              <h2 className="text-base font-extrabold text-white">
                {t('championWiki.baseStats')}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* HP */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                  <Heart className="h-3.5 w-3.5" />
                  <span>{t('championWiki.hp')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.hp}
                </span>
                <span className="text-[10px] text-zinc-500">
                  +{data.stats.hpperlevel} {t('championWiki.perLevel')}
                </span>
              </div>

              {/* Mana / Resource */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold mb-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>{data.partype || t('championWiki.mana')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.mp > 0 ? data.stats.mp : '0'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {data.stats.mp > 0 ? `+${data.stats.mpperlevel} ${t('championWiki.perLevel')}` : 'Keine Kosten'}
                </span>
              </div>

              {/* Attack Damage */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold mb-1">
                  <Swords className="h-3.5 w-3.5" />
                  <span>{t('championWiki.attackDamage')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.attackdamage}
                </span>
                <span className="text-[10px] text-zinc-500">
                  +{data.stats.attackdamageperlevel} {t('championWiki.perLevel')}
                </span>
              </div>

              {/* Armor */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                  <Shield className="h-3.5 w-3.5" />
                  <span>{t('championWiki.armor')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.armor}
                </span>
                <span className="text-[10px] text-zinc-500">
                  +{data.stats.armorperlevel} {t('championWiki.perLevel')}
                </span>
              </div>

              {/* Magic Resist */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1">
                  <Shield className="h-3.5 w-3.5" />
                  <span>{t('championWiki.mr')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.spellblock}
                </span>
                <span className="text-[10px] text-zinc-500">
                  +{data.stats.spellblockperlevel} {t('championWiki.perLevel')}
                </span>
              </div>

              {/* Attack Speed */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold mb-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{t('championWiki.attackSpeed')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.attackspeed}
                </span>
                <span className="text-[10px] text-zinc-500">
                  +{data.stats.attackspeedperlevel}% {t('championWiki.perLevel')}
                </span>
              </div>

              {/* Movement Speed */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                  <Wind className="h-3.5 w-3.5" />
                  <span>{t('championWiki.movementSpeed')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.movespeed}
                </span>
                <span className="text-[10px] text-zinc-500">Basiswert</span>
              </div>

              {/* Range */}
              <div className="flex flex-col rounded-xl bg-black/40 p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
                  <Target className="h-3.5 w-3.5" />
                  <span>{t('championWiki.range')}</span>
                </div>
                <span className="text-base font-black text-white">
                  {data.stats.attackrange}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {data.stats.attackrange > 300 ? 'Fernkampf' : 'Nahkampf'}
                </span>
              </div>
            </div>
          </div>

          {/* Lore / Biography */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.06]">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <h2 className="text-base font-extrabold text-white">
                {t('championWiki.lore')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
              {data.lore}
            </p>
          </div>

          {/* Tips (if available) */}
          {((data.allytips && data.allytips.length > 0) || (data.enemytips && data.enemytips.length > 0)) && (
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 shadow-xl backdrop-blur-md flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                <Award className="h-4 w-4 text-amber-400" />
                <h2 className="text-base font-extrabold text-white">
                  {t('championWiki.tips')}
                </h2>
              </div>

              {data.allytips && data.allytips.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                    {t('championWiki.allyTips')}
                  </span>
                  <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1.5">
                    {data.allytips.map((tip, i) => (
                      <li key={i} className="leading-relaxed">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.enemytips && data.enemytips.length > 0 && (
                <div className="pt-3 border-t border-white/[0.04]">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">
                    {t('championWiki.enemyTips')}
                  </span>
                  <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1.5">
                    {data.enemytips.map((tip, i) => (
                      <li key={i} className="leading-relaxed">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Abilities & Skins */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Abilities (Fähigkeiten) */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-lg font-black text-white">
                  {t('championWiki.abilities')}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Wähle eine Fähigkeit aus, um Skalierungen und Abklingzeiten anzuzeigen.
                </p>
              </div>
              <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Skillset
              </span>
            </div>

            {/* Spell Selectors: Passive, Q, W, E, R */}
            <div className="flex items-center gap-3 sm:gap-4 mb-6 overflow-x-auto pb-2">
              {/* Passive */}
              <button
                type="button"
                onClick={() => setSelectedSpellIndex(-1)}
                className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                  selectedSpellIndex === -1
                    ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.3)] scale-105'
                    : 'border-white/10 bg-black/40 hover:border-white/20'
                }`}
              >
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-white/10">
                  <Image
                    src={getChampionPassiveIconUrl(data.passive.image.full, version)}
                    alt={data.passive.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  {t('championWiki.passive')}
                </span>
              </button>

              {/* Spells: Q, W, E, R */}
              {data.spells.map((spell, idx) => {
                const keys = ['Q', 'W', 'E', 'R'];
                const isSelected = selectedSpellIndex === idx;
                return (
                  <button
                    key={spell.id}
                    type="button"
                    onClick={() => setSelectedSpellIndex(idx)}
                    className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.3)] scale-105'
                        : 'border-white/10 bg-black/40 hover:border-white/20'
                    }`}
                  >
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-white/10">
                      <Image
                        src={getChampionSpellIconUrl(spell.image.full, version)}
                        alt={spell.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white">
                      {keys[idx]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Selected Ability Details */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 flex flex-col gap-3.5">
              {selectedSpellIndex === -1 ? (
                // Passive details
                <>
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                      {t('championWiki.passive')}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {data.passive.name}
                    </h3>
                  </div>
                  <div
                    className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal"
                    dangerouslySetInnerHTML={{ __html: data.passive.description }}
                  />
                </>
              ) : selectedSpell ? (
                // Q, W, E, R details
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                        {['Q', 'W', 'E', 'R'][selectedSpellIndex]}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {selectedSpell.name}
                      </h3>
                    </div>

                    {/* CD & Cost */}
                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                      {selectedSpell.cooldownBurn && selectedSpell.cooldownBurn !== '0' && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>{selectedSpell.cooldownBurn}s</span>
                        </div>
                      )}
                      {selectedSpell.costBurn && selectedSpell.costBurn !== '0' && (
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-sky-400" />
                          <span>{selectedSpell.costBurn} {data.partype || 'Mana'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description / Tooltip */}
                  <div
                    className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal"
                    dangerouslySetInnerHTML={{
                      __html: selectedSpell.description || selectedSpell.tooltip,
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>

          {/* Skins Gallery (Skins & Artworks) */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c1017]/90 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-400" />
                <h2 className="text-base font-extrabold text-white">
                  {t('championWiki.skins')} ({data.skins.length})
                </h2>
              </div>
              <span className="text-xs font-bold text-amber-400 truncate max-w-[200px]">
                {activeSkin?.name === 'default' ? t('championWiki.defaultSkin') : activeSkin?.name}
              </span>
            </div>

            {/* Skins Thumbnails List */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto pr-1">
              {data.skins.map((skin, idx) => {
                const isSelected = selectedSkinIndex === idx;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => setSelectedSkinIndex(idx)}
                    className={`group/skin relative flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.35)] scale-105 z-10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/60">
                      <Image
                        src={getChampionSkinSplashUrl(data.id, skin.num)}
                        alt={skin.name}
                        fill
                        className="object-cover group-hover/skin:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                    <div className="p-1.5 bg-[#0a0d12]/90 border-t border-white/[0.04]">
                      <span className="text-[10px] font-bold text-zinc-300 truncate block group-hover/skin:text-amber-300 transition-colors">
                        {skin.name === 'default' ? t('championWiki.defaultSkin') : skin.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
