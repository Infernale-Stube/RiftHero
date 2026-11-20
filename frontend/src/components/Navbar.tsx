'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Flame } from 'lucide-react';
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
            <Image
              src="/logo.png"
              alt="RiftHero Logo"
              width={44}
              height={44}
              className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_20px_rgba(249,115,22,0.85)]"
              priority
              unoptimized
            />
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

        {/* Navigation Links */}
        <nav className="flex items-center gap-1">
          <Link
            href={`/${locale}/tier-list`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname?.includes('/tier-list')
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-zinc-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>{t('nav.tierList')}</span>
          </Link>
        </nav>

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
