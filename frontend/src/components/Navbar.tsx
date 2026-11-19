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
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a0d12]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-0.5 shadow-lg shadow-orange-500/20 transition-transform group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0a0d12]">
              <Shield className="h-5 w-5 text-orange-400 transition-colors group-hover:text-amber-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white transition-colors">
              RIFT<span className="text-orange-500">HERO</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 -mt-1 font-bold">
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

          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('nav.apiOnline')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
