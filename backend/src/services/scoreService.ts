export interface DeepLolScore {
  score: number; // 0.0 - 10.0 (1 decimal place)
  rank: number; // 1 - 10 in match
  isMvp: boolean; // Top score on winning team
  isAce: boolean; // Top score on losing team
  tierRating: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface ScoreTimelinePoint {
  minute: number;
  blueScore: number;
  redScore: number;
  diff: number; // blueScore - redScore
  playerScores: Record<string, number>; // puuid -> score at minute
}

/**
 * Calculates the DeepLoL AI-Score for all participants of a match.
 */
export function calculateMatchScores(
  participants: any[],
  gameDurationSeconds: number
): Map<string, DeepLolScore> {
  const durationMin = Math.max(gameDurationSeconds / 60, 1);
  const blueParticipants = participants.filter((p) => p.teamId === 100);
  const redParticipants = participants.filter((p) => p.teamId === 200);

  const blueKills = blueParticipants.reduce((acc, p) => acc + (p.kills || 0), 0);
  const redKills = redParticipants.reduce((acc, p) => acc + (p.kills || 0), 0);
  const blueDmg = blueParticipants.reduce((acc, p) => acc + (p.totalDamageDealtToChampions || 0), 0);
  const redDmg = redParticipants.reduce((acc, p) => acc + (p.totalDamageDealtToChampions || 0), 0);

  const scoredList: Array<{ puuid: string; win: boolean; rawScore: number }> = [];

  for (const p of participants) {
    const isBlue = p.teamId === 100;
    const teamKills = isBlue ? blueKills : redKills;
    const teamDmg = isBlue ? blueDmg : redDmg;

    // 1. Base Score
    let score = 5.2;

    // 2. KDA Performance
    const deaths = p.deaths || 0;
    const kills = p.kills || 0;
    const assists = p.assists || 0;
    const kda = (kills + assists) / Math.max(deaths, 1);

    // KDA contribution: centered around 2.5 KDA
    const kdaBonus = Math.min(2.8, Math.max(-2.2, (kda - 2.5) * 0.65));
    score += kdaBonus;

    // Excess deaths penalty
    if (deaths > 6) {
      score -= (deaths - 6) * 0.18;
    }

    // 3. Kill Participation (KP)
    const kp = teamKills > 0 ? (kills + assists) / teamKills : 0;
    const kpBonus = (kp - 0.45) * 1.8;
    score += kpBonus;

    // 4. Role & Damage Output
    const rolePos = (p.teamPosition || p.individualPosition || p.lane || '').toUpperCase();
    const isSupport = rolePos === 'UTILITY' || rolePos === 'SUPPORT';
    const isJungle = rolePos === 'JUNGLE';
    const isCarry = !isSupport && !isJungle;

    const dmgShare = teamDmg > 0 ? (p.totalDamageDealtToChampions || 0) / teamDmg : 0;
    if (isCarry) {
      const expectedDmg = 0.22;
      score += (dmgShare - expectedDmg) * 5.5;
    } else if (isJungle) {
      const expectedDmg = 0.17;
      score += (dmgShare - expectedDmg) * 4.5;
    } else {
      // Support
      score += Math.min(0.6, (dmgShare - 0.08) * 3.0);
    }

    // 5. CS & Economy
    const totalCs = p.totalMinionsKilled || 0;
    const csPerMin = totalCs / durationMin;

    if (isCarry) {
      const csBonus = Math.min(1.2, Math.max(-1.2, (csPerMin - 6.5) * 0.35));
      score += csBonus;
    } else if (isJungle) {
      const csBonus = Math.min(0.8, Math.max(-0.8, (csPerMin - 5.0) * 0.3));
      score += csBonus;
    }

    // 6. Vision Score
    const vpm = (p.visionScore || 0) / durationMin;
    if (isSupport) {
      const visBonus = Math.min(1.0, Math.max(-0.8, (vpm - 1.5) * 0.8));
      score += visBonus;
    } else {
      const visBonus = Math.min(0.6, Math.max(-0.4, (vpm - 0.6) * 0.5));
      score += visBonus;
    }

    // 7. Objective / Turret Bonus
    const turretTakedowns = (p as any).challenges?.turretTakedowns || (p as any).challengesJson?.turretTakedowns || 0;
    score += Math.min(0.5, turretTakedowns * 0.1);

    // 8. Match Outcome
    if (p.win) {
      score += 0.5;
    } else {
      score -= 0.3;
    }

    // Clamp score between 2.2 and 9.9
    const finalScore = Number(Math.min(9.9, Math.max(2.2, score)).toFixed(1));
    scoredList.push({ puuid: p.puuid, win: p.win, rawScore: finalScore });
  }

  // Sort by rawScore descending
  scoredList.sort((a, b) => b.rawScore - a.rawScore);

  // Identify MVP (top on winning team) and ACE (top on losing team)
  const mvpItem = scoredList.find((s) => s.win);
  const aceItem = scoredList.find((s) => !s.win);

  const resultMap = new Map<string, DeepLolScore>();

  scoredList.forEach((item, index) => {
    const isMvp = item.puuid === mvpItem?.puuid;
    const isAce = item.puuid === aceItem?.puuid;

    const roundedScore = isMvp
      ? 100
      : Math.min(99, Math.max(10, Math.round(item.rawScore * 10)));

    let tierRating: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
    if (roundedScore >= 90) tierRating = 'S+';
    else if (roundedScore >= 80) tierRating = 'S';
    else if (roundedScore >= 70) tierRating = 'A';
    else if (roundedScore >= 60) tierRating = 'B';
    else if (roundedScore >= 50) tierRating = 'C';
    else tierRating = 'D';

    resultMap.set(item.puuid, {
      score: roundedScore,
      rank: index + 1,
      isMvp,
      isAce,
      tierRating,
    });
  });

  return resultMap;
}

/**
 * Builds the complete DeepLolScore ranking map from precalculated heroScores stored in the database.
 * If participants do not have saved heroScores, returns an empty map (NO live calculation/fallback).
 */
export function buildScoresFromSavedHeroScores(
  participants: Array<{ puuid: string; win: boolean; heroScore?: number | null }>
): Map<string, DeepLolScore> {
  const withScore = participants.filter(
    (p) => typeof p.heroScore === 'number' && p.heroScore > 0
  );

  if (withScore.length === 0) {
    return new Map<string, DeepLolScore>();
  }

  const scoredList = withScore.map((p) => ({
    puuid: p.puuid,
    win: p.win,
    rawScore: p.heroScore as number,
  }));

  // Sort by rawScore descending
  scoredList.sort((a, b) => b.rawScore - a.rawScore);

  const mvpItem = scoredList.find((s) => s.win);
  const aceItem = scoredList.find((s) => !s.win);

  const resultMap = new Map<string, DeepLolScore>();

  scoredList.forEach((item, index) => {
    const isMvp = item.puuid === mvpItem?.puuid;
    const isAce = item.puuid === aceItem?.puuid;
    const scoreVal = Math.round(item.rawScore <= 10 ? item.rawScore * 10 : item.rawScore);

    let tierRating: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
    if (scoreVal >= 90) tierRating = 'S+';
    else if (scoreVal >= 80) tierRating = 'S';
    else if (scoreVal >= 70) tierRating = 'A';
    else if (scoreVal >= 60) tierRating = 'B';
    else if (scoreVal >= 50) tierRating = 'C';
    else tierRating = 'D';

    resultMap.set(item.puuid, {
      score: scoreVal,
      rank: index + 1,
      isMvp,
      isAce,
      tierRating,
    });
  });

  return resultMap;
}

/**
 * Computes minute-by-minute score timeline from Riot Match Timeline V5 data.
 */
export function calculateScoreTimeline(
  timeline: any,
  participants: any[],
  matchScores: Map<string, DeepLolScore>
): ScoreTimelinePoint[] {
  if (!timeline?.info?.frames || !Array.isArray(timeline.info.frames) || timeline.info.frames.length < 2) {
    return [];
  }

  // Build mapping from participantId (1..10) to puuid
  const partIdToPuuid = new Map<number, string>();
  if (Array.isArray(timeline.info.participants)) {
    timeline.info.participants.forEach((tp: any) => {
      partIdToPuuid.set(tp.participantId, tp.puuid);
    });
  } else {
    // Fallback: order of participants
    participants.forEach((p, idx) => {
      partIdToPuuid.set(idx + 1, p.puuid);
    });
  }

  const frames = timeline.info.frames;
  const totalFrames = frames.length;
  const result: ScoreTimelinePoint[] = [];

  // Track cumulative events
  const playerStats = new Map<
    number,
    { kills: number; deaths: number; assists: number; towers: number }
  >();
  for (let i = 1; i <= 10; i++) {
    playerStats.set(i, { kills: 0, deaths: 0, assists: 0, towers: 0 });
  }

  frames.forEach((frame: any, frameIdx: number) => {
    // Process events in this frame
    if (Array.isArray(frame.events)) {
      frame.events.forEach((ev: any) => {
        if (ev.type === 'CHAMPION_KILL') {
          if (ev.killerId && playerStats.has(ev.killerId)) {
            playerStats.get(ev.killerId)!.kills += 1;
          }
          if (ev.victimId && playerStats.has(ev.victimId)) {
            playerStats.get(ev.victimId)!.deaths += 1;
          }
          if (Array.isArray(ev.assistingParticipantIds)) {
            ev.assistingParticipantIds.forEach((aId: number) => {
              if (playerStats.has(aId)) {
                playerStats.get(aId)!.assists += 1;
              }
            });
          }
        } else if (ev.type === 'BUILDING_KILL' && ev.buildingType === 'TOWER_BUILDING') {
          if (ev.killerId && playerStats.has(ev.killerId)) {
            playerStats.get(ev.killerId)!.towers += 1;
          }
        }
      });
    }

    const playerScores: Record<string, number> = {};
    let blueScoreSum = 0;
    let blueCount = 0;
    let redScoreSum = 0;
    let redCount = 0;

    // Minute 0 baseline
    if (frameIdx === 0) {
      participants.forEach((p) => {
        playerScores[p.puuid] = 50;
        if (p.teamId === 100) {
          blueScoreSum += 50;
          blueCount++;
        } else {
          redScoreSum += 50;
          redCount++;
        }
      });
    } else {
      // Calculate dynamic score at minute `frameIdx`
      const currentMinute = frameIdx;
      const progressRatio = frameIdx / (totalFrames - 1);

      // Collect team total stats in this frame
      let teamBlueGold = 0;
      let teamRedGold = 0;
      let teamBlueKills = 0;
      let teamRedKills = 0;

      for (let pId = 1; pId <= 10; pId++) {
        const pf = frame.participantFrames?.[pId.toString()];
        const stats = playerStats.get(pId)!;
        if (pId <= 5) {
          teamBlueGold += pf?.totalGold || 0;
          teamBlueKills += stats.kills;
        } else {
          teamRedGold += pf?.totalGold || 0;
          teamRedKills += stats.kills;
        }
      }

      participants.forEach((p, idx) => {
        // Resolve participantId
        let pId = 0;
        for (const [id, puuid] of partIdToPuuid.entries()) {
          if (puuid === p.puuid) {
            pId = id;
            break;
          }
        }
        if (!pId) pId = idx + 1;

        const pf = frame.participantFrames?.[pId.toString()];
        const stats = playerStats.get(pId) || { kills: 0, deaths: 0, assists: 0, towers: 0 };
        const isBlue = p.teamId === 100;
        const myTeamGold = isBlue ? teamBlueGold : teamRedGold;
        const myTeamKills = isBlue ? teamBlueKills : teamRedKills;

        let score = 50.0;

        // KDA component
        const kda = (stats.kills + stats.assists) / Math.max(stats.deaths, 1);
        score += Math.min(25, Math.max(-20, (kda - 2.5) * 6.0));
        if (stats.deaths > 3) {
          score -= (stats.deaths - 3) * 1.5;
        }

        // KP component
        if (myTeamKills > 0) {
          const kp = (stats.kills + stats.assists) / myTeamKills;
          score += (kp - 0.45) * 15.0;
        }

        // Gold share component
        if (myTeamGold > 0 && pf?.totalGold) {
          const goldShare = pf.totalGold / myTeamGold;
          score += (goldShare - 0.2) * 40.0;
        }

        // CS/min component
        if (pf) {
          const totalCs = (pf.minionsKilled || 0) + (pf.jungleMinionsKilled || 0);
          const csPerMin = totalCs / currentMinute;
          const rolePos = (p.teamPosition || p.individualPosition || p.lane || '').toUpperCase();
          if (rolePos !== 'UTILITY' && rolePos !== 'SUPPORT') {
            score += Math.min(10, Math.max(-10, (csPerMin - 6.0) * 2.5));
          }
        }

        // Team momentum influence (smooth blend towards final score at the end)
        const rawFinal = matchScores.get(p.puuid)?.score ?? 60.0;
        const finalScore = rawFinal <= 10 ? rawFinal * 10 : rawFinal;
        const weightedScore = score * (1 - progressRatio * 0.5) + finalScore * (progressRatio * 0.5);

        const clamped = Math.min(100, Math.max(10, Math.round(weightedScore)));
        playerScores[p.puuid] = clamped;

        if (isBlue) {
          blueScoreSum += clamped;
          blueCount++;
        } else {
          redScoreSum += clamped;
          redCount++;
        }
      });
    }

    const avgBlue = blueCount > 0 ? Math.round(blueScoreSum / blueCount) : 50;
    const avgRed = redCount > 0 ? Math.round(redScoreSum / redCount) : 50;
    const diff = avgBlue - avgRed;

    result.push({
      minute: frameIdx,
      blueScore: avgBlue,
      redScore: avgRed,
      diff,
      playerScores,
    });
  });

  return result;
}
