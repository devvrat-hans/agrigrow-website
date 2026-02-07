'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  IconUpload, 
  IconX, 
  IconAlertCircle,
  IconPhoto 
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CropImagePreview } from './CropImagePreview';

// TYPES

export interface CropImageUploadProps {
  /** Callback when an image is selected */
  onImageSelect: (file: File | null) => void;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Currently selected image file (for controlled usage) */
  selectedImage?: File | null;
  /** Maximum file size in MB (default: 10MB) */
  maxSizeMB?: number;
}


// ACCEPTED FILE TYPES

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp';

/**
 * CropImageUpload Component
 * 
 * Drag-and-drop image upload zone for crop analysis.
 * Supports camera capture and gallery selection on mobile.
 * Validates file type and size with error feedback.
 * 
 * @example
 * <CropImageUpload 
 *   onImageSelect={(file) => setSelectedImage(file)} 
 *   disabled={isAnalyzing}
 * />
 */
export function CropImageUpload({
  onImageSelect,
  disabled = false,
  className,
  selectedImage: controlledImage,
  maxSizeMB = 10,
}: CropImageUploadProps) {
  // State
  const [_preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalImage, setInternalImage] = useState<File | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Use controlled or internal state
  const selectedImage = controlledImage !== undefined ? controlledImage : internalImage;

  // Update preview when selected image changes
  useEffect(() => {
    if (selectedImage) {
      const objectUrl = URL.createObjectURL(selectedImage);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [selectedImage]);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload an image file (JPG, PNG, or WebP)';
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  }, [maxSizeMB]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (controlledImage === undefined) {
      setInternalImage(file);
    }
    onImageSelect(file);
  }, [validateFile, onImageSelect, controlledImage]);

  // Handle file input change
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [handleFileSelect]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, handleFileSelect]);

  // Remove selected image
  const handleRemove = useCallback(() => {
    setError(null);
    if (controlledImage === undefined) {
      setInternalImage(null);
    }
    onImageSelect(null);
  }, [onImageSelect, controlledImage]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={cn('w-full', className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        aria-label="Select image"
      />

      {/* Image Preview or Drop Zone */}
      {selectedImage ? (
        <CropImagePreview
          image={selectedImage}
          onRemove={handleRemove}
          disabled={disabled}
        />
      ) : (
        <DropZone
          ref={dropZoneRef}
          isDragging={isDragging}
          disabled={disabled}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFilePicker}
        />
      )}

      {/* Error Message */}
      {error && (
        <div
          className={cn(
            'flex items-center gap-2 mt-3 p-3',
            'bg-red-50 dark:bg-red-950/30',
            'border border-red-200 dark:border-red-800',
            'rounded-lg text-sm text-red-700 dark:text-red-400'
          )}
          role="alert"
        >
          <IconAlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Size Hint */}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Supported: JPG, PNG, WebP (max {maxSizeMB}MB)
      </p>
    </div>
  );
}

// DROP ZONE SUB-COMPONENT

interface DropZoneProps {
  isDragging: boolean;
  disabled: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}

const DropZone = ({
  isDragging,
  disabled,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onClick,
  ...props
}: DropZoneProps & { ref?: React.Ref<HTMLDivElement> }) => {
  return (
    <div
      {...props}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'w-full min-h-[180px] sm:min-h-[200px]',
        'p-6 sm:p-8',
        'border-2 border-dashed rounded-xl',
        'transition-all duration-200 ease-in-out',
        'cursor-pointer',
        // Default state
        !isDragging && !disabled && [
          'border-gray-300 dark:border-gray-600',
          'bg-gray-50 dark:bg-gray-800/50',
          'hover:border-primary-400 dark:hover:border-primary-500',
          'hover:bg-primary-50 dark:hover:bg-primary-950/30',
        ],
        // Dragging state
        isDragging && [
          'border-primary-500 dark:border-primary-400',
          'bg-primary-50 dark:bg-primary-950/30',
          'scale-[1.02]',
        ],
        // Disabled state
        disabled && [
          'border-gray-200 dark:border-gray-700',
          'bg-gray-100 dark:bg-gray-800',
          'cursor-not-allowed opacity-60',
        ]
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label="Click or drag to upload crop image"
      aria-disabled={disabled}
    >
      {/* Upload Icon */}
      <div
        className={cn(
          'p-4 sm:p-5 rounded-full mb-5 sm:mb-6',
          'transition-colors duration-200',
          isDragging 
            ? 'bg-primary-100 dark:bg-primary-900/50' 
            : 'bg-gray-100 dark:bg-gray-700'
        )}
      >
        <IconUpload
          className={cn(
            'w-8 h-8 md:w-10 md:h-10',
            'transition-colors duration-200',
            isDragging
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-400 dark:text-gray-500'
          )}
        />
      </div>

      {/* Instruction Text */}
      <p
        className={cn(
          'text-base md:text-lg font-medium mb-2',
          'text-gray-700 dark:text-gray-300'
        )}
      >
        {isDragging ? 'Drop image here' : 'Upload crop image'}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">
        Drag and drop or click to browse
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 md:hidden">
        Tap to select an image
      </p>
    </div>
  );
};

// IMAGE PREVIEW SUB-COMPONENT

interface ImagePreviewSectionProps {
  preview: string;
  onRemove: () => void;
  disabled: boolean;
}

function _ImagePreviewSection({ preview, onRemove, disabled }: ImagePreviewSectionProps) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
      {/* Preview Image */}
      <Image
        src={preview}
        alt="Selected crop image preview"
        fill
        className="object-cover"
        unoptimized
      />

      {/* Overlay with Remove Button */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-t from-black/50 via-transparent to-transparent',
          'opacity-0 hover:opacity-100 transition-opacity duration-200',
          'flex items-end justify-center pb-4'
        )}
      >
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          className="shadow-lg"
        >
          <IconX className="w-4 h-4 mr-1" />
          Remove
        </Button>
      </div>

      {/* Always Visible Remove Button on Mobile */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className={cn(
          'absolute top-2 right-2 md:top-3 md:right-3',
          'p-2 rounded-full',
          'bg-black/50 hover:bg-black/70',
          'text-white',
          'transition-colors duration-200',
          'md:hidden',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="Remove selected image"
      >
        <IconX className="w-5 h-5" />
      </button>

      {/* Selected Indicator */}
      <div
        className={cn(
          'absolute bottom-2 left-2 md:bottom-3 md:left-3',
          'px-3 py-1.5 rounded-full',
          'bg-green-500/90 backdrop-blur-sm',
          'text-white text-xs font-medium',
          'flex items-center gap-1.5'
        )}
      >
        <IconPhoto className="w-3.5 h-3.5" />
        Image selected
      </div>
    </div>
  );
}

export default CropImageUpload;
