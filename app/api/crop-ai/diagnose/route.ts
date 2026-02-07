import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CropAnalysis from '@/models/CropAnalysis';
import { getIdentifier, checkRateLimit, addRateLimitHeaders, createRateLimitResponse, recordRequest } from '@/lib/rate-limit';
import { recordSuccess, recordError } from '@/lib/ai-analytics';
import type { DiagnosisApiRequest, DiagnosisResult, DiagnosisIssue } from '@/types/diagnosis';
import { GROWTH_STAGES, AFFECTED_PLANT_PARTS } from '@/constants/crop-ai';
import { CROP_LIST } from '@/constants/crops';

// Route segment config for Next.js App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for Vercel Pro, 10 for Vercel Hobby

// ============================================
// ERROR TYPES & MESSAGES
// ============================================

interface DiagnosisError {
  code: string;
  message: string;
  userMessage: string;
  statusCode: number;
  retryable: boolean;
}

const DIAGNOSIS_ERRORS: Record<string, DiagnosisError> = {
  MISSING_API_KEY: {
    code: 'MISSING_API_KEY',
    message: 'GEMINI_API_KEY is not configured',
    userMessage: 'AI service is temporarily unavailable. Please try again later.',
    statusCode: 500,
    retryable: false,
  },
  INVALID_CROP: {
    code: 'INVALID_CROP',
    message: 'Invalid crop name provided',
    userMessage: 'Please select a valid crop from the list.',
    statusCode: 400,
    retryable: false,
  },
  INVALID_GROWTH_STAGE: {
    code: 'INVALID_GROWTH_STAGE',
    message: 'Invalid growth stage provided',
    userMessage: 'Please select a valid growth stage.',
    statusCode: 400,
    retryable: false,
  },
  INVALID_IMAGE: {
    code: 'INVALID_IMAGE',
    message: 'Invalid or missing image data',
    userMessage: 'Please upload a clear photo of your crop.',
    statusCode: 400,
    retryable: false,
  },
  INVALID_IMAGE_FORMAT: {
    code: 'INVALID_IMAGE_FORMAT',
    message: 'Image format not supported',
    userMessage: 'Please upload a JPEG or PNG image.',
    statusCode: 400,
    retryable: false,
  },
  IMAGE_TOO_LARGE: {
    code: 'IMAGE_TOO_LARGE',
    message: 'Image size exceeds limit',
    userMessage: 'Image is too large. Please use a smaller image (max 5MB).',
    statusCode: 400,
    retryable: false,
  },
  AI_BLOCKED: {
    code: 'AI_BLOCKED',
    message: 'AI response was blocked due to safety settings',
    userMessage: 'We couldn\'t analyze this image. Please try with a different photo.',
    statusCode: 422,
    retryable: true,
  },
  AI_TIMEOUT: {
    code: 'AI_TIMEOUT',
    message: 'AI request timed out',
    userMessage: 'Analysis is taking too long. Please try again.',
    statusCode: 504,
    retryable: true,
  },
  AI_QUOTA_EXCEEDED: {
    code: 'AI_QUOTA_EXCEEDED',
    message: 'AI API quota exceeded',
    userMessage: 'Service is busy. Please try again in a few minutes.',
    statusCode: 429,
    retryable: true,
  },
  PARSE_ERROR: {
    code: 'PARSE_ERROR',
    message: 'Failed to parse AI response',
    userMessage: 'Analysis could not be completed. Please try again with a clearer photo.',
    statusCode: 500,
    retryable: true,
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again.',
    statusCode: 500,
    retryable: true,
  },
};

// ============================================
// SEASONAL & REGIONAL CONTEXT
// ============================================

interface SeasonalContext {
  month: string;
  season: string;
  commonIssues: string[];
  weatherConsiderations: string[];
}

/**
 * Get current season based on month (Indian agricultural calendar)
 */
