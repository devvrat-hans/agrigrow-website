import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { getIdentifier, checkRateLimit, recordRequest, addRateLimitHeaders, createRateLimitResponse } from '@/lib/rate-limit';
import { getCache, generateCacheKey, isCacheable } from '@/lib/ai-cache';
import { recordSuccess, recordError } from '@/lib/ai-analytics';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  /** Optional crops context for this conversation */
  cropsContext?: string[];
}

interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    conversationHistory: ChatMessage[];
  };
  error?: string;
  errorCode?: string;
}

interface SeasonalContext {
  month: string;
  monthNumber: number;
  season: string;
  seasonDescription: string;
  typicalActivities: string[];
  commonChallenges: string[];
  weatherPattern: string;
}

interface UserContext {
  name?: string;
  role?: string;
  location?: {
    state?: string;
    district?: string;
  };
  crops?: string[];
  experienceLevel?: string;
  language?: string;
}

// ============================================
// ERROR DEFINITIONS
// ============================================

interface ChatError {
  code: string;
  message: string;
  userMessage: string;
  statusCode: number;
  retryable: boolean;
}

const CHAT_ERRORS: Record<string, ChatError> = {
  MISSING_API_KEY: {
    code: 'MISSING_API_KEY',
    message: 'GEMINI_API_KEY is not configured',
    userMessage: 'AI service is temporarily unavailable. Please try again later.',
    statusCode: 500,
    retryable: false,
  },
  MISSING_MESSAGE: {
    code: 'MISSING_MESSAGE',
    message: 'Message is required',
    userMessage: 'Please enter a message to send.',
    statusCode: 400,
    retryable: false,
  },
  MESSAGE_TOO_LONG: {
    code: 'MESSAGE_TOO_LONG',
    message: 'Message exceeds maximum length',
    userMessage: 'Your message is too long. Please keep it under 2000 characters.',
    statusCode: 400,
    retryable: false,
  },
  AI_BLOCKED: {
    code: 'AI_BLOCKED',
    message: 'AI response was blocked by safety settings',
    userMessage: 'I couldn\'t process that request. Please try rephrasing your question.',
    statusCode: 422,
    retryable: true,
  },
  AI_ERROR: {
    code: 'AI_ERROR',
    message: 'AI processing failed',
    userMessage: 'Something went wrong. Please try again.',
    statusCode: 500,
    retryable: true,
  },
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    message: 'Invalid request body',
    userMessage: 'Invalid request. Please try again.',
    statusCode: 400,
    retryable: false,
  },
};

// ============================================
// SEASONAL CONTEXT
// ============================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get current seasonal context based on Indian agricultural calendar
 */
