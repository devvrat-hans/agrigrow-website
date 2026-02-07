import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CropPlan from '@/models/CropPlan';
import { getIdentifier, checkRateLimit, recordRequest, addRateLimitHeaders, createRateLimitResponse } from '@/lib/rate-limit';
import { getCache, generateCacheKey } from '@/lib/ai-cache';
import { recordSuccess, recordError } from '@/lib/ai-analytics';
import type { PlanningApiRequest, PlanningResult, CropRecommendation } from '@/types/planning';
import { 
  SEASONS, 
  SOIL_TYPES, 
  IRRIGATION_AVAILABILITY, 
  IRRIGATION_METHODS,
  MONTHS,
} from '@/constants/crop-ai';
import { INDIAN_STATES } from '@/constants/indian-locations';
import { getWeatherDataSafe, WeatherData, ForecastDay } from '@/lib/weather';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Get Gemini model configuration from environment
 */
function getModelConfig() {
  return {
    model: process.env.GEMINI_MODEL_PLANNING || 'gemini-2.0-flash',
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE_PLANNING || '0.3'),
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS_PLANNING || '8192', 10),
  };
}

// ============================================
// SEASONAL MARKET DEMAND DATA
// ============================================

interface SeasonalDemandInfo {
  highDemandCrops: string[];
  festivalCrops: string[];
  exportCrops: string[];
  tips: string[];
}

/**
 * Get seasonal market demand information
 */
function getSeasonalMarketDemand(season: string, month: string): SeasonalDemandInfo {
  const monthNum = parseInt(month, 10) || new Date().getMonth() + 1;
  
  // Festival-based demand (Indian context)
  const festivalCrops: string[] = [];
  if (monthNum >= 9 && monthNum <= 11) {
    // Navratri, Dussehra, Diwali season
    festivalCrops.push('Marigold', 'Sugarcane', 'Rice', 'Coconut');
  } else if (monthNum >= 1 && monthNum <= 3) {
    // Makar Sankranti, Holi season
    festivalCrops.push('Sugarcane', 'Til (Sesame)', 'Groundnut', 'Wheat');
  } else if (monthNum >= 7 && monthNum <= 8) {
    // Raksha Bandhan, Independence Day
    festivalCrops.push('Rice', 'Mangoes', 'Vegetables');
  }

  if (season === 'kharif') {
    return {
      highDemandCrops: ['Rice', 'Cotton', 'Soybean', 'Groundnut', 'Maize', 'Pulses'],
      festivalCrops,
      exportCrops: ['Cotton', 'Rice', 'Soybean', 'Chillies'],
      tips: [
        'Kharif crops benefit from monsoon rains - plan sowing after first showers',
        'Cotton and soybean have good export demand',
        'Rice market remains stable with MSP support',
      ],
    };
  } else if (season === 'rabi') {
    return {
      highDemandCrops: ['Wheat', 'Mustard', 'Chickpea', 'Potato', 'Onion', 'Garlic'],
      festivalCrops,
      exportCrops: ['Onion', 'Wheat', 'Mustard Oil', 'Spices'],
      tips: [
        'Wheat has strong MSP support and stable demand',
        'Potato and onion can give high returns but are price volatile',
        'Mustard benefits from oil demand in winter months',
      ],
    };
  } else {
    // Zaid season
    return {
      highDemandCrops: ['Watermelon', 'Muskmelon', 'Cucumber', 'Bitter Gourd', 'Fodder crops'],
      festivalCrops,
      exportCrops: ['Melons (for premium markets)', 'Vegetables'],
      tips: [
        'Summer vegetables fetch premium prices due to low supply',
        'Focus on quick-maturing crops to maximize returns',
        'Water management is critical - consider high-value, low-water crops',
      ],
    };
  }
}

// ============================================
// CROP ROTATION RECOMMENDATIONS
// ============================================

interface CropRotationInfo {
  previousCropBenefits: Record<string, string[]>;
  rotationSuggestions: string[];
  soilHealthTips: string[];
}

/**
 * Get crop rotation recommendations based on soil and season
 */
