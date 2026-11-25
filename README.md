# ⚔️ RiftHero – High-Performance League of Legends Statistics Platform

> Eine moderne, hochperformante League-of-Legends-Statistik-Plattform (inspiriert von *League of Graphs*), vollständig dockerisiert, mit **Riot Production API Key-Optimierung**, **10-Spieler-Schneeballsystem**, **stillem Auto-Refresh** und **Caddy HTTPS / Mailserver-Architektur** (analog zu `sparbro_backend`).

---

## 🏛️ Architektur-Übersicht

```mermaid
flowchart TD
    Client["Browser / Client (Web / Mobile)"]
    Caddy["Caddy 2 Reverse Proxy<br/>(Automated Let's Encrypt TLS :80/:443)"]
    Frontend["Next.js 14 Frontend<br/>(App Router, Tailwind CSS, Dark Theme)"]
    API["Fastify REST API Service<br/>(:4000)"]
    Worker["BullMQ Worker Service<br/>(Single-Process Riot Rate-Limiter)"]
    PG[("PostgreSQL 16 Database<br/>(Matches, Summoners, Ranks)")]
    Redis[("Redis 7 Datastore<br/>(BullMQ Queues)")]
    RiotAPI["Riot Games Production API<br/>(Account-v1, Summoner-v4, League-v4, Match-v5)"]
    Mailserver["docker-mailserver<br/>(SMTP, IMAP, TLS)"]

    Client -->|HTTPS :443| Caddy
    Caddy -->|/api/*| API
    Caddy -->|/*| Frontend
    Caddy -->|mail.rifthero.lol| Mailserver

    Frontend -->|Queries /api| API
    API -->|Read & Filter| PG
    API -->|Enqueue Stale Refresh| Redis

    Redis -->|queue:high (User Requests)| Worker
    Redis -->|queue:low (Snowball Crawler)| Worker

    Worker -->|Single-Process Ingestion| RiotAPI
    Worker -->|Save Matches & Participants| PG
    Worker -->|Enqueue Fellow 9 Players| Redis
```

---

## 🚀 Kern-Features & MVP-Scope

### 1. Startseite (`/`)
* **Zentrale Riot-ID-Suchleiste**: Flexible Eingabe (`GameName#TagLine` oder `GameName`) mit Regionsauswahl (`EUW`, `EUNE`, `NA`, `KR`; Standard: `EUW`).
* **Verlauf zuletzt gesuchter Spieler**: Im Browser (`localStorage`) persistierte Historie mit Direktnavigation und Löschfunktion.
* **Live-Übersicht „Zuletzt aktualisierte Profile“**: Echtzeit-Feed direkt aus PostgreSQL mit Profil-Icons, Level, Solo/Duo-Rang und relativer Zeitangabe (`vor 3 Min.`).

### 2. Profilseite (`/summoner/[region]/[gameName]-[tagLine]`)
* **Summoner-Header**: Profil-Icon über Riot Data Dragon (mit dynamischer Versionsauflösung), Level-Badge, Riot ID, Solo/Duo- & Flex-Rang (Tier, Division, LP, Winrate, Wins/Losses, Tier-Badges).
* **Champion-Übersicht (Sidebar)**: Meistgespielte Champions aus den geladenen Matches (Spiele, Winrate %, KDA, Ø CS, CS/min) inkl. Filter nach Queue-Typ (`Alle`, `Ranked Solo/Duo`, `Ranked Flex`, `ARAM`).
* **Match-Historie**: Chronologische Match-Liste mit Sieg/Niederlage-Färbung, Champion-Icon, KDA, CS & CS/min, Items (6 Slots + Trinket), Runen (Primary Keystone + Secondary Style), Summoner Spells (D, F), Spieldauer, Queue-Typ und **allen 10 Teilnehmern** (klickbar, um sofort auf deren Profil zu springen).
* **Stilles Auto-Refresh**: Beim Öffnen werden sofort gecachte PostgreSQL-Daten geliefert. Liegt `last_fetched_at` länger als 2 Minuten zurück, stößt das System im Hintergrund automatisch einen High-Priority-Update-Job an. Der im Frontend integrierte `AutoRefreshWatcher` aktualisiert die Ansicht nahtlos, sobald neue Matches gespeichert wurden.

### 3. 10-Spieler-Schneeballsystem & Rate-Limiting
* **Single-Process Worker Isolation**: Ausschließlich der `worker`-Container kommuniziert mit der Riot API über `@fightmegg/riot-api` und den integrierten `@fightmegg/riot-rate-limiter`. Dadurch existiert ein strikter, zentraler Rate-Limit-State ohne verteilte HTTP `429`-Rennen.
* **Priorisierte BullMQ-Queues**:
  * `summoner-high` (`queue:high`): Aktive User-Aufrufe werden mit hoher Concurrency und Burst-Strategie sofort verarbeitet.
  * `summoner-low` (`queue:low`): Der Worker legt für alle 9 Mitspieler aus analysierten Matches Hintergrund-Jobs ab (Match-Tiefe konfigurierbar via `SNOWBALL_MATCH_DEPTH`), die ungenutzte Rate-Limit-Kapazitäten drosselt nutzen.
* **Production Key Kapazität**: Vorkonfiguriert für **1.000 Req / 10s** und **60.000 Req / 10min**.

---

## 🛠️ Verzeichnisstruktur

