'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/LanguageContext';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const { t, locale } = useTranslation();

  return (
    <nav
      className={`flex items-center gap-2 text-xs font-medium text-zinc-400 ${className}`}
      aria-label="Breadcrumb"
    >
      {/* Root: Homepage */}
      <Link href={`/${locale}`} className="hover:text-orange-400 transition-colors">
        {t('nav.home') || 'Startseite'}
      </Link>

      {/* Path Items */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <span className="text-zinc-600 select-none">/</span>
            {isLast || !item.href ? (
              <span className="text-orange-400 font-bold select-none">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-orange-400 transition-colors">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
