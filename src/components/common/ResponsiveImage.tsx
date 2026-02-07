'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { IconPhoto, IconPhotoOff } from '@tabler/icons-react';

/**
 * Props for ResponsiveImage component
 */
export interface ResponsiveImageProps {
  /** Image source - can be URL or base64 data URL */
  src?: string | null;
  /** Alt text for accessibility */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Container CSS classes */
  containerClassName?: string;
  /** Width of the image */
  width?: number | string;
  /** Height of the image */
  height?: number | string;
  /** Object fit style */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Fallback image URL if main image fails */
  fallbackSrc?: string;
  /** Custom fallback component when no image available */
  fallbackComponent?: React.ReactNode;
  /** Whether to show a placeholder icon when no image */
  showPlaceholderIcon?: boolean;
  /** Placeholder icon size */
  placeholderIconSize?: number;
  /** Placeholder background color class */
  placeholderBgClass?: string;
  /** Loading attribute for lazy loading */
  loading?: 'lazy' | 'eager';
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Whether the image is a profile/avatar (circular styling) */
  isAvatar?: boolean;
  /** Image aspect ratio (e.g., '16/9', '4/3', '1/1') */
  aspectRatio?: string;
}

/**
 * Check if a string is a base64 data URL
 */
export function isBase64Image(src: string): boolean {
  return src.startsWith('data:image');
}

/**
 * Check if a string is a valid image URL
 */
export function isValidImageUrl(src: string): boolean {
  if (!src) return false;
  // Check for base64
  if (isBase64Image(src)) return true;
  // Check for absolute URL
  if (src.startsWith('http://') || src.startsWith('https://')) return true;
  // Check for relative path
  if (src.startsWith('/')) return true;
  return false;
}

/**
 * Get image type from source
 */
export function getImageType(src: string): 'base64' | 'url' | 'relative' | 'unknown' {
  if (!src) return 'unknown';
  if (isBase64Image(src)) return 'base64';
  if (src.startsWith('http://') || src.startsWith('https://')) return 'url';
  if (src.startsWith('/')) return 'relative';
  return 'unknown';
}

/**
 * Extract MIME type from base64 data URL
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  return match ? match[1] : null;
}

/**
 * Placeholder component when no image is available
 */
function ImagePlaceholder({
  iconSize = 24,
  bgClass = 'bg-gray-100 dark:bg-gray-800',
  className,
  isAvatar,
}: {
  iconSize?: number;
  bgClass?: string;
  className?: string;
  isAvatar?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        bgClass,
        isAvatar && 'rounded-full',
        className
      )}
    >
      <IconPhoto
        className="text-gray-400 dark:text-gray-500"
        size={iconSize}
      />
    </div>
  );
}

/**
 * Error placeholder component
 */
function ErrorPlaceholder({
  iconSize = 24,
  bgClass = 'bg-gray-100 dark:bg-gray-800',
  className,
  isAvatar,
}: {
  iconSize?: number;
  bgClass?: string;
  className?: string;
  isAvatar?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        bgClass,
        isAvatar && 'rounded-full',
        className
      )}
    >
      <IconPhotoOff
        className="text-gray-400 dark:text-gray-500"
        size={iconSize}
      />
    </div>
  );
}

/**
 * ResponsiveImage Component
 * 
 * A flexible image component that handles both URL and base64 data URL sources.
 * Includes lazy loading, error handling, and fallback support.
 * 
 * Features:
 * - Automatically detects image type (URL vs base64)
 * - Lazy loading support for performance
 * - Fallback image or placeholder on error
 * - Avatar mode with circular styling
 * - Aspect ratio control
 * - Loading and error callbacks
 * 
 * @example
 * // Basic usage
 * <ResponsiveImage src={imageUrl} alt="Example" />
 * 
 * @example
 * // With fallback
 * <ResponsiveImage 
 *   src={userImage} 
 *   alt="User avatar"
 *   fallbackSrc="/default-avatar.png"
 *   isAvatar
 * />
 * 
 * @example
 * // Cover image with aspect ratio
 * <ResponsiveImage
 *   src={coverImage}
 *   alt="Cover"
 *   aspectRatio="16/9"
 *   objectFit="cover"
 * />
 */
export function ResponsiveImage({
  src,
  alt,
  className,
  containerClassName,
  width,
  height,
  objectFit = 'cover',
  fallbackSrc,
  fallbackComponent,
  showPlaceholderIcon = true,
  placeholderIconSize = 24,
  placeholderBgClass = 'bg-gray-100 dark:bg-gray-800',
  loading = 'lazy',
  onLoad,
  onError,
  isAvatar = false,
  aspectRatio,
}: ResponsiveImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Determine if we have a valid image source
  const hasValidSrc = useMemo(() => {
    return Boolean(currentSrc && isValidImageUrl(currentSrc));
  }, [currentSrc]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setIsLoading(false);
    
    // Try fallback if available and not already using it
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    
    setHasError(true);
    onError?.();
  }, [fallbackSrc, currentSrc, onError]);

  // Reset state when src changes
  React.useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Container styles
  const containerStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
    if (height) styles.height = typeof height === 'number' ? `${height}px` : height;
    if (aspectRatio) styles.aspectRatio = aspectRatio;
    return styles;
  }, [width, height, aspectRatio]);

  // Image styles
  const imageStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      objectFit,
    };
    return styles;
  }, [objectFit]);

  // Render fallback or placeholder
  if (!hasValidSrc || hasError) {
    // Custom fallback component
    if (fallbackComponent) {
      return (
        <div
          className={cn(
            'relative overflow-hidden',
            isAvatar && 'rounded-full',
            containerClassName
          )}
          style={containerStyles}
        >
          {fallbackComponent}
        </div>
      );
    }

    // Show placeholder icon
    if (showPlaceholderIcon) {
      return (
        <div
          className={cn(
            'relative overflow-hidden w-full h-full',
            isAvatar && 'rounded-full',
            containerClassName
          )}
          style={containerStyles}
        >
          {hasError ? (
            <ErrorPlaceholder
              iconSize={placeholderIconSize}
              bgClass={placeholderBgClass}
              className="w-full h-full"
              isAvatar={isAvatar}
            />
          ) : (
            <ImagePlaceholder
              iconSize={placeholderIconSize}
              bgClass={placeholderBgClass}
              className="w-full h-full"
              isAvatar={isAvatar}
            />
          )}
        </div>
      );
    }

    // Return empty container
    return (
      <div
        className={cn(
          'relative overflow-hidden',
          placeholderBgClass,
          isAvatar && 'rounded-full',
          containerClassName
        )}
        style={containerStyles}
      />
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        isAvatar && 'rounded-full',
        containerClassName
      )}
      style={containerStyles}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            placeholderBgClass,
            isAvatar && 'rounded-full'
          )}
        >
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={currentSrc || undefined}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full',
          isLoading && 'opacity-0',
          !isLoading && 'opacity-100 transition-opacity duration-200',
          isAvatar && 'rounded-full',
          className
        )}
        style={imageStyles}
      />
    </div>
  );
}

export default ResponsiveImage;
