import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Plan status
 */
export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived';

/**
 * Market demand level
 */
export type MarketDemandLevel = 'high' | 'medium' | 'low';

/**
 * Investment level
 */
export type InvestmentLevel = 'low' | 'medium' | 'high';

/**
 * Crop category
 */
export type CropCategory = 
  | 'cereal' 
  | 'pulse' 
  | 'oilseed' 
  | 'vegetable' 
  | 'fruit' 
  | 'cash-crop' 
  | 'fodder'
  | 'other';

/**
 * Crop recommendation interface
 */
export interface ICropRecommendation {
  /** Crop name */
  name: string;
  /** Local/regional name */
  localName?: string;
  /** Crop category */
  category?: CropCategory;
  /** Suitability score (0-100) */
  suitabilityScore: number;
  /** Reasons for recommendation */
  reasons: string[];
  /** Expected yield */
  expectedYield: string;
  /** Market demand level */
  marketDemand: MarketDemandLevel;
  /** Water requirement description */
  waterRequirement: string;
  /** Investment level */
  investmentLevel: InvestmentLevel;
  /** Timeline/duration */
  timeline: string;
  /** Practical tips */
  tips: string[];
  /** Whether this crop was selected by user */
  isSelected?: boolean;
}

/**
 * Location information for the plan
 */
export interface IPlanLocation {
  /** State code */
  stateCode: string;
  /** State name */
  stateName: string;
  /** District name */
  district: string;
  /** Village (optional) */
  village?: string;
  /** GPS coordinates (optional) */
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Land information
 */
export interface ILandInfo {
  /** Land size */
  size: number;
  /** Unit (acre, hectare, bigha, etc.) */
  unit: string;
  /** Soil type */
  soilType: string;
  /** Irrigation availability */
  irrigationAvailability: string;
  /** Irrigation method (optional) */
  irrigationMethod?: string;
}

/**
 * Season information
 */
export interface ISeasonInfo {
  /** Season ID (kharif, rabi, zaid) */
  seasonId: string;
  /** Season name */
  seasonName: string;
  /** Planned sowing month */
  sowingMonth: string;
  /** Year */
  year: number;
}

/**
 * Weather data at time of planning
 */
export interface IPlanWeather {
  /** Temperature at time of planning (°C) */
  temperature?: number;
  /** Humidity (%) */
  humidity?: number;
  /** Weather condition */
  condition?: string;
  /** Whether forecast was included */
  forecastIncluded: boolean;
}

/**
 * Analysis sections from AI
 */
export interface IPlanAnalysis {
  /** Soil analysis summary */
  soilAnalysis: string;
  /** Weather considerations */
  weatherConsiderations: string;
  /** General tips */
  generalTips: string[];
}

/**
 * CropPlan document interface
 */
export interface ICropPlan extends Document {
  /** Reference to the user who created this plan */
  userId: Types.ObjectId;
  
  /** Plan title (auto-generated or user-defined) */
  title: string;
  
  /** Location information */
  location: IPlanLocation;
  
  /** Land information */
  land: ILandInfo;
  
  /** Season information */
  season: ISeasonInfo;
  
  /** Recommended crops from AI */
  recommendedCrops: ICropRecommendation[];
  
  /** AI-generated analysis */
  analysis: IPlanAnalysis;
  
  /** Weather data at time of planning */
  weather?: IPlanWeather;
  
  /** Plan status */
  status: PlanStatus;
  
  /** User notes */
  userNotes?: string;
  
  /** When the plan was created */
  planDate: Date;
  
