'use client';

import React from 'react';
import { useTranslation } from '@/i18n/LanguageContext';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rift-700/60 bg-rift-950/80 py-8 text-center text-xs text-slate-500">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>
          {t('footer.copyright', { year })}
        </p>
        <div className="flex items-center gap-4 text-slate-400">
          <span>{t('footer.prodKey')}</span>
          <span>•</span>
          <span>{t('footer.snowball')}</span>
        </div>
      </div>
    </footer>
  );
}
