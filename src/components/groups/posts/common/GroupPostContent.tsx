'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * GroupPostContent component props
 */
interface GroupPostContentProps {
  /** Post text content */
  content: string;
  /** Array of image URLs */
  images?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single image display component
 */
function SingleImage({ src, alt }: { src: string; alt?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button 
          className={cn(
            'relative w-full aspect-video rounded-lg overflow-hidden',
            'cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
          )}
        >
          <Image
            src={src}
            alt={alt || 'Post image'}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 640px) 100vw, 640px"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
        <div className="relative w-full max-h-[90vh] aspect-auto">
          <Image
            src={src}
            alt={alt || 'Post image (enlarged)'}
            width={1200}
            height={800}
            className="w-full h-auto object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Image grid for multiple images
 */
function ImageGrid({ images }: { images: string[] }) {
  // Limit to 4 images for grid display
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  return (
    <div className="grid grid-cols-2 gap-1 sm:gap-2 rounded-lg overflow-hidden">
      {displayImages.map((src, index) => (
        <Dialog key={index}>
          <DialogTrigger asChild>
            <button
              className={cn(
                'relative aspect-square overflow-hidden',
                'cursor-pointer',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                // Make first image span full width if only 3 images
                displayImages.length === 3 && index === 0 && 'col-span-2 aspect-video'
              )}
            >
              <Image
                src={src}
                alt={`Post image ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 640px) 50vw, 320px"
              />
              {/* Remaining count overlay on last image */}
              {index === 3 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-lg sm:text-xl font-semibold">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
            <div className="relative w-full max-h-[90vh] aspect-auto">
              <Image
                src={src}
                alt={`Post image ${index + 1} (enlarged)`}
                width={1200}
                height={800}
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}

/**
 * GroupPostContent component
 * 
 * Displays post text content and images with responsive layout.
 * Single image shows full width, multiple images in 2-column grid.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostContent({
  content,
  images,
  className,
}: GroupPostContentProps) {
  const hasImages = images && images.length > 0;

  return (
    <div className={cn('space-y-2 sm:space-y-3', className)}>
      {/* Text content */}
      {content && (
        <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
          {content}
        </p>
      )}

      {/* Images */}
      {hasImages && (
        <div className="mt-2 sm:mt-3">
          {images.length === 1 ? (
            <SingleImage src={images[0]} />
          ) : (
            <ImageGrid images={images} />
          )}
        </div>
      )}
    </div>
  );
}

export default GroupPostContent;