function getCropRotationInfo(soilType: string, season: string): CropRotationInfo {
  const rotationSuggestions: string[] = [];
  const soilHealthTips: string[] = [];
  
  // General rotation principles
  rotationSuggestions.push(
    'Rotate legumes (pulses) with cereals to fix nitrogen in soil',
    'Follow deep-rooted crops with shallow-rooted crops',
    'Avoid growing the same crop family in consecutive seasons'
  );
  
  // Soil-specific recommendations
  if (soilType === 'clay' || soilType === 'clay-loam') {
    soilHealthTips.push(
      'After paddy, grow legumes to improve soil structure',
      'Include green manure crops in rotation',
      'Avoid continuous flooding to prevent iron/manganese toxicity'
    );
  } else if (soilType === 'sandy' || soilType === 'sandy-loam') {
    soilHealthTips.push(
      'Include legumes frequently to add nitrogen',
      'Add organic matter through crop residues',
      'Short-duration crops work well in sandy soils'
    );
  } else if (soilType === 'black-cotton') {
    soilHealthTips.push(
      'Excellent for cotton, wheat, and pulses rotation',
      'Add gypsum to improve drainage after monsoon crops',
      'Deep tillage between seasons helps reduce waterlogging'
    );
  }
  
  // Season-specific rotation
  if (season === 'kharif') {
    rotationSuggestions.push(
      'After Kharif paddy → Rabi wheat/mustard/pulses',
      'After Kharif cotton → Rabi wheat/chickpea',
      'After Kharif soybean → Rabi wheat/gram (ideal rotation)'
    );
  } else if (season === 'rabi') {
    rotationSuggestions.push(
      'After Rabi wheat → Kharif paddy/maize/cotton',
      'After Rabi pulses → Kharif cereals (soil nitrogen benefit)',
      'After Rabi potato → Kharif maize/paddy'
    );
  }
  
  return {
    previousCropBenefits: {
      'legumes': ['Adds 20-40 kg N/ha to soil', 'Breaks pest cycles', 'Improves soil structure'],
      'cereals': ['Adds organic matter', 'Deep root channels improve drainage', 'Good for following with legumes'],
      'vegetables': ['Quick returns', 'High residue value', 'Follow with cereals for best results'],
    },
    rotationSuggestions,
    soilHealthTips,
  };
}

