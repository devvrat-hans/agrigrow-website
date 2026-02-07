/**
 * Knowledge Hub Constants
 * 
 * Contains crop data, YouTube video URLs, and helper functions
 * for the Knowledge Hub page.
 */

/**
 * Crop data interface
 */
export interface CropData {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Emoji icon */
  icon: string;
  /** YouTube video URL for Hindi tutorials */
  videoUrlHi?: string;
  /** YouTube video URL for English tutorials */
  videoUrlEn?: string;
  /** Resolved video URL based on user language (set at runtime) */
  videoUrl?: string;
}

/**
 * All crops data with video URLs for featured crops
 * Featured crops (with videos) are listed first
 */
export const cropsData: CropData[] = [
  // Featured crops with videos
  {
    id: 'rice',
    name: 'Rice',
    icon: '🌾',
    videoUrlHi: 'https://youtu.be/rg1P41tSD9k',
    videoUrlEn: 'https://youtu.be/GzU204loUt0',
  },
  {
    id: 'wheat',
    name: 'Wheat',
    icon: '🌾',
    videoUrlHi: 'https://youtu.be/0j__2-X7puw',
    videoUrlEn: 'https://youtu.be/ys85szkTeJ41',
  },
  {
    id: 'groundnut',
    name: 'Groundnut',
    icon: '🥜',
    videoUrlHi: 'https://youtu.be/x6lB2LBteZw',
    videoUrlEn: 'https://youtu.be/RYwo2dHmI-A',
  },
  {
    id: 'jowar',
    name: 'Jowar',
    icon: '🌾',
    videoUrlHi: 'https://youtu.be/EQmH4B43Itw',
    videoUrlEn: 'https://youtu.be/lxPFGJVwH0s',
  },
  // Other crops (coming soon)
  { id: 'cotton', name: 'Cotton', icon: '🧵' },
  { id: 'sugarcane', name: 'Sugarcane', icon: '🎋' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬' },
  { id: 'fruits', name: 'Fruits', icon: '🍎' },
  { id: 'pulses', name: 'Pulses', icon: '🫘' },
  { id: 'oilseeds', name: 'Oilseeds', icon: '🌻' },
  { id: 'spices', name: 'Spices', icon: '🌶️' },
  { id: 'millets', name: 'Millets', icon: '🌾' },
  { id: 'maize', name: 'Maize', icon: '🌽' },
  { id: 'soybean', name: 'Soybean', icon: '🫛' },
  { id: 'potato', name: 'Potato', icon: '🥔' },
  { id: 'onion', name: 'Onion', icon: '🧅' },
];

/**
 * Extract YouTube video ID from various URL formats
 * 
 * Supported formats:
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * 
 * @param url - YouTube URL
 * @returns Video ID or null if invalid
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Handle youtu.be short URLs
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortUrlMatch) {
    return shortUrlMatch[1];
  }

  // Handle standard youtube.com URLs
  const standardUrlMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (standardUrlMatch) {
    return standardUrlMatch[1];
  }

  // Handle embed URLs
  const embedUrlMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedUrlMatch) {
    return embedUrlMatch[1];
  }

  return null;
}

/**
 * Get YouTube embed URL from video URL
 * 
 * @param url - YouTube video URL
 * @param autoplay - Whether to autoplay the video (default: true)
 * @returns Embed URL or null if invalid
 */
export function getYouTubeEmbedUrl(url: string, autoplay: boolean = true): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0', // Don't show related videos
    modestbranding: '1', // Minimal branding
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Resolve video URLs based on user language.
 * English users get English videos, all others get Hindi videos.
 * Falls back to whichever language is available.
 *
 * @param language - User's preferred language code (e.g., 'en', 'hi')
 * @returns Crops array with resolved videoUrl field
 */
export function getLocalizedCrops(language: string = 'en'): CropData[] {
  return cropsData.map(crop => {
    let videoUrl: string | undefined;
    if (language === 'en') {
      videoUrl = crop.videoUrlEn || crop.videoUrlHi;
    } else {
      videoUrl = crop.videoUrlHi || crop.videoUrlEn;
    }
    return { ...crop, videoUrl };
  });
}

/**
 * Get featured crops (crops with videos) for a given language
 * 
 * @param language - User's preferred language code
 * @returns Array of crops that have video tutorials in the user's language
 */
export function getFeaturedCrops(language: string = 'en'): CropData[] {
  return getLocalizedCrops(language).filter(crop => crop.videoUrl !== undefined);
}

/**
 * Get other crops (crops without videos) for a given language
 * 
 * @param language - User's preferred language code
 * @returns Array of crops without video tutorials
 */
export function getOtherCrops(language: string = 'en'): CropData[] {
  return getLocalizedCrops(language).filter(crop => crop.videoUrl === undefined);
}

/**
 * Search crops by name with language-resolved video URLs
 * 
 * @param query - Search query
 * @param language - User's preferred language code
 * @returns Filtered crops matching the query
 */
export function searchCrops(query: string, language: string = 'en'): CropData[] {
  const localized = getLocalizedCrops(language);
  if (!query.trim()) return localized;
  
  const lowerQuery = query.toLowerCase().trim();
  return localized.filter(crop => 
    crop.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get crop by ID
 * 
 * @param id - Crop ID
 * @returns Crop data or undefined if not found
 */
export function getCropById(id: string): CropData | undefined {
  return cropsData.find(crop => crop.id === id);
}
