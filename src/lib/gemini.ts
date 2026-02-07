// Gemini AI Client Configuration for Crop Analysis
// This module provides the Gemini AI client for analyzing crop images
// and generating agricultural insights for Indian farmers.

import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';

// TYPE DEFINITIONS

// Crop health status enum
export type CropHealthStatus = 'healthy' | 'moderate' | 'critical';

// Disease severity level
export type DiseaseSeverity = 'low' | 'medium' | 'high';

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

// Nutrient deficiency detection result
export interface NutrientDeficiency {
  nutrient: string;
  confidence: number;
  symptoms: string[];
  solution: string[];
  fertilizer: string[];
}

// Pest detection result
export interface PestDetection {
  name: string;
  scientificName?: string;
  confidence: number;
  damageLevel: DiseaseSeverity;
  treatment: string[];
  prevention: string[];
}

// Weather data for context-aware analysis
export interface WeatherContext {
  temperature?: number;
  humidity?: number;
  condition?: string;
  rainfall?: number;
  forecast?: string[];
}

// Structured response from Gemini crop analysis
export interface GeminiCropAnalysisResult {
  cropIdentification: {
    name: string;
    scientificName?: string;
    confidence: number;
    growthStage?: string;
    estimatedAge?: string;
  };
  healthAssessment: {
    status: CropHealthStatus;
    healthScore: number;
    overallSummary: string;
    criticalIssues: string[];
  };
  diseases: DiseaseDetection[];
  nutrientDeficiencies: NutrientDeficiency[];
  pests: PestDetection[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    weatherBased?: string[];
  };
  yieldPrediction?: {
    status: string;
    suggestions: string[];
  };
}

// Error response from Gemini
export interface GeminiError {
  code: string;
  message: string;
  retryable: boolean;
}

// GEMINI CLIENT INITIALIZATION

// Initialize the Google Generative AI client
const getGeminiClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable.'
    );
  }
  
  return new GoogleGenerativeAI(apiKey);
};

// Get the Gemini vision model for crop analysis
export const getVisionModel = (): GenerativeModel => {
  const client = getGeminiClient();
  
  return client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    },
  });
};

// Get the Gemini text model for chat/recommendations
export const getTextModel = (): GenerativeModel => {
  const client = getGeminiClient();
  
  return client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });
};

// PROMPT TEMPLATES

