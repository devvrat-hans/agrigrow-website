/**
 * Planning Types
 * 
 * TypeScript interfaces for Crop Planning feature.
 * Used for getting AI-powered crop recommendations based on location, soil, and conditions.
 */

import type {
  SeasonId,
  SoilTypeId,
  IrrigationAvailabilityId,
  IrrigationMethodId,
  LandUnitId,
} from '@/constants/crop-ai';

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input data for crop planning
 */
export interface PlanningInput {
  /** State code */
  state: string;
  
  /** District name */
  district: string;
  
  /** Village name (optional) */
  village?: string;
  
  /** Land size */
  landSize: number;
  
  /** Land measurement unit */
  landUnit: LandUnitId;
  
  /** Cropping season */
  season: SeasonId;
  
  /** Planned sowing month (1-12) */
  sowingMonth: string;
  
  /** Soil type */
  soilType: SoilTypeId;
  
  /** Irrigation water availability */
  irrigationAvailability: IrrigationAvailabilityId;
  
  /** Irrigation method (if not rainfed) */
  irrigationMethod: IrrigationMethodId | '';
}

/**
 * Form values for planning wizard (before submission)
 */
export interface PlanningFormValues {
  /** State code */
  state: string;
  
  /** District name */
  district: string;
  
  /** Village name (optional) */
  village: string;
  
  /** Land size as string for input handling */
  landSize: string;
  
  /** Land measurement unit */
  landUnit: LandUnitId | '';
  
  /** Cropping season */
  season: SeasonId | '';
  
  /** Planned sowing month (1-12) */
  sowingMonth: string;
  
  /** Soil type */
  soilType: SoilTypeId | '';
  
  /** Irrigation water availability */
  irrigationAvailability: IrrigationAvailabilityId | '';
  
  /** Irrigation method */
  irrigationMethod: IrrigationMethodId | '';
}

/**
 * Validation errors for planning form
 */
export interface PlanningFormErrors {
  state?: string;
  district?: string;
  village?: string;
  landSize?: string;
  landUnit?: string;
  season?: string;
  sowingMonth?: string;
  soilType?: string;
  irrigationAvailability?: string;
  irrigationMethod?: string;
}

// ============================================
// RESULT TYPES
// ============================================

/**
 * Market demand level
 */
export type MarketDemand = 'high' | 'medium' | 'low';

/**
 * Investment level required
 */
export type InvestmentLevel = 'low' | 'medium' | 'high';

/**
 * Individual crop recommendation
 */
export interface CropRecommendation {
  /** Crop name */
  name: string;
  
  /** Suitability score (0-100) */
  suitabilityScore: number;
  
  /** Reasons why this crop is suitable */
  reasons: string[];
  
  /** Expected yield per acre/hectare */
  expectedYield: string;
  
  /** Current market demand */
  marketDemand: MarketDemand;
  
  /** Water requirement description */
  waterRequirement: string;
  
  /** Investment level required */
  investmentLevel: InvestmentLevel;
  
  /** Growing timeline */
  timeline: string;
  
  /** Specific tips for this crop */
  tips: string[];
}

/**
 * Complete planning result
 */
export interface PlanningResult {
  /** List of recommended crops */
  recommendedCrops: CropRecommendation[];
  
  /** Soil analysis and recommendations */
  soilAnalysis: string;
  
  /** Weather and climate considerations */
  weatherConsiderations: string;
  
  /** General farming tips */
  generalTips: string[];
}

// ============================================
// API TYPES
// ============================================

/**
 * Request body for planning API
 */
export interface PlanningApiRequest {
  /** State code */
  state: string;
  
  /** District name */
  district: string;
  
  /** Village name (optional) */
  village?: string;
  
  /** Land size */
  landSize: number;
  
  /** Land measurement unit */
  landUnit: LandUnitId;
  
  /** Cropping season */
  season: SeasonId;
  
  /** Planned sowing month */
  sowingMonth: string;
  
  /** Soil type */
  soilType: SoilTypeId;
  
  /** Irrigation availability */
  irrigationAvailability: IrrigationAvailabilityId;
  
  /** Irrigation method (optional, not needed for rainfed) */
  irrigationMethod?: IrrigationMethodId;
}

/**
 * API response for planning
 */
export interface PlanningApiResponse {
  /** Whether the request was successful */
  success: boolean;
  
  /** Planning result data (if successful) */
  data?: PlanningResult;
  
  /** Error message (if failed) */
  error?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Planning status for UI state management
 */
export type PlanningStatus = 
  | 'idle'
  | 'processing'
  | 'completed'
  | 'error';

/**
 * Planning step in the wizard (3 steps)
 */
export type PlanningStep = 1 | 2 | 3;

/**
 * Planning history item
 */
export interface PlanningHistoryItem {
  /** Unique ID */
  id: string;
  
  /** Input data used */
  input: PlanningInput;
  