function getCurrentSeasonalContext(): SeasonalContext {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Indian agricultural seasons
  if (month >= 5 && month <= 9) {
    // Kharif season (June - October): Monsoon crops
    return {
      month: monthNames[month],
      season: 'Kharif (Monsoon)',
      commonIssues: [
        'Fungal diseases due to high humidity',
        'Root rot from waterlogging',
        'Bacterial leaf blight',
        'Insect pest infestations',
        'Weed problems',
      ],
      weatherConsiderations: [
        'High rainfall and humidity',
        'Warm temperatures',
        'Risk of flooding in low-lying areas',
        'Cloudy conditions may affect photosynthesis',
      ],
    };
  } else if (month >= 10 || month <= 2) {
    // Rabi season (November - March): Winter crops
    return {
      month: monthNames[month],
      season: 'Rabi (Winter)',
      commonIssues: [
        'Frost damage in northern regions',
        'Aphid infestations',
        'Powdery mildew',
        'Nutrient deficiencies in cold soil',
        'Slow growth due to low temperatures',
      ],
      weatherConsiderations: [
        'Cool to cold temperatures',
        'Low humidity',
        'Morning fog in some regions',
        'Risk of frost in northern India',
      ],
    };
  } else {
    // Zaid season (March - May): Summer crops
    return {
      month: monthNames[month],
      season: 'Zaid (Summer)',
      commonIssues: [
        'Heat stress and wilting',
        'Spider mite infestations',
        'Sunburn on leaves',
        'Water stress symptoms',
        'Thrips and whitefly attacks',
      ],
      weatherConsiderations: [
        'High temperatures',
        'Low humidity',
        'Strong sunlight',
        'Water scarcity concerns',
      ],
    };
  }
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Get Gemini model configuration from environment
 */
function getModelConfig() {
  return {
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE_DIAGNOSIS || '0.3'),
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS_DIAGNOSIS || '4096', 10),
  };
}

// ============================================
// MAIN HANDLER
// ============================================