function getCurrentSeasonalContext(): SeasonalContext {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  
  // Kharif season (June - October): Monsoon crops
  if (month >= 5 && month <= 9) {
    return {
      month: MONTH_NAMES[month],
      monthNumber: month + 1,
      season: 'Kharif',
      seasonDescription: 'Monsoon/Rainy Season',
      typicalActivities: [
        'Sowing of monsoon crops like rice, maize, cotton, soybean',
        'Transplanting of paddy',
        'Weed management in fields',
        'Monitoring for pest and disease outbreaks',
        'Drainage management for waterlogged areas',
      ],
      commonChallenges: [
        'Fungal diseases due to high humidity',
        'Root rot from waterlogging',
        'Bacterial and viral diseases',
        'Heavy pest pressure (caterpillars, borers)',
        'Weed competition',
        'Soil erosion from heavy rains',
      ],
      weatherPattern: 'Monsoon rains with high humidity and warm temperatures (25-35°C)',
    };
  }
  
  // Rabi season (November - March): Winter crops
  if (month >= 10 || month <= 2) {
    return {
      month: MONTH_NAMES[month],
      monthNumber: month + 1,
      season: 'Rabi',
      seasonDescription: 'Winter Season',
      typicalActivities: [
        'Sowing of wheat, chickpea, mustard, barley',
        'Irrigation scheduling for winter crops',
        'Applying fertilizers for crop growth',
        'Pest monitoring (aphids common)',
        'Preparing for upcoming harvest (late Rabi)',
      ],
      commonChallenges: [
        'Frost damage in northern regions',
        'Aphid and whitefly infestations',
        'Powdery mildew in mustard and peas',
        'Nutrient deficiencies (particularly micronutrients)',
        'Fog-related diseases',
        'Irrigation water management',
      ],
      weatherPattern: 'Cool to cold temperatures (5-25°C) with low humidity and occasional fog',
    };
  }
  
  // Zaid season (March - May): Summer crops
  return {
    month: MONTH_NAMES[month],
    monthNumber: month + 1,
    season: 'Zaid',
    seasonDescription: 'Summer Season',
    typicalActivities: [
      'Growing short-duration vegetables',
      'Cucurbit cultivation (cucumber, watermelon, muskmelon)',
      'Fodder crop production',
      'Land preparation for Kharif',
      'Harvesting late Rabi crops',
    ],
    commonChallenges: [
      'Heat stress and wilting',
      'Water scarcity and irrigation challenges',
      'Spider mites and thrips attacks',
      'Sunburn on fruits and leaves',
      'High evapotranspiration rates',
      'Fruit cracking due to heat',
    ],
    weatherPattern: 'Hot and dry conditions (30-45°C) with intense sunlight',
  };
}

// ============================================
// REGIONAL CONTEXT
// ============================================

/**
 * Get regional farming context based on Indian state
 */
