'use client';

import { useState, useCallback, useEffect } from 'react';
import { getTranslations, getTranslationByKey, DEFAULT_LANGUAGE } from '@/locales';
import type { Translations, LanguageCode } from '@/locales';

/** Key used to store language preference in localStorage */
const LOCAL_STORAGE_KEY = 'userLanguage';

/**
 * Return type for the useTranslation hook
 */
export interface UseTranslationReturn {
  /** Translation function - accepts dot-notation key and returns translated string */
  t: (key: string) => string;
  /** Full translations object for the current language */
  translations: Translations;
  /** Current language code */
  language: LanguageCode;
  /** Function to update the language preference */
  setLanguage: (lang: LanguageCode) => void;
}

/**
 * Gets the initial language from localStorage (client-side only).
 * Falls back to browser language detection, then to the default language.
 */
function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === 'hi' || stored === 'en') return stored;
  } catch {
    // localStorage may not be available
  }
  // Detect browser language for first-time / non-logged-in visitors
  try {
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('hi')) return 'hi';
  } catch {
    // navigator may not be available in some environments
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Custom hook for internationalization in Agrigrow.
 * 
 * Reads the user's language preference from localStorage (key: 'userLanguage')
 * and provides a t() function for translating UI strings.
 * 
 * @example
 * ```tsx
 * const { t, language, setLanguage } = useTranslation();
 * return <button>{t('common.save')}</button>;
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  // Always start with default language to avoid hydration mismatch
  // (server has no localStorage, so it always renders DEFAULT_LANGUAGE)
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  // Sync with localStorage on mount (client-side only)
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored !== language) {
      setLanguageState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync with localStorage changes (e.g., from other tabs or LanguageProvider)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        const newLang = e.newValue as LanguageCode;
        if (newLang === 'en' || newLang === 'hi') {
          setLanguageState(newLang);
        }
      }
    };

    // Also listen for custom event dispatched by setLanguage
    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent<LanguageCode>;
      if (customEvent.detail === 'en' || customEvent.detail === 'hi') {
        setLanguageState(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languageChange', handleLanguageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChange', handleLanguageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translations = getTranslations(language);

  /**
   * Translation function - accepts a dot-notation key and returns the translated string.
   * Falls back to English if the translation is missing in the current language.
   */
  const t = useCallback(
    (key: string): string => {
      return getTranslationByKey(language, key);
    },
    [language]
  );

  /**
   * Updates the language preference in localStorage and triggers a re-render
   */
  const setLanguage = useCallback((lang: LanguageCode) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, lang);
    } catch {
      // localStorage may not be available
    }
    setLanguageState(lang);

    // Dispatch custom event so other components using the hook can update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
    }
  }, []);

  return { t, translations, language, setLanguage };
}
