'use client';

import React, { forwardRef, useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MobileScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  enableSnap?: boolean;
  snapAlign?: 'start' | 'center' | 'end';
  showFadeIndicators?: boolean;
  fadeWidth?: number;
  lockVerticalScroll?: boolean;
  paddingStart?: string;
  paddingEnd?: string;
  gap?: string;
  onScrollChange?: (scrollLeft: number, maxScroll: number) => void;
}

const MobileScrollContainer = forwardRef<HTMLDivElement, MobileScrollContainerProps>(
  (
    {
      children,
      className,
      enableSnap = true,
      snapAlign = 'start',
      showFadeIndicators = false,
      fadeWidth = 24,
      lockVerticalScroll = true,
      paddingStart,
      paddingEnd,
      gap,
      onScrollChange,
      style,
      ...rest
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    const handleScroll = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (showFadeIndicators) {
        setShowLeftFade(scrollLeft > 10);
        setShowRightFade(scrollLeft < maxScroll - 10);
      }

      if (onScrollChange) {
        onScrollChange(scrollLeft, maxScroll);
      }
    }, [onScrollChange, showFadeIndicators]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      handleScroll();
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }, [handleScroll]);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const snapClass = enableSnap
      ? snapAlign === 'start'
        ? 'snap-x snap-mandatory'
        : snapAlign === 'center'
        ? 'snap-x snap-mandatory'
        : 'snap-x snap-mandatory'
      : '';

    const childSnapClass =
      snapAlign === 'start'
        ? 'snap-start'
        : snapAlign === 'center'
        ? 'snap-center'
        : 'snap-end';

    return (
      <div className={cn('relative', showFadeIndicators && 'overflow-visible')}>
        {showFadeIndicators && showLeftFade && (
          <div
            className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none bg-gradient-to-r from-white dark:from-gray-900 to-transparent"
            style={{ width: fadeWidth }}
            aria-hidden="true"
          />
        )}

        <div
          ref={setRefs}
          className={cn(
            'flex overflow-x-auto overflow-y-hidden',
            'scrollbar-hide',
            '-webkit-overflow-scrolling-touch',
            lockVerticalScroll && 'touch-action-pan-x',
            snapClass,
            className
          )}
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            ...(paddingStart && { paddingLeft: paddingStart }),
            ...(paddingEnd && { paddingRight: paddingEnd }),
            ...(gap && { gap }),
            ...style,
          }}
          {...rest}
        >
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;

            if (!enableSnap) return child;

            const childElement = child as React.ReactElement<{
              className?: string;
              style?: React.CSSProperties;
            }>;

            return React.cloneElement(childElement, {
              className: cn(childElement.props.className, childSnapClass),
            });
          })}
        </div>

        {showFadeIndicators && showRightFade && (
          <div
            className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none bg-gradient-to-l from-white dark:from-gray-900 to-transparent"
            style={{ width: fadeWidth }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }
);

MobileScrollContainer.displayName = 'MobileScrollContainer';

export { MobileScrollContainer };
export type { MobileScrollContainerProps };