/**
 * POST /api/crop-ai/plan
 * 
 * Generates crop recommendations based on location, soil, season,
 * water availability, weather forecast, and market demand using Google Gemini AI.
 * 
 * Rate limited: 50 requests/hour, 200 requests/day per user
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Check rate limit before processing
  const { identifier } = getIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier);
  
  if (!rateLimitResult.allowed) {
    console.log(`[Planning API] Rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult);
  }
  
  try {
    // Parse request body
    const body: PlanningApiRequest = await request.json();

    // Validate required fields
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { success: false, error: 'AI service is not configured' },
        { status: 500 }
      );
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
    const stateName = getStateName(body.state);
    const seasonData = getSeasonData(body.season);
    const soilData = getSoilData(body.soilType);
    const irrigationData = getIrrigationData(body.irrigationAvailability);
    const irrigationMethodData = body.irrigationMethod 
      ? getIrrigationMethodData(body.irrigationMethod)
      : null;
    const monthName = getMonthName(body.sowingMonth);

    // Fetch weather data for the location (7-day forecast)
    let weatherData: WeatherData | null = null;
    try {
      weatherData = await getWeatherDataSafe({ 
        state: stateName, 
        district: body.district 
      }, 7);
      console.log(`Weather data fetched for: ${body.district || stateName}`);
    } catch (weatherError) {
      console.warn('Failed to fetch weather data:', weatherError);
      // Continue without weather data
    }

    // Get seasonal market demand
    const marketDemand = getSeasonalMarketDemand(body.season, body.sowingMonth);
    
    // Get crop rotation recommendations
    const rotationInfo = getCropRotationInfo(body.soilType, body.season);

    // Construct the enhanced prompt for Gemini
    const prompt = constructEnhancedPlanningPrompt({
      stateName,
      district: body.district,
      village: body.village,
      landSize: body.landSize,
      landUnit: body.landUnit,
      seasonData,
      sowingMonth: monthName,
      soilData,
      irrigationData,
      irrigationMethodData,
      weatherData,
      marketDemand,
      rotationInfo,
    });

    // ============================================
    // CACHING LAYER
    // ============================================
    const cache = getCache();
    
    // Generate cache key from planning parameters (without weather which changes)
    const planningCacheContext = {
      state: body.state,
      district: body.district,
      season: body.season,
      sowingMonth: body.sowingMonth,
      soilType: body.soilType,
      irrigationAvailability: body.irrigationAvailability,
      irrigationMethod: body.irrigationMethod,
      landSize: body.landSize,
      landUnit: body.landUnit,
    };
    
    const cacheKey = generateCacheKey('planning', JSON.stringify(planningCacheContext), planningCacheContext);
    
    let text: string;
    let fromCache = false;
    
    // Try to get cached response
    const cachedResponse = cache.get<string>(cacheKey);
    if (cachedResponse) {
      text = cachedResponse;
      fromCache = true;
      console.log(`[Planning API] Cache HIT for: ${body.state}/${body.district}/${body.season}`);
    } else {
      console.log(`[Planning API] Sending request to Gemini model: ${modelConfig.model}`);
      
      // Send request to Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      text = response.text();
      
      console.log(`[Planning API] Gemini response length: ${text?.length || 0} characters`);
      console.log(`[Planning API] Response preview: ${text?.substring(0, 200)}...`);
      
      // Cache the response only if it contains valid JSON
      if (text && text.trim() && (text.includes('{') || text.includes('recommendedCrops'))) {
        cache.set(cacheKey, text, 'planning');
        console.log(`[Planning API] Cached response for: ${body.state}/${body.district}/${body.season}`);
      } else {
        console.warn(`[Planning API] Invalid or empty response from Gemini, not caching`);
      }
    }

    // Parse the response into PlanningResult
    const planningResult = parseEnhancedPlanningResponse(text, marketDemand, rotationInfo);

    const processingTime = Date.now() - startTime;
    console.log(`Planning completed in ${processingTime}ms, cached: ${fromCache}`);

    // ============================================
    // SAVE PLAN TO DATABASE
    // ============================================
    let savedPlanId: string | undefined;
    
    try {
      // Get user from header (optional - allow anonymous plans)
      const userPhone = request.headers.get('x-user-phone');
      
      if (userPhone) {
        await dbConnect();
        
        const cleanPhone = userPhone.replace(/\D/g, '');
        const user = await User.findOne({ phone: cleanPhone });
        
        if (user) {
          // Generate a title for the plan
          const planTitle = `${seasonData.name} ${new Date().getFullYear()} - ${body.district}, ${stateName}`;
          
          // Map the planning result to CropPlan format
          const cropRecommendations = planningResult.recommendedCrops.map(crop => ({
            name: crop.name,
            suitabilityScore: crop.suitabilityScore,
            reasons: crop.reasons,
            expectedYield: crop.expectedYield,
            marketDemand: crop.marketDemand as 'high' | 'medium' | 'low',
            waterRequirement: crop.waterRequirement,
            investmentLevel: crop.investmentLevel as 'low' | 'medium' | 'high',
            timeline: crop.timeline,
            tips: crop.tips,
            isSelected: false,
          }));
          
          // Create the plan record
          const cropPlan = await CropPlan.create({
            userId: user._id,
            title: planTitle,
            location: {
              stateCode: body.state,
              stateName,
              district: body.district,
              village: body.village,
            },
            land: {
              size: body.landSize,
              unit: body.landUnit,
              soilType: body.soilType,
              irrigationAvailability: body.irrigationAvailability,
              irrigationMethod: body.irrigationMethod,
            },
            season: {
              seasonId: body.season,
              seasonName: seasonData.name,
              sowingMonth: monthName,
              year: new Date().getFullYear(),
            },
            recommendedCrops: cropRecommendations,
            analysis: {
              soilAnalysis: planningResult.soilAnalysis,
              weatherConsiderations: planningResult.weatherConsiderations,
              generalTips: planningResult.generalTips,
            },
            weather: weatherData ? {
              temperature: weatherData.current.temperature,
              humidity: weatherData.current.humidity,
              condition: weatherData.current.description,
              forecastIncluded: true,
            } : {
              forecastIncluded: false,
            },
            status: 'active',
            planDate: new Date(),
            processingTime,
          });
          
          savedPlanId = cropPlan._id.toString();
          console.log(`Plan saved with ID: ${savedPlanId}`);
        }
      }
    } catch (saveError) {
      // Log but don't fail the request if saving fails
      console.error('Failed to save plan to database:', saveError);
    }

    // Record the successful request for rate limiting
    recordRequest(identifier);

    // Record analytics
    const userPhone = request.headers.get('x-user-phone');
    recordSuccess('planning', processingTime, {
      userPhone: userPhone || undefined,
      cached: fromCache,
      metadata: {
        season: seasonData.name,
        state: body.state,
        model: modelConfig.model,
        responseLength: text.length,
      },
    });
    
    // Create response with rate limit headers
    const response = NextResponse.json({
      success: true,
      data: planningResult,
      planId: savedPlanId,
      meta: {
        processingTime,
        weatherIncluded: !!weatherData,
        season: seasonData.name,
        saved: !!savedPlanId,
        cached: fromCache,
      },
    });
    
    // Add rate limit headers
    const updatedRateLimitResult = checkRateLimit(identifier);
    addRateLimitHeaders(response.headers, updatedRateLimitResult);
    
    return response;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Planning API error:', error);
    
    // Record error analytics
    recordError(
      'planning',
      processingTime,
      'PLANNING_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Validate the request body
 */
