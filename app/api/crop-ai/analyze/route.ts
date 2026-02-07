import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CropAnalysis from '@/models/CropAnalysis';
import { analyzeCropImage, GeminiCropAnalysisResult } from '@/lib/gemini';
import { getWeatherData, getWeatherSuggestions, WeatherData } from '@/lib/weather';
import {
  validateBase64Image,
  isBase64DataUrl,
  estimateBase64Size,
  extractMimeTypeFromDataUrl,
} from '@/lib/base64-image';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_ANALYSES_PER_HOUR = 10;

// In-memory rate limit store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Check rate limit
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: MAX_ANALYSES_PER_HOUR - 1, resetIn: RATE_LIMIT_WINDOW };
  }
  
  if (userLimit.count >= MAX_ANALYSES_PER_HOUR) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: userLimit.resetTime - now,
    };
  }
  
  userLimit.count++;
  return {
    allowed: true,
    remaining: MAX_ANALYSES_PER_HOUR - userLimit.count,
    resetIn: userLimit.resetTime - now,
  };
}

// Convert File/Blob to base64
async function fileToBase64(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

// POST /api/crop-ai/analyze
// Analyze a crop image using Gemini AI
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate user
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. You can analyze ${MAX_ANALYSES_PER_HOUR} images per hour. Try again in ${resetMinutes} minutes.`,
          rateLimitReset: rateLimit.resetIn,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': MAX_ANALYSES_PER_HOUR.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + rateLimit.resetIn).toString(),
          },
        }
      );
    }

    // Parse request - support both JSON body (base64) and formData (file upload)
    let imageBase64: string;
    let imageSize: number;
    let imageMimeType: string;
    let cropType: string | null = null;
    let state: string | null = null;
    let district: string | null = null;
    let includeWeather = false;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // JSON body with base64 image
      const body = await request.json();
      const { image, cropType: bodyType, state: bodyState, district: bodyDistrict, includeWeather: bodyWeather } = body;

      if (!image) {
        return NextResponse.json(
          { success: false, error: 'Image is required. Provide a base64 data URL.' },
          { status: 400 }
        );
      }

      // Validate that it's a base64 data URL
      if (!isBase64DataUrl(image)) {
        return NextResponse.json(
          { success: false, error: 'Image must be a valid base64 data URL (data:image/...;base64,...)' },
          { status: 400 }
        );
      }

      // Validate image
      const validation = validateBase64Image(image);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `Invalid image: ${validation.error}` },
          { status: 400 }
        );
      }

      // Check size (allow up to 10MB for crop analysis)
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      imageSize = estimateBase64Size(image);
      if (imageSize > maxSizeBytes) {
        const sizeMB = (imageSize / (1024 * 1024)).toFixed(2);
        return NextResponse.json(
          { success: false, error: `Image too large (${sizeMB}MB). Maximum size is 10MB.` },
          { status: 400 }
        );
      }

      imageBase64 = image;
      imageMimeType = extractMimeTypeFromDataUrl(image) || 'image/jpeg';
      cropType = bodyType || null;
      state = bodyState || null;
      district = bodyDistrict || null;
      includeWeather = bodyWeather === true;

    } else {
      // FormData with file upload (backward compatibility)
      const formData = await request.formData();
      const imageFile = formData.get('image') as File | null;
      cropType = formData.get('cropType') as string | null;
      state = formData.get('state') as string | null;
      district = formData.get('district') as string | null;
      const includeWeatherStr = formData.get('includeWeather') as string | null;
      includeWeather = includeWeatherStr === 'true';

      // Validate image file
      if (!imageFile) {
        return NextResponse.json(
          { success: false, error: 'Image file is required' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json(
          { success: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP' },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (imageFile.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'Image too large. Maximum size is 10MB' },
          { status: 400 }
        );
      }

      // Convert file to base64
      imageBase64 = await fileToBase64(imageFile);
      imageSize = imageFile.size;
      imageMimeType = imageFile.type || 'image/jpeg';
    }

    // Build location object
    const location = state ? { state, district: district || undefined } : undefined;

    // Create initial analysis document with processing status
    // Store image as base64 in imageData field
    const initialAnalysis = new CropAnalysis({
      userId: user._id,
      imageData: imageBase64,
      imageMeta: {
        size: imageSize,
        type: imageMimeType,
        isBase64: true,
        uploadedAt: new Date(),
      },
      // Keep imageUrl/imageThumbnail for backward compatibility, but empty for new analyses
      imageUrl: '',
      imageThumbnail: '',
      overallHealth: 'moderate',
      healthScore: 0,
      cropType: cropType || 'Unknown',
      cropGrowthStage: 'Unknown',
      diseases: [],
      nutrientDeficiencies: [],
      pests: [],
      weatherSuggestions: {
        current: [],
        upcoming: [],
        rainPreparation: [],
      },
      yieldSuggestions: [],
      location: location ? {
        state: location.state,
        district: location.district || '',
      } : undefined,
      status: 'processing',
      analysisDate: new Date(),
    });

    await initialAnalysis.save();
    const analysisId = initialAnalysis._id.toString();

    try {
      // Fetch weather data if requested
      let weatherData: WeatherData | null = null;
      if (includeWeather && location) {
        try {
          weatherData = await getWeatherData(location);
        } catch (weatherError) {
          console.warn('Failed to fetch weather data:', weatherError);
          // Continue without weather data
        }
      }

      // Prepare weather context for Gemini
      const weatherContext = weatherData ? {
        temperature: weatherData.current.temperature,
        humidity: weatherData.current.humidity,
        condition: weatherData.current.condition,
        rainfall: weatherData.forecast[0]?.precipitation,
      } : undefined;

      // Call Gemini AI for analysis (Gemini accepts base64 directly)
      const geminiResult: GeminiCropAnalysisResult = await analyzeCropImage(
        imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        {
          cropType: cropType || undefined,
          location,
          weather: weatherContext,
          mimeType: imageMimeType,
        }
      );

      // Generate weather suggestions
      const weatherSuggestions = {
        current: [] as string[],
        upcoming: [] as string[],
        rainPreparation: [] as string[],
      };

      if (weatherData) {
        const suggestions = getWeatherSuggestions(weatherData, geminiResult);
        
        // Group suggestions by type
        suggestions.forEach(suggestion => {
          if (suggestion.type === 'rain') {
            weatherSuggestions.rainPreparation.push(...suggestion.actions);
          } else if (suggestion.urgency === 'high') {
            weatherSuggestions.current.push(...suggestion.actions);
          } else {
            weatherSuggestions.upcoming.push(...suggestion.actions);
          }
        });
      }

      // Map Gemini recommendations to weather suggestions if available
      if (geminiResult.recommendations.weatherBased) {
        weatherSuggestions.current.push(...geminiResult.recommendations.weatherBased);
      }

      // Update analysis document with results
      const updatedAnalysis = await CropAnalysis.findByIdAndUpdate(
        analysisId,
        {
          overallHealth: geminiResult.healthAssessment.status,
          healthScore: geminiResult.healthAssessment.healthScore,
          cropType: geminiResult.cropIdentification.name,
          cropGrowthStage: geminiResult.cropIdentification.growthStage || 'Unknown',
          diseases: geminiResult.diseases.map(disease => ({
            name: disease.name,
            scientificName: disease.scientificName,
            confidence: disease.confidence,
            severity: disease.severity,
            symptoms: disease.symptoms,
            treatment: disease.treatment,
            prevention: disease.prevention,
          })),
          nutrientDeficiencies: geminiResult.nutrientDeficiencies.map(deficiency => ({
            nutrient: deficiency.nutrient,
            confidence: deficiency.confidence,
            symptoms: deficiency.symptoms,
            solution: deficiency.solution,
          })),
          pests: geminiResult.pests.map(pest => ({
            name: pest.name,
            confidence: pest.confidence,
            damageLevel: pest.damageLevel,
            treatment: pest.treatment,
          })),
          weatherSuggestions,
          yieldSuggestions: [
            ...geminiResult.recommendations.immediate,
            ...geminiResult.recommendations.shortTerm,
            ...geminiResult.recommendations.longTerm,
          ],
          weather: weatherData ? {
            temperature: weatherData.current.temperature,
            feelsLike: weatherData.current.feelsLike,
            humidity: weatherData.current.humidity,
            condition: weatherData.current.condition,
            icon: weatherData.current.icon,
            windSpeed: weatherData.current.windSpeed,
            forecast: weatherData.forecast.slice(0, 5).map(day => ({
              date: day.date.toISOString ? day.date.toISOString().split('T')[0] : String(day.date),
              temperature: day.temperature.day,
              minTemp: day.temperature.min,
              maxTemp: day.temperature.max,
              humidity: day.humidity,
              condition: day.condition,
              icon: day.icon,
              chanceOfRain: Math.round(day.precipitationProbability * 100),
              windSpeed: day.windSpeed,
            })),
          } : undefined,
          status: 'completed',
          errorMessage: undefined,
        },
        { new: true }
      );

      if (!updatedAnalysis) {
        throw new Error('Failed to update analysis document');
      }

      // Format response - use imageData for new analyses, imageUrl for backward compat
      // imageSource virtual prefers imageData over imageUrl
      const imageSource = updatedAnalysis.imageData || updatedAnalysis.imageUrl;
      const responseData = {
        id: updatedAnalysis._id.toString(),
        userId: updatedAnalysis.userId.toString(),
        image: imageSource, // Unified image field (base64 or URL)
        imageUrl: updatedAnalysis.imageUrl || '', // Deprecated: for backward compat
        imageThumbnail: updatedAnalysis.imageThumbnail || imageSource, // Use base64 as thumbnail fallback
        imageMeta: updatedAnalysis.imageMeta || null,
        overallHealth: updatedAnalysis.overallHealth,
        healthScore: updatedAnalysis.healthScore,
        cropType: updatedAnalysis.cropType,
        cropGrowthStage: updatedAnalysis.cropGrowthStage,
        diseases: updatedAnalysis.diseases,
        nutrientDeficiencies: updatedAnalysis.nutrientDeficiencies,
        pests: updatedAnalysis.pests,
        weatherSuggestions: updatedAnalysis.weatherSuggestions,
        yieldSuggestions: updatedAnalysis.yieldSuggestions,
        location: updatedAnalysis.location,
        analysisDate: updatedAnalysis.analysisDate.toISOString(),
        weather: updatedAnalysis.weather,
        status: updatedAnalysis.status,
        createdAt: updatedAnalysis.createdAt.toISOString(),
        updatedAt: updatedAnalysis.updatedAt.toISOString(),
      };

      return NextResponse.json(
        {
          success: true,
          data: responseData,
          message: 'Crop analysis completed successfully',
        },
        {
          headers: {
            'X-RateLimit-Limit': MAX_ANALYSES_PER_HOUR.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          },
        }
      );

    } catch (analysisError) {
      console.error('Analysis error:', analysisError);

      // Update document with failed status
      await CropAnalysis.findByIdAndUpdate(analysisId, {
        status: 'failed',
        errorMessage: analysisError instanceof Error 
          ? analysisError.message 
          : 'An unexpected error occurred during analysis',
      });

      const errorMessage = analysisError instanceof Error 
        ? analysisError.message 
        : 'Failed to analyze crop image';

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          analysisId,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Crop analysis endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
