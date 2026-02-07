/**
 * Image Upload Utility for Agrigrow Posts
 * 
 * Handles client-side image validation, compression, and thumbnail generation.
 * 
 * TODO: In production, migrate from base64 storage in MongoDB to cloud storage
 * like Cloudinary or AWS S3 for better performance and scalability.
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed MIME types for image uploads
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

/**
 * Maximum width for compressed images
 */
const MAX_IMAGE_WIDTH = 1200;

/**
 * Thumbnail width
 */
const THUMBNAIL_WIDTH = 300;

/**
 * Compression quality (0-1)
 */
const COMPRESSION_QUALITY = 0.8;

/**
 * Thumbnail quality (slightly lower for smaller files)
 */
const THUMBNAIL_QUALITY = 0.7;

/**
 * Maximum number of images per post
 */
const MAX_IMAGES_PER_POST = 5;

// ============================================
// INTERFACES
// ============================================

/**
 * Result of image validation
 */
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  file?: File;
}

/**
 * Processed image with original and thumbnail versions
 */
export interface ProcessedImage {
  original: string; // Base64 encoded original (compressed)
  thumbnail: string; // Base64 encoded thumbnail
  originalSize: number; // Original file size in bytes
  compressedSize: number; // Compressed size in bytes
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
}

/**
 * Result of processing multiple images
 */
export interface ProcessImagesResult {
  success: boolean;
  images: ProcessedImage[];
  errors: string[];
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate a single image file
 * Checks file type (jpeg, png, webp, heic) and size (under 5MB)
 * 
 * @param file - The File object to validate
 * @returns Validation result with error message if invalid
 */
export function validateImage(file: File): ImageValidationResult {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of 5MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not supported. Allowed types: JPEG, PNG, WebP, HEIC`,
    };
  }

  // Check file extension as additional validation
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `File extension is not supported. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return {
    isValid: true,
    file,
  };
}

/**
 * Validate multiple images
 * 
 * @param files - Array of File objects to validate
 * @returns Array of validation results
 */
export function validateImages(files: File[]): ImageValidationResult[] {
  if (files.length > MAX_IMAGES_PER_POST) {
    return [{
      isValid: false,
      error: `Maximum ${MAX_IMAGES_PER_POST} images allowed per post. You selected ${files.length}.`,
    }];
  }

  return files.map(file => validateImage(file));
}

// ============================================
// IMAGE PROCESSING FUNCTIONS
// ============================================

/**
 * Load an image file and return an HTMLImageElement
 * 
 * @param file - The File object to load
 * @returns Promise resolving to HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url); // Clean up
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Resize and compress an image using browser canvas API
 * 
 * @param img - HTMLImageElement to process
 * @param maxWidth - Maximum width for the output
 * @param quality - Compression quality (0-1)
 * @param mimeType - Output MIME type
 * @returns Base64 encoded string and dimensions
 */
function resizeAndCompress(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number,
  mimeType: string = 'image/jpeg'
): { base64: string; width: number; height: number } {
  // Calculate new dimensions maintaining aspect ratio
  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Get context and set quality options
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to base64
  // Use JPEG for photos (better compression), PNG for transparency
  const outputMimeType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  const base64 = canvas.toDataURL(outputMimeType, quality);

  return { base64, width, height };
}

/**
 * Compress an image on the client side
 * Resizes to max 1200px width while maintaining aspect ratio
 * Compresses to 80% quality
 * 
 * @param file - The File object to compress
 * @returns Promise resolving to base64 encoded string
 */
export async function compressImageOnClient(file: File): Promise<{
  base64: string;
  width: number;
  height: number;
  compressedSize: number;
}> {
  // Handle HEIC/HEIF format - these need special handling
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    // For HEIC, we'll try to load it directly
    // Modern browsers may support it, or it will fail gracefully
    // In production, consider using a HEIC conversion library like heic2any
    console.warn('HEIC format detected. Browser support may vary.');
  }

  const img = await loadImage(file);
  
  const result = resizeAndCompress(
    img,
    MAX_IMAGE_WIDTH,
    COMPRESSION_QUALITY,
    file.type
  );