function validateRequest(body: PlanningApiRequest): string | null {
  if (!body.state) {
    return 'State is required';
  }

  if (!body.district) {
    return 'District is required';
  }

  if (!body.landSize || body.landSize <= 0) {
    return 'Valid land size is required';
  }

  if (!body.landUnit) {
    return 'Land unit is required';
  }

  if (!body.season) {
    return 'Season is required';
  }

  if (!body.sowingMonth) {
    return 'Sowing month is required';
  }

  if (!body.soilType) {
    return 'Soil type is required';
  }

  if (!body.irrigationAvailability) {
    return 'Irrigation availability is required';
  }

  // Irrigation method required if not rainfed
  if (body.irrigationAvailability !== 'rainfed' && !body.irrigationMethod) {
    return 'Irrigation method is required';
  }

  return null;
}

/**
 * Get state name from code
 */
function getStateName(stateCode: string): string {
  const state = INDIAN_STATES.find(s => s.code === stateCode);
  return state?.name || stateCode;
}

/**
 * Get season data
 */
function getSeasonData(seasonId: string) {
  const season = SEASONS.find(s => s.id === seasonId);
  return season || { id: seasonId, name: seasonId, description: '', months: '' };
}

/**
 * Get soil data
 */
function getSoilData(soilId: string) {
  const soil = SOIL_TYPES.find(s => s.id === soilId);
  return soil || { id: soilId, name: soilId, description: '' };
}

/**
 * Get irrigation availability data
 */
function getIrrigationData(irrigationId: string) {
  const irrigation = IRRIGATION_AVAILABILITY.find(i => i.id === irrigationId);
  return irrigation || { id: irrigationId, name: irrigationId, description: '' };
}

/**
 * Get irrigation method data
 */
function getIrrigationMethodData(methodId: string) {
  const method = IRRIGATION_METHODS.find(m => m.id === methodId);
  return method || { id: methodId, name: methodId, description: '' };
}

/**
 * Get month name
 */
function getMonthName(monthId: string): string {
  const month = MONTHS.find(m => String(m.id) === monthId);
  return month?.name || monthId;
}

/**
 * Construct the planning prompt for Gemini
 */
interface EnhancedPlanningPromptParams {
  stateName: string;
  district: string;
  village?: string;
  landSize: number;
  landUnit: string;
  seasonData: { name: string; description: string; months: string };
  sowingMonth: string;
  soilData: { name: string; description: string };
  irrigationData: { name: string; description: string };
  irrigationMethodData: { name: string; description: string } | null;
  weatherData: WeatherData | null;
  marketDemand: SeasonalDemandInfo;
  rotationInfo: CropRotationInfo;
}

