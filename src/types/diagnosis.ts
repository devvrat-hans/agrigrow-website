/**
 * Diagnosis Types
 * 
 * TypeScript interfaces for AI Crop Diagnosis feature.
 * Used for diagnosing crop diseases, pests, and deficiencies.
 */

import type { GrowthStageId, AffectedPlantPartId } from '@/constants/crop-ai';

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input data for crop diagnosis
 */
export interface DiagnosisInput {
  /** Crop name/ID from the crops list */
  cropName: string;
  
  /** Crop variety (optional) */
  cropVariety?: string;
  
  /** Current growth stage of the crop */
  growthStage: GrowthStageId;
  
  /** Base64 encoded image of the affected crop */
  imageBase64: string;
  
  /** Part of the plant that is affected */
  affectedPart: AffectedPlantPartId;
}

/**
 * Form values for diagnosis wizard (before submission)
 */
export interface DiagnosisFormValues {
  /** Crop name/ID from the crops list */
  cropName: string;
  
  /** Crop variety (optional) */
  cropVariety: string;
  
  /** Current growth stage of the crop */
  growthStage: GrowthStageId | '';
  
  /** Image file selected by user */
  imageFile: File | null;
  
  /** Base64 preview of the image */
  imagePreview: string;
  
  /** Part of the plant that is affected */
  affectedPart: AffectedPlantPartId | '';
}

/**
 * Validation errors for diagnosis form
 */
export interface DiagnosisFormErrors {
  cropName?: string;
  cropVariety?: string;
  growthStage?: string;
  imageFile?: string;
  imagePreview?: string;
  affectedPart?: string;
}

// ============================================
// RESULT TYPES
// ============================================

/**
 * Individual issue/problem identified in the diagnosis
 */
export interface DiagnosisIssue {
  /** Name of the disease, pest, or deficiency */
  name: string;
  
  /** Confidence level (0-100) */
  confidence: number;
  
  /** Description of the issue */
  description: string;
  
  /** Observable symptoms */
  symptoms: string[];
  
  /** Possible causes */
  causes: string[];
  
  /** Treatment recommendations */
  treatment: string[];
  
  /** Prevention measures */
  prevention: string[];
}

/**
 * Complete diagnosis result
 */
export interface DiagnosisResult {
  /** List of possible issues identified */
  possibleIssues: DiagnosisIssue[];
  
  /** Overall health score (0-100, higher is healthier) */
  overallHealthScore: number;
  
  /** General recommendations */
  generalRecommendations: string[];
}

// ============================================
// API TYPES
// ============================================

/**
 * Request body for diagnosis API
 */
export interface DiagnosisApiRequest {
  /** Crop name/ID */
  cropName: string;
  
  /** Crop variety (optional) */
  cropVariety?: string;
  
  /** Growth stage */
  growthStage: GrowthStageId;
  
  /** Base64 encoded image */
  imageBase64: string;
  
  /** Affected plant part */
  affectedPart: AffectedPlantPartId;
}

/**
 * API response for diagnosis
 */
export interface DiagnosisApiResponse {
  /** Whether the request was successful */
  success: boolean;
  
  /** Diagnosis result data (if successful) */
  data?: DiagnosisResult;
  
  /** Error message (if failed) */
  error?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Diagnosis status for UI state management
 */
export type DiagnosisStatus = 
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'completed'
  | 'error';

/**
 * Diagnosis step in the wizard
 */
export type DiagnosisStep = 1 | 2;

/**
 * Diagnosis history item
 */
export interface DiagnosisHistoryItem {
  /** Unique ID */
  id: string;
  
  /** Crop name */
  cropName: string;
  
  /** Image thumbnail (base64) */
  imageThumbnail: string;
  
  /** Diagnosis result */
  result: DiagnosisResult;
  
  /** Timestamp of diagnosis */
  createdAt: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create initial form values
 */
export function createInitialDiagnosisFormValues(): DiagnosisFormValues {
  return {
    cropName: '',
    cropVariety: '',
    growthStage: '',
    imageFile: null,
    imagePreview: '',
    affectedPart: '',
  };
}

/**
 * Validate step 1 of diagnosis form (crop info)
 */
export function validateDiagnosisStep1(values: DiagnosisFormValues): DiagnosisFormErrors {
  const errors: DiagnosisFormErrors = {};
  
  if (!values.cropName.trim()) {
    errors.cropName = 'Please select a crop';
  }
  
  if (!values.growthStage) {
    errors.growthStage = 'Please select the growth stage';
  }
  
  return errors;
}

/**
 * Validate step 2 of diagnosis form (image upload)
 */
export function validateDiagnosisStep2(values: DiagnosisFormValues): DiagnosisFormErrors {
  const errors: DiagnosisFormErrors = {};
  
  if (!values.imageFile && !values.imagePreview) {
    errors.imageFile = 'Please upload an image of the affected crop';
  }
  
  if (!values.affectedPart) {
    errors.affectedPart = 'Please select the affected plant part';
  }
  
  return errors;
}

/**
 * Validate all diagnosis form values
 */
export function validateDiagnosisForm(values: DiagnosisFormValues): DiagnosisFormErrors {
  return {
    ...validateDiagnosisStep1(values),
    ...validateDiagnosisStep2(values),
  };
}

/**
 * Check if step has errors
 */
export function hasStepErrors(errors: DiagnosisFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Convert form values to API input
 */
export function toDiagnosisApiRequest(values: DiagnosisFormValues): DiagnosisApiRequest {
  return {
    cropName: values.cropName,
    cropVariety: values.cropVariety || undefined,
    growthStage: values.growthStage as GrowthStageId,
    imageBase64: values.imagePreview,
    affectedPart: values.affectedPart as AffectedPlantPartId,
  };
}

/**
 * Get health score color class
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get health score background color class
 */
export function getHealthScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

/**
 * Get health score label
 */
export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Minor Issues';
  if (score >= 40) return 'Moderate Issues';
  if (score >= 20) return 'Serious Issues';
  return 'Critical';
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'High';
  if (confidence >= 50) return 'Medium';
  return 'Low';
}

/**
 * Get confidence level color class
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-600 dark:text-green-400';
  if (confidence >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-600 dark:text-gray-400';
}
