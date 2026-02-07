// Crop AI TypeScript Types and Interfaces
// These types are used throughout the Crop AI feature for frontend and API communication

// HEALTH AND STATUS TYPES

// Overall health status of a crop
export type CropHealthStatus = 'healthy' | 'moderate' | 'critical';

// Analysis processing status
export type AnalysisStatus = 'processing' | 'completed' | 'failed';

// Disease severity level
export type DiseaseSeverity = 'low' | 'medium' | 'high';

// Weather condition type
export type WeatherCondition = 
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'fog'
  | 'haze'
  | 'dust'
  | 'smoke';

// DISEASE DETECTION

// Disease detection result from AI analysis
export interface DiseaseDetection {
  name: string;
  scientificName?: string;
  confidence: number;
  severity: DiseaseSeverity;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
}

// NUTRIENT DEFICIENCY

// Nutrient deficiency detection result
export interface NutrientDeficiency {
  nutrient: string;
  confidence: number;
  symptoms: string[];
  solution: string[];
  fertilizer?: string[];
}

// PEST DETECTION

// Pest detection result
export interface PestDetection {
  name: string;
  scientificName?: string;
  confidence: number;
  damageLevel: DiseaseSeverity;
  treatment: string[];
  prevention?: string[];
}

// WEATHER DATA

// Weather forecast day
export interface ForecastDay {
  date: string;
  temperature: {
    min: number;
    max: number;
    day: number;
    night?: number;
  };
  humidity: number;
  condition: WeatherCondition | string;
  description: string;
  icon: string;
  precipitation: number;
  precipitationProbability: number;
  windSpeed?: number;
}

// Current weather data
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure?: number;
  windSpeed: number;
  windDirection?: number;
  visibility?: number;
  condition: WeatherCondition | string;
  description: string;
  icon: string;
  cloudCover?: number;
  uvIndex?: number;
  timestamp: string;
}

// Complete weather data structure
export interface WeatherData {
  location: {
    name: string;
    state?: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: CurrentWeather;
  forecast: ForecastDay[];
  alerts?: WeatherAlert[];
}

// Weather alert
export interface WeatherAlert {
  type: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  title: string;
  description: string;
  start: string;
  end: string;
}

// Weather suggestion for farming
export interface WeatherSuggestion {
  type: 'rain' | 'heat' | 'cold' | 'humidity' | 'wind' | 'general';
  urgency: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actions: string[];
}

// Weather suggestions grouped
export interface WeatherSuggestionsGrouped {
  current: string[];
  upcoming: string[];
  rainPreparation: string[];
}

// LOCATION DATA

// Location input from user
export interface LocationInput {
  state: string;
  district?: string;
}

// Location with coordinates
export interface Location {
  state: string;
  district: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Coordinates input
export interface Coordinates {
  lat: number;
  lon: number;
}

// CROP ANALYSIS RESULT

// Crop identification from AI
export interface CropIdentification {
  name: string;
  scientificName?: string;
  confidence: number;
  growthStage?: string;
  estimatedAge?: string;
}

// Health assessment from AI
export interface HealthAssessment {
  status: CropHealthStatus;
  healthScore: number;
  overallSummary: string;
  criticalIssues: string[];
}

// Recommendations from AI
export interface Recommendations {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  weatherBased?: string[];
}

// Yield prediction
export interface YieldPrediction {
  status: string;
  suggestions: string[];
}

// Complete crop analysis result (from database)
export interface CropAnalysisResult {
  id: string;
  userId: string;
  
  // Image data
  imageUrl: string;
  imageThumbnail: string;
  
  // Health assessment
  overallHealth: CropHealthStatus;
  healthScore: number;
  
  // Crop information
  cropType: string;
  cropGrowthStage: string;
  
  // Issues detection
  diseases: DiseaseDetection[];
  nutrientDeficiencies: NutrientDeficiency[];
  pests: PestDetection[];
  
  // Suggestions
  weatherSuggestions: WeatherSuggestionsGrouped;
  yieldSuggestions: string[];
  
  // Location
  location?: Location;
  
  // Analysis metadata
  analysisDate: string;
  weather?: WeatherData;
  
  // User input
  userNotes?: string;
  