  // Calculate compressed size (base64 is ~33% larger than binary)
  const compressedSize = Math.round((result.base64.length * 3) / 4);

  return {
    ...result,
    compressedSize,
  };
}

/**
 * Generate a thumbnail version of an image
 * Creates a 300px wide version
 * 
 * @param file - The File object to create thumbnail from
 * @returns Promise resolving to base64 encoded thumbnail string
 */
export async function generateThumbnail(file: File): Promise<string> {
  const img = await loadImage(file);
  
  const { base64 } = resizeAndCompress(
    img,
    THUMBNAIL_WIDTH,
    THUMBNAIL_QUALITY,
    'image/jpeg' // Always use JPEG for thumbnails
  );

  return base64;
}

/**
 * Process a single image: validate, compress, and generate thumbnail
 * 
 * @param file - The File object to process
 * @returns Promise resolving to ProcessedImage or error
 */
async function processSingleImage(file: File): Promise<ProcessedImage> {
  // Validate
  const validation = validateImage(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Compress original
  const compressed = await compressImageOnClient(file);

  // Generate thumbnail
  const thumbnail = await generateThumbnail(file);

  return {
    original: compressed.base64,
    thumbnail,
    originalSize: file.size,
    compressedSize: compressed.compressedSize,
    width: compressed.width,
    height: compressed.height,
    mimeType: file.type,
    fileName: file.name,
  };
}

/**
 * Process multiple images for a post
 * Validates each image, compresses them, and generates thumbnails
 * 
 * @param files - Array of File objects to process
 * @returns Promise resolving to ProcessImagesResult with processed images and any errors
 */
export async function processPostImages(files: File[]): Promise<ProcessImagesResult> {
  const result: ProcessImagesResult = {
    success: true,
    images: [],
    errors: [],
  };

  // Check maximum images limit
  if (files.length > MAX_IMAGES_PER_POST) {
    result.success = false;
    result.errors.push(
      `Maximum ${MAX_IMAGES_PER_POST} images allowed. You selected ${files.length}.`
    );
    return result;
  }

  // Process each image
  const processingPromises = files.map(async (file, index) => {
    try {
      const processed = await processSingleImage(file);
      return { index, processed, error: null };
    } catch (error) {
      return {
        index,
        processed: null,
        error: `Image ${index + 1} (${file.name}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  });

  const results = await Promise.all(processingPromises);

  // Separate successful and failed processing
  for (const res of results) {
    if (res.processed) {
      result.images.push(res.processed);
    } else if (res.error) {
      result.errors.push(res.error);
    }
  }

  // Mark as failed if any errors occurred
  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert base64 string to Blob
 * Useful for uploading to cloud storage later
 * 
 * @param base64 - Base64 encoded string (with or without data URL prefix)
 * @returns Blob object
 */
export function base64ToBlob(base64: string): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const mimeType = base64.includes('data:') 
    ? base64.split(';')[0].split(':')[1] 
    : 'image/jpeg';

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Calculate the size of a base64 string in bytes
 * 
 * @param base64 - Base64 encoded string
 * @returns Size in bytes
 */
export function getBase64Size(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  // Base64 encodes 3 bytes in 4 characters
  return Math.round((base64Data.length * 3) / 4);
}

/**
 * Format file size for display
 * 
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Check if a string is a valid base64 image
 * 
 * @param str - String to check
 * @returns Boolean indicating if valid base64 image
 */
export function isValidBase64Image(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  
  // Check for data URL format
  const dataUrlPattern = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/;
  if (!dataUrlPattern.test(str)) return false;
  
  // Check if base64 content is valid
  try {
    const base64Data = str.split(',')[1];
    atob(base64Data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract image dimensions from a base64 string
 * 
 * @param base64 - Base64 encoded image string
 * @returns Promise resolving to { width, height }
 */
export function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = base64;
  });
}

// ============================================
// CONSTANTS EXPORT (for testing and configuration)
// ============================================

export const IMAGE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_IMAGE_WIDTH,
  THUMBNAIL_WIDTH,
  COMPRESSION_QUALITY,
  THUMBNAIL_QUALITY,
  MAX_IMAGES_PER_POST,
};
