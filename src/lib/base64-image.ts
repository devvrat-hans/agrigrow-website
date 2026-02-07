/**
 * Base64 Image Utilities
 * Handles base64 image operations including validation, conversion, and compression
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Result of image validation
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Metadata about an image
 */
export interface ImageMeta {
  size: number;
  type: string;
  width?: number;
  height?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum allowed image size in megabytes
 */
export const MAX_IMAGE_SIZE_MB = 5;

/**
 * Maximum allowed image size in bytes
 */
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Type for allowed image MIME types
 */
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Default compression quality (0-1 range)
 */
export const DEFAULT_COMPRESSION_QUALITY = 0.8;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates an image file for type and size
 * @param file - The File object to validate
 * @returns ImageValidationResult with valid status and optional error message
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check if file type is allowed
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${MAX_IMAGE_SIZE_MB}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Validates a base64 string to check if it's a valid image
 * @param base64 - The base64 string to validate
 * @returns ImageValidationResult with valid status and optional error message
 */
export function validateBase64Image(base64: string): ImageValidationResult {
  // Check if it's a valid data URL format
  if (!base64.startsWith('data:image/')) {
    return {
      valid: false,
      error: 'Invalid base64 image format. Must start with "data:image/"',
    };
  }

  // Extract MIME type
  const mimeMatch = base64.match(/^data:(image\/[a-z+]+);base64,/i);
  if (!mimeMatch) {
    return {
      valid: false,
      error: 'Invalid base64 image format. Could not extract MIME type',
    };
  }

  const mimeType = mimeMatch[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType)) {
    return {
      valid: false,
      error: `Invalid image type: ${mimeType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Estimate and check size
  const estimatedSize = estimateBase64Size(base64);
  if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (estimatedSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Image size (${sizeMB}MB) exceeds maximum allowed size (${MAX_IMAGE_SIZE_MB}MB)`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts a File object to a base64 string
 * @param file - The File object to convert
 * @returns Promise resolving to the base64 data URL string
 */
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Gets the full data URL from a base64 string and MIME type
 * @param base64 - The raw base64 string (without data URL prefix)
 * @param mimeType - The MIME type of the image (e.g., 'image/jpeg')
 * @returns The complete data URL string
 */
export function getImageDataUrl(base64: string, mimeType: string): string {
  // If already a data URL, return as is
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Extracts the raw base64 string from a data URL
 * @param dataUrl - The complete data URL string
 * @returns The raw base64 string without the data URL prefix
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  const base64Index = dataUrl.indexOf('base64,');
  if (base64Index === -1) {
    // Not a data URL, return as is
    return dataUrl;
  }
  return dataUrl.substring(base64Index + 7);
}

/**
 * Extracts the MIME type from a data URL
 * @param dataUrl - The complete data URL string
 * @returns The MIME type or null if not found
 */
export function extractMimeTypeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,/i);
  return match ? match[1].toLowerCase() : null;
}

// ============================================================================
// Size Estimation Functions
// ============================================================================

/**
 * Estimates the size in bytes of a base64 string
 * @param base64 - The base64 string (with or without data URL prefix)
 * @returns The estimated size in bytes
 */
export function estimateBase64Size(base64: string): number {
  // Extract just the base64 part if it's a data URL
  const base64String = extractBase64FromDataUrl(base64);
  
  // Remove padding characters
  const padding = (base64String.match(/=/g) || []).length;
  
  // Base64 encoding produces 4 characters for every 3 bytes
  // Each character represents 6 bits, so 4 characters = 24 bits = 3 bytes
  return Math.floor((base64String.length * 3) / 4) - padding;
}

// ============================================================================
// Compression Functions
// ============================================================================

/**
 * Compresses an image using the canvas API
 * Note: This function only works in browser environments
 * @param base64 - The base64 data URL of the image to compress
 * @param maxWidth - Maximum width of the output image (default: 1920)
 * @param quality - Compression quality from 0 to 1 (default: 0.8)
 * @returns Promise resolving to the compressed base64 data URL
 */
export async function compressImage(
  base64: string,
  maxWidth: number = 1920,
  quality: number = DEFAULT_COMPRESSION_QUALITY
): Promise<string> {
  // Ensure quality is within valid range
  const clampedQuality = Math.max(0, Math.min(1, quality));
  
  return new Promise((resolve, reject) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // In server environment, return original
      resolve(base64);
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Determine output format
        // Use JPEG for photos (better compression), PNG for transparency
        const mimeType = extractMimeTypeFromDataUrl(base64);
        const outputFormat = mimeType === 'image/png' || mimeType === 'image/gif' 
          ? 'image/png' 
          : 'image/jpeg';
        
        // Convert to base64
        const compressedBase64 = canvas.toDataURL(outputFormat, clampedQuality);
        resolve(compressedBase64);
      } catch (error) {
        reject(new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = base64;
  });
}

/**
 * Gets the dimensions of an image from its base64 data URL
 * Note: This function only works in browser environments
 * @param base64 - The base64 data URL of the image
 * @returns Promise resolving to an object with width and height
 */
export async function getImageDimensions(
  base64: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      reject(new Error('Image dimensions can only be retrieved in browser environment'));
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = base64;
  });
}

/**
 * Gets complete metadata for an image from its base64 data URL
 * Note: This function only works fully in browser environments
 * @param base64 - The base64 data URL of the image
 * @returns Promise resolving to ImageMeta object
 */
export async function getImageMeta(base64: string): Promise<ImageMeta> {
  const size = estimateBase64Size(base64);
  const type = extractMimeTypeFromDataUrl(base64) || 'image/unknown';
  
  try {
    // Try to get dimensions (only works in browser)
    const dimensions = await getImageDimensions(base64);
    return {
      size,
      type,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch {
    // In server environment or on error, return without dimensions
    return { size, type };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a string is a base64 data URL
 * @param str - The string to check
 * @returns True if the string is a base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/') && str.includes(';base64,');
}

/**
 * Checks if a string is a URL (http/https)
 * @param str - The string to check
 * @returns True if the string is an HTTP(S) URL
 */
export function isImageUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

/**
 * Determines the image source type
 * @param source - The image source string
 * @returns 'base64' | 'url' | 'unknown'
 */
export function getImageSourceType(source: string): 'base64' | 'url' | 'unknown' {
  if (isBase64DataUrl(source)) {
    return 'base64';
  }
  if (isImageUrl(source)) {
    return 'url';
  }
  return 'unknown';
}

/**
 * Formats file size to human readable string
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
