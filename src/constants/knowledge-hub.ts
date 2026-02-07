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
  /** Optional YouTube video URL for tutorials */
  videoUrl?: string;
}

/**
 * All crops data with video URLs for featured crops
 * Featured crops (with videos) are listed first
 */
export const cropsData: CropData[] = [
  // Featured crops with videos
  { id: 'rice', name: 'Rice', icon: '🌾', videoUrl: 'https://youtu.be/rg1P41tSD9k' },
  { id: 'wheat', name: 'Wheat', icon: '🌾', videoUrl: 'https://youtu.be/0j__2-X7puw' },
  { id: 'groundnut', name: 'Groundnut', icon: '🥜', videoUrl: 'https://youtu.be/x6lB2LBteZw' },
  { id: 'bajra', name: 'Bajra', icon: '🌾', videoUrl: 'https://youtu.be/EQmH4B43Itw' },
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
 * Get featured crops (crops with videos)
 * 
 * @returns Array of crops that have video tutorials
 */
export function getFeaturedCrops(): CropData[] {
  return cropsData.filter(crop => crop.videoUrl !== undefined);
}

/**
 * Get other crops (crops without videos)
 * 
 * @returns Array of crops without video tutorials
 */
export function getOtherCrops(): CropData[] {
  return cropsData.filter(crop => crop.videoUrl === undefined);
}

/**
 * Search crops by name
 * 
 * @param query - Search query
 * @returns Filtered crops matching the query
 */
export function searchCrops(query: string): CropData[] {
  if (!query.trim()) return cropsData;
  
  const lowerQuery = query.toLowerCase().trim();
  return cropsData.filter(crop => 
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
