'use client';

import { usePathname, useRouter } from 'next/navigation';
import { IconMessageCircle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * GlobalAIWidget Component
 * 
 * A floating Ask AI button that appears on all pages except the crop-ai and ask-ai pages.
 * Navigates to the dedicated /ask-ai page when clicked.
 */
export function GlobalAIWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  // Hide on crop-ai page since it has its own AI widget
  if (pathname?.startsWith('/crop-ai')) {
    return null;
  }

  // Hide on ask-ai page since we're already there
  if (pathname?.startsWith('/ask-ai')) {
    return null;
  }

  // Hide on auth pages
  if (pathname?.startsWith('/auth') || pathname?.startsWith('/onboarding')) {
    return null;
  }

  return (
    <button
      onClick={() => router.push('/ask-ai')}
      className={cn(
        'fixed z-40 flex items-center justify-center rounded-full shadow-lg',
        'bg-green-600 hover:bg-green-700 text-white',
        'transition-all duration-200 hover:scale-105 active:scale-95',
        // Position above MobileBottomNav on mobile, bottom right on desktop
        'bottom-24 right-4 md:bottom-6 md:right-6',
        'min-w-[56px] min-h-[56px] md:min-w-[auto] md:min-h-[auto] md:px-4 md:py-3 md:gap-2'
      )}
      aria-label={t('common.askAi')}
    >
      <IconMessageCircle className="w-6 h-6 md:w-5 md:h-5" />
      <span className="hidden md:inline font-medium">{t('common.askAi')}</span>
    </button>
  );
}

export default GlobalAIWidget;
