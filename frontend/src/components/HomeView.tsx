'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Swords,
  Radio,
  Trophy,
  TrendingUp,
  Flame,
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import RecentSearches from '@/components/RecentSearches';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  getPositionIconUrl,
  getChampionIconUrl,
  getDDragonVersion,
  getPreviousDDragonPatch,
  PositionKey,
} from '@/lib/ddragon';
import { fetchMetaChampions } from '@/lib/api';

interface MetaChampion {
  name: string;
  tier: 'S+' | 'S' | 'A';
  winrate: string;
  pickrate: string;
  banrate: string;
  role: PositionKey;
  games?: number;
}

const ROLES: Array<{ key: PositionKey; label: string }> = [
  { key: 'TOP', label: 'Top Lane' },
  { key: 'JUNGLE', label: 'Jungle' },
  { key: 'MID', label: 'Mid Lane' },
  { key: 'ADC', label: 'Bot (ADC)' },
  { key: 'SUPPORT', label: 'Support' },
];

export default function HomeView() {
  const { t, locale } = useTranslation();
  const [activeRole, setActiveRole] = useState<PositionKey>('MID');
  const [patch, setPatch] = useState<string>(() => getPreviousDDragonPatch());
  const [metaByRole, setMetaByRole] = useState<Record<string, MetaChampion[]>>({
    TOP: [],
    JUNGLE: [],
    MID: [],
    ADC: [],
    SUPPORT: [],
  });
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  useEffect(() => {
    // Pure dynamic fetch from backend match analysis
    fetchMetaChampions()
      .then((res) => {
        if (res && res.champions) {
          setMetaByRole(res.champions as any);
        }
        if (res && res.patch) {
          setPatch(res.patch);
        }
      })
      .finally(() => {
        setIsLoadingMeta(false);
      });
  }, []);

  const metaChampions = metaByRole[activeRole] || [];

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center max-w-4xl w-full mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-bold text-amber-400 uppercase tracking-wider mb-5 shadow-sm">
          <Swords className="h-3.5 w-3.5 text-amber-400" />
          <span>{t('home.heroBadge')}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4">
          <span className="block">{t('home.heroTitle1')}</span>
          <span className="block mt-1 sm:mt-2">
            {t('home.heroTitle2')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500">
              {t('home.heroTitleHighlight')}
            </span>
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl font-normal leading-relaxed mb-8">
          {t('home.heroSubtitle')}
        </p>

        {/* Central Search Bar */}
        <div className="w-full max-w-3xl sm:max-w-4xl">
          <SearchBar defaultRegion="euw" />
        </div>

        {/* Recent Searches (from LocalStorage) */}
        <div className="w-full max-w-3xl sm:max-w-4xl mt-5">
          <RecentSearches />
        </div>
      </div>

      {/* 3 Core League Pillars (Pure LoL Focus, No DB/AI Jargon) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-14">
        {/* Pillar 1: Live Game Tracker */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-5 shadow-xl transition-all hover:border-sky-500/40 hover:bg-[#101724]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Radio className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-sky-400 tracking-wider">
                Live Scouting
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mb-1.5">
              {t('home.feature1Title')}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t('home.feature1Desc')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Ränge • Winrates • Runen • Matchups</span>
          </div>
        </div>

        {/* Pillar 2: 0-100 Performance Scores */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-5 shadow-xl transition-all hover:border-amber-500/40 hover:bg-[#15131a]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 tracking-wider">
                MVP & ACE
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mb-1.5">
              {t('home.feature2Title')}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t('home.feature2Desc')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>MVP 100 • ACE • Damage Share • Vision</span>
          </div>
        </div>

        {/* Pillar 3: Match History & LP Progression */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-5 shadow-xl transition-all hover:border-emerald-500/40 hover:bg-[#0f1816]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                Ranked Solo & Flex
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mb-1.5">
              {t('home.feature3Title')}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t('home.feature3Desc')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Netto LP • Item-Builds • CS/Minuten</span>
          </div>
        </div>
      </div>

      {/* Authentic Patch Meta Champions Showcase */}
      <div className="w-full flex flex-col rounded-3xl border border-white/[0.08] bg-[#0b0e14]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Meta Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>{t('home.metaTitle', { patch: patch || getPreviousDDragonPatch() })}</span>
            </div>
            <p className="text-sm text-zinc-400">
              {t('home.metaSubtitle')}
            </p>
          </div>

          {/* Right Controls: Role Filter Tabs + Tier List CTA */}
          <div className="flex items-center gap-3 flex-wrap self-start sm:self-auto">
            <div className="inline-flex rounded-xl bg-black/50 p-1 border border-white/[0.06]">
              {ROLES.map((r) => {
                const isActive = activeRole === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setActiveRole(r.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Image
                      src={getPositionIconUrl(r.key)}
                      alt={r.label}
                      width={14}
                      height={14}
                      className={`object-contain ${isActive ? 'opacity-100' : 'opacity-60'}`}
                      unoptimized
                    />
                    <span className="hidden sm:inline">{r.key}</span>
                  </button>
                );
              })}
            </div>

            <Link
              href={`/${locale}/tier-list`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-300 transition-all shadow-sm hover:border-amber-500/50"
            >
              <span>{t('home.viewAllTierList')}</span>
            </Link>
          </div>
        </div>

        {/* Champions Grid */}
        {isLoadingMeta ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.04] bg-black/25 p-4 animate-pulse h-44"
              >
                <div className="flex items-center gap-3">
                  <div className="h-13 w-13 rounded-2xl bg-white/5 shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 w-24 bg-white/5 rounded" />
                    <div className="h-3 w-16 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.04]">
                  <div className="h-8 bg-white/5 rounded-xl" />
                  <div className="h-8 bg-white/5 rounded-xl" />
                  <div className="h-8 bg-white/5 rounded-xl" />
                  <div className="h-8 bg-white/5 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : metaChampions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metaChampions.map((champ) => (
              <div
                key={champ.name}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#0c1017]/85 hover:bg-[#101724] hover:border-amber-500/35 p-4 transition-all duration-200 shadow-xl"
              >
                {/* Top: Avatar, Name, Role Icon & Tier Badge */}
                <div className="flex items-center gap-3.5 mb-3.5">
                  <div className="relative shrink-0">
                    <div className="h-13 w-13 rounded-2xl overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-200">
                      <Image
                        src={getChampionIconUrl(champ.name)}
                        alt={champ.name}
                        width={52}
                        height={52}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tight shadow-md border border-black/80 flex items-center justify-center leading-none z-10 ${
                        champ.tier === 'S+'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-amber-500/30'
                          : champ.tier === 'S'
                          ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-black shadow-sky-500/30'
                          : 'bg-zinc-700 text-white'
                      }`}
                    >
                      {champ.tier}
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-extrabold text-base text-white truncate group-hover:text-amber-300 transition-colors">
                      {champ.name}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                      <Image
                        src={getPositionIconUrl(champ.role)}
                        alt={champ.role}
                        width={13}
                        height={13}
                        className="opacity-70"
                        unoptimized
                      />
                      <span>{champ.role}</span>
                    </span>
                  </div>
                </div>

                {/* 4 Unified Metric Badges: Winrate, Pickrate, Banrate, Matches */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.05]">
                  {/* Winrate */}
                  <div className="flex flex-col rounded-xl bg-black/40 px-2.5 py-1.5 border border-white/[0.04]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Winrate
                    </span>
                    <span className="text-xs font-black text-emerald-400">
                      {champ.winrate}
                    </span>
                  </div>

                  {/* Pickrate */}
                  <div className="flex flex-col rounded-xl bg-black/40 px-2.5 py-1.5 border border-white/[0.04]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Pickrate
                    </span>
                    <span className="text-xs font-black text-sky-400">
                      {champ.pickrate}
                    </span>
                  </div>

                  {/* Banrate */}
                  <div className="flex flex-col rounded-xl bg-black/40 px-2.5 py-1.5 border border-white/[0.04]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Banrate
                    </span>
                    <span className="text-xs font-bold text-rose-400">
                      {champ.banrate || '—'}
                    </span>
                  </div>

                  {/* Matches */}
                  <div className="flex flex-col rounded-xl bg-black/40 px-2.5 py-1.5 border border-white/[0.04]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Matches
                    </span>
                    <span className="text-xs font-bold text-zinc-200">
                      {champ.games ? champ.games.toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
            <Shield className="h-8 w-8 text-zinc-600 mb-2 opacity-50" />
            <p className="text-sm font-semibold text-zinc-400">
              {t('home.noMetaPicks')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
