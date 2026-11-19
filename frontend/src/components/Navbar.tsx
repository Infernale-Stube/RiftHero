'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RiftHeroIcon from './RiftHeroIcon';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '@/i18n/LanguageContext';

export default function Navbar() {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const isHome = pathname === '/' || pathname === '/de' || pathname === '/en';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a0d12]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/80 via-orange-500/60 to-yellow-600/40 p-0.5 shadow-lg shadow-orange-500/25 transition-transform group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0a0d14]/90 backdrop-blur-sm">
              <RiftHeroIcon className="h-6 w-6 transition-all duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
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
          <div className="hidden md:block w-[440px] lg:w-[580px] xl:w-[700px]">
            <SearchBar compact />
          </div>
        )}

        {/* Language Switcher */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
