'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="rounded-2xl border border-rift-700/60 bg-rift-900/50 p-8 max-w-md">
        <ShieldAlert className="mx-auto h-12 w-12 text-slate-500 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">{t('common.pageNotFoundTitle')}</h2>
        <p className="text-sm text-slate-400 mb-6">
          {t('common.pageNotFoundDesc')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-hextech-blue px-5 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110 transition-all"
        >
          {t('common.backToHome')}
        </Link>
      </div>
    </div>
  );
}
