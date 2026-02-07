/**
 * useCreatePost Hook
 * 
 * Manages post creation state including input validation,
 * image processing, and API submission.
 */

import { useState, useCallback, useRef } from 'react';
import { createPost as apiCreatePost, type Post, type ApiError } from '@/lib/api-client';
import { validateImages } from '@/lib/image-upload';
import type { PostType, PostVisibility, PostCategory } from '@/models/Post';
import { validateBase64Image, estimateBase64Size, MAX_IMAGE_SIZE_BYTES } from '@/lib/base64-image';

/**
 * Create post input interface
 */
export interface CreatePostInput {
  content: string;
  images?: File[]; // Legacy support for File-based uploads
  base64Images?: string[]; // New: Pre-converted base64 images
  postType?: PostType;
  category?: PostCategory;
  crops?: string[]; // Legacy support
  visibility?: PostVisibility;
}

/**
 * Create post state
 */
export interface CreatePostState {
  isSubmitting: boolean;
  error: string | null;
  progress: number; // 0-100 for image processing progress
  validationErrors: Record<string, string>;
}

/**
 * Create post hook return type
 */
export interface UseCreatePostReturn {
  // State
  isSubmitting: boolean;
  error: string | null;
  progress: number;
  validationErrors: Record<string, string>;
  
  // Actions
  createPost: (input: CreatePostInput) => Promise<Post | null>;
  validateInput: (input: CreatePostInput) => boolean;
  clearError: () => void;
  clearValidationErrors: () => void;
}

/**
 * Validation rules
 */
const VALIDATION_RULES = {
  content: {
    minLength: 1,
    maxLength: 2000,
  },
  images: {
    maxCount: 5,
    maxSizeMB: 5,
  },
  crops: {
    maxCount: 10,
  },
};

/**
 * Custom hook for creating posts with validation and image processing
 * 
 * Features:
 * - Content and image validation
 * - Client-side image compression and thumbnail generation
 * - Progress tracking for uploads
 * - Comprehensive error handling
 * 
 * @returns Create post state and actions
 */
export function useCreatePost(): UseCreatePostReturn {
  // State
  const [state, setState] = useState<CreatePostState>({
    isSubmitting: false,
    error: null,
    progress: 0,
    validationErrors: {},
  });

  // Ref to track if component is mounted
  const mountedRef = useRef(true);

  /**
   * Validate post input
   */
  const validateInput = useCallback((input: CreatePostInput): boolean => {
    const errors: Record<string, string> = {};

    // Validate content
    if (!input.content || input.content.trim().length === 0) {
      errors.content = 'Post content is required';
    } else if (input.content.trim().length < VALIDATION_RULES.content.minLength) {
      errors.content = `Content must be at least ${VALIDATION_RULES.content.minLength} character`;
    } else if (input.content.length > VALIDATION_RULES.content.maxLength) {
      errors.content = `Content must be less than ${VALIDATION_RULES.content.maxLength} characters`;
    }

    // Validate base64 images (preferred)
    if (input.base64Images && input.base64Images.length > 0) {
      if (input.base64Images.length > VALIDATION_RULES.images.maxCount) {
        errors.images = `Maximum ${VALIDATION_RULES.images.maxCount} images allowed`;
      } else {
        // Validate each base64 image
        for (let i = 0; i < input.base64Images.length; i++) {
          const base64 = input.base64Images[i];
          const validation = validateBase64Image(base64);
          if (!validation.valid) {
            errors.images = `Image ${i + 1}: ${validation.error}`;
            break;
          }
          // Check size
          const size = estimateBase64Size(base64);
          if (size > MAX_IMAGE_SIZE_BYTES) {
            const sizeMB = (size / (1024 * 1024)).toFixed(2);
            errors.images = `Image ${i + 1} is too large (${sizeMB}MB). Maximum is 5MB.`;
            break;
          }
        }
      }
    }
    // Legacy: Validate File-based images
    else if (input.images && input.images.length > 0) {
      if (input.images.length > VALIDATION_RULES.images.maxCount) {
        errors.images = `Maximum ${VALIDATION_RULES.images.maxCount} images allowed`;
      } else {
        const validationResults = validateImages(input.images);
        const invalidImage = validationResults.find(r => !r.isValid);
        if (invalidImage && invalidImage.error) {
          errors.images = invalidImage.error;
        }
      }
    }

    // Validate crops
    if (input.crops && input.crops.length > VALIDATION_RULES.crops.maxCount) {
      errors.crops = `Maximum ${VALIDATION_RULES.crops.maxCount} crop tags allowed`;
    }

    // Validate post type
    if (input.postType) {
      const validTypes: PostType[] = ['question', 'update', 'tip', 'problem', 'success_story'];
      if (!validTypes.includes(input.postType)) {
        errors.postType = 'Invalid post type';
      }
    }

    // Validate visibility
    if (input.visibility) {
      const validVisibilities: PostVisibility[] = ['public', 'followers', 'group'];
      if (!validVisibilities.includes(input.visibility)) {
        errors.visibility = 'Invalid visibility setting';
      }
    }

    setState(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  }, []);

  /**
   * Create a new post
   */
  const createPost = useCallback(async (input: CreatePostInput): Promise<Post | null> => {
    // Validate input
    if (!validateInput(input)) {
      return null;
    }

    setState(prev => ({
      ...prev,
      isSubmitting: true,
      error: null,
      progress: 0,
    }));

    try {
      let processedImages: string[] = [];

      // Use base64Images if provided (new method from useImageUpload hook)
      if (input.base64Images && input.base64Images.length > 0) {
        setState(prev => ({ ...prev, progress: 50 }));
        // Base64 images are already processed, use directly
        processedImages = input.base64Images;
        setState(prev => ({ ...prev, progress: 60 }));
      }
      // Legacy: Process File-based images if provided
      else if (input.images && input.images.length > 0) {
        setState(prev => ({ ...prev, progress: 10 }));

        // Convert File[] to base64 manually for legacy support
        const convertFileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };

        try {
          processedImages = await Promise.all(
            input.images.map(file => convertFileToBase64(file))
          );
        } catch {
          throw new Error('Failed to process images');
        }
        
        setState(prev => ({ ...prev, progress: 60 }));
      }

      // Prepare API payload
      const payload = {
        content: input.content.trim(),
        images: processedImages,
        postType: input.postType || 'update' as PostType,
        category: input.category || 'general' as PostCategory,
        crops: input.crops?.map(c => c.toLowerCase().trim()).filter(Boolean) || [],
        visibility: input.visibility || 'public' as PostVisibility,
      };

      setState(prev => ({ ...prev, progress: 80 }));

      // Call API
      const response = await apiCreatePost(payload);

      if (!mountedRef.current) return null;

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        progress: 100,
      }));

      return response.data;
    } catch (err) {
      if (!mountedRef.current) return null;

      const apiError = err as ApiError;
      const errorMessage = typeof apiError === 'object' && apiError.error 
        ? apiError.error 
        : (err instanceof Error ? err.message : 'Failed to create post');

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage,
        progress: 0,
      }));

      return null;
    }
  }, [validateInput]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Clear validation errors
   */
  const clearValidationErrors = useCallback((): void => {
    setState(prev => ({ ...prev, validationErrors: {} }));
  }, []);

  return {
    // State
    isSubmitting: state.isSubmitting,
    error: state.error,
    progress: state.progress,
    validationErrors: state.validationErrors,
    
    // Actions
    createPost,
    validateInput,
    clearError,
    clearValidationErrors,
  };
}

export default useCreatePost;
