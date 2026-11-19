export type Locale = 'de' | 'en';

export interface TranslationDictionary {
  common: {
    loading: string;
    error: string;
    back: string;
    search: string;
    all: string;
    vs: string;
    pageNotFoundTitle: string;
    pageNotFoundDesc: string;
    backToHome: string;
  };
  nav: {
    brandSubtitle: string;
    searchPlaceholder: string;
    apiOnline: string;
  };
  home: {
    heroBadge: string;
    heroTitle1: string;
    heroTitleHighlight: string;
    heroSubtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    recentSearchesTitle: string;
    recentSummonersTitle: string;
    noRecentSummoners: string;
  };
  summoner: {
    loadingProfile: string;
    loadingSubtitle: string;
    profileNotFound: string;
    newPlayerTitle: string;
    newPlayerDesc: string;
    highPrioritySync: string;
    bgSync: string;
    cachedAgo: string;
    tabMatches: string;
    tabChampions: string;
    tabChallenges: string;
    tabLive: string;
    soloRank: string;
    flexRank: string;
    unranked: string;
    noGamesRecorded: string;
    lastGames: string;
    lpGraphTitle: string;
    netLp: string;
    peakRank: string;
    winStreak: string;
    longestStreak: string;
    playedWithTitle: string;
    playedWithEmpty: string;
    playedWithGames: string;
    playedWithWinrate: string;
    playedWithAs: string;
    topChampionsTitle: string;
    syncingToast: string;
    syncCompletedToast: string;
  };
  matches: {
    victory: string;
    defeat: string;
    win: string;
    loss: string;
    blueTeam: string;
    redTeam: string;
    loadMore: string;
    noMatches: string;
    filterAll: string;
    filterSolo: string;
    filterFlex: string;
    filterAram: string;
    filterNormal: string;
    detailedOverview: string;
    viewFullMatch: string;
    mostDmg: string;
    mostGold: string;
    mostCs: string;
  };
  champions: {
    championsPlayed: string;
    championsPlayedSubtitle: string;
    totalGames: string;
    overallWinrate: string;
    mostPlayed: string;
    mostPlayedTitle: string;
    champCount: string;
    gamesLabel: string;
    searchPlaceholder: string;
    colIndex: string;
    colChampion: string;
    colPlayed: string;
    colWinrate: string;
    colKda: string;
    colCs: string;
    colDamage: string;
    colGold: string;
    colHighlights: string;
    gamesCount: string;
    damageTaken: string;
    vision: string;
    maxKills: string;
    noChampions: string;
    loading: string;
  };
  challenges: {
    crystal: string;
    points: string;
    topPercent: string;
    progress: string;
    titleEquipped: string;
    allCategories: string;
    searchPlaceholder: string;
    tierFilter: string;
    tierAll: string;
    value: string;
    nextThreshold: string;
    noChallenges: string;
    loading: string;
    emptyTitle: string;
    emptyDesc: string;
  };
  matchDetail: {
    title: string;
    back: string;
    duration: string;
    playedAgo: string;
    patch: string;
    kills: string;
    blueTeam: string;
    redTeam: string;
    win: string;
    loss: string;
    playerOverview: string;
    playerOverviewSubtitle: string;
    teamObjectives: string;
    teamObjectivesSubtitle: string;
    firstBlue: string;
    firstRed: string;
    drakes: string;
    baronNashor: string;
    voidgrubs: string;
    riftHerald: string;
    towers: string;
    inhibitors: string;
    blueDrakes: string;
    redDrakes: string;
    noDrakes: string;
    bans: string;
    notFoundTitle: string;
    notFoundDesc: string;
    analyzing: string;
    timelineLoading: string;
    goldLeadTitle: string;
    minuteProgress: string;
    goldLeadSubtitle: string;
    maxBlue: string;
    maxRed: string;
    minuteAt: string;
    goldTied: string;
    blueLeads: string;
    redLeads: string;
    goldUnit: string;
    noTimeline: string;
  };
  live: {
    analyzing: string;
    spectatorCheck: string;
    notInGame: string;
    notInGameDesc: string;
    checkAgain: string;
    gameActive: string;
    gameMode: string;
    gameLength: string;
    refresh: string;
    refreshTitle: string;
    blueTeam: string;
    redTeam: string;
    bans: string;
    blueBans: string;
    redBans: string;
  };
  footer: {
    copyright: string;
    prodKey: string;
    snowball: string;
  };
}

