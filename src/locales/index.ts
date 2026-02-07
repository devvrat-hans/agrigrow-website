import { en } from './en';
import { hi } from './hi';
import { Translations, LanguageCode } from './types';

/**
 * Map of all available translations keyed by language code
 */
const translations: Record<LanguageCode, Translations> = {
  en,
  hi,
};

/**
 * Returns the translations object for the given language code.
 * Falls back to English if the requested language is not available.
 *
 * @param languageCode - The language code ('en' or 'hi')
 * @returns The translations object for the requested language
 */
export function getTranslations(languageCode: string): Translations {
  const code = languageCode as LanguageCode;
  return translations[code] || translations.en;
}

/**
 * Returns a specific translation value by dot-notation key path.
 * Falls back to English if the Hindi translation is missing.
 *
 * @param languageCode - The language code ('en' or 'hi')
 * @param key - Dot-notation key path (e.g., 'common.save', 'feed.categories.all')
 * @returns The translated string, or the key itself if not found
 */
export function getTranslationByKey(languageCode: string, key: string): string {
  const lang = getTranslations(languageCode);
  const fallback = translations.en;

  const keys = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = lang;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallbackValue: any = fallback;

  for (const k of keys) {
    value = value?.[k];
    fallbackValue = fallbackValue?.[k];
  }

  // Return the translated value, falling back to English, then the key itself
  if (typeof value === 'string') return value;
  if (typeof fallbackValue === 'string') return fallbackValue;
  return key;
}

/**
 * List of supported language codes
 */
export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'hi'];

/**
 * Default language code
 */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

// Re-export types
export type { Translations, LanguageCode, TranslationKey } from './types';
