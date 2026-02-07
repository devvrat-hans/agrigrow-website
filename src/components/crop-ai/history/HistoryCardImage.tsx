'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { isBase64Image } from '@/components/common';

// TYPES

export interface HistoryCardImageProps {
  /** Image source URL or base64 data URL */
  imageUrl: string;
  /** Alt text for accessibility */
  alt: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * HistoryCardImage Component
 * 
 * Displays a history card image with responsive sizing and loading skeleton.
 * Optimized for mobile with touch-friendly dimensions.
 */
export function HistoryCardImage({
  imageUrl,
  alt,
  className,
}: HistoryCardImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        'relative flex-shrink-0',
        'w-16 h-16 sm:w-20 sm:h-20',
        'rounded-lg overflow-hidden',
        'bg-gray-100 dark:bg-gray-800',
        className
      )}
    >
      {/* Loading Skeleton */}
      {isLoading && !hasError && (
        <div
          className={cn(
            'absolute inset-0',
            'bg-gray-200 dark:bg-gray-700',
            'animate-pulse'
          )}
        />
      )}

      {/* Error State */}
      {hasError && (
        <div
          className={cn(
            'absolute inset-0',
            'flex items-center justify-center',
            'bg-gray-100 dark:bg-gray-800',
            'text-gray-400 dark:text-gray-500'
          )}
        >
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Image */}
      {!hasError && (
        isBase64Image(imageUrl) ? (
          // Use native img for base64 images
          <img
            src={imageUrl}
            alt={alt}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              'transition-opacity duration-300',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        ) : (
          // Use Next.js Image for URL images
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes="(max-width: 640px) 64px, 80px"
            className={cn(
              'object-cover',
              'transition-opacity duration-300',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )
      )}
    </div>
  );
}

export default HistoryCardImage;