  /** Planning result */
  result: PlanningResult;
  
  /** Timestamp of planning */
  createdAt: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create initial form values
 */
export function createInitialPlanningFormValues(): PlanningFormValues {
  return {
    state: '',
    district: '',
    village: '',
    landSize: '',
    landUnit: '',
    season: '',
    sowingMonth: '',
    soilType: '',
    irrigationAvailability: '',
    irrigationMethod: '',
  };
}

/**
 * Validate step 1 of planning form (location & land)
 */
export function validatePlanningStep1(values: PlanningFormValues): PlanningFormErrors {
  const errors: PlanningFormErrors = {};
  
  if (!values.state) {
    errors.state = 'Please select a state';
  }
  
  if (!values.district) {
    errors.district = 'Please select a district';
  }
  
  if (!values.landSize || parseFloat(values.landSize) <= 0) {
    errors.landSize = 'Please enter a valid land size';
  }
  
  if (!values.landUnit) {
    errors.landUnit = 'Please select a land unit';
  }
  
  return errors;
}

/**
 * Validate step 2 of planning form (season & soil)
 */
export function validatePlanningStep2(values: PlanningFormValues): PlanningFormErrors {
  const errors: PlanningFormErrors = {};
  
  if (!values.season) {
    errors.season = 'Please select a season';
  }
  
  if (!values.sowingMonth) {
    errors.sowingMonth = 'Please select the sowing month';
  }
  
  if (!values.soilType) {
    errors.soilType = 'Please select your soil type';
  }
  
  return errors;
}

/**
 * Validate step 3 of planning form (water availability)
 */
export function validatePlanningStep3(values: PlanningFormValues): PlanningFormErrors {
  const errors: PlanningFormErrors = {};
  
  if (!values.irrigationAvailability) {
    errors.irrigationAvailability = 'Please select irrigation availability';
  }
  
  // Only require irrigation method if not rainfed
  if (values.irrigationAvailability && values.irrigationAvailability !== 'rainfed' && !values.irrigationMethod) {
    errors.irrigationMethod = 'Please select an irrigation method';
  }
  
  return errors;
}

/**
 * Validate all planning form values
 */
export function validatePlanningForm(values: PlanningFormValues): PlanningFormErrors {
  return {
    ...validatePlanningStep1(values),
    ...validatePlanningStep2(values),
    ...validatePlanningStep3(values),
  };
}

/**
 * Check if step has errors
 */
export function hasPlanningStepErrors(errors: PlanningFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Convert form values to API input
 */
export function toPlanningApiRequest(values: PlanningFormValues): PlanningApiRequest {
  const request: PlanningApiRequest = {
    state: values.state,
    district: values.district,
    village: values.village || undefined,
    landSize: parseFloat(values.landSize),
    landUnit: values.landUnit as LandUnitId,
    season: values.season as SeasonId,
    sowingMonth: values.sowingMonth,
    soilType: values.soilType as SoilTypeId,
    irrigationAvailability: values.irrigationAvailability as IrrigationAvailabilityId,
  };
  
  // Only include irrigation method if not rainfed
  if (values.irrigationAvailability !== 'rainfed' && values.irrigationMethod) {
    request.irrigationMethod = values.irrigationMethod as IrrigationMethodId;
  }
  
  return request;
}

/**
 * Get suitability score color class
 */
export function getSuitabilityScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
}

/**
 * Get suitability score background color class
 */
export function getSuitabilityScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-emerald-100 dark:bg-emerald-900/30';
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-orange-100 dark:bg-orange-900/30';
}

/**
 * Get suitability label
 */
export function getSuitabilityLabel(score: number): string {
  if (score >= 80) return 'Highly Suitable';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Moderate';
  return 'Consider Alternatives';
}

/**
 * Get market demand badge color
 */
export function getMarketDemandColor(demand: MarketDemand): string {
  switch (demand) {
    case 'high':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

/**
 * Get market demand label
 */
export function getMarketDemandLabel(demand: MarketDemand): string {
  switch (demand) {
    case 'high':
      return 'High Demand';
    case 'medium':
      return 'Moderate Demand';
    case 'low':
      return 'Low Demand';
    default:
      return 'Unknown';
  }
}

/**
 * Get investment level badge color
 */
export function getInvestmentLevelColor(level: InvestmentLevel): string {
  switch (level) {
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

/**
 * Get investment level label
 */
export function getInvestmentLevelLabel(level: InvestmentLevel): string {
  switch (level) {
    case 'low':
      return 'Low Investment';
    case 'medium':
      return 'Medium Investment';
    case 'high':
      return 'High Investment';
    default:
      return 'Unknown';
  }
}

/**
 * Format land size with unit
 */
export function formatLandSize(size: number, unit: LandUnitId): string {
  return `${size.toLocaleString()} ${unit === 'acres' ? 'Acres' : 'Hectares'}`;
}