/**
 * POST /api/crop-ai/diagnose
 * 
 * Analyzes a crop image for diseases, pests, and deficiencies
 * using Google Gemini AI with regional and seasonal context.
 * 
 * Rate limited: 50 requests/hour, 200 requests/day per user
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Check rate limit before processing
  const { identifier } = getIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier);
  
  if (!rateLimitResult.allowed) {
    console.log(`[Diagnose API] Rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult);
  }
  
  try {
    // Parse request body
    const body: DiagnosisApiRequest = await request.json();

    // Validate required fields
    const validationError = validateRequest(body);
    if (validationError) {
      return createErrorResponse(validationError);
    }

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(DIAGNOSIS_ERRORS.MISSING_API_KEY.message);
      return createErrorResponse(DIAGNOSIS_ERRORS.MISSING_API_KEY);
    }

    // Get model configuration
    const modelConfig = getModelConfig();

    // Initialize Gemini AI with configuration
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelConfig.model,
      generationConfig: {
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    // Get display names for context
    const cropName = getCropDisplayName(body.cropName);
    const growthStageName = getGrowthStageName(body.growthStage);
    const affectedPartName = getAffectedPartName(body.affectedPart);
    
    // Get seasonal context
    const seasonalContext = getCurrentSeasonalContext();

    // Construct the enhanced prompt for Gemini
    const prompt = constructEnhancedDiagnosisPrompt(
      cropName,
      body.cropVariety,
      growthStageName,
      affectedPartName,
      seasonalContext
    );

    // Prepare image data for Gemini
    const imageData = extractBase64Data(body.imageBase64);
    
    console.log('[Gemini API] Sending request to Gemini:', {
      model: modelConfig.model,
      cropName,
      growthStageName,
      affectedPartName,
      season: seasonalContext.season,
      hasImage: !!imageData.base64,
      imageMimeType: imageData.mimeType,
      imageBase64Length: imageData.base64.length,
    });

    // Send request to Gemini with timeout handling
    let result: GenerateContentResult;
    try {
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.base64,
          },
        },
      ]);
      console.log('[Gemini API] Response received successfully');
    } catch (aiError) {
      console.error('[Gemini API] Error:', aiError);
      return handleAIError(aiError);
    }

    const geminiResponse = result.response;
    
    // Check if response was blocked
    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      console.error('AI response blocked or empty:', {
        promptFeedback: geminiResponse.promptFeedback,
        candidates: geminiResponse.candidates,
      });
      return createErrorResponse(DIAGNOSIS_ERRORS.AI_BLOCKED);
    }

    let text: string;
    try {
      text = geminiResponse.text();
    } catch (textError) {
      console.error('Failed to extract text from response:', textError);
      return createErrorResponse(DIAGNOSIS_ERRORS.PARSE_ERROR);
    }
    
    // Log the raw response for debugging (truncated)
    console.log('AI response text (first 500 chars):', text.substring(0, 500));
    
    // Parse the response into DiagnosisResult
    const diagnosisResult = parseDiagnosisResponse(text, seasonalContext);
    
    // Calibrate confidence scores
    const calibratedResult = calibrateConfidenceScores(diagnosisResult);

    const processingTime = Date.now() - startTime;
    console.log(`Diagnosis completed in ${processingTime}ms`);

    // ============================================
    // SAVE DIAGNOSIS TO DATABASE
    // ============================================
    let savedAnalysisId: string | undefined;
    
    try {
      // Get user from header (optional - allow anonymous diagnoses)
      const userPhone = request.headers.get('x-user-phone');
      
      if (userPhone) {
        await dbConnect();
        
        const cleanPhone = userPhone.replace(/\D/g, '');
        const user = await User.findOne({ phone: cleanPhone });
        
        if (user) {
          // Determine overall health status from score
          const healthStatus = getHealthStatusFromScore(calibratedResult.overallHealthScore);
          
          // Map diagnosis issues to CropAnalysis format
          const diseases = calibratedResult.possibleIssues
            .filter(issue => issue.name.toLowerCase().includes('disease') || 
                           issue.name.toLowerCase().includes('blight') ||
                           issue.name.toLowerCase().includes('rot') ||
                           issue.name.toLowerCase().includes('mildew') ||
                           issue.name.toLowerCase().includes('wilt'))
            .map(issue => ({
              name: issue.name,
              confidence: issue.confidence / 100, // Convert to 0-1 scale
              severity: getSeverityFromConfidence(issue.confidence),
              symptoms: issue.symptoms,
              treatment: issue.treatment,
              prevention: issue.prevention,
            }));
          
          const pests = calibratedResult.possibleIssues
            .filter(issue => issue.name.toLowerCase().includes('pest') ||
                           issue.name.toLowerCase().includes('insect') ||
                           issue.name.toLowerCase().includes('mite') ||
                           issue.name.toLowerCase().includes('aphid') ||
                           issue.name.toLowerCase().includes('borer'))
            .map(issue => ({
              name: issue.name,
              confidence: issue.confidence / 100,
              damageLevel: getSeverityFromConfidence(issue.confidence),
              treatment: issue.treatment,
            }));
          
          const nutrientDeficiencies = calibratedResult.possibleIssues
            .filter(issue => issue.name.toLowerCase().includes('deficiency') ||
                           issue.name.toLowerCase().includes('nitrogen') ||
                           issue.name.toLowerCase().includes('phosphorus') ||
                           issue.name.toLowerCase().includes('potassium'))
            .map(issue => ({
              nutrient: issue.name.replace(/deficiency/i, '').trim(),
              confidence: issue.confidence / 100,
              symptoms: issue.symptoms,
              solution: issue.treatment,
            }));
          
          // Create the analysis record
          const cropAnalysis = await CropAnalysis.create({
            userId: user._id,
            imageData: body.imageBase64,
            imageUrl: '', // Legacy field, not used with base64
            imageThumbnail: '', // Could generate thumbnail later
            imageMeta: {
              size: body.imageBase64.length * 0.75, // Approximate size
              type: imageData.mimeType,
              uploadedAt: new Date(),
            },
            overallHealth: healthStatus,
            healthScore: calibratedResult.overallHealthScore,
            cropType: cropName,
            cropGrowthStage: growthStageName,
            diseases,
            nutrientDeficiencies,
            pests,
            weatherSuggestions: {
              current: [],
              upcoming: [],
              rainPreparation: [],
            },
            yieldSuggestions: calibratedResult.generalRecommendations,
            analysisDate: new Date(),
            status: 'completed',
            // Store metadata
            location: user.state ? {
              state: user.state,
              district: user.district || '',
            } : undefined,
          });
          
          savedAnalysisId = cropAnalysis._id.toString();
          console.log(`Diagnosis saved with ID: ${savedAnalysisId}`);
        }
      }
    } catch (saveError) {
      // Log but don't fail the request if saving fails
      console.error('Failed to save diagnosis to database:', saveError);
    }

    // Record the successful request for rate limiting
    recordRequest(identifier);

    // Record analytics
    const userPhone = request.headers.get('x-user-phone');
    recordSuccess('diagnosis', processingTime, {
      userPhone: userPhone || undefined,
      cached: false, // Diagnosis is never cached (image-based)
      metadata: {
        season: seasonalContext.season,
        crop: body.cropName,
        model: modelConfig.model,
        responseLength: text.length,
      },
    });
    
    // Create response with rate limit headers
    const response = NextResponse.json({
      success: true,
      data: calibratedResult,
      analysisId: savedAnalysisId,
      meta: {
        processingTime,
        season: seasonalContext.season,
        month: seasonalContext.month,
        saved: !!savedAnalysisId,
      },
    });
    
    // Add rate limit headers
    const updatedRateLimitResult = checkRateLimit(identifier);
    addRateLimitHeaders(response.headers, updatedRateLimitResult);
    
    return response;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Diagnosis API error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      processingTime,
    });
    
    // Record error analytics
    recordError(
      'diagnosis',
      processingTime,
      'DIAGNOSIS_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return handleGenericError(error);
  }
}

/**
 * Get health status from score
 */
