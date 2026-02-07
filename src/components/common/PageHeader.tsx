'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface PageHeaderProps {
  /** Optional right side action element */
  rightAction?: ReactNode;
  /** Whether to show logo (default: true) */
  showLogo?: boolean;
  /** Custom left content instead of logo */
  leftContent?: ReactNode;
  /** Custom title text instead of logo */
  title?: string;
  /** Whether to show back button (default: false) */
  showBackButton?: boolean;
  /** Custom back button handler (default: router.back()) */
  onBack?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable page header component with sticky positioning.
 * Typically shows logo on left and optional action on right.
 * 
 * Mobile-optimized with:
 * - Responsive padding (p-3 on mobile, p-4 on desktop)
 * - Responsive logo size (sm on mobile, md on desktop)
 * - Touch-friendly button sizes (minimum 44x44px)
 * - touch-action: manipulation to prevent double-tap zoom
 */
export function PageHeader({
  rightAction,
  showLogo = true,
  leftContent,
  title,
  showBackButton = false,
  onBack,
  className,
}: PageHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header 
      className={cn(
        "border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-40",
        // Responsive padding: p-3 (12px) on mobile, p-4 (16px) on sm+
        "p-3 sm:p-4",
        // Prevent double-tap zoom on mobile
        "touch-action-manipulation",
        className
      )}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between px-1 sm:px-0">
        {showBackButton ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleBack}
              className={cn(
                // Minimum 44x44px touch target per accessibility guidelines
                "min-w-[44px] min-h-[44px] -ml-2",
                "flex items-center justify-center",
                "rounded-full",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "active:bg-gray-200 dark:active:bg-gray-700",
                "active:scale-95",
                "transition-all duration-150",
                // Focus styles for accessibility
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              )}
              aria-label={t('common.goBack')}
            >
              {/* Use fixed size of 20 to prevent hydration mismatch */}
              <IconArrowLeft 
                size={20} 
                className="text-foreground" 
              />
            </button>
            {title && (
              <h1 className="text-base sm:text-lg font-semibold text-foreground line-clamp-1">
                {title}
              </h1>
            )}
          </div>
        ) : leftContent ? (
          leftContent
        ) : title ? (
          <h1 className="text-base sm:text-lg font-semibold text-foreground line-clamp-1">
            {title}
          </h1>
        ) : showLogo ? (
          <Logo size="md" />
        ) : null}
        {rightAction && (
          <div className="flex-shrink-0">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
}
