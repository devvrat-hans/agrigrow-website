'use client';

import { LanguageProvider } from '@/components/common/LanguageProvider';

/**
 * Client-side providers wrapper for the root layout.
 * Wraps children with LanguageProvider so translation context
 * is available throughout the entire application.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
