'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { getTranslations, getTranslationByKey, DEFAULT_LANGUAGE } from '@/locales';
import type { Translations, LanguageCode } from '@/locales';

/** Key used to store language preference in localStorage */
const LOCAL_STORAGE_KEY = 'userLanguage';

/**
 * Shape of the language context value
 */
interface LanguageContextValue {
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
 * React context for providing language/translation state to the component tree
 */
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * Props for the LanguageProvider component
 */
interface LanguageProviderProps {
  children: React.ReactNode;
  /** Optional initial language override (useful for SSR or testing) */
  initialLanguage?: LanguageCode;
}

/**
 * Gets the initial language from localStorage (client-side only)
 */
function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === 'hi' || stored === 'en') return stored;
  } catch {
    // localStorage may not be available
  }
  return DEFAULT_LANGUAGE;
}

/**
 * LanguageProvider component that wraps the application and provides
 * internationalization context to all child components.
 * 
 * Reads the initial language from localStorage on mount and updates
 * when the language changes via setLanguage or storage events.
 * 
 * @example
 * ```tsx
 * // In your root layout:
 * <LanguageProvider>
 *   <App />
 * </LanguageProvider>
 * 
 * // In any child component:
 * const { t, language, setLanguage } = useLanguage();
 * ```
 */
export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(
    initialLanguage || DEFAULT_LANGUAGE
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage after hydration to prevent SSR mismatch
  useEffect(() => {
    const stored = getStoredLanguage();
    setLanguageState(initialLanguage || stored);
    setIsHydrated(true);
  }, [initialLanguage]);

  // Listen for storage changes from other tabs and custom language change events
  useEffect(() => {
    if (!isHydrated) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        const newLang = e.newValue as LanguageCode;
        if (newLang === 'en' || newLang === 'hi') {
          setLanguageState(newLang);
        }
      }
    };

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
  }, [isHydrated]);

  const translations = useMemo(() => getTranslations(language), [language]);

  const t = useCallback(
    (key: string): string => {
      return getTranslationByKey(language, key);
    },
    [language]
  );

  const setLanguage = useCallback((lang: LanguageCode) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, lang);
    } catch {
      // localStorage may not be available
    }
    setLanguageState(lang);

    // Dispatch custom event so useTranslation hooks outside the provider tree can update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ t, translations, language, setLanguage }),
    [t, translations, language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access the language context from the LanguageProvider.
 * Must be used within a LanguageProvider tree.
 * 
 * @returns The language context value with t(), language, translations, and setLanguage
 * @throws Error if used outside of LanguageProvider
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageProvider;
