import { Shield, Zap, Database, Users } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import RecentSearches from '@/components/RecentSearches';
import RecentSummoners from '@/components/RecentSummoners';
import { fetchRecentSummoners } from '@/lib/api';

export const revalidate = 0; // live data

export default async function HomePage() {
  const recentSummoners = await fetchRecentSummoners(9);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center max-w-3xl mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-hextech-blue/30 bg-hextech-blue/10 px-3.5 py-1 text-xs font-bold text-hextech-blue uppercase tracking-wider mb-6">
          <Zap className="h-3.5 w-3.5" />
          <span>High-Capacity Production Analytics</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4">
          Dominieren Sie die <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-hextech-blue to-hextech-lightGold">Kluft</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed mb-8">
          Echtzeit-Statistiken, detaillierte Match-Historien und automatische Profil-Aktualisierung – blitzschnell gecacht in PostgreSQL und optimiert gegen Rate-Limits.
        </p>

        {/* Central Search Bar */}
        <div className="w-full max-w-2xl">
          <SearchBar defaultRegion="euw" />
        </div>

        {/* Recent Searches (from LocalStorage) */}
        <div className="w-full max-w-2xl mt-5">
          <RecentSearches />
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-14">
        <div className="flex items-center gap-3.5 rounded-xl border border-rift-700/60 bg-rift-900/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-200">Stilles Auto-Refresh</div>
            <div className="text-xs text-slate-400">Automatische Hintergrund-Updates ohne manuellen Button</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-rift-700/60 bg-rift-900/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hextech-blue/10 text-hextech-blue border border-hextech-blue/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-200">10-Spieler-Schneeballsystem</div>
            <div className="text-xs text-slate-400">Mitspieler werden im Hintergrund vorberechnet</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-rift-700/60 bg-rift-900/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-hextech-lightGold border border-amber-500/20">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-200">PostgreSQL Cache</div>
            <div className="text-xs text-slate-400">Sub-10ms Ladezeiten für bereits erfasste Profile</div>
          </div>
        </div>
      </div>

      {/* Live Recent Summoners Overview from Database */}
      <div className="w-full">
        <RecentSummoners summoners={recentSummoners} />
      </div>
    </div>
  );
}