// Build the crop analysis prompt for Gemini
const buildCropAnalysisPrompt = (
  cropType?: string,
  location?: { state?: string; district?: string },
  weather?: WeatherContext
): string => {
  let contextInfo = '';
  
  if (cropType) {
    contextInfo += `\nCrop Type (farmer provided): ${cropType}`;
  }
  
  if (location?.state || location?.district) {
    contextInfo += `\nLocation: ${[location.district, location.state].filter(Boolean).join(', ')}, India`;
  }
  
  if (weather) {
    const weatherParts = [];
    if (weather.temperature !== undefined) {
      weatherParts.push(`Temperature: ${weather.temperature}°C`);
    }
    if (weather.humidity !== undefined) {
      weatherParts.push(`Humidity: ${weather.humidity}%`);
    }
    if (weather.condition) {
      weatherParts.push(`Condition: ${weather.condition}`);
    }
    if (weather.rainfall !== undefined) {
      weatherParts.push(`Recent rainfall: ${weather.rainfall}mm`);
    }
    if (weatherParts.length > 0) {
      contextInfo += `\nCurrent Weather: ${weatherParts.join(', ')}`;
    }
  }

  return `You are an expert agricultural AI assistant specializing in Indian farming practices and crop diseases. Analyze the provided crop image and generate a comprehensive agricultural assessment.

${contextInfo ? `CONTEXT INFORMATION:${contextInfo}\n` : ''}

ANALYSIS REQUIREMENTS:
1. Identify the crop type and growth stage
2. Assess overall crop health (healthy, moderate, or critical)
3. Detect any diseases present with confidence levels
4. Identify nutrient deficiencies based on visual symptoms
5. Detect any pest damage or presence
6. Provide actionable recommendations suitable for Indian farmers
7. Consider local farming practices and available resources
8. Factor in the weather conditions if provided

RESPONSE FORMAT:
Return ONLY a valid JSON object with the following structure (no markdown, no code blocks, just the JSON):

{
  "cropIdentification": {
    "name": "crop common name in English",
    "scientificName": "scientific name if known",
    "confidence": 0.0 to 1.0,
    "growthStage": "seedling/vegetative/flowering/fruiting/mature",
    "estimatedAge": "approximate age in days/weeks"
  },
  "healthAssessment": {
    "status": "healthy" | "moderate" | "critical",
    "healthScore": 0 to 100,
    "overallSummary": "2-3 sentence summary in simple language",
    "criticalIssues": ["list of urgent issues if any"]
  },
  "diseases": [
    {
      "name": "disease common name",
      "scientificName": "scientific name",
      "confidence": 0.0 to 1.0,
      "severity": "low" | "medium" | "high",
      "symptoms": ["visible symptoms"],
      "treatment": ["treatment steps in simple terms"],
      "prevention": ["prevention measures"]
    }
  ],
  "nutrientDeficiencies": [
    {
      "nutrient": "nutrient name (N, P, K, Fe, etc.)",
      "confidence": 0.0 to 1.0,
      "symptoms": ["visible deficiency symptoms"],
      "solution": ["how to address this"],
      "fertilizer": ["recommended fertilizers available in India"]
    }
  ],
  "pests": [
    {
      "name": "pest common name",
      "scientificName": "scientific name if known",
      "confidence": 0.0 to 1.0,
      "damageLevel": "low" | "medium" | "high",
      "treatment": ["pest control methods"],
      "prevention": ["prevention strategies"]
    }
  ],
  "recommendations": {
    "immediate": ["urgent actions needed within 24-48 hours"],
    "shortTerm": ["actions for next 1-2 weeks"],
    "longTerm": ["practices for better crop management"],
    "weatherBased": ["recommendations based on weather conditions"]
  },
  "yieldPrediction": {
    "status": "good/average/at-risk",
    "suggestions": ["tips to improve yield"]
  }
}

IMPORTANT GUIDELINES:
- Use simple, farmer-friendly language
- Recommend treatments/products commonly available in Indian markets
- Mention local names where applicable
- If image is unclear or not a crop, indicate low confidence
- Always provide actionable next steps
- Consider small and marginal farmer constraints`;
};

// MAIN ANALYSIS FUNCTION

// Analyze a crop image using Gemini AI
export async function analyzeCropImage(
  imageBase64: string,
  options?: {
    cropType?: string;
    location?: { state?: string; district?: string };
    weather?: WeatherContext;
    mimeType?: string;
  }
): Promise<GeminiCropAnalysisResult> {
  const model = getVisionModel();
  const prompt = buildCropAnalysisPrompt(
    options?.cropType,
    options?.location,
    options?.weather
  );

  // Prepare the image part for Gemini
  const imagePart: Part = {
    inlineData: {
      data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      mimeType: options?.mimeType || 'image/jpeg',
    },
  };

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean the response - remove any markdown code blocks if present
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse the JSON response
    let analysisResult: GeminiCropAnalysisResult;
    
    try {
      analysisResult = JSON.parse(cleanedText);
    } catch {
      console.error('Failed to parse Gemini response:', cleanedText);
      throw new Error('Failed to parse AI analysis response. Please try again.');
    }

    // Validate and sanitize the response
    return validateAndSanitizeResponse(analysisResult);
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('SAFETY')) {
        throw new Error(
          'The image could not be analyzed due to content safety filters. Please try with a clearer crop image.'
        );
      }
      if (error.message.includes('RATE_LIMIT') || error.message.includes('429')) {
        throw new Error(
          'Service is temporarily busy. Please wait a moment and try again.'
        );
      }
      if (error.message.includes('API_KEY')) {
        throw new Error(
          'AI service configuration error. Please contact support.'
        );
      }
      throw error;
    }
    
    throw new Error('An unexpected error occurred during analysis. Please try again.');
  }
}

