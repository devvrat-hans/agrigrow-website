'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  IconBookmark,
  IconShare,
  IconEyeOff,
  IconFlag,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Quick action interface for swipe gestures
 */
export interface SwipeAction {
  id: string;
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

/**
 * Props for SwipeableCard component
 */
interface SwipeableCardProps {
  children: ReactNode;
  onSave?: () => void;
  onShare?: () => void;
  onHide?: () => void;
  onReport?: () => void;
  isSaved?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Swipe threshold in pixels
 */
const SWIPE_THRESHOLD = 80;

/**
 * Maximum swipe distance
 */
const MAX_SWIPE = 160;

/**
 * Action button size (touch-friendly)
 */
const ACTION_SIZE = 44;

/**
 * SwipeableCard Component
 * 
 * Wraps content with swipe-left-to-reveal quick actions for mobile.
 * Provides haptic feedback simulation through visual cues.
 * 
 * Features:
 * - Swipe left to reveal actions (save, share, hide, report)
 * - Touch-friendly 44px minimum targets
 * - Smooth spring animation
 * - Visual haptic feedback on action trigger
 */
export function SwipeableCard({
  children,
  onSave,
  onShare,
  onHide,
  onReport,
  isSaved = false,
  disabled = false,
  className,
}: SwipeableCardProps) {
  // State
  const [swipeX, setSwipeX] = useState(0);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [actionTriggered, setActionTriggered] = useState<string | null>(null);

  // Refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwipingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Build quick actions array
  const actions: SwipeAction[] = [
    ...(onSave
      ? [
          {
            id: 'save',
            icon: <IconBookmark size={20} className={isSaved ? 'fill-current' : ''} />,
            label: isSaved ? 'Unsave' : 'Save',
            color: 'text-primary-600 dark:text-primary-400',
            bgColor: 'bg-primary-100 dark:bg-primary-900/50',
            onClick: onSave,
          },
        ]
      : []),
    ...(onShare
      ? [
          {
            id: 'share',
            icon: <IconShare size={20} />,
            label: 'Share',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/50',
            onClick: onShare,
          },
        ]
      : []),
    ...(onHide
      ? [
          {
            id: 'hide',
            icon: <IconEyeOff size={20} />,
            label: 'Hide',
            color: 'text-gray-600 dark:text-gray-400',
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            onClick: onHide,
          },
        ]
      : []),
    ...(onReport
      ? [
          {
            id: 'report',
            icon: <IconFlag size={20} />,
            label: 'Report',
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-100 dark:bg-red-900/50',
            onClick: onReport,
          },
        ]
      : []),
  ];

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || actions.length === 0) return;

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwipingRef.current = false;
    },
    [disabled, actions.length]
  );

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || actions.length === 0) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchStartX.current - touchX;
      const deltaY = Math.abs(touchStartY.current - touchY);

      // If scrolling vertically more than horizontally, don't swipe
      if (!isSwipingRef.current && deltaY > Math.abs(deltaX)) {
        return;
      }

      // Start swiping if moved enough horizontally
      if (Math.abs(deltaX) > 10) {
        isSwipingRef.current = true;
      }

      if (isSwipingRef.current && deltaX > 0) {
        // Swiping left - reveal actions
        const newSwipeX = Math.min(deltaX, MAX_SWIPE);
        setSwipeX(newSwipeX);

        // Check if threshold crossed for visual feedback
        if (newSwipeX >= SWIPE_THRESHOLD && !isActionsVisible) {
          setIsActionsVisible(true);
          // Simulate haptic feedback with subtle scale animation
          if (contentRef.current) {
            contentRef.current.style.transform = `translateX(-${newSwipeX}px) scale(0.99)`;
            setTimeout(() => {
              if (contentRef.current) {
                contentRef.current.style.transform = `translateX(-${newSwipeX}px)`;
              }
            }, 50);
          }
        }
      } else if (deltaX < 0 && isActionsVisible) {
        // Swiping right - hide actions
        const newSwipeX = Math.max(0, swipeX + deltaX);
        setSwipeX(newSwipeX);
      }
    },
    [disabled, actions.length, isActionsVisible, swipeX]
  );

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(() => {
    if (!isSwipingRef.current) return;

    if (swipeX >= SWIPE_THRESHOLD) {
      // Snap to action reveal position
      setSwipeX(MAX_SWIPE);
      setIsActionsVisible(true);
    } else {
      // Snap back to closed
      setSwipeX(0);
      setIsActionsVisible(false);
    }

    isSwipingRef.current = false;
  }, [swipeX]);

  /**
   * Close actions when clicking outside
   */
  const closeActions = useCallback(() => {
    setSwipeX(0);
    setIsActionsVisible(false);
  }, []);

  /**
   * Handle action click with visual feedback
   */
  const handleActionClick = useCallback(
    (action: SwipeAction) => {
      setActionTriggered(action.id);

      // Visual feedback - brief scale
      setTimeout(() => {
        action.onClick();
        setActionTriggered(null);
        closeActions();
      }, 100);
    },
    [closeActions]
  );

  // Close actions when clicking elsewhere
  useEffect(() => {
    if (!isActionsVisible) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeActions();
      }
    };

    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsVisible, closeActions]);

  // If no actions available, just render children
  if (actions.length === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Background actions */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex items-center gap-1 px-2',
          'bg-gray-100 dark:bg-gray-800',
          'transition-opacity duration-200',
          isActionsVisible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ width: MAX_SWIPE }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'rounded-lg transition-transform duration-100',
              action.bgColor,
              action.color,
              actionTriggered === action.id && 'scale-110'
            )}
            style={{
              width: ACTION_SIZE,
              height: ACTION_SIZE,
              minWidth: ACTION_SIZE,
              minHeight: ACTION_SIZE,
            }}
            aria-label={action.label}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'relative bg-white dark:bg-gray-950',
          'transition-transform duration-200 ease-out',
          isSwipingRef.current && 'transition-none'
        )}
        style={{
          transform: `translateX(-${swipeX}px)`,
        }}
      >
        {children}
      </div>

      {/* Overlay to close actions on tap */}
      {isActionsVisible && (
        <div
          className="absolute inset-0 z-10"
          onClick={closeActions}
          onTouchStart={(e) => {
            e.stopPropagation();
            closeActions();
          }}
          style={{ pointerEvents: 'auto' }}
        />
      )}
    </div>
  );
}

export default SwipeableCard;