function getHealthStatusFromScore(score: number): 'healthy' | 'moderate' | 'critical' {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'moderate';
  return 'critical';
}

/**
 * Get severity from confidence score
 */
function getSeverityFromConfidence(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence >= 70) return 'high';
  if (confidence >= 40) return 'medium';
  return 'low';
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate the request body
 */
function validateRequest(body: DiagnosisApiRequest): DiagnosisError | null {
  if (!body.cropName) {
    return DIAGNOSIS_ERRORS.INVALID_CROP;
  }

  // Validate crop exists
  const crop = CROP_LIST.find(c => c.id === body.cropName);
  if (!crop) {
    return DIAGNOSIS_ERRORS.INVALID_CROP;
  }

  if (!body.growthStage) {
    return DIAGNOSIS_ERRORS.INVALID_GROWTH_STAGE;
  }

  // Validate growth stage exists
  const stage = GROWTH_STAGES.find(s => s.id === body.growthStage);
  if (!stage) {
    return DIAGNOSIS_ERRORS.INVALID_GROWTH_STAGE;
  }

  if (!body.imageBase64) {
    return DIAGNOSIS_ERRORS.INVALID_IMAGE;
  }

  // Validate base64 image format
  if (!body.imageBase64.startsWith('data:image/')) {
    return DIAGNOSIS_ERRORS.INVALID_IMAGE_FORMAT;
  }

  // Check image size (rough estimate: base64 is ~33% larger than binary)
  const base64Size = body.imageBase64.length * 0.75;
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (base64Size > maxSize) {
    return DIAGNOSIS_ERRORS.IMAGE_TOO_LARGE;
  }

  if (!body.affectedPart) {
    return {
      ...DIAGNOSIS_ERRORS.INVALID_CROP,
      message: 'Affected plant part is required',
      userMessage: 'Please select which part of the plant is affected.',
    };
  }

  return null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the display name for a crop
 */
function getCropDisplayName(cropId: string): string {
  const crop = CROP_LIST.find(c => c.id === cropId);
  return crop?.name || cropId;
}

/**
 * Get the display name for a growth stage
 */
function getGrowthStageName(stageId: string): string {
  const stage = GROWTH_STAGES.find(s => s.id === stageId);
  return stage?.name || stageId;
}

/**
 * Get the display name for an affected plant part
 */
function getAffectedPartName(partId: string): string {
  const part = AFFECTED_PLANT_PARTS.find(p => p.id === partId);
  return part?.name || partId;
}

/**
 * Extract base64 data and mime type from data URL
 */
function extractBase64Data(dataUrl: string): { base64: string; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    return { base64: dataUrl, mimeType: 'image/jpeg' };
  }
  return { mimeType: matches[1], base64: matches[2] };
}

