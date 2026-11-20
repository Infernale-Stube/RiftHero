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
        <Link href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <RiftHeroIcon className="h-10 w-10 transition-all duration-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] group-hover:drop-shadow-[0_0_18px_rgba(249,115,22,0.8)]" />
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
