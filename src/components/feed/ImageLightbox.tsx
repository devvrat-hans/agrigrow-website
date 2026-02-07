'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconZoomIn,
  IconZoomOut,
  IconDownload,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Props for ImageLightbox component
 */
interface ImageLightboxProps {
  /** Array of image URLs to display */
  images: string[];
  /** Index of the initially selected image */
  initialIndex?: number;
  /** Whether the lightbox is open */
  isOpen: boolean;
  /** Handler to close the lightbox */
  onClose: () => void;
  /** Alt text prefix for images */
  altPrefix?: string;
}

/**
 * ImageLightbox Component
 * Full-screen image viewer with navigation, zoom, and swipe gestures
 */
export function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  altPrefix = 'Image',
}: ImageLightboxProps) {
  // Current image index
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Zoom level (1 = 100%)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  
  // Touch gesture tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Loading state for images
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Reset state when image changes
   */
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [currentIndex]);

  /**
   * Reset to initial index when opening
   */
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  /**
   * Navigate to previous image
   */
  const goToPrevious = useCallback(() => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      return;
    }
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length, zoomLevel]);

  /**
   * Navigate to next image
   */
  const goToNext = useCallback(() => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      return;
    }
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length, zoomLevel]);

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 4));
  }, []);

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev / 1.5, 1);
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  /**
   * Toggle zoom on double-tap
   */
  const toggleZoom = useCallback(() => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setZoomLevel(2);
    }
  }, [zoomLevel]);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext, zoomIn, zoomOut]);

  /**
   * Prevent body scroll when open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Touch event handlers for swipe gestures
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    // Detect double tap
    if (now - lastTapRef.current < 300) {
      toggleZoom();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: now,
    };

    if (zoomLevel > 1) {
      setIsPanning(true);
    }
  }, [zoomLevel, toggleZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (isPanning && zoomLevel > 1) {
      // Panning when zoomed
      setPanPosition((prev) => ({
        x: prev.x + deltaX * 0.5,
        y: prev.y + deltaY * 0.5,
      }));
      touchStartRef.current.x = touch.clientX;
      touchStartRef.current.y = touch.clientY;
    }
  }, [isPanning, zoomLevel]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Swipe detection (only when not zoomed)
    if (zoomLevel === 1) {
      const swipeThreshold = 50;
      const swipeVelocity = Math.abs(deltaX) / deltaTime;

      if (Math.abs(deltaX) > swipeThreshold && swipeVelocity > 0.3) {
        if (deltaX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
      } else if (Math.abs(deltaY) > swipeThreshold * 1.5 && deltaY > 0) {
        // Swipe down to close
        onClose();
      }
    }

    touchStartRef.current = null;
    setIsPanning(false);
  }, [zoomLevel, goToPrevious, goToNext, onClose]);

  /**
   * Handle pinch zoom
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }, [zoomIn, zoomOut]);

  /**
   * Download current image
   */
  const downloadImage = useCallback(async () => {
    try {
      const response = await fetch(images[currentIndex]);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${altPrefix}-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [images, currentIndex, altPrefix]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'bg-black/95',
        'flex items-center justify-center'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Backdrop - click to close */}
      <div
        className="absolute inset-0"
        onClick={() => {
          if (zoomLevel === 1) onClose();
        }}
      />

      {/* Top bar with controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white text-sm">
          {images.length > 1 && (
            <span>
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={zoomLevel <= 1}
            className={cn(
              'p-2 rounded-full text-white transition-colors',
              zoomLevel <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'
            )}
            aria-label="Zoom out"
          >
            <IconZoomOut size={24} />
          </button>
          <button
            onClick={zoomIn}
            disabled={zoomLevel >= 4}
            className={cn(
              'p-2 rounded-full text-white transition-colors',
              zoomLevel >= 4 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'
            )}
            aria-label="Zoom in"
          >
            <IconZoomIn size={24} />
          </button>
          <button
            onClick={downloadImage}
            className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
            aria-label="Download image"
          >
            <IconDownload size={24} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
            aria-label="Close lightbox"
          >
            <IconX size={24} />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Current image */}
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`${altPrefix} ${currentIndex + 1}`}
          className={cn(
            'max-w-full max-h-full object-contain select-none',
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          style={{
            transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          draggable={false}
        />
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && zoomLevel === 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 z-10',
              'p-3 rounded-full',
              'bg-black/50 text-white',
              'hover:bg-black/70 transition-colors',
              'hidden md:flex items-center justify-center'
            )}
            aria-label="Previous image"
          >
            <IconChevronLeft size={28} />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2 z-10',
              'p-3 rounded-full',
              'bg-black/50 text-white',
              'hover:bg-black/70 transition-colors',
              'hidden md:flex items-center justify-center'
            )}
            aria-label="Next image"
          >
            <IconChevronRight size={28} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (zoomLevel === 1) {
                  setCurrentIndex(index);
                }
              }}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                index === currentIndex
                  ? 'w-6 bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Go to image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}

      {/* Zoom level indicator */}
      {zoomLevel > 1 && (
        <div className="absolute bottom-6 right-6 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
          {Math.round(zoomLevel * 100)}%
        </div>
      )}
    </div>
  );
}

export default ImageLightbox;