// RESPONSE VALIDATION

// Validate and sanitize the Gemini response to ensure data consistency
function validateAndSanitizeResponse(
  response: Partial<GeminiCropAnalysisResult>
): GeminiCropAnalysisResult {
  // Ensure crop identification exists with defaults
  const cropIdentification = {
    name: response.cropIdentification?.name || 'Unknown Crop',
    scientificName: response.cropIdentification?.scientificName,
    confidence: clampNumber(response.cropIdentification?.confidence, 0, 1, 0.5),
    growthStage: response.cropIdentification?.growthStage,
    estimatedAge: response.cropIdentification?.estimatedAge,
  };

  // Ensure health assessment exists with defaults
  const healthAssessment = {
    status: validateHealthStatus(response.healthAssessment?.status),
    healthScore: clampNumber(response.healthAssessment?.healthScore, 0, 100, 50),
    overallSummary: response.healthAssessment?.overallSummary || 
      'Analysis complete. Please review the detailed findings below.',
    criticalIssues: Array.isArray(response.healthAssessment?.criticalIssues)
      ? response.healthAssessment.criticalIssues
      : [],
  };

  // Validate diseases array
  const diseases = Array.isArray(response.diseases)
    ? response.diseases.map(validateDisease).filter(Boolean) as DiseaseDetection[]
    : [];

  // Validate nutrient deficiencies array
  const nutrientDeficiencies = Array.isArray(response.nutrientDeficiencies)
    ? response.nutrientDeficiencies.map(validateNutrientDeficiency).filter(Boolean) as NutrientDeficiency[]
    : [];

  // Validate pests array
  const pests = Array.isArray(response.pests)
    ? response.pests.map(validatePest).filter(Boolean) as PestDetection[]
    : [];

  // Ensure recommendations exist with defaults
  const recommendations = {
    immediate: ensureStringArray(response.recommendations?.immediate),
    shortTerm: ensureStringArray(response.recommendations?.shortTerm),
    longTerm: ensureStringArray(response.recommendations?.longTerm),
    weatherBased: response.recommendations?.weatherBased 
      ? ensureStringArray(response.recommendations.weatherBased)
      : undefined,
  };

  // Yield prediction with defaults
  const yieldPrediction = response.yieldPrediction
    ? {
        status: response.yieldPrediction.status || 'unknown',
        suggestions: ensureStringArray(response.yieldPrediction.suggestions),
      }
    : undefined;

  return {
    cropIdentification,
    healthAssessment,
    diseases,
    nutrientDeficiencies,
    pests,
    recommendations,
    yieldPrediction,
  };
}

// Validate health status enum
function validateHealthStatus(status?: string): CropHealthStatus {
  const validStatuses: CropHealthStatus[] = ['healthy', 'moderate', 'critical'];
  if (status && validStatuses.includes(status as CropHealthStatus)) {
    return status as CropHealthStatus;
  }
  return 'moderate';
}

// Validate and sanitize a disease detection object
function validateDisease(disease: Partial<DiseaseDetection>): DiseaseDetection | null {
  if (!disease || !disease.name) return null;
  
  const validSeverities: DiseaseSeverity[] = ['low', 'medium', 'high'];
  
  return {
    name: disease.name,
    scientificName: disease.scientificName,
    confidence: clampNumber(disease.confidence, 0, 1, 0.5),
    severity: validSeverities.includes(disease.severity as DiseaseSeverity)
      ? disease.severity as DiseaseSeverity
      : 'medium',
    symptoms: ensureStringArray(disease.symptoms),
    treatment: ensureStringArray(disease.treatment),
    prevention: ensureStringArray(disease.prevention),
  };
}

