import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Overall health status of the crop
 */
export type CropHealthStatus = 'healthy' | 'moderate' | 'critical';

/**
 * Analysis processing status
 */
export type AnalysisStatus = 'processing' | 'completed' | 'failed';

/**
 * Disease severity level
 */
export type DiseaseSeverity = 'low' | 'medium' | 'high';

/**
 * Disease detection interface
 */
export interface IDisease {
  /** Disease name (common name) */
  name: string;
  /** Scientific name (optional) */
  scientificName?: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Severity level */
  severity: DiseaseSeverity;
  /** Visible symptoms */
  symptoms: string[];
  /** Treatment recommendations */
  treatment: string[];
  /** Prevention measures */
  prevention: string[];
}

/**
 * Nutrient deficiency interface
 */
export interface INutrientDeficiency {
  /** Nutrient name */
  nutrient: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Visible symptoms */
  symptoms: string[];
  /** Recommended solutions */
  solution: string[];
}

/**
 * Pest detection interface
 */
export interface IPest {
  /** Pest name */
  name: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Level of damage caused */
  damageLevel: string;
  /** Treatment recommendations */
  treatment: string[];
}

/**
 * Weather-based suggestions interface
 */
export interface IWeatherSuggestions {
  /** Current weather-based suggestions */
  current: string[];
  /** Suggestions based on upcoming weather */
  upcoming: string[];
  /** Rain preparation tips */
  rainPreparation: string[];
}

/**
 * Location data interface
 */
export interface ILocation {
  /** State */
  state: string;
  /** District */
  district: string;
  /** GPS coordinates (optional) */
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Weather forecast day interface
 */
export interface IForecastDay {
  /** Date string */
  date: string;
  /** Temperature in Celsius */
  temperature: number;
  /** Min temperature */
  minTemp: number;
  /** Max temperature */
  maxTemp: number;
  /** Humidity percentage */
  humidity: number;
  /** Weather condition */
  condition: string;
  /** Weather condition icon */
  icon?: string;
  /** Chance of rain percentage */
  chanceOfRain: number;
  /** Wind speed in km/h */
  windSpeed?: number;
}

/**
 * Weather data interface
 */
export interface IWeather {
  /** Current temperature in Celsius */
  temperature: number;
  /** Feels like temperature */
  feelsLike?: number;
  /** Humidity percentage */
  humidity: number;
  /** Weather condition (sunny, cloudy, rainy, etc.) */
  condition: string;
  /** Condition icon */
  icon?: string;
  /** Wind speed in km/h */
  windSpeed?: number;
  /** 5-day forecast */
  forecast: IForecastDay[];
}

/**
 * Image metadata interface for crop analysis images
 */
export interface ICropImageMeta {
  /** Size in bytes */
  size: number;
  /** MIME type (e.g., 'image/jpeg') */
  type: string;
  /** When the image was uploaded */
  uploadedAt: Date;
}

/**
 * CropAnalysis document interface
 */
export interface ICropAnalysis extends Document {
  /** Reference to the user who created this analysis */
  userId: Types.ObjectId;
  
  // Image Data
  /**
   * @deprecated Use imageData instead for new analyses.
   * URL of the analyzed image (legacy Cloudinary support)
   */
  imageUrl: string;
  /** Base64 data URL of the crop image (preferred for new analyses) */
  imageData?: string;
  /** Metadata for the uploaded image */
  imageMeta?: ICropImageMeta;
  /** Thumbnail URL for list display */
  imageThumbnail: string;
  /**
   * @deprecated No longer needed with base64 storage
   * Cloudinary public ID for image deletion
   */
  cloudinaryPublicId?: string;
  
  // Health Assessment
  /** Overall health status */
  overallHealth: CropHealthStatus;
  /** Health score (0-100) */
  healthScore: number;
  
  // Crop Information
  /** Detected or user-specified crop type */
  cropType: string;
  /** Growth stage (seedling, vegetative, flowering, fruiting, mature) */
  cropGrowthStage: string;
  
  // Issues Detection
  /** Array of detected diseases */
  diseases: IDisease[];
  /** Array of detected nutrient deficiencies */
  nutrientDeficiencies: INutrientDeficiency[];
  /** Array of detected pests */
  pests: IPest[];
  
  // Suggestions
  /** Weather-based farming suggestions */
  weatherSuggestions: IWeatherSuggestions;
  /** Yield improvement suggestions */
  yieldSuggestions: string[];
  
  // Location Data
  /** Analysis location */
  location?: ILocation;
  
  // Analysis Metadata
  /** Date of analysis */
  analysisDate: Date;
  /** Weather data at time of analysis */
  weather?: IWeather;
  
  // User Input
  /** User's personal notes */
  userNotes?: string;
  