export const translations: Record<Locale, TranslationDictionary> = {
  de: {
    common: {
      loading: 'Wird geladen...',
      error: 'Fehler',
      back: 'Zurück',
      search: 'Suchen',
      all: 'Alle',
      vs: 'VS',
      pageNotFoundTitle: 'Seite nicht gefunden',
      pageNotFoundDesc: 'Das gesuchte Profil oder die Seite existiert nicht oder konnte nicht aufgelöst werden.',
      backToHome: 'Zur Startseite',
    },
    nav: {
      brandSubtitle: 'LoL Stats & Analytics',
      searchPlaceholder: 'Beschwörer suchen (Name#TAG)...',
      apiOnline: 'Riot API Online',
    },
    home: {
      heroBadge: 'High-Capacity Production Analytics',
      heroTitle1: 'Dominieren Sie die',
      heroTitleHighlight: 'Kluft',
      heroSubtitle:
        'Echtzeit-Statistiken, detaillierte Match-Historien und automatische Profil-Aktualisierung – blitzschnell gecacht in PostgreSQL und optimiert gegen Rate-Limits.',
      feature1Title: 'Stilles Auto-Refresh',
      feature1Desc: 'Automatische Hintergrund-Updates ohne manuellen Button',
      feature2Title: '10-Spieler-Schneeballsystem',
      feature2Desc: 'Mitspieler werden im Hintergrund vorberechnet',
      feature3Title: 'PostgreSQL Cache',
      feature3Desc: 'Sub-10ms Ladezeiten für bereits erfasste Profile',
      recentSearchesTitle: 'Kürzliche Suchen',
      recentSummonersTitle: 'Zuletzt aufgerufene Beschwörer',
      noRecentSummoners: 'Noch keine Spieler aufgerufen.',
    },
    summoner: {
      loadingProfile: 'Profil wird geladen...',
      loadingSubtitle: 'PostgreSQL & Riot API Überprüfung',
      profileNotFound: 'Profil konnte nicht geladen werden',
      newPlayerTitle: 'Neuer Spieler wird erfasst',
      newPlayerDesc:
        'Dieses Profil ist noch nicht in PostgreSQL gespeichert. Der Worker ruft gerade alle Matches und Liga-Ränge über die Riot Production API ab.',
      highPrioritySync: 'High-Priority Ingestion läuft...',
      bgSync: 'Hintergrund-Sync läuft...',
      cachedAgo: 'Gecached · vor {time}',
      tabMatches: 'Match History',
      tabChampions: 'Champions',
      tabChallenges: 'Challenges',
      tabLive: 'Live Game',
      soloRank: 'Ranked Solo/Duo',
      flexRank: 'Ranked Flex',
      unranked: 'Unranked',
      noGamesRecorded: 'Keine Spiele erfasst',
      lastGames: 'Letzte {count} Spiele',
      lpGraphTitle: 'LP-Verlauf',
      netLp: 'Netto LP',
      peakRank: 'Peak',
      winStreak: 'Längste Win-Streak',
      longestStreak: 'Streak',
      playedWithTitle: 'Häufige Mitspieler (Synergie)',
      playedWithEmpty: 'Noch keine Mitspieler-Synergien verzeichnet',
      playedWithGames: 'Spiele',
      playedWithWinrate: 'Win %',
      playedWithAs: 'mit {champ}',
      topChampionsTitle: 'Top Champions',
      syncingToast: 'Profil & Matches werden im Hintergrund aktualisiert...',
      syncCompletedToast: 'Profil erfolgreich aktualisiert!',
    },
    matches: {
      victory: 'Victory',
      defeat: 'Defeat',
      win: 'Sieg',
      loss: 'Niederlage',
      blueTeam: 'Blaues Team',
      redTeam: 'Rotes Team',
      loadMore: 'Mehr Matches laden',
      noMatches: 'Keine Matches für diesen Filter gefunden.',
      filterAll: 'Alle Queues',
      filterSolo: 'Ranked Solo',
      filterFlex: 'Ranked Flex',
      filterAram: 'ARAM',
      filterNormal: 'Normal Draft',
      detailedOverview: 'Detaillierte Spielübersicht',
      viewFullMatch: 'Vollständige Match-Seite (Drakes, Timeline & Grafiken)',
      mostDmg: 'Most Dmg',
      mostGold: 'Most Gold',
      mostCs: 'Most CS',
    },
    champions: {
      championsPlayed: 'Champions',
      championsPlayedSubtitle: 'Gespielte Champions',
      totalGames: 'Spiele gesamt',
      overallWinrate: 'Gesamte Winrate',
      mostPlayed: 'Meistgespielt',
      mostPlayedTitle: 'Meistgespielte Champions',
      champCount: '{count} Champs',
      gamesLabel: '{count} Spiele',
      searchPlaceholder: 'Champion suchen...',
      colIndex: '#',
      colChampion: 'Champion',
      colPlayed: 'Gespielt',
      colWinrate: 'Winrate',
      colKda: 'KDA',
      colCs: 'CS',
      colDamage: 'Schaden',
      colGold: 'Gold',
      colHighlights: 'Highlights',
      gamesCount: '{count} Spiele',
      damageTaken: 'Erhalten: {amount}',
      vision: 'Vision: {score}',
      maxKills: 'Max {count} Kills',
      noChampions: 'Keine Champions gefunden.',
      loading: 'Lade Champion-Statistiken...',
    },
    challenges: {
      crystal: '{level} Crystal',
      points: 'Punkte',
      topPercent: 'Top {pct}% der Spieler',
      progress: 'Fortschritt',
      titleEquipped: 'Titel: „{title}“',
      allCategories: 'Alle Kategorien',
      searchPlaceholder: 'Challenge suchen...',
      tierFilter: 'Rang:',
      tierAll: 'ALL',
      value: 'Wert: {val}',
      nextThreshold: 'Nächster: {tier} ({val})',
      noChallenges: 'Keine Challenges mit diesen Filterkriterien gefunden.',
      loading: 'Lade Challenges & Punkte...',
      emptyTitle: 'Keine Challenges gefunden',
      emptyDesc: 'Für diesen Beschwörer konnten noch keine Challenge-Daten abgerufen werden.',
    },
    matchDetail: {
      title: 'Match-Analyse',
      back: 'Zurück',
      duration: 'Dauer: {dur}',
      playedAgo: 'Gespielt {time}',
      patch: 'Patch {patch}',
      kills: 'Kills',
      blueTeam: 'Blaues Team',
      redTeam: 'Rotes Team',
      win: 'Sieg',
      loss: 'Niederlage',
      playerOverview: 'Spielerübersicht (Blaues Team vs. Rotes Team)',
      playerOverviewSubtitle: 'KDA, Schaden, CS, Vision & Items',
      teamObjectives: 'Team-Objektive (Ingame-Statistiken)',
      teamObjectivesSubtitle: 'Erreichte neutrale & strategische Ziele',
      firstBlue: 'First (Blau)',
      firstRed: 'First (Rot)',
      drakes: 'Drakes',
      baronNashor: 'Baron Nashor',
      voidgrubs: 'Voidgrubs',
      riftHerald: 'Rift Herald',
      towers: 'Türme',
      inhibitors: 'Inhibitoren',
      blueDrakes: 'Blau Drakes:',
      redDrakes: 'Rot Drakes:',
      noDrakes: 'Keine Drakes',
      bans: 'Bans:',
      notFoundTitle: 'Match nicht gefunden',
      notFoundDesc: 'Das Spiel {id} konnte weder in der Datenbank noch über die Riot API abgerufen werden.',
      analyzing: 'Match-Details werden analysiert...',
      timelineLoading: 'Timeline & Ingame-Objektive laden',
      goldLeadTitle: 'Gold-Vorteil Graph (Timeline)',
      minuteProgress: 'Minutenverlauf',
      goldLeadSubtitle: 'Netto-Golddifferenz zwischen Blauem und Rotem Team im Spielverlauf',
      maxBlue: 'Max Blau:',
      maxRed: 'Max Rot:',
      minuteAt: 'Minute {min}:00',
      goldTied: '(Gleichstand)',
      blueLeads: '(Blau führt)',
      redLeads: '(Rot führt)',
      goldUnit: '{amount}k Gold',
      noTimeline: 'Keine Timeline-Daten für dieses Match verfügbar.',
    },
    live: {
      analyzing: 'Spectator-Status wird abgefragt...',
      spectatorCheck: 'Riot Games Spectator v5 Überprüfung',
      notInGame: 'Kein aktives Live-Spiel',
      notInGameDesc: '{name} befindet sich aktuell in keinem laufenden League-of-Legends-Match.',
      checkAgain: 'Status erneut prüfen',
      gameActive: 'Live Spiel Aktiv',
      gameMode: 'Spielmodus: {mode}',
      gameLength: 'Laufzeit',
      refresh: 'Aktualisieren',
      refreshTitle: 'Live-Daten aktualisieren',
      blueTeam: 'Blaues Team',
      redTeam: 'Rotes Team',
      bans: 'Bans:',
      blueBans: 'Blau:',
      redBans: 'Rot:',
    },
    footer: {
      copyright: '© {year} RiftHero. Nicht affiliiert mit Riot Games. League of Legends und Riot Games sind Warenzeichen von Riot Games, Inc.',
      prodKey: 'Production Key Enabled',
      snowball: '10-Player Snowball Ingestion',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      back: 'Back',
      search: 'Search',
      all: 'All',
      vs: 'VS',
      pageNotFoundTitle: 'Page Not Found',
      pageNotFoundDesc: 'The requested profile or page does not exist or could not be resolved.',
      backToHome: 'Back to Home',
    },
    nav: {
      brandSubtitle: 'LoL Stats & Analytics',
      searchPlaceholder: 'Search summoner (Name#TAG)...',
      apiOnline: 'Riot API Online',
    },
    home: {
      heroBadge: 'High-Capacity Production Analytics',
      heroTitle1: 'Dominate the',
      heroTitleHighlight: 'Rift',
      heroSubtitle:
        'Real-time stats, detailed match histories, and automatic background profile updates – ultra-fast caching in PostgreSQL and optimized against rate limits.',
      feature1Title: 'Silent Auto-Refresh',
      feature1Desc: 'Automated background ingestion with no manual refresh button needed',
      feature2Title: '10-Player Snowball',
      feature2Desc: 'Lobby teammates are queued and pre-fetched automatically',
      feature3Title: 'PostgreSQL Cache',
      feature3Desc: 'Sub-10ms response times for previously indexed summoners',
      recentSearchesTitle: 'Recent Searches',
      recentSummonersTitle: 'Recently Viewed Summoners',
      noRecentSummoners: 'No summoners viewed yet.',
    },
    summoner: {
      loadingProfile: 'Loading profile...',
      loadingSubtitle: 'PostgreSQL & Riot API lookup',
      profileNotFound: 'Summoner profile could not be loaded',
      newPlayerTitle: 'Discovering New Summoner',
      newPlayerDesc:
        'This profile is not stored in PostgreSQL yet. Background worker is fetching all season matches and league ranks via Riot Production API.',
      highPrioritySync: 'High-priority ingestion in progress...',
      bgSync: 'Background sync in progress...',
      cachedAgo: 'Cached · {time} ago',
      tabMatches: 'Match History',
      tabChampions: 'Champions',
      tabChallenges: 'Challenges',
      tabLive: 'Live Game',
      soloRank: 'Ranked Solo/Duo',
      flexRank: 'Ranked Flex',
      unranked: 'Unranked',
      noGamesRecorded: 'No games recorded',
      lastGames: 'Last {count} Games',
      lpGraphTitle: 'LP History',
      netLp: 'Net LP',
      peakRank: 'Peak',
      winStreak: 'Longest Win Streak',
      longestStreak: 'Streak',
      playedWithTitle: 'Played With (Teammates)',
      playedWithEmpty: 'No teammate synergies recorded yet',
      playedWithGames: 'Games',
      playedWithWinrate: 'Win %',
      playedWithAs: 'with {champ}',
      topChampionsTitle: 'Top Champions',
      syncingToast: 'Profile & matches updating in background...',
      syncCompletedToast: 'Profile updated successfully!',
    },
    matches: {
      victory: 'Victory',
      defeat: 'Defeat',
      win: 'Win',
      loss: 'Loss',
      blueTeam: 'Blue Team',
      redTeam: 'Red Team',
      loadMore: 'Load more matches',
      noMatches: 'No matches found for this filter.',
      filterAll: 'All Queues',
      filterSolo: 'Ranked Solo',
      filterFlex: 'Ranked Flex',
      filterAram: 'ARAM',
      filterNormal: 'Normal Draft',
      detailedOverview: 'Detailed Match Overview',
      viewFullMatch: 'Full Match Page (Drakes, Timeline & Graphs)',
      mostDmg: 'Most Dmg',
      mostGold: 'Most Gold',
      mostCs: 'Most CS',
    },
    champions: {
      championsPlayed: 'Champions',
      championsPlayedSubtitle: 'Champions Played',
      totalGames: 'Total Games',
      overallWinrate: 'Overall Winrate',
      mostPlayed: 'Most Played',
      mostPlayedTitle: 'Most Played Champions',
      champCount: '{count} Champs',
      gamesLabel: '{count} Games',
      searchPlaceholder: 'Search champion...',
      colIndex: '#',
      colChampion: 'Champion',
      colPlayed: 'Played',
      colWinrate: 'Winrate',
      colKda: 'KDA',
      colCs: 'CS',
      colDamage: 'Damage',
      colGold: 'Gold',
      colHighlights: 'Highlights',
      gamesCount: '{count} Games',
      damageTaken: 'Taken: {amount}',
      vision: 'Vision: {score}',
      maxKills: 'Max {count} Kills',
      noChampions: 'No champions found.',
      loading: 'Loading champion statistics...',
    },
    challenges: {
      crystal: '{level} Crystal',
      points: 'Points',
      topPercent: 'Top {pct}% of players',
      progress: 'Progress',
      titleEquipped: 'Title: "{title}"',
      allCategories: 'All Categories',
      searchPlaceholder: 'Search challenges...',
      tierFilter: 'Tier:',
      tierAll: 'ALL',
      value: 'Value: {val}',
      nextThreshold: 'Next: {tier} ({val})',
      noChallenges: 'No challenges found matching these criteria.',
      loading: 'Loading challenges & points...',
      emptyTitle: 'No Challenges Found',
      emptyDesc: 'No challenge data could be retrieved for this summoner yet.',
    },
    matchDetail: {
      title: 'Match Analysis',
      back: 'Back',
      duration: 'Duration: {dur}',
      playedAgo: 'Played {time}',
      patch: 'Patch {patch}',
      kills: 'Kills',
      blueTeam: 'Blue Team',
      redTeam: 'Red Team',
      win: 'Victory',
      loss: 'Defeat',
      playerOverview: 'Player Overview (Blue Team vs. Red Team)',
      playerOverviewSubtitle: 'KDA, Damage, CS, Vision & Items',
      teamObjectives: 'Team Objectives (Ingame Statistics)',
      teamObjectivesSubtitle: 'Captured neutral & strategic objectives',
      firstBlue: 'First (Blue)',
      firstRed: 'First (Red)',
      drakes: 'Drakes',
      baronNashor: 'Baron Nashor',
      voidgrubs: 'Voidgrubs',
      riftHerald: 'Rift Herald',
      towers: 'Towers',
      inhibitors: 'Inhibitors',
      blueDrakes: 'Blue Drakes:',
      redDrakes: 'Red Drakes:',
      noDrakes: 'No Drakes',
      bans: 'Bans:',
      notFoundTitle: 'Match Not Found',
      notFoundDesc: 'Match {id} could not be retrieved from the database or Riot API.',
      analyzing: 'Analyzing match details...',
      timelineLoading: 'Loading timeline & ingame objectives',
      goldLeadTitle: 'Gold Advantage Graph (Timeline)',
      minuteProgress: 'Minute timeline',
      goldLeadSubtitle: 'Net gold difference between Blue and Red team over time',
      maxBlue: 'Max Blue:',
      maxRed: 'Max Red:',
      minuteAt: 'Minute {min}:00',
      goldTied: '(Tied)',
      blueLeads: '(Blue leads)',
      redLeads: '(Red leads)',
      goldUnit: '{amount}k Gold',
      noTimeline: 'No timeline data available for this match.',
    },
    live: {
      analyzing: 'Checking Spectator status...',
      spectatorCheck: 'Riot Games Spectator v5 check',
      notInGame: 'No Active Live Game',
      notInGameDesc: '{name} is currently not in an active League of Legends match.',
      checkAgain: 'Check status again',
      gameActive: 'Live Game Active',
      gameMode: 'Game Mode: {mode}',
      gameLength: 'Game Length',
      refresh: 'Refresh',
      refreshTitle: 'Refresh live data',
      blueTeam: 'Blue Team',
      redTeam: 'Red Team',
      bans: 'Bans:',
      blueBans: 'Blue:',
      redBans: 'Red:',
    },
    footer: {
      copyright: '© {year} RiftHero. Not affiliated with Riot Games. League of Legends and Riot Games are trademarks of Riot Games, Inc.',
      prodKey: 'Production Key Enabled',
      snowball: '10-Player Snowball Ingestion',
    },
  },
};
