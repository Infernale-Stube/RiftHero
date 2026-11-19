'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, TranslationDictionary, translations } from './translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  dict: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('de');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      // 1. Prioritize URL parameter (?lang=en or ?lang=de or ?hl=en or ?locale=en)
      let fromUrl: Locale | null = null;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const urlLang = searchParams.get('lang') || searchParams.get('hl') || searchParams.get('locale');
        if (urlLang === 'de' || urlLang === 'en') {
          fromUrl = urlLang;
        }
      }

      if (fromUrl) {
        setLocaleState(fromUrl);
        localStorage.setItem('rifthero_locale', fromUrl);
        document.documentElement.lang = fromUrl;
        return;
      }

      // 2. Fallback to localStorage
      const saved = localStorage.getItem('rifthero_locale') as Locale | null;
      if (saved === 'de' || saved === 'en') {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      } else if (typeof navigator !== 'undefined') {
        // 3. Fallback to browser language
        const browserLang = navigator.language.toLowerCase();
        const detected: Locale = browserLang.startsWith('de') ? 'de' : 'en';
        setLocaleState(detected);
        document.documentElement.lang = detected;
      }
    } catch {
      // Ignore localStorage read errors (e.g. private mode)
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('rifthero_locale', newLocale);
      document.documentElement.lang = newLocale;

      // Keep URL search param in sync (?lang=de / ?lang=en)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', newLocale);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignore
    }
  }, []);

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
    <LanguageContext.Provider value={{ locale, setLocale, t, dict }}>
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
  const { t, locale, dict, setLocale } = useLanguage();
  return { t, locale, dict, setLocale };
}
