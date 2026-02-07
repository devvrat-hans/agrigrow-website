'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Device type detection
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Mobile detection hook return type
 */
export interface UseMobileReturn {
  /** Whether the device is mobile (< 640px) */
  isMobile: boolean;
  /** Whether the device is tablet (640px - 1024px) */
  isTablet: boolean;
  /** Whether the device is desktop (> 1024px) */
  isDesktop: boolean;
  /** Current device type */
  deviceType: DeviceType;
  /** Whether touch is available */
  isTouchDevice: boolean;
  /** Whether reduced motion is preferred */
  prefersReducedMotion: boolean;
  /** Current viewport width */
  viewportWidth: number;
  /** Current viewport height */
  viewportHeight: number;
  /** Safe area insets for notched devices */
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Breakpoints matching Tailwind defaults
 */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * useMobile Hook
 * 
 * Detects device type and provides mobile-specific utilities.
 * Uses responsive design principles with Tailwind breakpoints.
 * 
 * Features:
 * - Device type detection (mobile/tablet/desktop)
 * - Touch device detection
 * - Reduced motion preference detection
 * - Safe area insets for notched devices
 * - Viewport dimensions tracking
 * 
 * Note: Uses SSR-safe defaults to prevent hydration mismatches.
 * Values update after hydration is complete.
 */
export function useMobile(): UseMobileReturn {
  // Track whether we're hydrated to prevent SSR/client mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  
  // State with SSR-safe defaults (desktop-like values)
  // These match what Tailwind would render on server
  const [viewportWidth, setViewportWidth] = useState(1024);
  const [viewportHeight, setViewportHeight] = useState(768);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  /**
   * Update viewport dimensions
   */
  const updateViewport = useCallback(() => {
    if (typeof window !== 'undefined') {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    }
  }, []);

  /**
   * Update safe area insets
   */
  const updateSafeAreaInsets = useCallback(() => {
    if (typeof window !== 'undefined' && typeof getComputedStyle !== 'undefined') {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      const parseInset = (property: string): number => {
        const value = computedStyle.getPropertyValue(property);
        return value ? parseInt(value, 10) || 0 : 0;
      };

      setSafeAreaInsets({
        top: parseInset('--sat') || parseInset('env(safe-area-inset-top)') || 0,
        bottom: parseInset('--sab') || parseInset('env(safe-area-inset-bottom)') || 0,
        left: parseInset('--sal') || parseInset('env(safe-area-inset-left)') || 0,
        right: parseInset('--sar') || parseInset('env(safe-area-inset-right)') || 0,
      });
    }
  }, []);

  // Initialize on mount - runs after hydration is complete
  useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true);
    
    if (typeof window === 'undefined') return;

    // Check touch support
    setIsTouchDevice(
      'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints for IE compatibility
        (navigator.msMaxTouchPoints as number) > 0
    );

    // Check reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);

    // Update viewport
    updateViewport();
    updateSafeAreaInsets();

    // Listen for viewport changes
    const handleResize = () => {
      updateViewport();
      updateSafeAreaInsets();
    };

    // Listen for motion preference changes
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [updateViewport, updateSafeAreaInsets]);

  // Compute device type based on current viewport width
  // Before hydration, use desktop values to match SSR
  const deviceType: DeviceType = useMemo(() => {
    if (!isHydrated) return 'desktop';
    if (viewportWidth < BREAKPOINTS.sm) return 'mobile';
    if (viewportWidth < BREAKPOINTS.lg) return 'tablet';
    return 'desktop';
  }, [viewportWidth, isHydrated]);

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  return {
    isMobile,
    isTablet,
    isDesktop,
    deviceType,
    isTouchDevice,
    prefersReducedMotion,
    viewportWidth,
    viewportHeight,
    safeAreaInsets,
  };
}

/**
 * Hook to get touch-friendly sizes
 */
export function useTouchFriendlySize(baseSize: number): number {
  const { isMobile, isTouchDevice } = useMobile();

  // Minimum touch target size per accessibility guidelines
  const MIN_TOUCH_TARGET = 44;

  if (isMobile || isTouchDevice) {
    return Math.max(baseSize, MIN_TOUCH_TARGET);
  }

  return baseSize;
}

/**
 * Hook to determine if animations should be reduced
 */
export function useReducedAnimations(): boolean {
  const { prefersReducedMotion, isMobile: _isMobile } = useMobile();

  // Reduce animations on mobile for performance or if user prefers reduced motion
  return prefersReducedMotion;
}

export default useMobile;