function getRegionalContext(state?: string): string {
  if (!state) return '';
  
  const stateContext: Record<string, string> = {
    // North India
    'Punjab': 'Major wheat and rice producing state. Known for intensive agriculture with good irrigation infrastructure.',
    'Haryana': 'Important for wheat, rice, and dairy farming. Part of the Green Revolution belt.',
    'Uttar Pradesh': 'Largest agricultural state. Diverse crops including sugarcane, wheat, rice, potatoes.',
    'Rajasthan': 'Arid climate, focus on pearl millet (bajra), pulses, oilseeds. Water conservation is critical.',
    'Uttarakhand': 'Himalayan state with terrace farming. Organic farming is growing. Fruits and vegetables.',
    'Himachal Pradesh': 'Apple orchards, vegetables. High-altitude farming with unique challenges.',
    'Jammu and Kashmir': 'Saffron, apples, walnuts. Cold climate agriculture.',
    
    // East India
    'West Bengal': 'Major rice producer, jute cultivation. High rainfall areas. Fish farming integrated.',
    'Bihar': 'Rice, wheat, maize, vegetables. Flood-prone areas along Ganga.',
    'Odisha': 'Rice-based farming, pulses. Cyclone-prone coastal areas.',
    'Jharkhand': 'Plateau region with vegetables, rice. Tribal farming practices.',
    
    // West India
    'Maharashtra': 'Diverse agriculture - sugarcane, cotton, soybean, grapes. Drip irrigation common.',
    'Gujarat': 'Cotton, groundnut, cumin. Good irrigation systems. Dairy farming important.',
    'Goa': 'Rice, coconut, cashew. Coastal farming with salinity concerns.',
    
    // South India
    'Karnataka': 'Coffee, spices, ragi, rice. Dry land farming in north, plantation crops in south.',
    'Kerala': 'Spices (pepper, cardamom), rubber, coconut. High rainfall, plantation farming.',
    'Tamil Nadu': 'Rice, sugarcane, bananas. Both irrigated and rain-fed areas.',
    'Andhra Pradesh': 'Rice, cotton, chillies, mango. Both coastal and dry regions.',
    'Telangana': 'Cotton, rice, turmeric. Tank irrigation traditional.',
    
    // Central India
    'Madhya Pradesh': 'Largest producer of pulses and oilseeds. Soybean major crop.',
    'Chhattisgarh': 'Rice bowl of India. Forest produce also significant.',
    
    // Northeast India
    'Assam': 'Tea, rice, jute. High rainfall, flood management important.',
    'Meghalaya': 'Turmeric, ginger, pineapple. Hill farming with jhum (shifting cultivation).',
    'Manipur': 'Rice, fruits, vegetables. Valley and hill farming different.',
    'Tripura': 'Rice, rubber, bamboo. Small farm holdings.',
    'Nagaland': 'Rice, maize, fruits. Terrace farming.',
    'Arunachal Pradesh': 'Subtropical to alpine crops. Organic farming focus.',
    'Mizoram': 'Jhum cultivation transitioning to settled farming.',
    'Sikkim': 'First fully organic state. Cardamom, ginger, oranges.',
  };
  
  return stateContext[state] || `Farming in ${state} region of India.`;
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

/**
 * Build a context-aware system prompt
 */
function buildSystemPrompt(
  seasonalContext: SeasonalContext,
  userContext: UserContext,
  cropsContext?: string[]
): string {
  // Base identity and expertise
  let prompt = `You are AgriGrow AI, an expert agricultural assistant specifically designed for Indian farmers.

CURRENT CONTEXT:
- Date: ${seasonalContext.month} (${seasonalContext.season} season - ${seasonalContext.seasonDescription})
- Weather Pattern: ${seasonalContext.weatherPattern}
- Typical Activities This Time: ${seasonalContext.typicalActivities.slice(0, 3).join(', ')}
- Common Challenges Now: ${seasonalContext.commonChallenges.slice(0, 3).join(', ')}
`;

  // Add user context if available
  if (userContext.name || userContext.location?.state || userContext.crops?.length) {
    prompt += `\nFARMER CONTEXT:\n`;
    
    if (userContext.name) {
      prompt += `- Name: ${userContext.name}\n`;
    }
    
    if (userContext.location?.state) {
      prompt += `- Location: ${userContext.location.district ? userContext.location.district + ', ' : ''}${userContext.location.state}\n`;
      prompt += `- Regional Info: ${getRegionalContext(userContext.location.state)}\n`;
    }
    
    // Combine user's profile crops and conversation-specific crops
    const allCrops = new Set<string>();
    if (userContext.crops?.length) {
      userContext.crops.forEach(c => allCrops.add(c));
    }
    if (cropsContext?.length) {
      cropsContext.forEach(c => allCrops.add(c));
    }
    
    if (allCrops.size > 0) {
      prompt += `- Crops of Interest: ${Array.from(allCrops).join(', ')}\n`;
    }
    
    if (userContext.experienceLevel) {
      prompt += `- Experience Level: ${userContext.experienceLevel}\n`;
    }
    
    if (userContext.role) {
      prompt += `- Profile: ${userContext.role}\n`;
    }
  }

  // Core expertise and guidelines
  prompt += `
YOUR EXPERTISE:
- Crop diseases identification and treatment (fungal, bacterial, viral)
- Pest management (integrated pest management, organic and chemical solutions)
- Nutrient deficiencies diagnosis and fertilizer recommendations
- Irrigation and water management
- Seasonal farming advice tailored to Indian conditions
- Organic and traditional farming methods (desi kheti)
- Weather-based farming decisions
- Soil health and improvement techniques
- Post-harvest handling and storage
- Government schemes and subsidies (PM-KISAN, PMFBY, etc.)

RESPONSE GUIDELINES:
1. Keep responses CONCISE and ACTIONABLE - farmers need practical advice
2. Use SIMPLE language that any farmer can understand
3. When discussing treatments, mention both ORGANIC/NATURAL and CHEMICAL options
4. Consider REGIONAL and SEASONAL factors in your advice
5. Provide STEP-BY-STEP instructions when explaining procedures
6. Include DOSAGE and APPLICATION methods when recommending products
7. Mention SAFETY precautions when discussing pesticides
8. If unsure, acknowledge and suggest consulting local agricultural experts or Krishi Vigyan Kendra (KVK)
9. Be ENCOURAGING and SUPPORTIVE - farming is challenging
10. Use HINDI/HINGLISH terms in parentheses when helpful (e.g., aphids (माहू/mahoo))

FORMAT YOUR RESPONSES:
- Use bullet points for lists
- Use numbered steps for procedures
- Bold important warnings or key points using **text**
- Keep paragraphs short and readable
- Include estimated costs or quantities when relevant

ALWAYS PRIORITIZE:
- Farmer safety and health
- Sustainable farming practices
- Cost-effective solutions
- Crop health and yield improvement`;

  return prompt;
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
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE_CHAT || '0.7'),
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS_CHAT || '1024', 10),
  };
}