function constructEnhancedPlanningPrompt(params: EnhancedPlanningPromptParams): string {
  const {
    stateName,
    district,
    village,
    landSize,
    landUnit,
    seasonData,
    sowingMonth,
    soilData,
    irrigationData,
    irrigationMethodData,
    weatherData,
    marketDemand,
    rotationInfo,
  } = params;

  const locationInfo = village 
    ? `${village} village, ${district} district, ${stateName}` 
    : `${district} district, ${stateName}`;

  const irrigationInfo = irrigationMethodData
    ? `${irrigationData.name} irrigation using ${irrigationMethodData.name}`
    : irrigationData.name;

  // Build weather section
  let weatherSection = '';
  if (weatherData) {
    const currentWeather = weatherData.current;
    weatherSection = `
## CURRENT WEATHER CONDITIONS
- Temperature: ${currentWeather.temperature}°C (Feels like: ${currentWeather.feelsLike}°C)
- Humidity: ${currentWeather.humidity}%
- Condition: ${currentWeather.description}
- Wind Speed: ${currentWeather.windSpeed} km/h

## 7-DAY WEATHER FORECAST
${weatherData.forecast.slice(0, 7).map((day: ForecastDay) => 
  `- ${day.date}: ${day.temperature.min}°C - ${day.temperature.max}°C, ${day.description}, Rain: ${day.precipitationProbability}%`
).join('\n')}
`;
  } else {
    weatherSection = `
## WEATHER NOTE
Weather data could not be fetched. Use general seasonal patterns for ${stateName} in ${sowingMonth}.
`;
  }

  // Build market demand section
  const marketSection = `
## CURRENT MARKET DEMAND (${seasonData.name} Season)
### High Demand Crops:
${marketDemand.highDemandCrops.map(c => `- ${c}`).join('\n')}

### Festival Season Crops (good for local markets):
${marketDemand.festivalCrops.length > 0 ? marketDemand.festivalCrops.map(c => `- ${c}`).join('\n') : '- Regular demand expected'}

### Export-Oriented Crops:
${marketDemand.exportCrops.map(c => `- ${c}`).join('\n')}

### Market Tips:
${marketDemand.tips.map(t => `- ${t}`).join('\n')}
`;

  // Build crop rotation section
  const rotationSection = `
## CROP ROTATION RECOMMENDATIONS

### Rotation Principles:
${rotationInfo.rotationSuggestions.map(s => `- ${s}`).join('\n')}

### Soil Health Tips for ${soilData.name} Soil:
${rotationInfo.soilHealthTips.map(t => `- ${t}`).join('\n')}

### Benefits of Previous Crop Types:
- Legumes (Pulses): ${rotationInfo.previousCropBenefits['legumes'].join(', ')}
- Cereals: ${rotationInfo.previousCropBenefits['cereals'].join(', ')}
- Vegetables: ${rotationInfo.previousCropBenefits['vegetables'].join(', ')}
`;

  return `You are an expert agricultural consultant specializing in Indian farming conditions. Based on the following farmer's conditions, provide comprehensive crop planning recommendations.

# FARMER'S CONDITIONS
- **Location:** ${locationInfo}, India
- **Land Size:** ${landSize} ${landUnit}
- **Season:** ${seasonData.name} (${seasonData.months}) - ${seasonData.description}
- **Planned Sowing:** ${sowingMonth}
- **Soil Type:** ${soilData.name} - ${soilData.description}
- **Water/Irrigation:** ${irrigationInfo}
${weatherSection}
${marketSection}
${rotationSection}

# ANALYSIS REQUIRED

Based on ALL the above information, provide your recommendations in the following JSON format:

{
  "recommendedCrops": [
    {
      "name": "<crop name>",
      "localName": "<Hindi/regional name if applicable>",
      "suitabilityScore": <0-100>,
      "category": "<cereal|pulse|oilseed|vegetable|fruit|cash-crop|fodder>",
      "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
      "expectedYield": "<yield per ${landUnit}>",
      "marketDemand": "<high|medium|low>",
      "currentMarketPrice": "<approximate price range per quintal>",
      "waterRequirement": "<low|moderate|high - with explanation>",
      "investmentLevel": "<low|medium|high - with approximate cost per ${landUnit}>",
      "timeline": {
        "sowingWindow": "<best sowing period>",
        "harvestTime": "<expected harvest period>",
        "duration": "<total growing days>"
      },
      "weatherSuitability": "<how the weather forecast affects this crop>",
      "rotationAdvice": "<what to grow before/after this crop>",
      "risks": ["<risk 1>", "<risk 2>"],
      "tips": ["<specific tip 1>", "<specific tip 2>", "<specific tip 3>"]
    }
  ],
  "soilAnalysis": {
    "summary": "<paragraph about the soil and its suitability>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "limitations": ["<limitation 1>", "<limitation 2>"],
    "improvements": ["<improvement suggestion 1>", "<improvement suggestion 2>"]
  },
  "weatherAnalysis": {
    "summary": "<paragraph about weather factors for ${stateName} in ${sowingMonth}>",
    "favorable": ["<favorable factor 1>", "<favorable factor 2>"],
    "concerns": ["<concern 1>", "<concern 2>"],
    "precautions": ["<precaution 1>", "<precaution 2>"]
  },
  "marketAnalysis": {
    "summary": "<paragraph about current market conditions>",
    "profitableCrops": ["<crop 1>", "<crop 2>"],
    "priceVolatileCrops": ["<crop 1>", "<crop 2>"],
    "mspCrops": ["<crops with MSP support>"]
  },
  "rotationPlan": {
    "currentSeason": "<recommended crop>",
    "nextSeason": "<what to grow next>",
    "yearlyPlan": "<brief yearly rotation plan>"
  },
  "generalTips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>", "<tip 5>"],
  "warningNotes": ["<any critical warnings or concerns>"]
}

# GUIDELINES

1. Recommend 5-7 crops suitable for ${seasonData.name} season in ${stateName}
2. Consider the ACTUAL weather forecast when advising on sowing timing
3. Match water requirements with available irrigation (${irrigationData.name})
4. Include high market demand crops from the market analysis
5. Consider crop rotation benefits for long-term soil health
6. Include a mix of food crops, cash crops, and vegetables
7. Keep tips practical and actionable for small-scale farmers
8. Use simple, clear language that farmers can understand
9. Include both organic and chemical input options
10. Consider crop diversity for risk management

IMPORTANT: Return ONLY the JSON object, no additional text.`;
}