// ============================================
// ENHANCED PROMPT CONSTRUCTION
// ============================================

/**
 * Construct an enhanced diagnosis prompt with seasonal and regional context
 */
function constructEnhancedDiagnosisPrompt(
  cropName: string,
  cropVariety: string | undefined,
  growthStage: string,
  affectedPart: string,
  seasonalContext: SeasonalContext
): string {
  const varietyInfo = cropVariety ? ` (variety: ${cropVariety})` : '';
  
  return `You are an expert agricultural scientist specializing in crop diseases, pests, and nutrient deficiencies in Indian agriculture.

## Context
- **Current Month:** ${seasonalContext.month}
- **Season:** ${seasonalContext.season}
- **Crop:** ${cropName}${varietyInfo}
- **Growth Stage:** ${growthStage}
- **Affected Part:** ${affectedPart}

## Seasonal Considerations
During ${seasonalContext.season} season, the following issues are common:
${seasonalContext.commonIssues.map(issue => `- ${issue}`).join('\n')}

Weather considerations:
${seasonalContext.weatherConsiderations.map(w => `- ${w}`).join('\n')}

## Task
Analyze the provided image carefully and provide a comprehensive diagnosis.

## Output Format
Return a JSON object with this exact structure:

{
  "overallHealthScore": <number 0-100>,
  "healthStatus": "<healthy|mild|moderate|severe|critical>",
  "possibleIssues": [
    {
      "name": "<disease/pest/deficiency name>",
      "scientificName": "<scientific name if applicable>",
      "type": "<disease|pest|deficiency|disorder>",
      "confidence": <number 0-100>,
      "severity": "<low|medium|high>",
      "description": "<clear 1-2 sentence description>",
      "symptoms": ["<visible symptom 1>", "<visible symptom 2>", ...],
      "causes": ["<cause 1>", "<cause 2>", ...],
      "treatment": [
        {"type": "organic", "steps": ["<step 1>", "<step 2>"]},
        {"type": "chemical", "steps": ["<step 1>", "<step 2>"]}
      ],
      "prevention": ["<prevention measure 1>", "<prevention measure 2>", ...],
      "timeToRecovery": "<estimated recovery time>"
    }
  ],
  "generalRecommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "seasonalAdvice": ["<seasonal tip 1>", "<seasonal tip 2>", ...],
  "urgencyLevel": "<immediate|soon|routine>",
  "consultExpert": <boolean - true if professional help recommended>
}

## Confidence Scoring Guidelines
- **90-100%**: Distinctive, unmistakable symptoms clearly visible
- **70-89%**: Characteristic symptoms visible with minor uncertainty
- **50-69%**: Likely diagnosis but some symptoms overlap with other conditions
- **30-49%**: Possible diagnosis, needs closer examination or lab testing
- **<30%**: Low confidence, multiple conditions possible

## Important Guidelines
1. Focus on conditions relevant to Indian agricultural context
2. List issues in order of likelihood (highest confidence first)
3. Include BOTH organic and chemical treatment options
4. Keep language simple and actionable for farmers
5. Consider the current season (${seasonalContext.season}) when diagnosing
6. Be conservative with high confidence scores unless symptoms are unmistakable
7. Always recommend consulting an agricultural expert for severe cases
8. If the plant appears healthy, provide an appropriate health score (85-100) and preventive recommendations

Return ONLY the JSON object, no additional text.`;
}

// ============================================
// RESPONSE PARSING
// ============================================

