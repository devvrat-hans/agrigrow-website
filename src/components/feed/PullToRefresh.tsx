'use client';

import React, {
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { IconRefresh, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Props for PullToRefresh component
 */
interface PullToRefreshProps {
  /** Child content to wrap */
  children: ReactNode;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Whether refresh is disabled */
  disabled?: boolean;
  /** Pull distance required to trigger refresh (default: 80px) */
  threshold?: number;
  /** Maximum pull distance (default: 150px) */
  maxPull?: number;
  /** Additional class names */
  className?: string;
}

/**
 * PullToRefresh Component
 * 
 * Wraps content with pull-to-refresh functionality for mobile.
 * Provides visual feedback during pull and loading states.
 * 
 * Features:
 * - Smooth pull animation with resistance
 * - Visual indicator showing pull progress
 * - Loading spinner during refresh
 * - Works with touch devices only
 * - Prevents conflicts with scrolling
 */
export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  maxPull = 150,
  className,
}: PullToRefreshProps) {
  // State
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Refs
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  /**
   * Check if scroll is at top
   */
  const isAtTop = useCallback((): boolean => {
    if (scrollableRef.current) {
      return scrollableRef.current.scrollTop <= 0;
    }
    return window.scrollY <= 0;
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      // Only start pull if at top of scroll
      if (isAtTop()) {
        touchStartY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    },
    [disabled, isRefreshing, isAtTop]
  );

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || isRefreshing || disabled) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      if (distance > 0 && isAtTop()) {
        // Apply resistance for natural feel
        const resistedDistance = Math.min(
          distance * 0.5,
          maxPull
        );
        setPullDistance(resistedDistance);

        // Prevent default scrolling while pulling
        if (resistedDistance > 0) {
          e.preventDefault();
        }
      }
    },
    [isPulling, isRefreshing, disabled, maxPull, isAtTop]
  );

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing && !disabled) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(threshold); // Hold at threshold during refresh

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Snap back
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, disabled, onRefresh]);

  // Calculate progress percentage
  const progress = Math.min(pullDistance / threshold, 1);

  // Indicator rotation based on pull distance
  const rotation = progress * 180;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center',
          'transition-transform duration-200 ease-out',
          'pointer-events-none z-10',
          isPulling && 'transition-none'
        )}
        style={{
          top: -60,
          height: 60,
          transform: `translateY(${isRefreshing ? threshold : pullDistance}px)`,
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 rounded-full',
            'bg-white dark:bg-gray-900',
            'shadow-lg border border-gray-200 dark:border-gray-700',
            'transition-all duration-200',
            pullDistance >= threshold && !isRefreshing && 'bg-primary-50 dark:bg-primary-900/50'
          )}
        >
          {isRefreshing ? (
            <IconLoader2
              size={20}
              className="text-primary-500 animate-spin"
            />
          ) : (
            <IconRefresh
              size={20}
              className={cn(
                'text-gray-500 dark:text-gray-400 transition-transform duration-100',
                pullDistance >= threshold && 'text-primary-500'
              )}
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Content container */}
      <div
        ref={scrollableRef}
        className={cn(
          'transition-transform duration-200 ease-out',
          isPulling && 'transition-none'
        )}
        style={{
          transform: `translateY(${isRefreshing ? threshold : pullDistance}px)`,
        }}
      >
        {children}
      </div>

      {/* Pull progress text */}
      {pullDistance > 20 && !isRefreshing && (
        <div
          className={cn(
            'absolute left-0 right-0 text-center',
            'text-xs text-gray-500 dark:text-gray-400',
            'pointer-events-none transition-opacity duration-200'
          )}
          style={{
            top: pullDistance - 20,
          }}
        >
          {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}
    </div>
  );
}

export default PullToRefresh;