// Keep the old function for backward compatibility
interface PlanningPromptParams {
  stateName: string;
  district: string;
  village?: string;
  landSize: number;
  landUnit: string;
  seasonData: { name: string; description: string; months: string };
  sowingMonth: string;
  soilData: { name: string; description: string };
  irrigationData: { name: string; description: string };
  irrigationMethodData: { name: string; description: string } | null;
}

function _constructPlanningPrompt(params: PlanningPromptParams): string {
  const {
    stateName,
    district,
    village,
    landSize,
    landUnit,
    seasonData,
    sowingMonth,
    soilData,
    irrigationData,
    irrigationMethodData,
  } = params;

  const locationInfo = village 
    ? `${village} village, ${district} district, ${stateName}` 
    : `${district} district, ${stateName}`;

  const irrigationInfo = irrigationMethodData
    ? `${irrigationData.name} irrigation using ${irrigationMethodData.name}`
    : irrigationData.name;

  return `You are an expert agricultural consultant specializing in Indian farming conditions. Based on the following farmer's conditions, recommend 5-7 suitable crops for their farm.

FARMER'S CONDITIONS:
- Location: ${locationInfo}, India
- Land Size: ${landSize} ${landUnit}
- Season: ${seasonData.name} (${seasonData.months}) - ${seasonData.description}
- Planned Sowing: ${sowingMonth}
- Soil Type: ${soilData.name} - ${soilData.description}
- Water/Irrigation: ${irrigationInfo}

Consider the following when making recommendations:
1. Local climate and weather patterns of ${stateName}
2. Soil suitability for different crops
3. Water requirements vs available irrigation
4. Market demand in the region
5. Investment and labor requirements
6. Crop rotation benefits
7. Risk factors

Provide your response in the following JSON format:

{
  "recommendedCrops": [
    {
      "name": "<crop name>",
      "suitabilityScore": <0-100>,
      "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
      "expectedYield": "<yield per acre/hectare>",
      "marketDemand": "<high|medium|low>",
      "waterRequirement": "<description>",
      "investmentLevel": "<low|medium|high>",
      "timeline": "<growing duration>",
      "tips": ["<specific tip 1>", "<specific tip 2>"]
    }
  ],
  "soilAnalysis": "<paragraph about the soil and its suitability>",
  "weatherConsiderations": "<paragraph about weather factors for ${stateName} in ${sowingMonth}>",
  "generalTips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>", "<tip 5>"]
}

Guidelines:
1. Recommend crops suitable for ${seasonData.name} season in ${stateName}.
2. Consider the soil type limitations and advantages.
3. Match water requirements with available irrigation.
4. Include a mix of food crops, cash crops, and vegetables if applicable.
5. Keep tips practical and actionable for small-scale farmers.
6. Use simple, clear language.
7. Consider crop diversity for risk management.

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.`;
}