/**
 * Parse Gemini's response into DiagnosisResult structure
 */
function parseDiagnosisResponse(responseText: string, seasonalContext: SeasonalContext): DiagnosisResult {
  try {
    // Clean the response (remove any markdown formatting if present)
    let cleanText = responseText.trim();
    
    // Remove markdown code blocks if present
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    // Parse JSON
    const parsed = JSON.parse(cleanText);

    // Validate and transform the response
    const result: DiagnosisResult = {
      overallHealthScore: clampNumber(parsed.overallHealthScore, 0, 100, 50),
      possibleIssues: parseEnhancedIssues(parsed.possibleIssues),
      generalRecommendations: [
        ...parseStringArray(parsed.generalRecommendations),
        ...parseStringArray(parsed.seasonalAdvice),
      ],
    };

    return result;
  } catch (error) {
    console.error('Error parsing diagnosis response:', error);
    console.error('Response text:', responseText.substring(0, 500));
    
    // Return a fallback response with seasonal context
    return createFallbackDiagnosisResult(seasonalContext);
  }
}

/**
 * Parse enhanced issues with treatment structure
 */
function parseEnhancedIssues(issues: unknown): DiagnosisIssue[] {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map((issue): DiagnosisIssue => {
    // Handle treatment array which may have organic/chemical structure
    const treatmentSteps: string[] = [];
    if (Array.isArray(issue.treatment)) {
      issue.treatment.forEach((t: { type?: string; steps?: string[] } | string) => {
        if (typeof t === 'string') {
          treatmentSteps.push(t);
        } else if (t && typeof t === 'object' && Array.isArray(t.steps)) {
          const prefix = t.type ? `[${t.type.charAt(0).toUpperCase() + t.type.slice(1)}] ` : '';
          t.steps.forEach((step: string) => {
            treatmentSteps.push(`${prefix}${step}`);
          });
        }
      });
    }

    return {
      name: String(issue.name || 'Unknown Issue'),
      confidence: clampNumber(issue.confidence, 0, 100, 50),
      description: String(issue.description || ''),
      symptoms: parseStringArray(issue.symptoms),
      causes: parseStringArray(issue.causes),
      treatment: treatmentSteps.length > 0 ? treatmentSteps : parseStringArray(issue.treatment),
      prevention: parseStringArray(issue.prevention),
    };
  });
}

/**
 * Parse and validate string array
 */
function parseStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.filter(item => typeof item === 'string').map(String);
}

/**
 * Clamp a number within a range with a default value
 */
function clampNumber(value: unknown, min: number, max: number, defaultValue: number): number {
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  return Math.min(max, Math.max(min, num));
}

// ============================================
// CONFIDENCE CALIBRATION
// ============================================

/**
 * Calibrate confidence scores based on various factors
 */
function calibrateConfidenceScores(result: DiagnosisResult): DiagnosisResult {
  // Apply calibration to each issue
  const calibratedIssues = result.possibleIssues.map((issue, index) => {
    let calibratedConfidence = issue.confidence;

    // Reduce confidence slightly for issues beyond the first (primary diagnosis)
    if (index > 0) {
      calibratedConfidence = Math.max(10, calibratedConfidence - (index * 5));
    }

    // Boost confidence if many symptoms are listed (more evidence)
    if (issue.symptoms.length >= 4) {
      calibratedConfidence = Math.min(100, calibratedConfidence + 5);
    }

    // Reduce confidence if description is too short (less certain)
    if (issue.description.length < 20) {
      calibratedConfidence = Math.max(10, calibratedConfidence - 10);
    }

    // Ensure confidence doesn't exceed realistic bounds
    // Very rarely should we have 100% confidence from image alone
    calibratedConfidence = Math.min(95, calibratedConfidence);

    return {
      ...issue,
      confidence: Math.round(calibratedConfidence),
    };
  });

  // Sort by calibrated confidence
  calibratedIssues.sort((a, b) => b.confidence - a.confidence);

  return {
    ...result,
    possibleIssues: calibratedIssues,
  };
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Create error response
 */
function createErrorResponse(error: DiagnosisError): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: error.userMessage,
      errorCode: error.code,
      retryable: error.retryable,
    },
    { status: error.statusCode }
  );
}

