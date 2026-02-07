'use client';

import React, { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks';

/**
 * Icon component type from @tabler/icons-react
 * These icons accept size, color, stroke, and className props
 */
interface TablerIconProps {
  size?: number | string;
  color?: string;
  stroke?: number;
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
  role?: string;
}

/**
 * Props for ResponsiveIcon component
 */
interface ResponsiveIconProps {
  /** The icon component from @tabler/icons-react */
  icon: ComponentType<TablerIconProps>;
  /** Icon size on mobile devices (<640px). Default: 18 */
  mobileSize?: number;
  /** Icon size on desktop devices (≥640px). Default: 20 */
  desktopSize?: number;
  /** Icon color - passed directly to the icon component */
  color?: string;
  /** Icon stroke width - passed directly to the icon component */
  stroke?: number;
  /** Additional CSS classes for the icon */
  className?: string;
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** Whether icon is decorative (hides from screen readers) */
  'aria-hidden'?: boolean;
}

/**
 * Default icon sizes following mobile-first design principles
 * 18px on mobile provides good visibility without overwhelming small screens
 * 20px on desktop provides comfortable click targets and visual balance
 */
const DEFAULT_MOBILE_SIZE = 18;
const DEFAULT_DESKTOP_SIZE = 20;

/**
 * ResponsiveIcon Component
 * 
 * A wrapper component that renders icons with responsive sizing based on
 * the current viewport. Uses the useMobile hook to detect screen size
 * and automatically adjusts icon size for optimal visibility and touch targets.
 * 
 * This component works seamlessly with @tabler/icons-react icons and provides
 * consistent icon sizing across the application.
 * 
 * Default sizes:
 * - Mobile (<640px): 18px
 * - Desktop (≥640px): 20px
 * 
 * @example
 * // Basic usage with default sizes
 * import { IconHeart } from '@tabler/icons-react';
 * <ResponsiveIcon icon={IconHeart} />
 * 
 * @example
 * // Custom sizes
 * import { IconMenu } from '@tabler/icons-react';
 * <ResponsiveIcon 
 *   icon={IconMenu} 
 *   mobileSize={20} 
 *   desktopSize={24} 
 * />
 * 
 * @example
 * // With color and stroke
 * import { IconUser } from '@tabler/icons-react';
 * <ResponsiveIcon 
 *   icon={IconUser}
 *   color="currentColor"
 *   stroke={1.5}
 *   className="text-primary-600"
 * />
 * 
 * @example
 * // With accessibility label
 * import { IconSettings } from '@tabler/icons-react';
 * <ResponsiveIcon 
 *   icon={IconSettings}
 *   aria-label="Open settings"
 * />
 */
function ResponsiveIcon({
  icon: Icon,
  mobileSize = DEFAULT_MOBILE_SIZE,
  desktopSize = DEFAULT_DESKTOP_SIZE,
  color,
  stroke,
  className,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}: ResponsiveIconProps) {
  // Use the mobile hook to detect screen size
  const { isMobile } = useMobile();

  // Determine the appropriate size based on screen size
  const size = isMobile ? mobileSize : desktopSize;

  // If aria-hidden is not explicitly set, hide decorative icons
  // that don't have an aria-label
  const computedAriaHidden = ariaHidden ?? !ariaLabel;

  return (
    <Icon
      size={size}
      color={color}
      stroke={stroke}
      className={cn(
        // Ensure icon doesn't shrink in flex containers
        'flex-shrink-0',
        // Smooth transition for size changes (e.g., orientation change)
        'transition-[width,height] duration-150',
        className
      )}
      aria-label={ariaLabel}
      aria-hidden={computedAriaHidden}
      role={ariaLabel ? 'img' : undefined}
    />
  );
}

ResponsiveIcon.displayName = 'ResponsiveIcon';

/**
 * Helper hook that returns icon size based on mobile state
 * Useful when you need to pass size to icons without using ResponsiveIcon
 * 
 * @example
 * const iconSize = useResponsiveIconSize();
 * return <IconHeart size={iconSize} />;
 * 
 * @example
 * const iconSize = useResponsiveIconSize(16, 18);
 * return <IconSmallIcon size={iconSize} />;
 */
function useResponsiveIconSize(
  mobileSize: number = DEFAULT_MOBILE_SIZE,
  desktopSize: number = DEFAULT_DESKTOP_SIZE
): number {
  const { isMobile } = useMobile();
  return isMobile ? mobileSize : desktopSize;
}

export { 
  ResponsiveIcon, 
  useResponsiveIconSize,
  DEFAULT_MOBILE_SIZE, 
  DEFAULT_DESKTOP_SIZE 
};
export type { ResponsiveIconProps };