/**
 * Parse enhanced Gemini response into PlanningResult structure
 */
function parseEnhancedPlanningResponse(
  responseText: string,
  marketDemand: SeasonalDemandInfo,
  rotationInfo: CropRotationInfo
): PlanningResult {
  try {
    // Check for empty/null response
    if (!responseText || !responseText.trim()) {
      console.error('[Planning API] Empty response from Gemini');
      throw new Error('Empty response from AI model');
    }

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

    // Try to find JSON in the response if it's wrapped in other text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    console.log('[Planning API] Attempting to parse JSON response...');

    // Parse JSON
    const parsed = JSON.parse(cleanText);

    console.log('[Planning API] JSON parsed successfully');
    console.log('[Planning API] Crops found:', parsed.recommendedCrops?.length || 0);

    // Build enhanced soil analysis
    let soilAnalysis = '';
    if (typeof parsed.soilAnalysis === 'object') {
      soilAnalysis = parsed.soilAnalysis.summary || '';
      if (parsed.soilAnalysis.strengths?.length) {
        soilAnalysis += '\n\nStrengths: ' + parsed.soilAnalysis.strengths.join(', ');
      }
      if (parsed.soilAnalysis.improvements?.length) {
        soilAnalysis += '\n\nRecommended Improvements: ' + parsed.soilAnalysis.improvements.join(', ');
      }
    } else {
      soilAnalysis = String(parsed.soilAnalysis || '');
    }

    // Build enhanced weather analysis
    let weatherConsiderations = '';
    if (typeof parsed.weatherAnalysis === 'object') {
      weatherConsiderations = parsed.weatherAnalysis.summary || '';
      if (parsed.weatherAnalysis.favorable?.length) {
        weatherConsiderations += '\n\nFavorable Conditions: ' + parsed.weatherAnalysis.favorable.join(', ');
      }
      if (parsed.weatherAnalysis.precautions?.length) {
        weatherConsiderations += '\n\nPrecautions: ' + parsed.weatherAnalysis.precautions.join(', ');
      }
    } else {
      weatherConsiderations = String(parsed.weatherConsiderations || '');
    }

    // Combine general tips with market and rotation tips
    const generalTips = [
      ...parseStringArray(parsed.generalTips),
      ...marketDemand.tips.slice(0, 2),
      ...rotationInfo.rotationSuggestions.slice(0, 2),
    ];

    // Validate and transform the response
    const result: PlanningResult = {
      recommendedCrops: parseEnhancedCropRecommendations(parsed.recommendedCrops),
      soilAnalysis,
      weatherConsiderations,
      generalTips,
    };

    return result;
  } catch (error) {
    console.error('[Planning API] Error parsing planning response:', error);
    console.error('[Planning API] Response text length:', responseText?.length || 0);
    console.error('[Planning API] Response text (first 1000 chars):', responseText?.substring(0, 1000));
    
    // Try to extract any useful information from the response
    let errorDetails = '';
    if (error instanceof SyntaxError) {
      errorDetails = 'The AI returned an invalid response format.';
    } else if (!responseText || !responseText.trim()) {
      errorDetails = 'The AI returned an empty response.';
    } else {
      errorDetails = 'Unable to process the AI response.';
    }
    
    // Return a fallback response with market and rotation tips
    return {
      recommendedCrops: [],
      soilAnalysis: `${errorDetails} Unable to analyze soil conditions. Please consult your local agricultural office.`,
      weatherConsiderations: `${errorDetails} Unable to provide weather analysis. Check with local meteorological department.`,
      generalTips: [
        'Consult your local agricultural extension office for personalized advice',
        ...marketDemand.tips.slice(0, 2),
        ...rotationInfo.rotationSuggestions.slice(0, 2),
        'Check local market prices before deciding on crops',
      ],
    };
  }
}

