/**
 * useImageUpload Hook
 * Custom React hook for managing image uploads with base64 conversion
 */

import { useState, useCallback } from 'react';
import {
  validateImageFile,
  convertFileToBase64,
  compressImage,
  getImageMeta,
  DEFAULT_COMPRESSION_QUALITY,
  MAX_IMAGE_SIZE_MB,
  ImageMeta,
} from '@/lib/base64-image';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Configuration options for the useImageUpload hook
 */
export interface UseImageUploadOptions {
  /** Maximum number of images allowed (default: 5) */
  maxImages?: number;
  /** Maximum size per image in MB (default: 5) */
  maxSizePerImageMB?: number;
  /** Compression quality from 0 to 1 (default: 0.8) */
  compressionQuality?: number;
  /** Maximum width for image compression (default: 1920) */
  maxWidth?: number;
}

/**
 * Represents a selected image with its metadata
 */
export interface SelectedImage {
  /** Unique identifier for the image */
  id: string;
  /** Original file object */
  file: File;
  /** Base64 data URL of the image */
  base64: string;
  /** Preview URL (same as base64 for display) */
  preview: string;
  /** Image metadata */
  meta: ImageMeta;
}

/**
 * Error object for image upload errors
 */
export interface ImageUploadError {
  /** Unique identifier for the error */
  id: string;
  /** Filename that caused the error */
  filename: string;
  /** Error message */
  message: string;
}

/**
 * Return type of the useImageUpload hook
 */
export interface UseImageUploadReturn {
  /** Array of selected images with their base64 data */
  selectedImages: SelectedImage[];
  /** Whether images are currently being processed */
  uploading: boolean;
  /** Array of errors that occurred during processing */
  errors: ImageUploadError[];
  /** Upload/processing progress (0-100) */
  uploadProgress: number;
  /** Function to select and process images from a FileList */
  selectImages: (files: FileList | File[]) => Promise<void>;
  /** Function to remove a single image by ID */
  removeImage: (id: string) => void;
  /** Function to clear all selected images and errors */
  clearAll: () => void;
  /** Function to get just the base64 strings for API submission */
  getBase64Images: () => string[];
  /** Function to clear all errors */
  clearErrors: () => void;
  /** Whether the maximum number of images has been reached */
  isMaxReached: boolean;
  /** Remaining number of images that can be added */
  remainingSlots: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique ID for images
 */
function generateId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for managing image uploads with base64 conversion and compression
 * @param options - Configuration options for the hook
 * @returns Object containing state and functions for managing image uploads
 */
export function useImageUpload(
  options: UseImageUploadOptions = {}
): UseImageUploadReturn {
  const {
    maxImages = 5,
    maxSizePerImageMB = MAX_IMAGE_SIZE_MB,
    compressionQuality = DEFAULT_COMPRESSION_QUALITY,
    maxWidth = 1920,
  } = options;

  // State
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errors, setErrors] = useState<ImageUploadError[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Computed values
  const isMaxReached = selectedImages.length >= maxImages;
  const remainingSlots = Math.max(0, maxImages - selectedImages.length);

  /**
   * Processes a single file: validates, converts to base64, and compresses
   */
  const processFile = useCallback(
    async (file: File): Promise<SelectedImage | ImageUploadError> => {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        return {
          id: generateId(),
          filename: file.name,
          message: validation.error || 'Invalid file',
        };
      }

      // Check custom size limit
      const maxSizeBytes = maxSizePerImageMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return {
          id: generateId(),
          filename: file.name,
          message: `File size exceeds ${maxSizePerImageMB}MB limit`,
        };
      }

      try {
        // Convert to base64
        const base64 = await convertFileToBase64(file);

        // Compress image
        const compressedBase64 = await compressImage(
          base64,
          maxWidth,
          compressionQuality
        );

        // Get metadata
        const meta = await getImageMeta(compressedBase64);

        return {
          id: generateId(),
          file,
          base64: compressedBase64,
          preview: compressedBase64,
          meta,
        };
      } catch (error) {
        return {
          id: generateId(),
          filename: file.name,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to process image',
        };
      }
    },
    [maxSizePerImageMB, maxWidth, compressionQuality]
  );

  /**
   * Selects and processes multiple images from a FileList
   */
  const selectImages = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      if (!files || files.length === 0) return;

      // Convert FileList to array
      const fileArray = Array.from(files);

      // Check remaining slots
      const currentCount = selectedImages.length;
      const availableSlots = maxImages - currentCount;

      if (availableSlots <= 0) {
        setErrors((prev) => [
          ...prev,
          {
            id: generateId(),
            filename: 'Multiple files',
            message: `Maximum ${maxImages} images allowed`,
          },
        ]);
        return;
      }

      // Limit files to available slots
      const filesToProcess = fileArray.slice(0, availableSlots);
      const skippedCount = fileArray.length - filesToProcess.length;

      if (skippedCount > 0) {
        setErrors((prev) => [
          ...prev,
          {
            id: generateId(),
            filename: `${skippedCount} file(s)`,
            message: `${skippedCount} file(s) skipped. Maximum ${maxImages} images allowed.`,
          },
        ]);
      }

      setUploading(true);
      setUploadProgress(0);

      const newImages: SelectedImage[] = [];
      const newErrors: ImageUploadError[] = [];

      // Process files sequentially to track progress
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const result = await processFile(file);

        // Update progress
        const progress = Math.round(((i + 1) / filesToProcess.length) * 100);
        setUploadProgress(progress);

        // Check if result is an error or success
        if ('filename' in result) {
          newErrors.push(result);
        } else {
          newImages.push(result);
        }
      }

      // Update state
      setSelectedImages((prev) => [...prev, ...newImages]);
      if (newErrors.length > 0) {
        setErrors((prev) => [...prev, ...newErrors]);
      }

      setUploading(false);
    },
    [selectedImages.length, maxImages, processFile]
  );

  /**
   * Removes a single image by ID
   */
  const removeImage = useCallback((id: string): void => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  /**
   * Clears all selected images and errors
   */
  const clearAll = useCallback((): void => {
    setSelectedImages([]);
    setErrors([]);
    setUploadProgress(0);
  }, []);

  /**
   * Clears all errors
   */
  const clearErrors = useCallback((): void => {
    setErrors([]);
  }, []);

  /**
   * Returns array of base64 strings for API submission
   */
  const getBase64Images = useCallback((): string[] => {
    return selectedImages.map((img) => img.base64);
  }, [selectedImages]);

  return {
    selectedImages,
    uploading,
    errors,
    uploadProgress,
    selectImages,
    removeImage,
    clearAll,
    getBase64Images,
    clearErrors,
    isMaxReached,
    remainingSlots,
  };
}

export default useImageUpload;
