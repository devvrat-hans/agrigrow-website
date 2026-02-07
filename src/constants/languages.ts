/**
 * Language configuration constants
 * 
 * Single source of truth for all language-related data
 * used across onboarding, profile settings, and display components.
 */

export type LanguageStatus = 'available' | 'coming-soon';

export interface LanguageOption {
  /** ISO 639-1 language code */
  code: string;
  /** English name */
  name: string;
  /** Name in the native script */
  nativeName: string;
  /** Availability status */
  status: LanguageStatus;
}

/**
 * All supported languages with their availability status.
 * Only English and Hindi are currently available.
 */
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', status: 'available' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', status: 'available' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', status: 'coming-soon' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', status: 'coming-soon' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', status: 'coming-soon' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', status: 'coming-soon' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', status: 'coming-soon' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', status: 'coming-soon' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', status: 'coming-soon' },
];

/**
 * Map of language codes to display names.
 * Used for rendering language names from stored codes.
 */
export const LANGUAGE_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((lang) => [lang.code, lang.name])
);

/**
 * Get the display name for a language code.
 * Falls back to the code itself if not found.
 */
export function getLanguageDisplayName(code: string): string {
  return LANGUAGE_MAP[code] || code;
}

/**
 * Available (selectable) languages only.
 */
export const AVAILABLE_LANGUAGES = LANGUAGES.filter((lang) => lang.status === 'available');

/**
 * Check if a language code is available for selection.
 */
export function isLanguageAvailable(code: string): boolean {
  return AVAILABLE_LANGUAGES.some((lang) => lang.code === code);
}
