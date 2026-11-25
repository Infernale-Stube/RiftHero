'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  Flame,
  Shield,
  Sparkles,
  ChevronRight,
  Swords,
  Crosshair,
} from 'lucide-react';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '@/i18n/LanguageContext';
import { getMajorMinorPatch, getDDragonVersion } from '@/lib/ddragon';

export default function Navbar() {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [activePatch, setActivePatch] = useState(() => getMajorMinorPatch());

  const isHome = pathname === '/' || pathname === '/de' || pathname === '/en';

  const handleOpen = () => {
    setIsRendered(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDrawerOpen(true);
      });
    });
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setIsRendered(false);
    }, 300);
  };

  // Close drawer whenever the route changes
  useEffect(() => {
    handleClose();
  }, [pathname]);

  // Sync active patch from DDragon
  useEffect(() => {
    setActivePatch(getMajorMinorPatch());
    const handler = (e: CustomEvent) => {
      if (e.detail) setActivePatch(getMajorMinorPatch(e.detail));
    };
    window.addEventListener('rifthero:ddragon-version' as any, handler);
    return () => window.removeEventListener('rifthero:ddragon-version' as any, handler);
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (drawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const homeNavItem = {
    href: `/${locale}`,
    label: t('nav.home') || 'Startseite',
    icon: Home,
    isActive: isHome,
  };

  const secondaryNavItems = [
    {
      href: `/${locale}/champions`,
      label: t('nav.champions') || 'Champions',
      icon: Shield,
      isActive: Boolean(pathname?.includes('/champions')),
    },
    {
      href: `/${locale}/items`,
      label: t('nav.items') || 'Items',
      icon: Swords,
      isActive: Boolean(pathname?.includes('/items')),
    },
    {
      href: `/${locale}/tier-list`,
      label: t('nav.tierList') || 'Tier List',
      icon: Flame,
      isActive: Boolean(pathname?.includes('/tier-list')),
    },
    {
      href: `/${locale}/counterpicks`,
      label: t('nav.counterpicks') || 'Counter Picks',
      icon: Crosshair,
      isActive: Boolean(pathname?.includes('/counterpicks')),
    },
  ].sort((a, b) => a.label.localeCompare(b.label, locale));

  const navItems = [homeNavItem, ...secondaryNavItems];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#0a0d12]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Burger Menu Button + Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Hamburger Button placed BEFORE the logo */}
            <button
              type="button"
              onClick={handleOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Menü öffnen"
              title="Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

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
                  RIFT<span className="text-amber-400">HERO</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 -mt-1 font-bold">
                  {t('nav.brandSubtitle')}
                </span>
              </div>
            </Link>
          </div>

          {/* Compact Search Bar in Header if not on Home */}
          {!isHome && (
            <div className="hidden md:block w-[440px] lg:w-[580px] xl:w-[700px]">
              <SearchBar compact />
            </div>
          )}

          {/* Right: Language Switcher */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Side Navigation Drawer (Burgermenü with fade in & fade out) */}
      {isRendered && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay (smooth fade in and fade out) */}
          <div
            className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
              drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Slide-over & Fade Drawer Panel (smooth slide & fade in and out) */}
          <div
            className={`relative flex w-80 max-w-[85vw] flex-col justify-between bg-[#0b0e14] border-r border-white/10 p-6 shadow-2xl z-50 transition-all duration-300 ease-in-out transform ${
              drawerOpen
                ? 'translate-x-0 opacity-100'
                : '-translate-x-full opacity-0'
            }`}
          >
            {/* Drawer Top */}
            <div className="flex flex-col">
              {/* Drawer Header with Logo and Close Button */}
              <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="RiftHero Logo"
                      width={36}
                      height={36}
                      className="h-8 w-8 object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-black tracking-tight text-white">
                      RIFT<span className="text-amber-400">HERO</span>
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 -mt-0.5 font-bold">
                      Navigation
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  aria-label="Menü schließen"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1.5 mt-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleClose}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        item.isActive
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                          : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${item.isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Info */}
            <div className="pt-6 border-t border-white/[0.08] flex flex-col gap-3">
              {/* Active Patch Pill */}
              <div className="flex items-center justify-between rounded-xl bg-black/40 border border-white/[0.06] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Patch {activePatch}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>

              <div className="text-[11px] text-zinc-500 text-center">
                LoL Scouting, Champions & Analytics
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