// Validate and sanitize a nutrient deficiency object
function validateNutrientDeficiency(
  deficiency: Partial<NutrientDeficiency>
): NutrientDeficiency | null {
  if (!deficiency || !deficiency.nutrient) return null;
  
  return {
    nutrient: deficiency.nutrient,
    confidence: clampNumber(deficiency.confidence, 0, 1, 0.5),
    symptoms: ensureStringArray(deficiency.symptoms),
    solution: ensureStringArray(deficiency.solution),
    fertilizer: ensureStringArray(deficiency.fertilizer),
  };
}

// Validate and sanitize a pest detection object
function validatePest(pest: Partial<PestDetection>): PestDetection | null {
  if (!pest || !pest.name) return null;
  
  const validDamageLevels: DiseaseSeverity[] = ['low', 'medium', 'high'];
  
  return {
    name: pest.name,
    scientificName: pest.scientificName,
    confidence: clampNumber(pest.confidence, 0, 1, 0.5),
    damageLevel: validDamageLevels.includes(pest.damageLevel as DiseaseSeverity)
      ? pest.damageLevel as DiseaseSeverity
      : 'medium',
    treatment: ensureStringArray(pest.treatment),
    prevention: ensureStringArray(pest.prevention),
  };
}

// UTILITY FUNCTIONS

// Clamp a number within a range with a default fallback
function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value === undefined || value === null || isNaN(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}

// Ensure a value is a string array
function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

// CHAT FUNCTIONALITY

// Send a follow-up question about a previous analysis
export async function askFollowUpQuestion(
  question: string,
  analysisContext: GeminiCropAnalysisResult,
  conversationHistory?: { role: 'user' | 'model'; text: string }[]
): Promise<string> {
  const model = getTextModel();
  
  const systemPrompt = `You are an expert agricultural AI assistant for Indian farmers. 
You are helping a farmer understand their crop analysis results.

PREVIOUS ANALYSIS CONTEXT:
Crop: ${analysisContext.cropIdentification.name}
Health Status: ${analysisContext.healthAssessment.status}
Health Score: ${analysisContext.healthAssessment.healthScore}/100
Diseases Found: ${analysisContext.diseases.map(d => d.name).join(', ') || 'None'}
Deficiencies Found: ${analysisContext.nutrientDeficiencies.map(n => n.nutrient).join(', ') || 'None'}
Pests Found: ${analysisContext.pests.map(p => p.name).join(', ') || 'None'}

GUIDELINES:
- Use simple, farmer-friendly language
- Provide practical, actionable advice
- Consider resources available to Indian farmers
- Be conversational and helpful
- Keep responses concise but informative`;

  try {
    const chat = model.startChat({
      history: conversationHistory?.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })) || [],
    });

    const result = await chat.sendMessage(`${systemPrompt}\n\nFarmer's Question: ${question}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Follow-up question error:', error);
    throw new Error('Failed to process your question. Please try again.');
  }
}

// Get crop-specific recommendations based on location and season
export async function getCropRecommendations(
  location: { state: string; district?: string },
  season?: string,
  soilType?: string
): Promise<{
  recommendedCrops: { name: string; suitability: number; reasons: string[] }[];
  generalTips: string[];
}> {
  const model = getTextModel();
  
  const prompt = `As an agricultural expert for India, recommend crops for the following conditions:

Location: ${location.district ? `${location.district}, ` : ''}${location.state}, India
${season ? `Season: ${season}` : ''}
${soilType ? `Soil Type: ${soilType}` : ''}

Return a JSON object with:
{
  "recommendedCrops": [
    { "name": "crop name", "suitability": 0.0 to 1.0, "reasons": ["why this crop suits"] }
  ],
  "generalTips": ["farming tips for this region/season"]
}

Focus on crops suitable for small and marginal farmers. Consider local climate, water availability, and market demand.
Return ONLY valid JSON, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Crop recommendations error:', error);
    throw new Error('Failed to get crop recommendations. Please try again.');
  }
}

// EXPORTS

export default {
  analyzeCropImage,
  askFollowUpQuestion,
  getCropRecommendations,
  getVisionModel,
  getTextModel,
};
