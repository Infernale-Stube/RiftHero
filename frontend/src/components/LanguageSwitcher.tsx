'use client';

import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#0d1116] p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => setLocale('de')}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold transition-all ${
          locale === 'de'
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="Deutsch"
      >
        <span className="text-[11px]">🇩🇪</span>
        <span>DE</span>
      </button>

      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold transition-all ${
          locale === 'en'
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="English"
      >
        <span className="text-[11px]">🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