/**
 * Handle AI-specific errors
 */
function handleAIError(error: unknown): NextResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('AI error details:', {
    message: errorMessage,
    stack: errorStack,
    errorType: error?.constructor?.name,
  });

  if (errorMessage.includes('quota') || errorMessage.includes('RATE_LIMIT') || errorMessage.includes('Resource has been exhausted')) {
    return createErrorResponse(DIAGNOSIS_ERRORS.AI_QUOTA_EXCEEDED);
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
    return createErrorResponse(DIAGNOSIS_ERRORS.AI_TIMEOUT);
  }

  if (errorMessage.includes('blocked') || errorMessage.includes('SAFETY') || errorMessage.includes('HARM_CATEGORY')) {
    return createErrorResponse(DIAGNOSIS_ERRORS.AI_BLOCKED);
  }
  
  if (errorMessage.includes('API_KEY') || errorMessage.includes('invalid') || errorMessage.includes('authentication')) {
    return createErrorResponse(DIAGNOSIS_ERRORS.MISSING_API_KEY);
  }

  console.error('AI error (unhandled type):', errorMessage);
  return createErrorResponse(DIAGNOSIS_ERRORS.UNKNOWN_ERROR);
}

/**
 * Handle generic errors
 */
function handleGenericError(error: unknown): NextResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error('Generic error:', {
    message: errorMessage,
    stack: errorStack,
    errorType: error?.constructor?.name,
  });
  
  // Check for specific error types and provide better user-facing messages
  if (errorMessage.includes('JSON') || errorMessage.includes('parse') || errorMessage.includes('Unexpected token')) {
    return createErrorResponse(DIAGNOSIS_ERRORS.PARSE_ERROR);
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
    return createErrorResponse({
      ...DIAGNOSIS_ERRORS.AI_TIMEOUT,
      message: 'Network error connecting to AI service',
      userMessage: 'Could not connect to analysis service. Please check your internet connection.',
    });
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('RATE_LIMIT') || errorMessage.includes('429')) {
    return createErrorResponse(DIAGNOSIS_ERRORS.AI_QUOTA_EXCEEDED);
  }
  
  if (errorMessage.includes('API key') || errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('unauthorized')) {
    return createErrorResponse(DIAGNOSIS_ERRORS.MISSING_API_KEY);
  }
  
  // Check for Gemini-specific errors
  if (errorMessage.includes('GoogleGenerativeAI') || errorMessage.includes('generativelanguage')) {
    if (errorMessage.includes('blocked') || errorMessage.includes('SAFETY')) {
      return createErrorResponse(DIAGNOSIS_ERRORS.AI_BLOCKED);
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE')) {
      return createErrorResponse(DIAGNOSIS_ERRORS.AI_TIMEOUT);
    }
  }
  
  return createErrorResponse(DIAGNOSIS_ERRORS.UNKNOWN_ERROR);
}

/**
 * Create fallback diagnosis result when parsing fails
 */
function createFallbackDiagnosisResult(seasonalContext: SeasonalContext): DiagnosisResult {
  return {
    overallHealthScore: 50,
    possibleIssues: [
      {
        name: 'Analysis Incomplete',
        confidence: 0,
        description: 'We could not fully analyze the image. Please try again with a clearer photo.',
        symptoms: [],
        causes: ['Image quality may be insufficient', 'Lighting conditions may be poor'],
        treatment: ['Try uploading a clearer image of the affected area'],
        prevention: [],
      },
    ],
    generalRecommendations: [
      'Take a closer, well-lit photo of the affected area',
      'Ensure the affected part is clearly visible in the image',
      `During ${seasonalContext.season} season, monitor for: ${seasonalContext.commonIssues.slice(0, 2).join(', ')}`,
      'Consult your local agricultural extension office for in-person diagnosis',
    ],
  };
}
