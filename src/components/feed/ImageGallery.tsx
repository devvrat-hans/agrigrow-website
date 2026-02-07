'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ImageLightbox } from './ImageLightbox';

/**
 * Props for ImageGallery component
 */
interface ImageGalleryProps {
  /** Array of image URLs to display */
  images: string[];
  /** Optional callback when an image is clicked (receives index) */
  onImageClick?: (index: number) => void;
  /** Alt text prefix for images */
  altPrefix?: string;
  /** Maximum height for single image display */
  maxHeight?: number;
  /** Additional class names */
  className?: string;
  /** Whether to disable the built-in lightbox */
  disableLightbox?: boolean;
}

/**
 * Single image component with lazy loading and blur placeholder
 */
interface GalleryImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
  className?: string;
  showOverlay?: number;
}

function GalleryImage({ src, alt, onClick, className, showOverlay }: GalleryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        'relative overflow-hidden cursor-pointer',
        'bg-gray-100 dark:bg-gray-800',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Blur placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Failed to load image
          </span>
        </div>
      )}

      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />

      {/* Count overlay for 5+ images */}
      {showOverlay && showOverlay > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <span className="text-white text-2xl md:text-3xl font-bold">
            +{showOverlay}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * ImageGallery Component
 * Smart layout gallery for displaying post images with lightbox support
 */
export function ImageGallery({
  images,
  onImageClick,
  altPrefix = 'Post image',
  maxHeight = 400,
  className,
  disableLightbox = false,
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleImageClick = useCallback(
    (index: number) => {
      if (onImageClick) {
        onImageClick(index);
      }
      if (!disableLightbox) {
        setLightboxIndex(index);
        setLightboxOpen(true);
      }
    },
    [onImageClick, disableLightbox]
  );

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  // Limit displayed images to 5, the rest will be shown in count overlay
  const displayedImages = images.slice(0, 5);
  const remainingCount = images.length > 5 ? images.length - 4 : 0;

  /**
   * Render single image layout
   */
  const renderSingleImage = () => (
    <GalleryImage
      src={images[0]}
      alt={`${altPrefix} 1`}
      onClick={() => handleImageClick(0)}
      className={cn('w-full rounded-lg', `max-h-[${maxHeight}px]`)}
    />
  );

  /**
   * Render two images side by side
   */
  const renderTwoImages = () => (
    <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
      {displayedImages.map((src, index) => (
        <GalleryImage
          key={index}
          src={src}
          alt={`${altPrefix} ${index + 1}`}
          onClick={() => handleImageClick(index)}
          className="aspect-square"
        />
      ))}
    </div>
  );

  /**
   * Render three images - 1 large on left, 2 stacked on right
   */
  const renderThreeImages = () => (
    <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
      <GalleryImage
        src={images[0]}
        alt={`${altPrefix} 1`}
        onClick={() => handleImageClick(0)}
        className="col-span-2 row-span-2 aspect-square"
      />
      <GalleryImage
        src={images[1]}
        alt={`${altPrefix} 2`}
        onClick={() => handleImageClick(1)}
        className="aspect-square"
      />
      <GalleryImage
        src={images[2]}
        alt={`${altPrefix} 3`}
        onClick={() => handleImageClick(2)}
        className="aspect-square"
      />
    </div>
  );

  /**
   * Render four images in 2x2 grid
   */
  const renderFourImages = () => (
    <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
      {displayedImages.map((src, index) => (
        <GalleryImage
          key={index}
          src={src}
          alt={`${altPrefix} ${index + 1}`}
          onClick={() => handleImageClick(index)}
          className="aspect-square"
        />
      ))}
    </div>
  );

  /**
   * Render five or more images - 2 on top, 3 on bottom with last showing count
   */
  const renderFiveOrMoreImages = () => (
    <div className="grid grid-cols-6 gap-1 rounded-lg overflow-hidden">
      {/* Top row - 2 images spanning 3 cols each */}
      <GalleryImage
        src={images[0]}
        alt={`${altPrefix} 1`}
        onClick={() => handleImageClick(0)}
        className="col-span-3 aspect-video"
      />
      <GalleryImage
        src={images[1]}
        alt={`${altPrefix} 2`}
        onClick={() => handleImageClick(1)}
        className="col-span-3 aspect-video"
      />
      {/* Bottom row - 3 images spanning 2 cols each */}
      <GalleryImage
        src={images[2]}
        alt={`${altPrefix} 3`}
        onClick={() => handleImageClick(2)}
        className="col-span-2 aspect-square"
      />
      <GalleryImage
        src={images[3]}
        alt={`${altPrefix} 4`}
        onClick={() => handleImageClick(3)}
        className="col-span-2 aspect-square"
      />
      <GalleryImage
        src={images[remainingCount > 0 ? 4 : 4]}
        alt={`${altPrefix} 5`}
        onClick={() => handleImageClick(4)}
        className="col-span-2 aspect-square"
        showOverlay={remainingCount > 0 ? remainingCount : undefined}
      />
    </div>
  );

  /**
   * Select layout based on image count
   */
  const renderGallery = () => {
    switch (images.length) {
      case 1:
        return renderSingleImage();
      case 2:
        return renderTwoImages();
      case 3:
        return renderThreeImages();
      case 4:
        return renderFourImages();
      default:
        return renderFiveOrMoreImages();
    }
  };

  return (
    <>
      <div className={cn('relative', className)}>
        {renderGallery()}
      </div>

      {/* Lightbox */}
      {!disableLightbox && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          altPrefix={altPrefix}
        />
      )}
    </>
  );
}

export default ImageGallery;