/**
 * Parse enhanced crop recommendations
 */
function parseEnhancedCropRecommendations(crops: unknown): CropRecommendation[] {
  if (!Array.isArray(crops)) {
    return [];
  }

  return crops.map((crop): CropRecommendation => {
    // Handle timeline object or string
    let timeline = '3-4 months';
    if (typeof crop.timeline === 'object') {
      timeline = crop.timeline.duration || 
        `Sow: ${crop.timeline.sowingWindow || 'N/A'}, Harvest: ${crop.timeline.harvestTime || 'N/A'}`;
    } else if (typeof crop.timeline === 'string') {
      timeline = crop.timeline;
    }

    // Build enhanced tips including rotation advice and weather suitability
    const tips: string[] = parseStringArray(crop.tips);
    if (crop.rotationAdvice) {
      tips.push(`Rotation: ${crop.rotationAdvice}`);
    }
    if (crop.weatherSuitability) {
      tips.push(`Weather: ${crop.weatherSuitability}`);
    }

    return {
      name: String(crop.name || 'Unknown Crop'),
      suitabilityScore: Math.min(100, Math.max(0, Number(crop.suitabilityScore) || 50)),
      reasons: parseStringArray(crop.reasons),
      expectedYield: String(crop.expectedYield || 'Varies'),
      marketDemand: validateMarketDemand(crop.marketDemand),
      waterRequirement: String(crop.waterRequirement || 'Moderate'),
      investmentLevel: validateInvestmentLevel(crop.investmentLevel),
      timeline,
      tips,
    };
  });
}

/**
 * Parse Gemini's response into PlanningResult structure
 */
function _parsePlanningResponse(responseText: string): PlanningResult {
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
    const result: PlanningResult = {
      recommendedCrops: parseCropRecommendations(parsed.recommendedCrops),
      soilAnalysis: String(parsed.soilAnalysis || ''),
      weatherConsiderations: String(parsed.weatherConsiderations || ''),
      generalTips: parseStringArray(parsed.generalTips),
    };

    return result;
  } catch (error) {
    console.error('Error parsing planning response:', error);
    console.error('Response text:', responseText);
    
    // Return a fallback response
    return {
      recommendedCrops: [],
      soilAnalysis: 'Unable to analyze soil conditions. Please consult your local agricultural office.',
      weatherConsiderations: 'Unable to provide weather analysis. Check with local meteorological department.',
      generalTips: [
        'Consult your local agricultural extension office for personalized advice',
        'Consider getting a soil test done before planting',
        'Check local market prices before deciding on crops',
        'Plan for crop rotation to maintain soil health',
      ],
    };
  }
}

/**
 * Parse and validate crop recommendations array
 */
function parseCropRecommendations(crops: unknown): CropRecommendation[] {
  if (!Array.isArray(crops)) {
    return [];
  }

  return crops.map((crop): CropRecommendation => ({
    name: String(crop.name || 'Unknown Crop'),
    suitabilityScore: Math.min(100, Math.max(0, Number(crop.suitabilityScore) || 50)),
    reasons: parseStringArray(crop.reasons),
    expectedYield: String(crop.expectedYield || 'Varies'),
    marketDemand: validateMarketDemand(crop.marketDemand),
    waterRequirement: String(crop.waterRequirement || 'Moderate'),
    investmentLevel: validateInvestmentLevel(crop.investmentLevel),
    timeline: String(crop.timeline || '3-4 months'),
    tips: parseStringArray(crop.tips),
  }));
}

/**
 * Validate market demand value
 */
function validateMarketDemand(value: unknown): 'high' | 'medium' | 'low' {
  const strValue = String(value).toLowerCase();
  if (strValue === 'high' || strValue === 'medium' || strValue === 'low') {
    return strValue;
  }
  return 'medium';
}

/**
 * Validate investment level value
 */
function validateInvestmentLevel(value: unknown): 'low' | 'medium' | 'high' {
  const strValue = String(value).toLowerCase();
  if (strValue === 'low' || strValue === 'medium' || strValue === 'high') {
    return strValue;
  }
  return 'medium';
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
