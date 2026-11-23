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
    details: string;
  };
  nav: {
    brandSubtitle: string;
    searchPlaceholder: string;
    apiOnline: string;
    tierList: string;
    champions: string;
    items: string;
    home: string;
    liveGame: string;
    masteries: string;
    challenges: string;
    matches: string;
  };
  navigation: {
    home: string;
    champions: string;
    items: string;
    tierList: string;
  };
  home: {
    heroBadge: string;
    heroTitle1: string;
    heroTitle2: string;
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
    metaTitle: string;
    metaSubtitle: string;
    noMetaPicks: string;
    viewAllTierList: string;
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
    tabMasteries: string;
    tabChallenges: string;
    tabLive: string;
    soloRank: string;
    flexRank: string;
    ranked5sRank: string;
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
    filterRanked5s: string;
    filterAram: string;
    filterNormal: string;
    detailedOverview: string;
    viewFullMatch: string;
    mostDmg: string;
    mostGold: string;
    mostCs: string;
    blueSide: string;
    redSide: string;
    remake: string;
    bans: string;
    towers: string;
    inhibitors: string;
    dragons: string;
    barons: string;
    herald: string;
    build: string;
    damage: string;
    taken: string;
    vision: string;
    gold: string;
    heroScore: string;
    matchId: string;
    switchToTaken: string;
    switchToDamage: string;
    badgeNew: string;
    surrender: string;
    matchDetails: string;
    toggleDetails: string;
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
  masteries: {
    title: string;
    totalScore: string;
    totalPoints: string;
    championsPlayed: string;
    searchPlaceholder: string;
    sortBy: string;
    sortByPoints: string;
    sortByLevel: string;
    sortByRecent: string;
    sortByName: string;
    filterAll: string;
    filterLevel7: string;
    filterLevel10: string;
    level: string;
    points: string;
    nextLevel: string;
    maxLevel: string;
    lastPlayed: string;
    milestone: string;
    noResults: string;
    loading: string;
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
    championWinrate: string;
    rankedWinrate: string;
    avgRank: string;
    avgWinrate: string;
    noData: string;
    draftBans: string;
    you: string;
    winProbability: string;
    winProbabilitySubtitle: string;
    blueFavored: string;
    redFavored: string;
    evenMatch: string;
    rankFactor: string;
    winrateFactor: string;
    champFactor: string;
    masteryFactor: string;
    mapFactor: string;
    blueLead: string;
    redLead: string;
    balanced: string;
    confidenceHigh: string;
    confidenceMedium: string;
    confidenceLow: string;
    ban: string;
    noBan: string;
    noPlayer: string;
    accountLevel: string;
    started: string;
    liveGame: string;
    matchId: string;
    copyMatchId: string;
    toggleFactors: string;
    factors: string;
    less: string;
    balanceMarker: string;
    lpDiff: string;
    equalRankLevel: string;
    mmrComparison: string;
    avgSeasonWinrates: string;
    bluePrefix: string;
    redPrefix: string;
    firstMatches: string;
    champExpSubtitle: string;
    masterySubtitle: string;
    masteryLevel: string;
    firstTime: string;
    sideAdvantageBlue: string;
    sideAdvantageNeutral: string;
    sideAdvantageBlueDesc: string;
    sideAdvantageSymmetric: string;
    mapBiasSubtitle: string;
    winProbDisclaimer: string;
    autoCheckInterval: string;
    matchEndedRedirect: string;
  };
  footer: {
    copyright: string;
    prodKey: string;
    snowball: string;
  };
  tierList: {
    pageTitle: string;
    pageSubtitle: string;
    allRoles: string;
    searchPlaceholder: string;
    colRank: string;
    colChampion: string;
    colRole: string;
    colTier: string;
    colWinrate: string;
    colPickrate: string;
    colBanrate: string;
    colMatches: string;
    colScore: string;
    noResults: string;
    topWinrate: string;
    mostPicked: string;
    mostBanned: string;
    totalAnalyzed: string;
  };
  championWiki: {
    pageTitle: string;
    pageSubtitle: string;
    searchPlaceholder: string;
    filterAll: string;
    filterFighter: string;
    filterMage: string;
    filterAssassin: string;
    filterMarksman: string;
    filterTank: string;
    filterSupport: string;
    difficulty: string;
    role: string;
    noChampions: string;
    backToList: string;
    lore: string;
    abilities: string;
    passive: string;
    baseStats: string;
    skins: string;
    hp: string;
    hpRegen: string;
    mana: string;
    manaRegen: string;
    armor: string;
    mr: string;
    attackDamage: string;
    attackSpeed: string;
    movementSpeed: string;
    range: string;
    cooldown: string;
    cost: string;
    tips: string;
    allyTips: string;
    enemyTips: string;
    resource: string;
    perLevel: string;
    defaultSkin: string;
    patchDataNotice: string;
    breadcrumbHome: string;
    breadcrumbChampions: string;
    showingCount: string;
    sortByNameAsc: string;
    sortByNameDesc: string;
    sortByDiffAsc: string;
    sortByDiffDesc: string;
    laneTop: string;
    laneJungle: string;
    laneMid: string;
    laneAdc: string;
    laneSupport: string;
    allLanes: string;
    allClasses: string;
    resetFilters: string;
    clickForDetails: string;
    faqTitle1: string;
    faqDesc1: string;
    faqTitle2: string;
    faqDesc2: string;
    faqTitle3: string;
    faqDesc3: string;
    tabOverview: string;
    tabAbilities: string;
    tabSkins: string;
    pricingBE: string;
    pricingRP: string;
    detailFaqRelease: string;
    detailFaqReleaseDesc: string;
    detailFaqRole: string;
    detailFaqRoleDesc: string;
    detailFaqSkins: string;
    detailFaqSkinsDesc: string;
    detailFaqCost: string;
    detailFaqCostDesc: string;
    championsFromYear: string;
    skinTimeline: string;
    regular: string;
    epic: string;
    legendary: string;
    mythic: string;
    transcendent: string;
    allSkinsGallery: string;
    allyTipsTitle: string;
    enemyTipsTitle: string;
  };
  itemsWiki: {
    pageTitle: string;
    pageSubtitle: string;
    badge: string;
    searchPlaceholder: string;
    allCategories: string;
    catAttack: string;
    catMagic: string;
    catDefense: string;
    catMovement: string;
    catStarterConsumable: string;
    mapFilter: string;
    mapSR: string;
    mapARAM: string;
    mapArena: string;
    mapAll: string;
    tierFilter: string;
    allTiers: string;
    tierLegendary: string;
    tierEpic: string;
    tierBasic: string;
    tierBoots: string;
    tierStarter: string;
    tierConsumable: string;
    sortBy: string;
    sortGoldDesc: string;
    sortGoldAsc: string;
    sortNameAsc: string;
    sortNameDesc: string;
    onlyPurchasable: string;
    resetFilters: string;
    noItemsFound: string;
    noItemsDesc: string;
    showingCount: string;
    goldCost: string;
    totalCost: string;
    recipeCost: string;
    sellValue: string;
    buildsFrom: string;
    buildsInto: string;
    noRecipe: string;
    noUpgrades: string;
    close: string;
    statsTitle: string;
    effectsTitle: string;
    tagsTitle: string;
    exclusiveChampion: string;
    ornnUpgrade: string;
    roleAll: string;
    roleFighter: string;
    roleMarksman: string;
    roleAssassin: string;
    roleMage: string;
    roleTank: string;
    roleSupport: string;
    statFilters: string;
    clearStats: string;
    goldEfficiency: string;
    efficiencyBadge: string;
    buildPathTitle: string;
    upgradedFrom: string;
    tierLegendaries: string;
    tierEpics: string;
    tierBasics: string;
    tierStarters: string;
    tierBootsPlural: string;
    tierConsumablesPlural: string;
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
      details: 'Details',
    },
    nav: {
      brandSubtitle: 'LoL Stats & Analytics',
      searchPlaceholder: 'Beschwörer suchen (Name#TAG)...',
      apiOnline: 'Riot API Online',
      tierList: 'Tier List',
      champions: 'Champions',
      items: 'Items',
      home: 'Startseite',
      liveGame: 'Live Game',
      masteries: 'Masteries',
      challenges: 'Challenges',
      matches: 'Match History',
    },
    navigation: {
      home: 'Startseite',
      champions: 'Champions',
      items: 'Items',
      tierList: 'Tier List',
    },
    home: {
      heroBadge: 'League of Legends Scouting & Stats',
      heroTitle1: 'Finde jeden Spieler.',
      heroTitle2: 'Analysiere',
      heroTitleHighlight: 'jedes Match.',
      heroSubtitle:
        'Echtzeit Live-Game Scouting, detaillierte Match-Historien, Hero Score-Ratings und Champion-Masteries auf einen Blick.',
      feature1Title: 'Live Game Tracker',
      feature1Desc: 'Gegner-Ränge, Champion-Erfahrung und Matchups vor Spielbeginn scouten',
      feature2Title: 'Hero Score',
      feature2Desc: 'Objektives MVP & ACE Rating basierend auf dem Hero Score (Combat, KDA, Farming & Objectives)',
      feature3Title: 'Match History & LP Tracker',
      feature3Desc: 'Detaillierte Timeline-Analysen, Item-Builds und exakte LP-Verläufe',
      recentSearchesTitle: 'Zuletzt gesucht',
      recentSummonersTitle: 'Zuletzt aufgerufene Beschwörer',
      noRecentSummoners: 'Noch keine Spieler aufgerufen.',
      metaTitle: 'Patch {patch} Meta Picks',
      metaSubtitle: 'Die stärksten Champions nach Rolle auf der aktuellen Kluft',
      noMetaPicks: 'Noch keine Match-Daten für diese Rolle erfasst.',
      viewAllTierList: 'Vollständige Tier List ansehen →',
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
      cachedAgo: 'Gecached · {time}',
      tabMatches: 'Übersicht',
      tabChampions: 'Champions',
      tabMasteries: 'Masteries',
      tabChallenges: 'Challenges',
      tabLive: 'Live Game',
      soloRank: 'Solo/Duo',
      flexRank: 'Flex',
      ranked5sRank: '5s',
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
      victory: 'Sieg',
      defeat: 'Niederlage',
      win: 'Sieg',
      loss: 'Niederlage',
      blueTeam: 'Blaues Team',
      redTeam: 'Rotes Team',
      loadMore: 'Mehr Matches laden',
      noMatches: 'Keine Matches für diesen Filter gefunden.',
      filterAll: 'Alle Queues',
      filterSolo: 'Solo/Duo',
      filterFlex: 'Flex',
      filterRanked5s: 'Ranked 5s',
      filterAram: 'ARAM',
      filterNormal: 'Normal Draft',
      detailedOverview: 'Detaillierte Spielübersicht',
      viewFullMatch: 'Vollständige Match-Seite (Drakes, Timeline & Grafiken)',
      mostDmg: 'Most Dmg',
      mostGold: 'Most Gold',
      mostCs: 'Most CS',
      blueSide: 'Blaue Seite',
      redSide: 'Rote Seite',
      remake: 'Remake',
      bans: 'Bans:',
      towers: 'Türme',
      inhibitors: 'Inhibitoren',
      dragons: 'Drachen',
      barons: 'Barone',
      herald: 'Herolde / Maden',
      build: 'Build',
      damage: 'Schaden',
      taken: 'Erhalten',
      vision: 'Sicht',
      gold: 'Gold',
      heroScore: 'Hero Score',
      matchId: 'Match-ID:',
      switchToTaken: 'Zu Schaden Erhalten (Taken) wechseln',
      switchToDamage: 'Zu Ausgeteilter Schaden (Damage) wechseln',
      badgeNew: 'Neu',
      surrender: 'Aufgabe',
      matchDetails: 'Match-Details',
      toggleDetails: 'Match-Details ein-/ausklappen',
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
    masteries: {
      title: 'Champion Masteries',
      totalScore: 'Mastery-Score',
      totalPoints: 'Gesamtpunkte',
      championsPlayed: 'Gespielte Champions',
      searchPlaceholder: 'Champion suchen...',
      sortBy: 'Sortieren:',
      sortByPoints: 'Meiste Punkte',
      sortByLevel: 'Höchstes Level',
      sortByRecent: 'Zuletzt gespielt',
      sortByName: 'Name (A-Z)',
      filterAll: 'Alle Level',
      filterLevel7: 'Level 7+',
      filterLevel10: 'Level 10+',
      level: 'Level',
      points: 'Punkte',
      nextLevel: 'Nächstes Level',
      maxLevel: 'Max Level',
      lastPlayed: 'Zuletzt gespielt',
      milestone: 'Meilenstein',
      noResults: 'Keine Champion-Masteries gefunden.',
      loading: 'Lade Champion-Masteries...',
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
      blueBans: 'Blaues Team',
      redBans: 'Rotes Team',
      championWinrate: 'Champ Winrate',
      rankedWinrate: 'Ranked Winrate',
      avgRank: 'Ø Rang',
      avgWinrate: 'Ø Winrate',
      noData: 'Keine Daten',
      draftBans: 'Gebannte Champions',
      you: 'DU',
      winProbability: 'Siegwahrscheinlichkeit',
      winProbabilitySubtitle: 'Berechnet aus MMR, Siegraten, Champion-Meisterschaft & Karten-Vorteil',
      blueFavored: 'Blaues Team favorisiert',
      redFavored: 'Rotes Team favorisiert',
      evenMatch: 'Ausgeglichenes Duell',
      rankFactor: 'Rang & MMR',
      winrateFactor: 'Ø Ranked Winrate',
      champFactor: 'Champion-Erfahrung',
      masteryFactor: 'Champion-Mastery',
      mapFactor: 'Karten-Vorteil',
      blueLead: 'Blau führt',
      redLead: 'Rot führt',
      balanced: 'Ausgeglichen',
      confidenceHigh: 'Hohe Datenbasis',
      confidenceMedium: 'Mittlere Datenbasis',
      confidenceLow: 'Geringe Datenbasis (viele Unranked)',
      ban: 'Ban',
      noBan: 'Kein Ban',
      noPlayer: 'Kein Spieler',
      accountLevel: 'Account-Stufe',
      started: 'Start:',
      liveGame: 'Live Game',
      matchId: 'Match ID:',
      copyMatchId: 'Match ID kopieren',
      toggleFactors: 'Faktoren ein-/ausblenden',
      factors: 'Faktoren',
      less: 'Weniger',
      balanceMarker: '50% Ausgleichsmarkierung',
      lpDiff: '{count} LP Differenz',
      equalRankLevel: 'Gleiches Rangniveau',
      mmrComparison: 'Blau: {blue} MMR · Rot: {red} MMR',
      avgSeasonWinrates: 'Durchschnittliche Saison-Siegraten',
      bluePrefix: 'Blau',
      redPrefix: 'Rot',
      firstMatches: 'Erste Matches',
      champExpSubtitle: 'Erfahrung mit gewähltem Champion',
      masterySubtitle: 'Ø Stufe {bLvl} vs {rLvl}',
      masteryLevel: 'Mastery Stufe {level}',
      firstTime: 'First Time',
      sideAdvantageBlue: '+1.2% Blau',
      sideAdvantageNeutral: 'Neutral',
      sideAdvantageBlueDesc: 'Blaues Team (First Pick)',
      sideAdvantageSymmetric: 'Symmetrische Karte',
      mapBiasSubtitle: 'Statistischer Summoner\'s-Rift-Vorteil',
      winProbDisclaimer: 'Die Siegwahrscheinlichkeit wird vor Spielstart anhand von Team-MMR, saisonaler Siegrate, Champion-Beherrschung und Kartenseite prognostiziert.',
      autoCheckInterval: 'Auto-Check alle 3 Min.',
      matchEndedRedirect: 'Match beendet! Leite zur Übersicht weiter und aktualisiere Profil...',
    },
    footer: {
      copyright: '© {year} RiftHero. Nicht affiliiert mit Riot Games. League of Legends und Riot Games sind Warenzeichen von Riot Games, Inc.',
      prodKey: 'Production Key Enabled',
      snowball: '10-Player Snowball Ingestion',
    },
    tierList: {
      pageTitle: 'Patch {patch} Champion Tier List',
      pageSubtitle: 'Die stärksten Champions der Kluft der Beschwörer nach Rolle, Winrate und Pickrate',
      allRoles: 'Alle Rollen',
      searchPlaceholder: 'Champion suchen...',
      colRank: '#',
      colChampion: 'Champion',
      colRole: 'Rolle',
      colTier: 'Tier',
      colWinrate: 'Winrate',
      colPickrate: 'Pickrate',
      colBanrate: 'Banrate',
      colMatches: 'Matches',
      colScore: 'Rating',
      noResults: 'Keine Champions gefunden, die den Filtern entsprechen.',
      topWinrate: 'Höchste Winrate',
      mostPicked: 'Meistgespielt',
      mostBanned: 'Meistgebannt',
      totalAnalyzed: 'Analysierte Matches',
    },
    championWiki: {
      pageTitle: 'Champion Übersicht',
      pageSubtitle: 'Alle {count} Champions in League of Legends auf aktuellem Patch {patch}',
      searchPlaceholder: 'Champion suchen (Name, Titel oder Rolle)...',
      filterAll: 'Alle Rollen',
      filterFighter: 'Kämpfer',
      filterMage: 'Magier',
      filterAssassin: 'Assassinen',
      filterMarksman: 'Schützen',
      filterTank: 'Tanks',
      filterSupport: 'Unterstützer',
      difficulty: 'Schwierigkeit',
      role: 'Klasse',
      noChampions: 'Keine Champions gefunden, die den Filtern entsprechen.',
      backToList: 'Zurück zur Champion-Übersicht',
      lore: 'Biografie & Hintergrund',
      abilities: 'Fähigkeiten & Skills',
      passive: 'Passiv',
      baseStats: 'Basis-Attribute zum aktuellen Patch',
      skins: 'Skins & Artworks',
      hp: 'Leben',
      hpRegen: 'LP-Regen',
      mana: 'Mana / Ressource',
      manaRegen: 'Mana-Regen',
      armor: 'Rüstung',
      mr: 'Magieresistenz',
      attackDamage: 'Angriffsschaden',
      attackSpeed: 'Angriffstempo',
      movementSpeed: 'Lauftempo',
      range: 'Reichweite',
      cooldown: 'Abklingzeit',
      cost: 'Kosten',
      tips: 'Tipps',
      allyTips: 'Tipps als dieser Champion',
      enemyTips: 'Tipps gegen diesen Champion',
      resource: 'Ressource',
      perLevel: 'pro Stufe',
      defaultSkin: 'Standard-Skin',
      patchDataNotice: 'Aktuelle Patch-Daten direkt aus Riots Data Dragon',
      breadcrumbHome: 'Startseite',
      breadcrumbChampions: 'Champions',
      showingCount: 'Zeige {filtered} von {total} Champions',
      sortByNameAsc: 'Name (A-Z)',
      sortByNameDesc: 'Name (Z-A)',
      sortByDiffAsc: 'Schwierigkeit (Niedrig bis Hoch)',
      sortByDiffDesc: 'Schwierigkeit (Hoch bis Niedrig)',
      laneTop: 'Top',
      laneJungle: 'Jungle',
      laneMid: 'Mid',
      laneAdc: 'Bot / ADC',
      laneSupport: 'Support',
      allLanes: 'Alle Positionen',
      allClasses: 'Alle Klassen',
      resetFilters: 'Filter zurücksetzen',
      clickForDetails: 'Klicken für Details',
      faqTitle1: 'Wie viele Champions gibt es in League of Legends?',
      faqDesc1: 'League of Legends verfügt derzeit über {count} spielbare Champions. Riot Games veröffentlicht regelmäßig neue Champions und Reworks im Laufe des Jahres (typischerweise 3 bis 4 neue Champions jährlich, zuletzt Ambessa).',
      faqTitle2: 'Champion-Verteilung nach Rollen',
      faqDesc2: 'Champions auf Summoner\'s Rift verteilen sich auf die fünf Hauptpositionen Top, Jungle, Mid, Bot (ADC) und Support, wobei viele flexible Picks in mehreren Rollen glänzen.',
      faqTitle3: 'Klassen & Spielstile',
      faqDesc3: 'Jeder Champion gehört primären und sekundären Klassen wie Kämpfer (Fighter), Magier (Mage), Schützen (Marksman), Assassinen, Tanks oder Unterstützer an.',
      tabOverview: 'Übersicht & Spotlight',
      tabAbilities: 'Fähigkeiten & Kit',
      tabSkins: 'Skins & Artworks',
      pricingBE: 'BE',
      pricingRP: 'RP',
      detailFaqRelease: 'Wann wurde {name} veröffentlicht?',
      detailFaqReleaseDesc: '{name} wurde am {date} veröffentlicht. Spieler konnten den Champion direkt nach Release mit Blauen Essenzen oder Riot Points erwerben.',
      detailFaqRole: 'Auf welcher Position wird {name} gespielt?',
      detailFaqRoleDesc: '{name} wird primär auf {role} gespielt{flex}, wo die einzigartige Skill-Kombination und Stärken am besten zum Tragen kommen.',
      detailFaqSkins: 'Wie viele Skins besitzt {name}?',
      detailFaqSkinsDesc: '{name} verfügt aktuell über {count} verschiedene Skins und Artworks im Spiel, inklusive des Basis-Klassikers.',
      detailFaqCost: 'Wie viel kostet {name}?',
      detailFaqCostDesc: '{name} kostet {be} Blaue Essenzen oder {rp} Riot Points. Der Champion kann im Ingame-Shop mit beiden Währungen freigeschaltet werden.',
      championsFromYear: 'Champions aus dem Jahr {year} ({count})',
      skinTimeline: 'Skin Timeline',
      regular: 'Regular',
      epic: 'Epic',
      legendary: 'Legendary',
      mythic: 'Mythic',
      transcendent: 'Transcendent',
      allSkinsGallery: 'Alle Skins & Artworks',
      allyTipsTitle: 'Tipps beim Spielen mit {name}',
      enemyTipsTitle: 'Tipps beim Spielen gegen {name}',
    },
    itemsWiki: {
      pageTitle: 'Item Enzyklopädie & Rezepte',
      pageSubtitle: 'Alle {count} Gegenstände in League of Legends auf aktuellem Patch {patch}',
      badge: 'PATCH {patch} ITEM ENZYKLOPÄDIE',
      searchPlaceholder: 'Item suchen (z.B. Rabadon, Klinge der Unendlichkeit, IE)...',
      allCategories: 'Alle Kategorien',
      catAttack: 'Angriff',
      catMagic: 'Magie',
      catDefense: 'Verteidigung',
      catMovement: 'Bewegung',
      catStarterConsumable: 'Start & Verbrauch',
      mapFilter: 'Spielmodus / Karte',
      mapSR: 'Kluft der Beschwörer',
      mapARAM: 'ARAM (Heulende Schlucht)',
      mapArena: 'Arena',
      mapAll: 'Alle Karten',
      tierFilter: 'Gegenstandsstufe',
      allTiers: 'Alle Stufen',
      tierLegendary: 'Legendär & Vollständig',
      tierEpic: 'Episch',
      tierBasic: 'Basis',
      tierBoots: 'Stiefel',
      tierStarter: 'Startgegenstände',
      tierConsumable: 'Verbrauchsgüter',
      sortBy: 'Sortieren nach',
      sortGoldDesc: 'Goldkosten (hoch → niedrig)',
      sortGoldAsc: 'Goldkosten (niedrig → hoch)',
      sortNameAsc: 'Name (A → Z)',
      sortNameDesc: 'Name (Z → A)',
      onlyPurchasable: 'Nur kaufbare Items',
      resetFilters: 'Filter zurücksetzen',
      noItemsFound: 'Keine Items gefunden',
      noItemsDesc: 'Passe deine Suchbegriffe oder Filter an, um passende Gegenstände zu finden.',
      showingCount: 'Zeige {filtered} von {total} Items',
      goldCost: 'Gold',
      totalCost: 'Gesamtkosten',
      recipeCost: 'Rezeptkosten',
      sellValue: 'Verkaufswert',
      buildsFrom: 'Baut aus (Rezept)',
      buildsInto: 'Baut zu (Ausbauten)',
      noRecipe: 'Keine Vorstufen erforderlich',
      noUpgrades: 'Keine weiteren Ausbauten',
      close: 'Schließen',
      statsTitle: 'Werte & Attribute',
      effectsTitle: 'Effekte & Passiven',
      tagsTitle: 'Kategorien',
      exclusiveChampion: 'Exklusiv für',
      ornnUpgrade: 'Ornn Meisterwerk',
      roleAll: 'Alle Rollen',
      roleFighter: 'Kämpfer',
      roleMarksman: 'Schützen',
      roleAssassin: 'Assassinen',
      roleMage: 'Magier',
      roleTank: 'Tanks',
      roleSupport: 'Unterstützer',
      statFilters: 'Attribut-Filter',
      clearStats: 'Attribute leeren',
      goldEfficiency: 'Gold-Effizienz',
      efficiencyBadge: '{pct}% eff.',
      buildPathTitle: 'Rezeptbaum & Baupfad',
      upgradedFrom: 'Baut aus',
      tierLegendaries: 'LEGENDÄRE GEGENSTÄNDE',
      tierEpics: 'EPISCHE GEGENSTÄNDE',
      tierBasics: 'BASISGEGENSTÄNDE',
      tierStarters: 'STARTGEGENSTÄNDE',
      tierBootsPlural: 'STIEFEL',
      tierConsumablesPlural: 'VERBRAUCHSGÜTER',
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
      details: 'Details',
    },
    nav: {
      brandSubtitle: 'LoL Stats & Analytics',
      searchPlaceholder: 'Search summoner (Name#TAG)...',
      apiOnline: 'Riot API Online',
      tierList: 'Tier List',
      champions: 'Champions',
      items: 'Items',
      home: 'Homepage',
      liveGame: 'Live Game',
      masteries: 'Masteries',
      challenges: 'Challenges',
      matches: 'Match History',
    },
    navigation: {
      home: 'Homepage',
      champions: 'Champions',
      items: 'Items',
      tierList: 'Tier List',
    },
    home: {
      heroBadge: 'League of Legends Scouting & Stats',
      heroTitle1: 'Scout Every Player.',
      heroTitle2: 'Dominate the',
      heroTitleHighlight: 'Rift',
      heroSubtitle:
        'Real-time live game scouting, detailed match breakdowns, Hero Score ratings, and champion masteries at a glance.',
      feature1Title: 'Live Game Tracker',
      feature1Desc: 'Scout opponent ranks, champion mastery, and matchups before game start',
      feature2Title: 'Hero Score',
      feature2Desc: 'Objective MVP & ACE ratings powered by the Hero Score system',
      feature3Title: 'Match History & LP Tracker',
      feature3Desc: 'In-depth timeline analysis, item builds, and exact LP progression',
      recentSearchesTitle: 'Recent Searches',
      recentSummonersTitle: 'Recently Viewed Summoners',
      noRecentSummoners: 'No summoners viewed yet.',
      metaTitle: 'Patch {patch} Meta Picks',
      metaSubtitle: 'Top tier champion picks by lane on Summoner\'s Rift',
      noMetaPicks: 'No match data recorded for this role yet.',
      viewAllTierList: 'View Full Tier List →',
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
      cachedAgo: 'Cached · {time}',
      tabMatches: 'Overview',
      tabChampions: 'Champions',
      tabMasteries: 'Masteries',
      tabChallenges: 'Challenges',
      tabLive: 'Live Game',
      soloRank: 'Solo/Duo',
      flexRank: 'Flex',
      ranked5sRank: '5s',
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
      win: 'Victory',
      loss: 'Defeat',
      blueTeam: 'Blue Team',
      redTeam: 'Red Team',
      loadMore: 'Load more matches',
      noMatches: 'No matches found for this filter.',
      filterAll: 'All Queues',
      filterSolo: 'Solo/Duo',
      filterFlex: 'Flex',
      filterRanked5s: 'Ranked 5s',
      filterAram: 'ARAM',
      filterNormal: 'Normal Draft',
      detailedOverview: 'Detailed Match Overview',
      viewFullMatch: 'Full Match Page (Drakes, Timeline & Graphs)',
      mostDmg: 'Most Dmg',
      mostGold: 'Most Gold',
      mostCs: 'Most CS',
      blueSide: 'Blue Side',
      redSide: 'Red Side',
      remake: 'Remake',
      bans: 'Bans:',
      towers: 'Towers',
      inhibitors: 'Inhibitors',
      dragons: 'Dragons',
      barons: 'Barons',
      herald: 'Voidgrubs / Herald',
      build: 'Build',
      damage: 'Damage',
      taken: 'Taken',
      vision: 'Vision',
      gold: 'Gold',
      heroScore: 'Hero Score',
      matchId: 'Match ID:',
      switchToTaken: 'Switch to Damage Taken',
      switchToDamage: 'Switch to Damage Dealt',
      badgeNew: 'New',
      surrender: 'Surrender',
      matchDetails: 'Match Details',
      toggleDetails: 'Toggle Match Details',
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
    masteries: {
      title: 'Champion Masteries',
      totalScore: 'Mastery Score',
      totalPoints: 'Total Points',
      championsPlayed: 'Champions Played',
      searchPlaceholder: 'Search champion...',
      sortBy: 'Sort by:',
      sortByPoints: 'Most Points',
      sortByLevel: 'Highest Level',
      sortByRecent: 'Recently Played',
      sortByName: 'Name (A-Z)',
      filterAll: 'All Levels',
      filterLevel7: 'Level 7+',
      filterLevel10: 'Level 10+',
      level: 'Level',
      points: 'Points',
      nextLevel: 'Next Level',
      maxLevel: 'Max Level',
      lastPlayed: 'Last Played',
      milestone: 'Milestone',
      noResults: 'No champion masteries found.',
      loading: 'Loading champion masteries...',
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
      blueBans: 'Blue Team',
      redBans: 'Red Team',
      championWinrate: 'Champ Winrate',
      rankedWinrate: 'Ranked Winrate',
      avgRank: 'Avg. Rank',
      avgWinrate: 'Avg. Winrate',
      noData: 'No Data',
      draftBans: 'Champion Bans',
      you: 'YOU',
      winProbability: 'Win Probability',
      winProbabilitySubtitle: 'Calculated from MMR, win rates, champion mastery & map advantage',
      blueFavored: 'Blue Team Favored',
      redFavored: 'Red Team Favored',
      evenMatch: 'Even Matchup',
      rankFactor: 'Rank & MMR',
      winrateFactor: 'Avg. Ranked Winrate',
      champFactor: 'Champion Experience',
      masteryFactor: 'Champion Mastery',
      mapFactor: 'Map Advantage',
      blueLead: 'Blue leads',
      redLead: 'Red leads',
      balanced: 'Balanced',
      confidenceHigh: 'High data confidence',
      confidenceMedium: 'Medium data confidence',
      confidenceLow: 'Low data confidence (unranked players)',
      ban: 'Ban',
      noBan: 'No Ban',
      noPlayer: 'No player',
      accountLevel: 'Account Level',
      started: 'Started:',
      liveGame: 'Live Game',
      matchId: 'Match ID:',
      copyMatchId: 'Copy Match ID',
      toggleFactors: 'Toggle factors',
      factors: 'Factors',
      less: 'Less',
      balanceMarker: '50% Balance Marker',
      lpDiff: '{count} LP difference',
      equalRankLevel: 'Equal rank level',
      mmrComparison: 'Blue: {blue} MMR · Red: {red} MMR',
      avgSeasonWinrates: 'Average season win rates',
      bluePrefix: 'Blue',
      redPrefix: 'Red',
      firstMatches: 'First matches',
      champExpSubtitle: 'Experience on selected champion',
      masterySubtitle: 'Avg Lvl {bLvl} vs {rLvl}',
      masteryLevel: 'Mastery Level {level}',
      firstTime: 'First Time',
      sideAdvantageBlue: '+1.2% Blue',
      sideAdvantageNeutral: 'Neutral',
      sideAdvantageBlueDesc: 'Blue Team (First Pick)',
      sideAdvantageSymmetric: 'Symmetric Map',
      mapBiasSubtitle: 'Statistical Summoner\'s Rift bias',
      winProbDisclaimer: 'Win probability is predicted prior to game start based on team MMR, seasonal win rate, champion mastery, and map side.',
      autoCheckInterval: 'Auto-check every 3 min',
      matchEndedRedirect: 'Match ended! Redirecting to overview and refreshing profile...',
    },
    footer: {
      copyright: '© {year} RiftHero. Not affiliated with Riot Games. League of Legends and Riot Games are trademarks of Riot Games, Inc.',
      prodKey: 'Production Key Enabled',
      snowball: '10-Player Snowball Ingestion',
    },
    tierList: {
      pageTitle: 'Patch {patch} Champion Tier List',
      pageSubtitle: 'Top tier champion picks on Summoner\'s Rift ranked by winrate, pickrate, and impact',
      allRoles: 'All Roles',
      searchPlaceholder: 'Search champion...',
      colRank: '#',
      colChampion: 'Champion',
      colRole: 'Role',
      colTier: 'Tier',
      colWinrate: 'Winrate',
      colPickrate: 'Pickrate',
      colBanrate: 'Banrate',
      colMatches: 'Matches',
      colScore: 'Rating',
      noResults: 'No champions found matching the selected filters.',
      topWinrate: 'Highest Winrate',
      mostPicked: 'Most Picked',
      mostBanned: 'Most Banned',
      totalAnalyzed: 'Matches Analyzed',
    },
    championWiki: {
      pageTitle: 'Champion Overview',
      pageSubtitle: 'All {count} Champions in League of Legends on active Patch {patch}',
      searchPlaceholder: 'Search champion (name, title or role)...',
      filterAll: 'All Roles',
      filterFighter: 'Fighters',
      filterMage: 'Mages',
      filterAssassin: 'Assassins',
      filterMarksman: 'Marksmen',
      filterTank: 'Tanks',
      filterSupport: 'Supports',
      difficulty: 'Difficulty',
      role: 'Class',
      noChampions: 'No champions found matching the selected filters.',
      backToList: 'Back to Champion Overview',
      lore: 'Biography & Lore',
      abilities: 'Abilities & Skills',
      passive: 'Passive',
      baseStats: 'Base Statistics for Active Patch',
      skins: 'Skins & Artworks',
      hp: 'Health',
      hpRegen: 'HP Regen',
      mana: 'Mana / Resource',
      manaRegen: 'Mana Regen',
      armor: 'Armor',
      mr: 'Magic Resist',
      attackDamage: 'Attack Damage',
      attackSpeed: 'Attack Speed',
      movementSpeed: 'Movement Speed',
      range: 'Range',
      cooldown: 'Cooldown',
      cost: 'Cost',
      tips: 'Tips',
      allyTips: 'Playing as Champion',
      enemyTips: 'Playing against Champion',
      resource: 'Resource',
      perLevel: 'per level',
      defaultSkin: 'Default Skin',
      patchDataNotice: 'Active patch data directly from Riot Data Dragon',
      breadcrumbHome: 'Homepage',
      breadcrumbChampions: 'Champions',
      showingCount: 'Showing {filtered} of {total} champions',
      sortByNameAsc: 'Name (A-Z)',
      sortByNameDesc: 'Name (Z-A)',
      sortByDiffAsc: 'Difficulty (Low to High)',
      sortByDiffDesc: 'Difficulty (High to Low)',
      laneTop: 'Top',
      laneJungle: 'Jungle',
      laneMid: 'Mid',
      laneAdc: 'Bot / ADC',
      laneSupport: 'Support',
      allLanes: 'All Positions',
      allClasses: 'All Classes',
      resetFilters: 'Reset filters',
      clickForDetails: 'Click for details',
      faqTitle1: 'How Many Champions Are in League of Legends?',
      faqDesc1: 'League of Legends currently features {count} playable champions. Riot Games regularly releases new champions and gameplay updates throughout the year (typically 3 to 4 annually, most recently Ambessa).',
      faqTitle2: 'Champion Distribution by Role',
      faqDesc2: 'Champions on Summoner\'s Rift are distributed across five primary lanes: Top, Jungle, Mid, Bot (ADC), and Support, with many versatile champions flexing across multiple positions.',
      faqTitle3: 'Champion Classes & Playstyles',
      faqDesc3: 'Every champion belongs to tactical classes including Fighters, Mages, Marksmen, Assassins, Tanks, and Supports, each bringing distinct playstyles and abilities to Summoner\'s Rift.',
      tabOverview: 'Overview & Spotlight',
      tabAbilities: 'Abilities & Kit',
      tabSkins: 'Skins & Artworks',
      pricingBE: 'BE',
      pricingRP: 'RP',
      detailFaqRelease: 'When Was {name} Released?',
      detailFaqReleaseDesc: '{name} was released on {date}. Players could purchase them with Riot Points or Blue Essence as soon as it dropped in-game.',
      detailFaqRole: 'What Lane Is {name}?',
      detailFaqRoleDesc: '{name} is primarily played in the {role} lane{flex}, leveraging their distinct ability kit and playstyle where they can maximize their impact throughout the game.',
      detailFaqSkins: 'How Many Skins Does {name} Have?',
      detailFaqSkinsDesc: 'Currently, there are {count} {name} Skins available in the game. This includes all cosmetic variants released since their launch, the base skin is not included.',
      detailFaqCost: 'How Much Is {name}?',
      detailFaqCostDesc: '{name} costs {be} Blue Essence or {rp} Riot Points. You can purchase them from the in-game store using either currency. Blue Essence is earned through the battle pass and disenchanting champion shards, while Riot Points require real money to obtain.',
      championsFromYear: 'Champions from {year} ({count})',
      skinTimeline: 'Skin Timeline',
      regular: 'Regular',
      epic: 'Epic',
      legendary: 'Legendary',
      mythic: 'Mythic',
      transcendent: 'Transcendent',
      allSkinsGallery: 'All Skins & Splash Artworks',
      allyTipsTitle: 'Playing as {name}',
      enemyTipsTitle: 'Playing against {name}',
    },
    itemsWiki: {
      pageTitle: 'Item Encyclopedia & Build Paths',
      pageSubtitle: 'All {count} items in League of Legends on active Patch {patch}',
      badge: 'PATCH {patch} ITEM ENCYCLOPEDIA',
      searchPlaceholder: 'Search items (e.g. Rabadon, Infinity Edge, IE)...',
      allCategories: 'All Categories',
      catAttack: 'Attack',
      catMagic: 'Magic',
      catDefense: 'Defense',
      catMovement: 'Movement',
      catStarterConsumable: 'Starter & Consumable',
      mapFilter: 'Game Mode / Map',
      mapSR: "Summoner's Rift",
      mapARAM: 'ARAM (Howling Abyss)',
      mapArena: 'Arena',
      mapAll: 'All Maps',
      tierFilter: 'Item Tier',
      allTiers: 'All Tiers',
      tierLegendary: 'Legendary & Completed',
      tierEpic: 'Epic',
      tierBasic: 'Basic',
      tierBoots: 'Boots',
      tierStarter: 'Starter Items',
      tierConsumable: 'Consumables',
      sortBy: 'Sort by',
      sortGoldDesc: 'Gold Cost (High → Low)',
      sortGoldAsc: 'Gold Cost (Low → High)',
      sortNameAsc: 'Name (A → Z)',
      sortNameDesc: 'Name (Z → A)',
      onlyPurchasable: 'Only Purchasable Items',
      resetFilters: 'Reset Filters',
      noItemsFound: 'No Items Found',
      noItemsDesc: 'Adjust your search terms or filters to find items.',
      showingCount: 'Showing {filtered} of {total} items',
      goldCost: 'Gold',
      totalCost: 'Total Cost',
      recipeCost: 'Recipe Cost',
      sellValue: 'Sell Value',
      buildsFrom: 'Builds From (Recipe)',
      buildsInto: 'Builds Into (Upgrades)',
      noRecipe: 'No components required',
      noUpgrades: 'No further upgrades',
      close: 'Close',
      statsTitle: 'Stats & Attributes',
      effectsTitle: 'Effects & Passives',
      tagsTitle: 'Categories',
      exclusiveChampion: 'Exclusive to',
      ornnUpgrade: 'Ornn Masterwork',
      roleAll: 'All Roles',
      roleFighter: 'Fighter',
      roleMarksman: 'Marksman',
      roleAssassin: 'Assassin',
      roleMage: 'Mage',
      roleTank: 'Tank',
      roleSupport: 'Support',
      statFilters: 'Stat Filters',
      clearStats: 'Clear Stats',
      goldEfficiency: 'Gold Efficiency',
      efficiencyBadge: '{pct}% eff.',
      buildPathTitle: 'Build Path & Recipe Tree',
      upgradedFrom: 'Upgraded From',
      tierLegendaries: 'LEGENDARIES',
      tierEpics: 'EPICS',
      tierBasics: 'BASICS',
      tierStarters: 'STARTERS',
      tierBootsPlural: 'BOOTS',
      tierConsumablesPlural: 'CONSUMABLES',
    },
  },
};
