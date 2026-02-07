'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks';

/**
 * Props for FeedItemImageGallery component
 */
interface FeedItemImageGalleryProps {
  /** Array of image URLs */
  images: string[];
  /** Handler when an image is clicked (receives index) */
  onImageClick?: (index: number) => void;
  /** Additional class names */
  className?: string;
}

/**
 * FeedItemImageGallery Component
 * 
 * Displays a responsive image gallery for feed items.
 * 
 * Layout behavior:
 * - 1 image: Full width with max-height constraint
 * - 2 images: Side by side
 * - 3+ images: 2-column grid on mobile, with larger first image; 
 *              2-3 columns on desktop
 * 
 * Mobile-optimized with:
 * - Touch-friendly click areas
 * - Proper aspect-ratio handling
 * - Lazy loading for performance
 */
export function FeedItemImageGallery({
  images,
  onImageClick,
  className,
}: FeedItemImageGalleryProps) {
  const { isMobile } = useMobile();
  const count = images.length;

  if (count === 0) return null;

  const handleClick = (index: number) => {
    onImageClick?.(index);
  };

  // Optimize image loading - placeholder for image service integration
  const getOptimizedImageSrc = (src: string, _size: 'sm' | 'md' | 'lg' = 'md') => {
    return src;
  };

  // Single image - full width with max-height constraint
  if (count === 1) {
    return (
      <div
        className={cn(
          'mx-3 sm:mx-4 rounded-lg overflow-hidden',
          'cursor-pointer active:opacity-90 transition-opacity',
          // Touch-friendly minimum height
          'min-h-[150px]',
          className
        )}
        onClick={() => handleClick(0)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(0);
          }
        }}
        aria-label="View image"
      >
        <img
          src={getOptimizedImageSrc(images[0], 'lg')}
          alt="Post image"
          className={cn(
            'w-full object-cover',
            // Responsive max-height: smaller on mobile, larger on desktop
            'max-h-[350px] sm:max-h-[400px] md:max-h-[500px]'
          )}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  // Two images - side by side
  if (count === 2) {
    return (
      <div className={cn('mx-3 sm:mx-4 grid grid-cols-2 gap-1 rounded-lg overflow-hidden', className)}>
        {images.slice(0, 2).map((img, index) => (
          <div
            key={index}
            className={cn(
              'aspect-square cursor-pointer active:opacity-90 transition-opacity',
              // Touch-friendly minimum size
              'min-w-[100px] min-h-[100px]'
            )}
            onClick={() => handleClick(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(index);
              }
            }}
            aria-label={`View image ${index + 1} of ${count}`}
          >
            <img
              src={getOptimizedImageSrc(img, 'md')}
              alt={`Post image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    );
  }

  // 3 or more images - responsive grid
  // Mobile: 2 columns with first image spanning both columns
  // Desktop: 3 columns with first image spanning 2
  return (
    <div 
      className={cn(
        'mx-3 sm:mx-4 rounded-lg overflow-hidden',
        // 2 columns on mobile, 3 columns on sm+
        'grid grid-cols-2 sm:grid-cols-3 gap-1',
        className
      )}
    >
      {images.slice(0, isMobile ? 4 : 6).map((img, index) => {
        // First image is always larger
        const isFirstImage = index === 0;
        const isLastVisibleImage = isMobile 
          ? (index === 3 && count > 4)
          : (index === 5 && count > 6);
        const remainingCount = isMobile 
          ? count - 4
          : count - 6;

        return (
          <div
            key={index}
            className={cn(
              'relative cursor-pointer active:opacity-90 transition-opacity',
              // First image spans 2 columns and 2 rows on mobile
              // On desktop: spans 2 columns and 2 rows
              isFirstImage && 'col-span-2 row-span-2',
              // Aspect ratio handling
              !isFirstImage && 'aspect-square',
              isFirstImage && 'aspect-[2/1] sm:aspect-square',
              // Touch-friendly minimum size
              'min-h-[80px] sm:min-h-[100px]'
            )}
            onClick={() => handleClick(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(index);
              }
            }}
            aria-label={`View image ${index + 1} of ${count}`}
          >
            <img
              src={getOptimizedImageSrc(img, isFirstImage ? 'lg' : 'sm')}
              alt={`Post image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            {/* Plus count overlay on last visible image */}
            {isLastVisibleImage && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl font-bold">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default FeedItemImageGallery;
