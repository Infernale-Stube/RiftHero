import Image from 'next/image';
import { FormattedMatch } from '@/types';
import {
  getChampionIconUrl,
  getItemIconUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
} from '@/lib/ddragon';
import { formatDuration, formatTimeAgo, getKdaColor } from '@/lib/utils';
import ParticipantList from './ParticipantList';

interface MatchCardProps {
  match: FormattedMatch;
  region: string;
}

export default function MatchCard({ match, region }: MatchCardProps) {
  const { win, queueName, gameDuration, gameCreation, participant, blueTeam, redTeam } = match;

  const runeKeystoneUrl = getRuneIconUrl(participant.primaryRune);
  const runeStyleUrl = getStyleIconUrl(participant.secondaryStyle);

  return (
    <div
      className={`relative flex flex-col xl:flex-row xl:items-center justify-between rounded-xl border p-4 transition-all ${
        win
          ? 'border-blue-500/40 bg-blue-950/20 hover:border-blue-500/60'
          : 'border-rose-500/40 bg-rose-950/20 hover:border-rose-500/60'
      }`}
    >
      {/* Colored Left Bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
          win ? 'bg-blue-500' : 'bg-rose-500'
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 min-w-0">
        {/* 1. Queue & Outcome Info */}
        <div className="flex flex-col justify-center min-w-[100px]">
          <span className="text-xs font-bold text-slate-300 truncate">
            {queueName}
          </span>
          <span className="text-[11px] text-slate-500">
            {formatTimeAgo(gameCreation)}
          </span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                win ? 'text-blue-400' : 'text-rose-400'
              }`}
            >
              {win ? 'Sieg' : 'Niederlage'}
            </span>
            <span className="text-[11px] text-slate-400">
              {formatDuration(gameDuration)}
            </span>
          </div>
        </div>

        {/* 2. Champion, Spells, Runes */}
        <div className="flex items-center gap-3">
          {/* Champion Icon + Level */}
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-rift-600 shadow-md">
            <Image
              src={getChampionIconUrl(participant.championName)}
              alt={participant.championName}
              width={56}
              height={56}
              className="h-full w-full object-cover"
              unoptimized
            />
            <div className="absolute bottom-0 right-0 rounded-tl bg-rift-950/90 px-1 text-[10px] font-bold text-hextech-lightGold">
              {participant.champLevel}
            </div>
          </div>

          {/* Spells & Runes (2x2 grid) */}
          <div className="flex gap-1">
            {/* Spells */}
            <div className="flex flex-col gap-1">
              <div className="h-6 w-6 overflow-hidden rounded border border-rift-700 bg-rift-900">
                <Image
                  src={getSpellIconUrl(participant.spells[0])}
                  alt="Spell 1"
                  width={24}
                  height={24}
                  unoptimized
                />
              </div>
              <div className="h-6 w-6 overflow-hidden rounded border border-rift-700 bg-rift-900">
                <Image
                  src={getSpellIconUrl(participant.spells[1])}
                  alt="Spell 2"
                  width={24}
                  height={24}
                  unoptimized
                />
              </div>
            </div>

            {/* Runes */}
            <div className="flex flex-col gap-1">
              <div className="h-6 w-6 overflow-hidden rounded border border-rift-700 bg-rift-900 flex items-center justify-center p-0.5">
                {runeKeystoneUrl ? (
                  <Image
                    src={runeKeystoneUrl}
                    alt="Keystone"
                    width={20}
                    height={20}
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full bg-rift-800 rounded-full" />
                )}
              </div>
              <div className="h-6 w-6 overflow-hidden rounded border border-rift-700 bg-rift-900 flex items-center justify-center p-0.5">
                {runeStyleUrl ? (
                  <Image
                    src={runeStyleUrl}
                    alt="Secondary Rune"
                    width={18}
                    height={18}
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full bg-rift-800 rounded-full" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. KDA & Farm */}
        <div className="flex flex-col justify-center min-w-[120px]">
          <div className="flex items-center gap-1 text-sm font-black text-slate-100">
            <span>{participant.kills}</span>
            <span className="text-slate-500 font-normal">/</span>
            <span className="text-rose-400">{participant.deaths}</span>
            <span className="text-slate-500 font-normal">/</span>
            <span>{participant.assists}</span>
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-xs">
            <span className={getKdaColor(participant.kda)}>
              {participant.kda}:1 KDA
            </span>
            <span className="text-slate-400">
              {participant.cs} CS ({participant.csPerMinute}/m)
            </span>
          </div>
        </div>

        {/* 4. Items (6 Inventory + 1 Trinket) */}
        <div className="flex items-center gap-1">
          <div className="grid grid-cols-3 gap-1">
            {participant.items.slice(0, 6).map((itemId, idx) => (
              <div
                key={idx}
                className="h-7 w-7 rounded border border-rift-700/80 bg-rift-900/80 overflow-hidden flex items-center justify-center"
              >
                {itemId > 0 ? (
                  <Image
                    src={getItemIconUrl(itemId)}
                    alt={`Item ${itemId}`}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
            ))}
          </div>

          {/* Trinket */}
          <div className="h-7 w-7 rounded border border-rift-700/80 bg-rift-900/80 overflow-hidden flex items-center justify-center ml-1">
            {participant.items[6] > 0 ? (
              <Image
                src={getItemIconUrl(participant.items[6])}
                alt="Trinket"
                width={28}
                height={28}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. 10 Participants List */}
      <div className="mt-4 xl:mt-0 xl:pl-4 xl:border-l xl:border-rift-700/60 shrink-0">
        <ParticipantList
          region={region}
          currentPuuid={participant.puuid}
          blueTeam={blueTeam}
          redTeam={redTeam}
        />
      </div>
    </div>
  );
}