// ============================================
// USER CONTEXT HELPER
// ============================================

/**
 * Fetch user context from database
 */
async function getUserContext(phone: string | null): Promise<UserContext> {
  if (!phone) return {};
  
  try {
    await dbConnect();
    const cleanPhone = phone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone }).lean() as IUser | null;
    
    if (!user) return {};
    
    return {
      name: user.fullName,
      role: user.role,
      location: {
        state: user.state,
        district: user.district,
      },
      crops: user.crops,
      experienceLevel: user.experienceLevel,
      language: user.language,
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return {};
  }
}

// ============================================
// ERROR RESPONSE HELPER
// ============================================

function createErrorResponse(error: ChatError): NextResponse<ChatResponse> {
  return NextResponse.json(
    {
      success: false,
      error: error.userMessage,
      errorCode: error.code,
    },
    { status: error.statusCode }
  );
}

// ============================================
// POST HANDLER
// ============================================

/**
 * POST /api/crop-ai/chat
 * 
 * Handles chat messages with context-aware AI responses.
 * Incorporates seasonal, regional, and user-specific context.
 * 
 * Rate limited: 50 requests/hour, 200 requests/day per user
 * 
 * Headers:
 * - x-user-phone: Optional phone number for user context
 * 
 * Body:
 * - message: The user's message
 * - conversationHistory: Previous messages in the conversation
 * - cropsContext: Optional crops to focus the conversation on
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  
  // Check rate limit before processing
  const { identifier } = getIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier);
  
  if (!rateLimitResult.allowed) {
    console.log(`[Chat API] Rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult) as NextResponse<ChatResponse>;
  }
  
  try {
    // Parse request body
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(CHAT_ERRORS.INVALID_REQUEST);
    }
    
    const { message, conversationHistory = [], cropsContext } = body;

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return createErrorResponse(CHAT_ERRORS.MISSING_MESSAGE);
    }

    if (message.length > 2000) {
      return createErrorResponse(CHAT_ERRORS.MESSAGE_TOO_LONG);
    }

    // Check for API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('[Chat API] Missing GEMINI_API_KEY');
      return createErrorResponse(CHAT_ERRORS.MISSING_API_KEY);
    }

    // Get user context from header (optional)
    const userPhone = request.headers.get('x-user-phone');
    const userContext = await getUserContext(userPhone);
    
    // Get seasonal context
    const seasonalContext = getCurrentSeasonalContext();
    
    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(seasonalContext, userContext, cropsContext);
    
    // Get model configuration
    const modelConfig = getModelConfig();
    
    // Initialize the model
    const model = genAI.getGenerativeModel({ 
      model: modelConfig.model,
    });

    // Build conversation history with system prompt
    const history: ChatMessage[] = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ 
          text: `Namaste! I am AgriGrow AI, your farming assistant. I'm here to help you with any agricultural questions.

**Current Season**: ${seasonalContext.season} (${seasonalContext.seasonDescription})
${userContext.location?.state ? `**Your Region**: ${userContext.location.state}` : ''}
${userContext.crops?.length ? `**Your Crops**: ${userContext.crops.join(', ')}` : ''}

How can I help you with your farming today? You can ask me about:
- Crop diseases and treatments
- Pest control (organic & chemical)
- Fertilizers and nutrition
- Irrigation and water management
- Season-specific advice
- Government schemes` 
        }],
      },
      ...conversationHistory,
    ];

    // Start chat session with configuration
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: modelConfig.maxOutputTokens,
        temperature: modelConfig.temperature,
      },
    });

    // Check if this query can use caching (only for new conversations with general questions)
    const cache = getCache();
    const canCache = conversationHistory.length === 0 && isCacheable('chat', message, {
      season: seasonalContext.season,
      state: userContext.location?.state,
      crop: cropsContext?.[0],
    });

    let responseText = '';
    let fromCache = false;

    // Generate cache key based on normalized query and context
    const cacheKey = canCache ? generateCacheKey('chat', message, {
      season: seasonalContext.season,
      state: userContext.location?.state,
      crop: cropsContext?.[0],
    }) : '';

    // Try to get cached response for new conversations
    if (canCache) {
      const cachedResponse = cache.get<string>(cacheKey);
      if (cachedResponse) {
        responseText = cachedResponse;
        fromCache = true;
        console.log(`[Chat API] Cache HIT for query: "${message.substring(0, 50)}..."`);
      }
    }

    // If not cached, call Gemini API
    if (!fromCache) {
      const result = await chat.sendMessage(message.trim());
      const geminiResponse = await result.response;
      responseText = geminiResponse.text();

      // Cache the response if cacheable
      if (canCache && responseText && responseText.trim()) {
        cache.set(cacheKey, responseText, 'chat');
        console.log(`[Chat API] Cached response for query: "${message.substring(0, 50)}..."`);
      }
    }
    
    // Check if response was blocked
    if (!responseText || responseText.trim() === '') {
      console.error('[Chat API] Empty response received');
      return createErrorResponse(CHAT_ERRORS.AI_BLOCKED);
    }

    // Update conversation history (without system prompt overhead)
    const updatedHistory: ChatMessage[] = [
      ...conversationHistory,
      {
        role: 'user',
        parts: [{ text: message.trim() }],
      },
      {
        role: 'model',
        parts: [{ text: responseText }],
      },
    ];

    // Record the successful request for rate limiting (even for cached responses to track usage)
    recordRequest(identifier);

    // Log success for monitoring
    const duration = Date.now() - startTime;
    console.log(`[Chat API] Success in ${duration}ms, user: ${userPhone || 'anonymous'}, season: ${seasonalContext.season}, cached: ${fromCache}`);

    // Record analytics
    recordSuccess('chat', duration, {
      userPhone: userPhone || undefined,
      cached: fromCache,
      metadata: {
        season: seasonalContext.season,
        state: userContext.location?.state,
        crop: cropsContext?.[0],
        model: modelConfig.model,
        queryLength: message.length,
        responseLength: responseText.length,
      },
    });

    // Create response with rate limit headers
    const response = NextResponse.json({
      success: true,
      data: {
        response: responseText,
        conversationHistory: updatedHistory,
      },
    });
    
    // Add rate limit headers
    const updatedRateLimitResult = checkRateLimit(identifier);
    addRateLimitHeaders(response.headers, updatedRateLimitResult);
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Chat API] Error after ${duration}ms:`, error);

    // Record error analytics
    const errorCode = error instanceof SyntaxError ? 'INVALID_REQUEST' : 'AI_ERROR';
    recordError('chat', duration, errorCode, error instanceof Error ? error.message : 'Unknown error');

    // Handle specific errors
    if (error instanceof SyntaxError) {
      return createErrorResponse(CHAT_ERRORS.INVALID_REQUEST);
    }
    
    // Check for blocked content
    if (error instanceof Error && error.message.includes('blocked')) {
      return createErrorResponse(CHAT_ERRORS.AI_BLOCKED);
    }

    return createErrorResponse(CHAT_ERRORS.AI_ERROR);
  }
}
