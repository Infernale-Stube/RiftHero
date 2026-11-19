'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '@/i18n/LanguageContext';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-rift-700/60 bg-rift-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-hextech-blue to-blue-600 p-0.5 shadow-md shadow-hextech-blue/20 transition-transform group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-rift-950">
              <Shield className="h-5 w-5 text-hextech-blue transition-colors group-hover:text-hextech-lightGold" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white group-hover:text-hextech-lightGold transition-colors">
              RIFT<span className="text-hextech-blue">HERO</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 -mt-1 font-semibold">
              {t('nav.brandSubtitle')}
            </span>
          </div>
        </Link>

        {/* Compact Search Bar in Header if not on Home */}
        {!isHome && (
          <div className="hidden md:block w-96">
            <SearchBar compact />
          </div>
        )}

        {/* Status & Language Switcher */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('nav.apiOnline')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