```
f:\rifthero\
├── docker-compose.yml          # Vollständige Multi-Container Orchestrierung
├── Caddyfile                   # Automatisches Let's Encrypt SSL/TLS & Scanner-Blocker
├── .env.example                # Komplette Environment-Vorlage
├── README.md                   # Projektdokumentation
├── prisma/
│   └── schema.prisma           # PostgreSQL Schema (Summoners, Ranks, Matches, Participants)
├── docker/
│   └── mailserver/             # docker-mailserver Konfiguration
├── backend/                    # Fastify API & BullMQ Worker (Node.js/TypeScript)
│   ├── Dockerfile
│   ├── docker-entrypoint.sh    # Automatische DB-Migration & Service-Starter
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── api/                # Fastify REST Server & Routes
│       ├── worker/             # BullMQ Worker & Riot API Ingestion
│       ├── riot/               # Riot API Client, Routing & Data Dragon Resolver
│       ├── queue/              # BullMQ Queues (high & low)
│       └── services/           # DB-Queries & Stats-Aggregationen
└── frontend/                   # Next.js 14 App Router Frontend (Tailwind CSS)
    ├── Dockerfile              # Multi-Stage Lean Standalone Image
    ├── package.json
    ├── tailwind.config.ts      # LoG Dark-Theme & League Hextech Farben
    └── src/
        ├── app/                # App Router Seiten (/, /summoner/[region]/[tag])
        ├── components/         # SearchBar, MatchCard, ChampionStats, etc.
        └── lib/                # API-Client & Data Dragon Utilities
```

---

## ⚡ Schnellstart (Docker)

### 1. Umgebungsvariablen konfigurieren
Kopiere die Vorlage `.env.example` nach `.env`:

```bash
cp .env.example .env
```

Trage deinen **Riot Games Production API Key** ein:
```ini
RIOT_API_KEY=RGAPI-dein-production-key-hier
APP_DOMAIN=rifthero.lol
ACME_EMAIL=deine-email@domain.de
```

### 2. Container bauen & starten
Starte die gesamte Plattform mit einem einzigen Befehl:

```bash
docker compose up -d --build
```

Docker startet:
1. `postgres` (PostgreSQL 16 mit Healthcheck)
2. `redis` (Redis 7 als Queue-Broker)
3. `api` (Fastify REST Server – synchronisiert automatisch das Datenbankschema via `prisma db push`)
4. `worker` (BullMQ Ingestion Worker mit Riot Rate-Limiter)
5. `frontend` (Next.js 14 Web-App)
6. `caddy` (Automatisches HTTPS & Reverse Proxy)
7. `mailserver` (docker-mailserver)

### 3. Zugriff
* **Frontend**: `http://localhost:3000` (oder via Domain `https://rifthero.lol`)
* **REST API**: `http://localhost:4000/api` (oder `https://api.rifthero.lol`)
* **API Health**: `http://localhost:4000/api/health`

---

## 🗄️ PostgreSQL Schema & Vorbereitung auf erweiterte Features

Das Schema in `prisma/schema.prisma` ist modular aufgebaut und bereits für zukünftige Timeline-Deep-Dives, Heatmaps und Tier-Listen vorbereitet:

* **`summoners`**: PUUID (Unique Index), Riot ID (`gameName#tagLine`), Platform/Region, Profile Icon, Level, `lastFetchedAt` (für Stale-Checks).
* **`summoner_ranks`**: Solo/Duo- & Flex-Ränge, Tier, Division, LP, Wins, Losses.
* **`matches`**: Match ID (z.B. `EUW1_6999999999`), Game Creation, Duration, Queue ID, Cluster.
* **`match_participants`**: Speichert alle **10 Spieler** pro Spiel mit KDA, CS, CS/min, Items (0-6), Runen (Keystone + Substyle), Summoner Spells, Vision-Score sowie den JSON-Spalten:
  * `perksJson`: Vollständige Runen-Aufschlüsselung für Deep-Dives.
  * `challengesJson`: Riot-Challenges für erweiterte Leistungsanalysen.
  * `timelineSummaryJson`: Vorbereitet für Min-15 CS-Diff, Gold-Diff & Kill-Participation.

---

## 🛡️ Wartung & Nützliche Befehle

### Logs in Echtzeit ansehen:
```bash
# Worker-Logs (Riot API Requests & Queue-Aktivität)
docker compose logs -f worker

# API-Logs
docker compose logs -f api

# Caddy SSL/TLS-Logs
docker compose logs -f caddy
```

### Mail-Account im Mailserver anlegen:
```bash
docker compose exec mailserver setup email add postmaster@rifthero.lol meinPasswort123
```

### Datenbank manuell inspizieren:
```bash
docker compose exec postgres psql -U rifthero -d rifthero
```

---

## 🤖 Automatisches Deployment (GitHub Actions)

Die Datei `.github/workflows/deploy.yml` deployt jeden Push auf `master` / `main` vollautomatisch via SSH auf deinen Server (analog zu `sparbro_backend`).

### Benötigte GitHub Repository Secrets:
Hinterlege folgende Secrets in deinem GitHub-Repository unter **Settings > Secrets and variables > Actions**:

| Secret Name | Beispiel-Wert | Beschreibung |
| :--- | :--- | :--- |
| `SSH_HOST` | `123.45.67.89` | Öffentliche IP-Adresse des Servers |
| `SSH_USER` | `root` | SSH-Benutzername |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Privater SSH-Key für Serverzugriff |
| `SSH_PORT` | `22` | SSH-Port (Standard: `22`) |
| `DEPLOY_PATH` | `/opt/rifthero` | Pfad zur Plattform auf dem Server |

