'use client';

import { useSummonerContext } from '../SummonerContext';
import LiveGameView from '@/components/LiveGameView';

export default function SummonerLivePage() {
  const { region, profileData, liveData, isLoadingLive, reloadLiveGame } = useSummonerContext();

  const gameName = profileData?.summoner?.gameName || '';
  const tagLine = profileData?.summoner?.tagLine || '';

  return (
    <div className="w-full">
      <LiveGameView
        region={region}
        gameName={gameName}
        tagLine={tagLine}
        liveData={liveData}
        isLoading={isLoadingLive}
        onRefresh={reloadLiveGame}
      />
    </div>
  );
}