  /** Processing time in milliseconds */
  processingTime?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const CropRecommendationSchema = new Schema<ICropRecommendation>(
  {
    name: { type: String, required: true },
    localName: { type: String },
    category: {
      type: String,
      enum: ['cereal', 'pulse', 'oilseed', 'vegetable', 'fruit', 'cash-crop', 'fodder', 'other'],
    },
    suitabilityScore: { type: Number, required: true, min: 0, max: 100 },
    reasons: [{ type: String }],
    expectedYield: { type: String },
    marketDemand: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    waterRequirement: { type: String },
    investmentLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    timeline: { type: String },
    tips: [{ type: String }],
    isSelected: { type: Boolean, default: false },
  },
  { _id: false }
);

const PlanLocationSchema = new Schema<IPlanLocation>(
  {
    stateCode: { type: String, required: true },
    stateName: { type: String, required: true },
    district: { type: String, required: true },
    village: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { _id: false }
);

const LandInfoSchema = new Schema<ILandInfo>(
  {
    size: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    soilType: { type: String, required: true },
    irrigationAvailability: { type: String, required: true },
    irrigationMethod: { type: String },
  },
  { _id: false }
);

const SeasonInfoSchema = new Schema<ISeasonInfo>(
  {
    seasonId: { type: String, required: true },
    seasonName: { type: String, required: true },
    sowingMonth: { type: String, required: true },
    year: { type: Number, required: true },
  },
  { _id: false }
);

const PlanWeatherSchema = new Schema<IPlanWeather>(
  {
    temperature: { type: Number },
    humidity: { type: Number },
    condition: { type: String },
    forecastIncluded: { type: Boolean, default: false },
  },
  { _id: false }
);

const PlanAnalysisSchema = new Schema<IPlanAnalysis>(
  {
    soilAnalysis: { type: String, default: '' },
    weatherConsiderations: { type: String, default: '' },
    generalTips: [{ type: String }],
  },
  { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const CropPlanSchema = new Schema<ICropPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Plan title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    location: {
      type: PlanLocationSchema,
      required: [true, 'Location is required'],
    },
    land: {
      type: LandInfoSchema,
      required: [true, 'Land information is required'],
    },
    season: {
      type: SeasonInfoSchema,
      required: [true, 'Season information is required'],
    },
    recommendedCrops: [CropRecommendationSchema],
    analysis: {
      type: PlanAnalysisSchema,
      default: () => ({
        soilAnalysis: '',
        weatherConsiderations: '',
        generalTips: [],
      }),
    },
    weather: PlanWeatherSchema,
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'active',
    },
    userNotes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    planDate: {
      type: Date,
      default: Date.now,
    },
    processingTime: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// User's plans sorted by date
CropPlanSchema.index({ userId: 1, planDate: -1 });

// Find plans by season
CropPlanSchema.index({ userId: 1, 'season.seasonId': 1, 'season.year': 1 });

// Find plans by status
CropPlanSchema.index({ userId: 1, status: 1, planDate: -1 });

// Find plans by location
CropPlanSchema.index({ userId: 1, 'location.stateCode': 1, 'location.district': 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual populate for user details
 */
CropPlanSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get the top N recommended crops by suitability score
 */
CropPlanSchema.methods.getTopCrops = function (count: number = 3): ICropRecommendation[] {
  return this.recommendedCrops
    .sort((a: ICropRecommendation, b: ICropRecommendation) => b.suitabilityScore - a.suitabilityScore)
    .slice(0, count);
};

/**
 * Mark a crop as selected
 */
CropPlanSchema.methods.selectCrop = function (cropName: string): void {
  const crop = this.recommendedCrops.find(
    (c: ICropRecommendation) => c.name.toLowerCase() === cropName.toLowerCase()
  );
  if (crop) {
    crop.isSelected = true;
    this.status = 'active';
  }
};

/**
 * Archive the plan
 */
CropPlanSchema.methods.archive = function (): void {
  this.status = 'archived';
};

// ============================================
// STATIC METHODS
// ============================================

interface CropPlanModel extends Model<ICropPlan> {
  findByUser(userId: Types.ObjectId | string, options?: { status?: PlanStatus; limit?: number }): Promise<ICropPlan[]>;
  findActivePlans(userId: Types.ObjectId | string): Promise<ICropPlan[]>;
  getRecentPlans(userId: Types.ObjectId | string, days?: number): Promise<ICropPlan[]>;
}

/**
 * Find plans by user with optional filters
 */
CropPlanSchema.statics.findByUser = async function (
  userId: Types.ObjectId | string,
  options: { status?: PlanStatus; limit?: number } = {}
): Promise<ICropPlan[]> {
  const query: Record<string, unknown> = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  let queryBuilder = this.find(query).sort({ planDate: -1 });
  
  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }
  
  return queryBuilder.exec();
};

/**
 * Find all active plans for a user
 */
CropPlanSchema.statics.findActivePlans = async function (
  userId: Types.ObjectId | string
): Promise<ICropPlan[]> {
  return this.find({ userId, status: 'active' })
    .sort({ planDate: -1 })
    .exec();
};

/**
 * Get recent plans from last N days
 */
CropPlanSchema.statics.getRecentPlans = async function (
  userId: Types.ObjectId | string,
  days: number = 30
): Promise<ICropPlan[]> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return this.find({
    userId,
    planDate: { $gte: dateThreshold },
  })
    .sort({ planDate: -1 })
    .exec();
};

// ============================================
// MODEL EXPORT
// ============================================

const CropPlan = (mongoose.models.CropPlan as CropPlanModel) || 
  mongoose.model<ICropPlan, CropPlanModel>('CropPlan', CropPlanSchema);

export default CropPlan;
