'use client';

import React from 'react';
import { useTranslation } from '@/i18n/LanguageContext';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-[#07090d] py-10 text-xs text-zinc-500">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-tight text-white">
              RIFT<span className="text-orange-500">HERO</span>
            </span>
            <span className="text-[10px] text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">
              {t('footer.copyright', { year })}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
            <span className="text-emerald-400">{t('footer.prodKey')}</span>
            <span className="text-zinc-600">•</span>
            <span>{t('footer.snowball')}</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed max-w-4xl mx-auto sm:mx-0 text-center sm:text-left">
          RiftHero isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}
