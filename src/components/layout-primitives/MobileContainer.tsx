'use client';

import React, { ReactNode, forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for MobileContainer component
 */
interface MobileContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Child elements to render inside the container */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to include safe area padding at the bottom (for notched devices) */
  includeSafeAreaBottom?: boolean;
  /** Whether to include safe area padding at the top */
  includeSafeAreaTop?: boolean;
  /** Maximum width constraint (default: '2xl' which is 42rem/672px) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full' | 'none';
  /** Whether to center the container horizontally */
  centered?: boolean;
  /** Custom padding override - when provided, disables default responsive padding */
  padding?: string;
  /** HTML element tag to use (default: 'div') */
  as?: 'div' | 'section' | 'main' | 'article' | 'aside';
}

/**
 * Get max-width class based on maxWidth prop
 */
function getMaxWidthClass(maxWidth: MobileContainerProps['maxWidth']): string {
  switch (maxWidth) {
    case 'sm':
      return 'max-w-sm';
    case 'md':
      return 'max-w-md';
    case 'lg':
      return 'max-w-lg';
    case 'xl':
      return 'max-w-xl';
    case '2xl':
      return 'max-w-2xl';
    case '3xl':
      return 'max-w-3xl';
    case '4xl':
      return 'max-w-4xl';
    case 'full':
      return 'max-w-full';
    case 'none':
      return '';
    default:
      return 'max-w-2xl';
  }
}

/**
 * MobileContainer Component
 * 
 * A reusable container component that provides responsive padding and
 * safe-area handling for mobile devices with notches (iPhone X+, etc.).
 * 
 * Default responsive padding:
 * - Mobile (<640px): px-4 (1rem / 16px)
 * - Small screens (640px+): px-6 (1.5rem / 24px)  
 * - Medium screens (768px+): px-0 (content constrained by max-width)
 * 
 * @example
 * // Basic usage
 * <MobileContainer>
 *   <YourContent />
 * </MobileContainer>
 * 
 * @example
 * // With safe area handling and custom max-width
 * <MobileContainer 
 *   includeSafeAreaBottom 
 *   maxWidth="lg"
 *   centered
 * >
 *   <YourContent />
 * </MobileContainer>
 * 
 * @example
 * // As a main element with safe areas
 * <MobileContainer 
 *   as="main" 
 *   includeSafeAreaTop 
 *   includeSafeAreaBottom
 * >
 *   <PageContent />
 * </MobileContainer>
 */
const MobileContainer = forwardRef<HTMLDivElement, MobileContainerProps>(
  (
    {
      children,
      className,
      includeSafeAreaBottom = false,
      includeSafeAreaTop = false,
      maxWidth = '2xl',
      centered = true,
      padding,
      as: Component = 'div',
      style,
      ...props
    },
    ref
  ) => {
    // Build safe area styles
    const safeAreaStyles: React.CSSProperties = {
      ...style,
    };

    // Add safe area padding using CSS environment variables
    if (includeSafeAreaTop) {
      safeAreaStyles.paddingTop = 'env(safe-area-inset-top, 0px)';
    }

    if (includeSafeAreaBottom) {
      safeAreaStyles.paddingBottom = 'max(env(safe-area-inset-bottom, 0px), 0px)';
    }

    return (
      <Component
        ref={ref}
        className={cn(
          // Default responsive horizontal padding
          // Mobile: 16px | Small: 24px | Medium+: 0px (relies on max-width)
          padding ?? 'px-4 sm:px-6 md:px-0',
          // Max width constraint
          getMaxWidthClass(maxWidth),
          // Center horizontally
          centered && 'mx-auto',
          // Additional classes
          className
        )}
        style={safeAreaStyles}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

MobileContainer.displayName = 'MobileContainer';

export { MobileContainer };
export type { MobileContainerProps };
