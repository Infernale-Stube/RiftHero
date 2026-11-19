'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Locale, TranslationDictionary, translations } from './translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  localePath: (path: string) => string;
  t: (path: string, params?: Record<string, string | number>) => string;
  dict: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine current locale from URL path prefix (/en/... or /de/...)
  const pathLocale: Locale = pathname?.startsWith('/en') ? 'en' : 'de';
  const [locale, setLocaleState] = useState<Locale>(pathLocale);

  // Synchronize when pathname changes (e.g. user clicked /en or /de link)
  useEffect(() => {
    if (pathLocale !== locale) {
      setLocaleState(pathLocale);
      document.documentElement.lang = pathLocale;
    }
  }, [pathLocale, locale]);

  // Set document language and sync cookie on mount or change
  useEffect(() => {
    try {
      document.documentElement.lang = locale;
      localStorage.setItem('rifthero_locale', locale);
      document.cookie = `rifthero_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore
    }
  }, [locale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      try {
        localStorage.setItem('rifthero_locale', newLocale);
        document.cookie = `rifthero_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = newLocale;

        if (pathname) {
          const pathWithoutLocale = pathname.replace(/^\/(de|en)(\/|$)/, '/');
          const targetPath =
            pathWithoutLocale === '/'
              ? `/${newLocale}`
              : `/${newLocale}${pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`}`;

          const search = typeof window !== 'undefined' ? window.location.search : '';
          const hash = typeof window !== 'undefined' ? window.location.hash : '';
          router.push(`${targetPath}${search}${hash}`);
        }
      } catch {
        // Ignore
      }
    },
    [pathname, router]
  );

  const localePath = useCallback(
    (path: string): string => {
      const clean = path.replace(/^\/(de|en)(\/|$)/, '/');
      const normalized = clean.startsWith('/') ? clean : `/${clean}`;
      return normalized === '/' ? `/${locale}` : `/${locale}${normalized}`;
    },
    [locale]
  );

  const dict = translations[locale];

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let current: any = translations[locale];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to German if key not found
          let fallback: any = translations.de;
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
              fallback = fallback[fk];
            } else {
              return path;
            }
          }
          current = fallback;
          break;
        }
      }

      if (typeof current !== 'string') {
        return path;
      }

      if (params) {
        let result = current;
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replaceAll(`{${pKey}}`, String(pVal));
        }
        return result;
      }

      return current;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, localePath, t, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, locale, dict, setLocale, localePath } = useLanguage();
  return { t, locale, dict, setLocale, localePath };
}