  // Status
  /** Processing status */
  status: AnalysisStatus;
  /** Error message if status is 'failed' */
  errorMessage?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA DEFINITION
// ============================================

const DiseaseSchema = new Schema<IDisease>(
  {
    name: { type: String, required: true },
    scientificName: { type: String },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    symptoms: [{ type: String }],
    treatment: [{ type: String }],
    prevention: [{ type: String }],
  },
  { _id: false }
);

const NutrientDeficiencySchema = new Schema<INutrientDeficiency>(
  {
    nutrient: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    symptoms: [{ type: String }],
    solution: [{ type: String }],
  },
  { _id: false }
);

const PestSchema = new Schema<IPest>(
  {
    name: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    damageLevel: { type: String, required: true },
    treatment: [{ type: String }],
  },
  { _id: false }
);

const WeatherSuggestionsSchema = new Schema<IWeatherSuggestions>(
  {
    current: [{ type: String }],
    upcoming: [{ type: String }],
    rainPreparation: [{ type: String }],
  },
  { _id: false }
);

const LocationSchema = new Schema<ILocation>(
  {
    state: { type: String, required: true },
    district: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { _id: false }
);

const ForecastDaySchema = new Schema<IForecastDay>(
  {
    date: { type: String, required: true },
    temperature: { type: Number, required: true },
    minTemp: { type: Number },
    maxTemp: { type: Number },
    humidity: { type: Number },
    condition: { type: String, required: true },
    icon: { type: String },
    chanceOfRain: { type: Number, default: 0 },
    windSpeed: { type: Number },
  },
  { _id: false }
);

const WeatherSchema = new Schema<IWeather>(
  {
    temperature: { type: Number, required: true },
    feelsLike: { type: Number },
    humidity: { type: Number, required: true },
    condition: { type: String, required: true },
    icon: { type: String },
    windSpeed: { type: Number },
    forecast: [ForecastDaySchema],
  },
  { _id: false }
);

const CropAnalysisSchema = new Schema<ICropAnalysis>(
  {
    // User Reference
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Image Data
    /**
     * @deprecated Use imageData instead for new analyses.
     * URL of the analyzed image (legacy Cloudinary support)
     */
    imageUrl: {
      type: String,
      required: false, // Changed to optional for base64 support
    },
    /**
     * Base64 data URL of the crop image (preferred for new analyses)
     */
    imageData: {
      type: String,
    },
    /**
     * Metadata for the uploaded image
     */
    imageMeta: {
      size: { type: Number },
      type: { type: String },
      uploadedAt: { type: Date },
    },
    imageThumbnail: {
      type: String,
      required: false, // Changed to optional
    },
    /**
     * @deprecated No longer needed with base64 storage
     * Cloudinary public ID for image deletion
     */
    cloudinaryPublicId: {
      type: String,
    },

    // Health Assessment
    overallHealth: {
      type: String,
      enum: ['healthy', 'moderate', 'critical'],
      required: true,
    },
    healthScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Crop Information
    cropType: {
      type: String,
      required: true,
      index: true,
    },
    cropGrowthStage: {
      type: String,
      default: 'unknown',
    },

    // Issues Detection
    diseases: {
      type: [DiseaseSchema],
      default: [],
    },
    nutrientDeficiencies: {
      type: [NutrientDeficiencySchema],
      default: [],
    },
    pests: {
      type: [PestSchema],
      default: [],
    },

    // Suggestions
    weatherSuggestions: {
      type: WeatherSuggestionsSchema,
      default: {
        current: [],
        upcoming: [],
        rainPreparation: [],
      },
    },
    yieldSuggestions: {
      type: [String],
      default: [],
    },

    // Location Data
    location: {
      type: LocationSchema,
    },

    // Analysis Metadata
    analysisDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    weather: {
      type: WeatherSchema,
    },

    // User Input
    userNotes: {
      type: String,
      maxlength: 1000,
    },

    // Status
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
      index: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Primary index for user's analyses sorted by date
CropAnalysisSchema.index({ userId: 1, analysisDate: -1 });

// Index for filtering by crop type
CropAnalysisSchema.index({ userId: 1, cropType: 1, analysisDate: -1 });

// Index for filtering by health status
CropAnalysisSchema.index({ userId: 1, overallHealth: 1, analysisDate: -1 });

// Index for status-based queries (e.g., finding processing analyses)
CropAnalysisSchema.index({ status: 1, createdAt: 1 });

// Compound index for date range queries
CropAnalysisSchema.index({ userId: 1, analysisDate: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

/**
 * Total issues count
 */
CropAnalysisSchema.virtual('totalIssues').get(function () {
  return (
    this.diseases.length +
    this.nutrientDeficiencies.length +
    this.pests.length
  );
});

/**
 * Has critical issues
 */
CropAnalysisSchema.virtual('hasCriticalIssues').get(function () {
  return this.diseases.some((d) => d.severity === 'high');
});

/**
 * Days since analysis
 */
CropAnalysisSchema.virtual('daysSinceAnalysis').get(function () {
  const now = new Date();
  const analysisDate = new Date(this.analysisDate);
  const diffTime = Math.abs(now.getTime() - analysisDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Update user notes
 */
CropAnalysisSchema.methods.updateNotes = function (notes: string) {
  this.userNotes = notes.substring(0, 1000);
  return this.save();
};

/**
 * Mark as completed with results
 */
CropAnalysisSchema.methods.markCompleted = function (results: Partial<ICropAnalysis>) {
  this.status = 'completed';
  Object.assign(this, results);
  return this.save();
};

/**
 * Mark as failed with error
 */
CropAnalysisSchema.methods.markFailed = function (errorMessage: string) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get analyses for a user with pagination
 */
CropAnalysisSchema.statics.getForUser = function (
  userId: Types.ObjectId,
  options: {
    page?: number;
    limit?: number;
    cropType?: string;
    healthStatus?: CropHealthStatus;
    dateFrom?: Date;
    dateTo?: Date;
    status?: AnalysisStatus;
  } = {}
) {
  const {
    page = 1,
    limit = 10,
    cropType,
    healthStatus,
    dateFrom,
    dateTo,
    status = 'completed',
  } = options;

  const query: Record<string, unknown> = { userId, status };

  if (cropType) {
    query.cropType = cropType;
  }

  if (healthStatus) {
    query.overallHealth = healthStatus;
  }

  if (dateFrom || dateTo) {
    query.analysisDate = {};
    if (dateFrom) (query.analysisDate as Record<string, Date>).$gte = dateFrom;
    if (dateTo) (query.analysisDate as Record<string, Date>).$lte = dateTo;
  }

  return this.find(query)
    .sort({ analysisDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1); // Fetch one extra to check if there are more
};

/**
 * Count analyses for a user
 */
CropAnalysisSchema.statics.countForUser = function (
  userId: Types.ObjectId,
  options: {
    cropType?: string;
    healthStatus?: CropHealthStatus;
    dateFrom?: Date;
    dateTo?: Date;
    status?: AnalysisStatus;
  } = {}
) {
  const { cropType, healthStatus, dateFrom, dateTo, status = 'completed' } = options;

  const query: Record<string, unknown> = { userId, status };

  if (cropType) query.cropType = cropType;
  if (healthStatus) query.overallHealth = healthStatus;

  if (dateFrom || dateTo) {
    query.analysisDate = {};
    if (dateFrom) (query.analysisDate as Record<string, Date>).$gte = dateFrom;
    if (dateTo) (query.analysisDate as Record<string, Date>).$lte = dateTo;
  }

  return this.countDocuments(query);
};

/**
 * Get recent analyses for a user (for dashboard)
 */
CropAnalysisSchema.statics.getRecentForUser = function (
  userId: Types.ObjectId,
  limit: number = 3
) {
  return this.find({ userId, status: 'completed' })
    .sort({ analysisDate: -1 })
    .limit(limit)
    .select('imageThumbnail cropType overallHealth healthScore analysisDate');
};

/**
 * Clean up old processing analyses (stuck in processing)
 */
CropAnalysisSchema.statics.cleanupStuckAnalyses = function (olderThanMinutes: number = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return this.updateMany(
    { status: 'processing', createdAt: { $lt: cutoff } },
    { status: 'failed', errorMessage: 'Analysis timed out' }
  );
};

/**
 * Get crop type statistics for a user
 */
CropAnalysisSchema.statics.getCropStats = function (userId: Types.ObjectId) {
  return this.aggregate([
    { $match: { userId, status: 'completed' } },
    {
      $group: {
        _id: '$cropType',
        count: { $sum: 1 },
        avgHealthScore: { $avg: '$healthScore' },
        lastAnalysis: { $max: '$analysisDate' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Enable virtuals in JSON output
CropAnalysisSchema.set('toJSON', { virtuals: true });
CropAnalysisSchema.set('toObject', { virtuals: true });

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual to get the image source (prefers imageData over imageUrl for new analyses)
 */
CropAnalysisSchema.virtual('imageSource').get(function() {
  // Prefer base64 imageData if available
  if (this.imageData) {
    return this.imageData;
  }
  // Fall back to imageUrl for backward compatibility
  return this.imageUrl;
});

/**
 * Virtual to check if the image is base64 encoded
 */
CropAnalysisSchema.virtual('isImageBase64').get(function() {
  // Check if imageData is present and starts with data:image
  if (this.imageData && this.imageData.startsWith('data:image/')) {
    return true;
  }
  // Check imageMeta
  if (this.imageMeta?.type) {
    return true;
  }
  return false;
});

// ============================================
// PRE-VALIDATE HOOK
// ============================================

/**
 * Ensure either imageUrl or imageData is provided
 */
CropAnalysisSchema.pre('validate', function() {
  if (!this.imageUrl && !this.imageData) {
    throw new Error('Either imageUrl or imageData must be provided');
  }
});

// ============================================
// MODEL EXPORT
// ============================================

// Prevent model compilation error in development with hot reload
const CropAnalysis: Model<ICropAnalysis> =
  mongoose.models.CropAnalysis ||
  mongoose.model<ICropAnalysis>('CropAnalysis', CropAnalysisSchema);

export default CropAnalysis;
