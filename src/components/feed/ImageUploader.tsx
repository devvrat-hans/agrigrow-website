'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  IconPhoto,
  IconX,
  IconGripVertical,
  IconCloudUpload,
  IconAlertCircle,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Maximum number of images allowed
 */
const MAX_IMAGES = 5;

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Accepted image types
 */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Image preview item with metadata
 */
interface ImagePreview {
  id: string;
  file: File;
  url: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

/**
 * Props for ImageUploader component
 */
interface ImageUploaderProps {
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

/**
 * Generate unique ID for image items
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * ImageUploader Component
 * Handles multiple image selection with preview grid, reordering, and removal
 */
export function ImageUploader({
  onImagesChange,
  maxImages = MAX_IMAGES,
  maxFileSize = MAX_FILE_SIZE,
  acceptedTypes = ACCEPTED_TYPES,
  disabled = false,
  className,
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent of image changes
  useEffect(() => {
    const files = images.map((img) => img.file);
    onImagesChange(files);
  }, [images, onImagesChange]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, []);

  /**
   * Validate and process selected files
   */
  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validImages: ImagePreview[] = [];
      const errors: string[] = [];

      // Calculate remaining slots
      const remainingSlots = maxImages - images.length;
      const filesToProcess = fileArray.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        // Validate file type
        if (!acceptedTypes.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type`);
          continue;
        }

        // Validate file size
        if (file.size > maxFileSize) {
          errors.push(
            `${file.name}: File too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`
          );
          continue;
        }

        // Create preview
        const preview: ImagePreview = {
          id: generateId(),
          file,
          url: URL.createObjectURL(file),
          uploading: false,
          progress: 0,
        };

        validImages.push(preview);
      }

      if (errors.length > 0) {
        console.warn('Image upload errors:', errors);
      }

      if (fileArray.length > remainingSlots) {
        console.warn(`Only ${remainingSlots} images can be added. Max ${maxImages} images allowed.`);
      }

      if (validImages.length > 0) {
        setImages((prev) => [...prev, ...validImages]);
      }
    },
    [images.length, maxImages, maxFileSize, acceptedTypes]
  );

  /**
   * Handle file input change
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(event.target.files);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  /**
   * Handle click on upload area
   */
  const handleUploadClick = () => {
    if (!disabled && images.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  /**
   * Handle drag and drop upload
   */
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled && images.length < maxImages) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    if (!disabled && event.dataTransfer.files && images.length < maxImages) {
      processFiles(event.dataTransfer.files);
    }
  };

  /**
   * Remove an image
   */
  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  /**
   * Handle drag start for reordering
   */
  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  /**
   * Handle drag over for reordering
   */
  const handleImageDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  /**
   * Handle drop for reordering
   */
  const handleImageDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setImages((prev) => {
        const newImages = [...prev];
        const [draggedImage] = newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, draggedImage);
        return newImages;
      });
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  /**
   * Handle drag end
   */
  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Image preview grid - 2 columns on mobile, 3 on desktop */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => handleImageDragStart(index)}
              onDragOver={(e) => handleImageDragOver(e, index)}
              onDrop={() => handleImageDrop(index)}
              onDragEnd={handleImageDragEnd}
              className={cn(
                'relative group aspect-square rounded-lg overflow-hidden',
                'border-2 border-transparent transition-all duration-200',
                draggedIndex === index && 'opacity-50 scale-95',
                dropTargetIndex === index &&
                  'border-primary-500 border-dashed bg-primary-50 dark:bg-primary-950'
              )}
            >
              {/* Image preview */}
              <img
                src={image.url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Upload progress overlay */}
              {image.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-full max-w-[80%] h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${image.progress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {image.error && (
                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-2">
                  <IconAlertCircle className="text-white" size={20} />
                </div>
              )}

              {/* Hover overlay with controls */}
              <div
                className={cn(
                  'absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100',
                  'sm:transition-opacity sm:duration-200 flex items-center justify-center gap-2',
                  // Always visible on mobile for touch access
                  'max-sm:opacity-100 max-sm:bg-transparent'
                )}
              >
                {/* Drag handle - 44px touch target */}
                <div
                  className={cn(
                    'absolute top-1 left-1 min-w-[44px] min-h-[44px] flex items-center justify-center',
                    'rounded bg-black/50 cursor-grab',
                    'text-white hover:bg-black/70',
                    // Smaller visual on mobile but full touch area
                    'sm:min-w-0 sm:min-h-0 sm:p-1'
                  )}
                  title="Drag to reorder"
                >
                  <IconGripVertical size={16} className="sm:w-[14px] sm:h-[14px]" />
                </div>

                {/* Remove button - 44px touch target */}
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  disabled={disabled}
                  className={cn(
                    'absolute top-1 right-1 min-w-[44px] min-h-[44px] flex items-center justify-center',
                    'rounded-full bg-red-500 text-white hover:bg-red-600',
                    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                    // Smaller visual on desktop
                    'sm:min-w-0 sm:min-h-0 sm:p-1',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label={`Remove image ${index + 1}`}
                >
                  <IconX size={18} className="sm:w-[14px] sm:h-[14px]" />
                </button>
              </div>

              {/* Image number badge */}
              <div
                className={cn(
                  'absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                  'bg-black/50 text-white'
                )}
              >
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area - 48px minimum touch target */}
      {canAddMore && (
        <div
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2',
            'min-h-[100px] sm:min-h-0 p-4 sm:p-6 border-2 border-dashed rounded-lg cursor-pointer',
            'transition-all duration-200',
            'border-gray-300 dark:border-gray-700',
            'hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/50',
            'active:scale-[0.98]', // Touch feedback
            isDragOver &&
              'border-primary-500 bg-primary-50 dark:bg-primary-950',
            disabled && 'opacity-50 cursor-not-allowed hover:border-gray-300'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            multiple
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
            aria-label="Upload images"
          />

          <div
            className={cn(
              'w-12 h-12 sm:w-12 sm:h-12 rounded-full flex items-center justify-center',
              'bg-gray-100 dark:bg-gray-800',
              isDragOver && 'bg-primary-100 dark:bg-primary-900'
            )}
          >
            {isDragOver ? (
              <IconCloudUpload
                size={24}
                className="text-primary-500 animate-bounce"
              />
            ) : (
              <IconPhoto size={24} className="text-gray-400" />
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isDragOver ? 'Drop images here' : 'Tap to add photos'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              PNG, JPG, GIF up to {Math.round(maxFileSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {images.length}/{maxImages} images
        </span>
        {images.length > 1 && <span>Drag images to reorder</span>}
      </div>
    </div>
  );
}

export default ImageUploader;
