'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { IconCamera, IconX, IconUpload, IconPhoto, IconCrop } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { SingleSelectGroup } from '../common';
import { AFFECTED_PLANT_PARTS } from '@/constants/crop-ai';
import { ImageEditModal } from './ImageEditModal';
import type { SelectOption } from '../common';

/**
 * Values for the ImageUploadForm
 */
export interface ImageUploadFormValues {
  imageFile: File | null;
  imagePreview: string;
  affectedPart: string;
}

/**
 * Errors for ImageUploadForm fields
 */
export interface ImageUploadFormErrors {
  imageFile?: string;
  imagePreview?: string;
  affectedPart?: string;
}

/**
 * Props for ImageUploadForm component
 */
interface ImageUploadFormProps {
  /** Current form values */
  values: ImageUploadFormValues;
  /** Callback when values change */
  onChange: (values: ImageUploadFormValues) => void;
  /** Field-specific error messages */
  errors?: ImageUploadFormErrors;
  /** Additional className */
  className?: string;
}

/**
 * ImageUploadForm Component
 * 
 * Step 2 of the diagnosis wizard.
 * Collects:
 * - Image of affected crop (drag-and-drop or file selection)
 * - Affected plant part (single select from AFFECTED_PLANT_PARTS)
 * 
 * Features:
 * - Drag and drop support
 * - Click to upload
 * - Camera capture on mobile
 * - Image preview with remove button
 * - Rotate and crop functionality
 */
export function ImageUploadForm({
  values,
  onChange,
  errors = {},
  className,
}: ImageUploadFormProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Convert AFFECTED_PLANT_PARTS to single select options
  const affectedPartOptions: SelectOption[] = AFFECTED_PLANT_PARTS.map(part => ({
    value: part.id,
    label: part.name,
    description: part.description,
  }));

  /**
   * Compress image to reduce size for API upload
   * Target: max 1MB, max 1024px on longest side
   */
  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Calculate new dimensions (max 1024px on longest side)
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression (0.8 quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Read file as data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Process file and create preview with compression
  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    try {
      // Compress image before storing
      const compressedImage = await compressImage(file);
      onChange({
        ...values,
        imageFile: file,
        imagePreview: compressedImage,
      });
    } catch (error) {
      console.error('Image compression error:', error);
      // Fallback to uncompressed if compression fails
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({
          ...values,
          imageFile: file,
          imagePreview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  }, [values, onChange, compressImage]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle edited image save from modal
  const handleEditedImageSave = useCallback((editedImageBase64: string) => {
    onChange({
      ...values,
      imagePreview: editedImageBase64,
    });
  }, [values, onChange]);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle click to open file picker
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Handle remove image
  const handleRemoveImage = () => {
    onChange({
      ...values,
      imageFile: null,
      imagePreview: '',
    });
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle affected part change
  const handleAffectedPartChange = (value: string) => {
    onChange({
      ...values,
      affectedPart: value,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Image Upload Area */}
      <div className="space-y-2">
        <label
          className={cn(
            'block text-sm font-medium',
            errors.imageFile ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {t('cropAi.diagnosis.uploadCropImage')} <span className="text-red-500">*</span>
        </label>

        {/* Hidden file input with camera capture support */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {values.imagePreview ? (
          /* Image Preview */
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <img
              src={values.imagePreview}
              alt="Uploaded crop image"
              className="w-full h-64 object-cover"
            />
            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemoveImage}
              className={cn(
                'absolute top-3 right-3',
                'flex items-center justify-center',
                'w-10 h-10 rounded-full',
                'bg-red-500 text-white',
                'shadow-lg',
                'hover:bg-red-600',
                'active:scale-95',
                'transition-all duration-200'
              )}
              aria-label="Remove image"
            >
              <IconX className="w-5 h-5" />
            </button>
            
            {/* Bottom action buttons */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {/* Edit/Crop button */}
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className={cn(
                  'flex items-center gap-2',
                  'px-3 py-2 rounded-lg',
                  'bg-white/90 dark:bg-gray-800/90',
                  'text-gray-700 dark:text-gray-200',
                  'text-sm font-medium',
                  'shadow-lg',
                  'hover:bg-white dark:hover:bg-gray-800',
                  'active:scale-95',
                  'transition-all duration-200'
                )}
                aria-label="Edit image"
              >
                <IconCrop className="w-4 h-4" />
                <span className="hidden sm:inline">{t('cropAi.diagnosis.editImage')}</span>
              </button>
              
              {/* Change image button */}
              <button
                type="button"
                onClick={handleClick}
                className={cn(
                  'flex items-center gap-2',
                  'px-3 py-2 rounded-lg',
                  'bg-white/90 dark:bg-gray-800/90',
                  'text-gray-700 dark:text-gray-200',
                  'text-sm font-medium',
                  'shadow-lg',
                  'hover:bg-white dark:hover:bg-gray-800',
                  'active:scale-95',
                  'transition-all duration-200'
                )}
                aria-label="Change image"
              >
                <IconPhoto className="w-4 h-4" />
                <span className="hidden sm:inline">{t('cropAi.diagnosis.browseFiles')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Upload Area */
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative cursor-pointer',
              'flex flex-col items-center justify-center',
              'min-h-[200px] sm:min-h-[240px]',
              'rounded-xl border-2 border-dashed',
              'transition-all duration-200',
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : errors.imageFile
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50',
              'hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'flex items-center justify-center',
                'w-16 h-16 sm:w-20 sm:h-20 mb-4',
                'rounded-full',
                'bg-gray-100 dark:bg-gray-700/50'
              )}
            >
              <IconCamera
                className={cn(
                  'w-8 h-8 sm:w-10 sm:h-10',
                  'text-gray-400 dark:text-gray-500'
                )}
              />
            </div>

            {/* Text */}
            <div className="text-center px-4">
              <p
                className={cn(
                  'text-sm sm:text-base font-medium',
                  'text-gray-700 dark:text-gray-300',
                  'mb-1'
                )}
              >
                {t('cropAi.diagnosis.tapToSelect')}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {t('cropAi.diagnosis.dragAndDrop')}
              </p>
            </div>

            {/* Upload icon badge */}
            <div
              className={cn(
                'absolute bottom-4 right-4',
                'flex items-center justify-center',
                'w-10 h-10 rounded-full',
                'bg-primary-500 text-white',
                'shadow-md'
              )}
            >
              <IconUpload className="w-5 h-5" />
            </div>
          </div>
        )}

        {errors.imageFile && (
          <p className="text-sm text-red-500 mt-1">{errors.imageFile}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('cropAi.diagnosis.clearPhoto')}
        </p>
      </div>

      {/* Affected Plant Part - Required */}
      <div className="space-y-3">
        <label
          className={cn(
            'block text-sm font-medium',
            errors.affectedPart ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {t('cropAi.diagnosis.affectedPlantPart')} <span className="text-red-500">*</span>
        </label>
        <SingleSelectGroup
          options={affectedPartOptions}
          value={values.affectedPart}
          onChange={handleAffectedPartChange}
          columns={2}
        />
        {errors.affectedPart && (
          <p className="text-sm text-red-500 mt-1">{errors.affectedPart}</p>
        )}
      </div>

      {/* Image Edit Modal */}
      {values.imagePreview && (
        <ImageEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          imageSrc={values.imagePreview}
          onSave={handleEditedImageSave}
        />
      )}
    </div>
  );
}

export type { ImageUploadFormProps };
