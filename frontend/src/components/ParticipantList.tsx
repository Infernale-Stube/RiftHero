import Link from 'next/link';
import Image from 'next/image';
import { MatchParticipant } from '@/types';
import { getChampionIconUrl } from '@/lib/ddragon';

interface ParticipantListProps {
  region: string;
  currentPuuid: string;
  blueTeam: MatchParticipant[];
  redTeam: MatchParticipant[];
}

export default function ParticipantList({
  region,
  currentPuuid,
  blueTeam,
  redTeam,
}: ParticipantListProps) {
  const renderTeam = (team: MatchParticipant[], isBlue: boolean) => (
    <div className="flex flex-col gap-1 w-full sm:w-[130px]">
      {team.map((p) => {
        const isCurrent = p.puuid === currentPuuid;
        const tag = p.riotIdTagline || region.toUpperCase();
        const formattedTag = `${p.riotIdGameName}-${tag}`;

        return (
          <Link
            key={p.puuid}
            href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
            className={`group flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors ${
              isCurrent ? 'bg-rift-700/80 font-bold' : 'hover:bg-rift-800/60'
            }`}
            title={`${p.riotIdGameName}#${tag}`}
          >
            <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded">
              <Image
                src={getChampionIconUrl(p.championName)}
                alt={p.championName}
                width={16}
                height={16}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
            <span
              className={`truncate text-[11px] ${
                isCurrent
                  ? 'text-white'
                  : 'text-slate-400 group-hover:text-slate-200'
              }`}
            >
              {p.riotIdGameName}
            </span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
      {renderTeam(blueTeam, true)}
      {renderTeam(redTeam, false)}
    </div>
  );
}
