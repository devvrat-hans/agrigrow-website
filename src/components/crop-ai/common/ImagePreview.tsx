'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { IconPhoto, IconZoomIn, IconX, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { isBase64Image } from '@/components/common';

// TYPES

export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';

export interface ImagePreviewProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Aspect ratio for the image container */
  aspectRatio?: AspectRatio;
  /** Whether to enable zoom on click */
  showZoom?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

// ASPECT RATIO CONFIGURATIONS

const ASPECT_RATIO_CLASSES: Record<AspectRatio, string> = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  'auto': '',
};

/**
 * ImagePreview Component
 * 
 * Displays an image with loading/error states and optional zoom functionality.
 * Supports touch gestures for pinch-to-zoom on mobile devices.
 * 
 * @example
 * <ImagePreview 
 *   src="/crop-image.jpg" 
 *   alt="Wheat crop" 
 *   aspectRatio="4:3" 
 *   showZoom 
 * />
 */
export function ImagePreview({
  src,
  alt,
  aspectRatio = 'auto',
  showZoom = false,
  className,
  onLoad,
  onError,
}: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Handle click for zoom
  const handleClick = useCallback(() => {
    if (showZoom && !hasError && !isLoading) {
      setIsModalOpen(true);
    }
  }, [showZoom, hasError, isLoading]);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      {/* Main Image Container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg md:rounded-xl',
          'bg-gray-100 dark:bg-gray-800',
          ASPECT_RATIO_CLASSES[aspectRatio],
          showZoom && !hasError && !isLoading && 'cursor-zoom-in',
          className
        )}
        onClick={handleClick}
        role={showZoom ? 'button' : undefined}
        tabIndex={showZoom ? 0 : undefined}
        onKeyDown={showZoom ? (e) => e.key === 'Enter' && handleClick() : undefined}
        aria-label={showZoom ? `View ${alt} in full screen` : undefined}
      >
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <IconLoader2 
              className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin relative z-10" 
            />
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <IconPhoto className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Failed to load image
            </span>
          </div>
        )}

        {/* Actual Image */}
        {!hasError && (
          isBase64Image(src) ? (
            // Use native img for base64 images
            <img
              src={src}
              alt={alt}
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
                isLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            // Use Next.js Image for URL images
            <Image
              src={src}
              alt={alt}
              fill
              className={cn(
                'object-cover transition-opacity duration-300',
                isLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={handleLoad}
              onError={handleError}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          )
        )}

        {/* Zoom Indicator */}
        {showZoom && !hasError && !isLoading && (
          <div
            className={cn(
              'absolute bottom-2 right-2 md:bottom-3 md:right-3',
              'p-1.5 md:p-2 rounded-full',
              'bg-black/50 backdrop-blur-sm',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'md:opacity-70 hover:opacity-100'
            )}
          >
            <IconZoomIn className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && (
        <ImageModal
          src={src}
          alt={alt}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

// IMAGE MODAL COMPONENT

interface ImageModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

function ImageModal({ src, alt, onClose }: ImageModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev * 1.2, 5));
      } else if (e.key === '-') {
        setScale((prev) => Math.max(prev / 1.2, 1));
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, resetZoom]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialDistance.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      initialScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const newScale = Math.max(
        1,
        Math.min(5, initialScale.current * (currentDistance / initialDistance.current))
      );
      setScale(newScale);
      
      // Reset position if zoomed out
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      // Limit panning
      const maxPan = (scale - 1) * 100;
      setPosition({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY)),
      });
    }
  }, [isDragging, scale, dragStart, initialDistance]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
    setIsDragging(false);
  }, []);

  // Mouse handlers for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxPan = (scale - 1) * 100;
      setPosition({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY)),
      });
    }
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double click to zoom
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  }, [scale, resetZoom]);

  // Wheel zoom for desktop
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(1, Math.min(5, scale * delta));
    setScale(newScale);
    
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-50',
        'bg-black/95 backdrop-blur-sm',
        'flex items-center justify-center',
        'touch-none'
      )}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onClose();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      role="dialog"
      aria-modal="true"
      aria-label={`Full screen view of ${alt}`}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className={cn(
          'absolute top-4 right-4 z-10',
          'p-2 md:p-3 rounded-full',
          'bg-white/10 hover:bg-white/20',
          'text-white',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-white/50'
        )}
        aria-label="Close full screen view"
      >
        <IconX className="w-6 h-6 md:w-7 md:h-7" />
      </button>

      {/* Zoom Controls */}
      <div
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 z-10',
          'flex items-center gap-3 px-4 py-2',
          'bg-white/10 rounded-full backdrop-blur-sm',
          'text-white text-sm'
        )}
      >
        <button
          onClick={() => setScale((prev) => Math.max(prev / 1.2, 1))}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Zoom out"
        >
          <span className="text-lg font-medium">−</span>
        </button>
        <span className="min-w-[4ch] text-center font-medium">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((prev) => Math.min(prev * 1.2, 5))}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Zoom in"
        >
          <span className="text-lg font-medium">+</span>
        </button>
        {scale > 1 && (
          <button
            onClick={resetZoom}
            className="ml-2 px-2 py-0.5 text-xs bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            aria-label="Reset zoom"
          >
            Reset
          </button>
        )}
      </div>

      {/* Image Container */}
      <div
        ref={imageRef}
        className={cn(
          'relative max-w-[90vw] max-h-[85vh]',
          'select-none',
          isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
        )}
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {isBase64Image(src) ? (
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg"
            draggable={false}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={900}
            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg"
            priority
            draggable={false}
          />
        )}
      </div>

      {/* Instructions */}
      <div
        className={cn(
          'absolute bottom-16 left-1/2 -translate-x-1/2',
          'text-white/60 text-xs md:text-sm',
          'hidden md:block'
        )}
      >
        Double-click to zoom • Scroll to adjust • Drag to pan
      </div>
    </div>
  );
}

export default ImagePreview;
