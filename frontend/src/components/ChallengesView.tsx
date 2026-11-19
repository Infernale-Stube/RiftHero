'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Trophy, Sparkles, Shield, Flame, Users, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { FormattedPlayerChallenges, FormattedChallengeItem } from '@/types';

interface ChallengesViewProps {
  challengesData: FormattedPlayerChallenges | null;
  isLoading?: boolean;
}

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  NONE: { text: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  IRON: { text: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20' },
  BRONZE: { text: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/20' },
  SILVER: { text: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/20' },
  GOLD: { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  PLATINUM: { text: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/30' },
  EMERALD: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  DIAMOND: { text: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/30' },
  MASTER: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  GRANDMASTER: { text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
  CHALLENGER: { text: 'text-amber-300', bg: 'bg-amber-300/10', border: 'border-amber-300/30' },
};

const CATEGORY_ICONS_MAP: Record<string, any> = {
  EXPERTISE: Flame,
  TEAMWORK: Users,
  IMAGINATION: Sparkles,
  VETERANCY: Shield,
  COLLECTION: BookOpen,
};

export default function ChallengesView({
  challengesData,
  isLoading = false,
}: ChallengesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const challengesList = challengesData?.challenges || [];

  // Filter challenges
  const filteredChallenges = useMemo(() => {
    let result = [...challengesList];

    // Filter by Category
    if (selectedCategory !== 'ALL') {
      result = result.filter((c) => c.category === selectedCategory);
    }

    // Filter by Tier
    if (selectedTier !== 'ALL') {
      result = result.filter((c) => c.level === selectedTier);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [challengesList, selectedCategory, selectedTier, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span>Lade Challenges & Punkte...</span>
        </div>
      </div>
    );
  }

  if (!challengesData) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#0d1116] p-12 text-center">
        <Trophy className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Keine Challenges gefunden</h3>
        <p className="text-xs text-zinc-400">
          Für diesen Beschwörer konnten noch keine Challenge-Daten abgerufen werden.
        </p>
      </div>
    );
  }

  const { totalPoints, categoryPoints, preferences } = challengesData;
  const crystalTierColors = TIER_COLORS[totalPoints.level] || TIER_COLORS.GOLD;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: Challenge Crystal & Total Points */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#0d1116] via-[#121820] to-[#0d1116] p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Crystal & Title */}
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              <Image
                src={totalPoints.crystalIconUrl}
                alt={totalPoints.level}
                fill
                className="object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                unoptimized
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${crystalTierColors.bg} ${crystalTierColors.text} ${crystalTierColors.border}`}>
                  {totalPoints.level} Crystal
                </span>
                {totalPoints.percentile > 0 && (
                  <span className="text-xs text-zinc-400 font-medium">
                    Top {(totalPoints.percentile * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="mt-1 text-3xl font-black text-white">
                {totalPoints.current.toLocaleString()} <span className="text-sm font-semibold text-zinc-400">Punkte</span>
              </div>
              {preferences?.title && (
                <div className="mt-1 text-xs text-orange-400 font-semibold italic">
                  Titel: &ldquo;{preferences.title}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* Right: Progress to next crystal level */}
          <div className="w-full md:w-80">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-medium">
              <span>Fortschritt</span>
              <span className="text-white font-bold">
                {totalPoints.current.toLocaleString()} / {totalPoints.max.toLocaleString()} ({totalPoints.progressPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                style={{ width: `${totalPoints.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5 Capstone Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(categoryPoints).map(([catKey, cat]) => {
          const IconComponent = CATEGORY_ICONS_MAP[catKey] || Layers;
          const tierStyle = TIER_COLORS[cat.level] || TIER_COLORS.GOLD;
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(isSelected ? 'ALL' : catKey)}
              className={`rounded-xl border p-4 text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-orange-500/50 bg-[#151c28] shadow-lg shadow-orange-500/10'
                  : 'border-white/[0.08] bg-[#0d1116] hover:border-white/20 hover:bg-[#111722]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 text-orange-400" />
                  <span className="font-bold text-white text-xs">{cat.name}</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
                  {cat.level}
                </span>
              </div>

              <div className="text-lg font-black text-white mt-1">
                {cat.current.toLocaleString()}{' '}
                <span className="text-[11px] font-normal text-zinc-400">
                  / {cat.max.toLocaleString()}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${cat.progressPercent}%` }}
                />
              </div>

              {cat.percentile > 0 && (
                <div className="mt-2 text-[10px] text-zinc-500 font-medium">
                  Top {(cat.percentile * 100).toFixed(1)}% der Spieler
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar: Category filter pills, Tier pills, and Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0d1116] p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'EXPERTISE', 'TEAMWORK', 'IMAGINATION', 'VETERANCY', 'COLLECTION', 'SEASONAL'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 border border-transparent'
                }`}
              >
                {cat === 'ALL' ? 'Alle Kategorien' : cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Challenge suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#060809] py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-orange-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Tier filter row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.04]">
          <span className="text-[11px] font-semibold text-zinc-500 mr-1">Rang:</span>
          {['ALL', 'CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'IRON'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`rounded px-2 py-0.5 text-[10px] font-bold transition-all ${
                selectedTier === tier
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Challenge Tokens Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredChallenges.length === 0 ? (
          <div className="col-span-full rounded-xl border border-white/[0.08] bg-[#0d1116] p-12 text-center text-xs text-zinc-500">
            Keine Challenges mit diesen Filterkriterien gefunden.
          </div>
        ) : (
          filteredChallenges.map((ch) => {
            const tierStyle = TIER_COLORS[ch.level] || TIER_COLORS.IRON;

            return (
              <div
                key={ch.challengeId}
                className="group relative flex flex-col justify-between rounded-xl border border-white/[0.06] bg-[#0d1116] p-4 transition-all hover:border-white/20 hover:bg-[#111722]"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Token Icon */}
                    <div className="relative h-12 w-12 shrink-0">
                      <Image
                        src={ch.iconUrl}
                        alt={ch.name}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform"
                        unoptimized
                      />
                    </div>

                    {/* Challenge Title & Badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs truncate">
                          {ch.name}
                        </span>
                        {ch.isCapstone && (
                          <span className="rounded bg-orange-500/20 px-1 py-0.2 text-[9px] font-bold text-orange-400 border border-orange-500/30">
                            Capstone
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
                          {ch.level}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {ch.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {ch.description && (
                    <p className="mt-3 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {ch.description}
                    </p>
                  )}
                </div>

                {/* Progress / Value footer */}
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Wert: {ch.value.toLocaleString()}</span>
                  </div>

                  {ch.nextThreshold ? (
                    <div className="text-zinc-500 text-[10px]">
                      Nächster: <span className="text-zinc-300 font-semibold">{ch.nextThreshold.tier}</span> ({ch.nextThreshold.value.toLocaleString()})
                    </div>
                  ) : ch.percentile > 0 ? (
                    <div className="text-orange-400/90 text-[10px] font-semibold">
                      Top {(ch.percentile * 100).toFixed(1)}%
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