  // Status
  status: AnalysisStatus;
  errorMessage?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// HISTORY AND LIST DISPLAY

// Simplified analysis item for list display
export interface AnalysisHistoryItem {
  id: string;
  imageUrl: string;
  imageThumbnail: string;
  cropType: string;
  overallHealth: CropHealthStatus;
  healthScore: number;
  analysisDate: string;
  status: AnalysisStatus;
  diseaseCount: number;
  deficiencyCount: number;
  pestCount: number;
}

// Analysis history list response
export interface AnalysisHistoryResponse {
  analyses: AnalysisHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}

// FILTERS

// Filters for analysis history
export interface AnalysisFilters {
  cropType?: string;
  healthStatus?: CropHealthStatus;
  status?: AnalysisStatus;
  dateFrom?: string;
  dateTo?: string;
}

// Sort options
export type AnalysisSortBy = 'analysisDate' | 'healthScore' | 'cropType';
export type SortOrder = 'asc' | 'desc';

// API REQUEST TYPES

// Analyze request (for API)
export interface AnalyzeRequest {
  image: File | Blob;
  cropType?: string;
  location?: LocationInput;
  includeWeather?: boolean;
}

// Analyze request form data
export interface AnalyzeFormData {
  image: File;
  cropType?: string;
  state?: string;
  district?: string;
  includeWeather?: boolean;
}

// Create analysis input (backend)
export interface CreateAnalysisInput {
  userId: string;
  imageBase64: string;
  imageMimeType: string;
  cropType?: string;
  location?: LocationInput;
  includeWeather?: boolean;
}

// API RESPONSE TYPES

// Analyze response (from API)
export interface AnalyzeResponse {
  success: boolean;
  data?: CropAnalysisResult;
  error?: string;
  message?: string;
}

// Single analysis response
export interface GetAnalysisResponse {
  success: boolean;
  data?: CropAnalysisResult;
  error?: string;
}

// History response
export interface GetHistoryResponse {
  success: boolean;
  data?: AnalysisHistoryResponse;
  error?: string;
}

// Delete response
export interface DeleteAnalysisResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// CHAT TYPES

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Chat request
export interface ChatRequest {
  message: string;
  analysisId?: string;
  conversationHistory?: ChatMessage[];
}

// Chat response
export interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// CROP RECOMMENDATION

// Crop recommendation
export interface CropRecommendation {
  name: string;
  suitability: number;
  reasons: string[];
  season?: string;
  waterRequirement?: string;
  marketDemand?: string;
}

// Crop recommendations response
export interface CropRecommendationsResponse {
  success: boolean;
  recommendations?: CropRecommendation[];
  generalTips?: string[];
  error?: string;
}

// UI STATE TYPES

// Upload state
export interface UploadState {
  selectedImage: File | null;
  imagePreview: string | null;
  cropType: string;
  location: LocationInput | null;
  includeWeather: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

// Analysis state
export interface AnalysisState {
  currentAnalysis: CropAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  stage: 'idle' | 'uploading' | 'analyzing' | 'processing' | 'completed' | 'failed';
}

// History state
export interface HistoryState {
  analyses: AnalysisHistoryItem[];
  isLoading: boolean;
  error: string | null;
  filters: AnalysisFilters;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}

// Chat state
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  analysisContext: CropAnalysisResult | null;
}

// CONSTANTS

// Common Indian crops
export const INDIAN_CROPS = {
  cereals: ['Rice', 'Wheat', 'Maize', 'Sorghum', 'Pearl Millet', 'Finger Millet', 'Barley'],
  cashCrops: ['Cotton', 'Sugarcane', 'Jute', 'Tea', 'Coffee', 'Tobacco', 'Rubber'],
  vegetables: ['Tomato', 'Onion', 'Potato', 'Brinjal', 'Chilli', 'Cauliflower', 'Cabbage', 'Okra', 'Carrot', 'Spinach', 'Bitter Gourd', 'Bottle Gourd'],
  pulses: ['Chickpea', 'Pigeon Pea', 'Black Gram', 'Green Gram', 'Lentil', 'Kidney Bean'],
  oilseeds: ['Groundnut', 'Soybean', 'Mustard', 'Sunflower', 'Sesame', 'Safflower'],
  fruits: ['Mango', 'Banana', 'Grapes', 'Papaya', 'Pomegranate', 'Orange', 'Guava', 'Apple'],
  spices: ['Turmeric', 'Ginger', 'Garlic', 'Coriander', 'Cumin', 'Cardamom', 'Black Pepper'],
} as const;

// All crops flat list
export const ALL_CROPS = [
  ...INDIAN_CROPS.cereals,
  ...INDIAN_CROPS.cashCrops,
  ...INDIAN_CROPS.vegetables,
  ...INDIAN_CROPS.pulses,
  ...INDIAN_CROPS.oilseeds,
  ...INDIAN_CROPS.fruits,
  ...INDIAN_CROPS.spices,
];

// Growth stages
export const GROWTH_STAGES = [
  'Seedling',
  'Vegetative',
  'Flowering',
  'Fruiting',
  'Mature',
  'Harvesting',
] as const;

export type GrowthStage = typeof GROWTH_STAGES[number];

// Health status colors
export const HEALTH_STATUS_COLORS: Record<CropHealthStatus, { bg: string; text: string; border: string }> = {
  healthy: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500' },
};

// Severity colors
export const SEVERITY_COLORS: Record<DiseaseSeverity, { bg: string; text: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high: { bg: 'bg-red-100', text: 'text-red-700' },
};

// Type guards

export function isCropHealthStatus(value: string): value is CropHealthStatus {
  return ['healthy', 'moderate', 'critical'].includes(value);
}

export function isAnalysisStatus(value: string): value is AnalysisStatus {
  return ['processing', 'completed', 'failed'].includes(value);
}

export function isDiseaseSeverity(value: string): value is DiseaseSeverity {
  return ['low', 'medium', 'high'].includes(value);
}

// Utility types

// Make certain properties optional for partial updates
export type PartialAnalysis = Partial<Omit<CropAnalysisResult, 'id' | 'userId' | 'createdAt'>>;

// Pick only display fields for list
export type AnalysisListItem = Pick<
  CropAnalysisResult,
  'id' | 'imageUrl' | 'imageThumbnail' | 'cropType' | 'overallHealth' | 'healthScore' | 'analysisDate' | 'status'
>;
