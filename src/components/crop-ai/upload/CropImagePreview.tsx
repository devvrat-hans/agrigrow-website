'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconX, IconPhoto } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface CropImagePreviewProps {
  /** Image file to preview */
  image: File | null;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Whether the remove button is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * CropImagePreview Component
 *
 * Displays a preview of the selected crop image with a remove button.
 * Mobile-responsive with touch-friendly remove button.
 *
 * @example
 * <CropImagePreview
 *   image={selectedFile}
 *   onRemove={() => setSelectedFile(null)}
 *   disabled={isAnalyzing}
 * />
 */
export function CropImagePreview({
  image,
  onRemove,
  disabled = false,
  className,
}: CropImagePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);

  // Create object URL for preview
  useEffect(() => {
    if (image) {
      const objectUrl = URL.createObjectURL(image);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [image]);

  // Don't render if no image
  if (!image || !preview) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative w-full aspect-video rounded-xl overflow-hidden',
        'border-2 border-primary-200 dark:border-primary-800',
        'bg-gray-100 dark:bg-gray-800',
        className
      )}
    >
      {/* Image */}
      <Image
        src={preview}
        alt="Selected crop image"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />

      {/* Remove Button - Always visible on mobile, hover on desktop */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        className={cn(
          'absolute top-2 right-2 sm:top-3 sm:right-3',
          'min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px]',
          'flex items-center justify-center',
          'rounded-full',
          'bg-black/50 hover:bg-black/70',
          'text-white',
          'transition-colors duration-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="Remove selected image"
      >
        <IconX className="w-5 h-5 sm:w-4 sm:h-4" />
      </button>

      {/* Selected Indicator */}
      <div
        className={cn(
          'absolute bottom-2 left-2 sm:bottom-3 sm:left-3',
          'px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full',
          'bg-green-500/90 backdrop-blur-sm',
          'text-white text-xs font-medium',
          'flex items-center gap-1.5'
        )}
      >
        <IconPhoto className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Image selected</span>
        <span className="sm:hidden">Selected</span>
      </div>
    </div>
  );
}
