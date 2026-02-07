import { NextRequest, NextResponse } from 'next/server';
import { getWeatherData, WeatherData } from '@/lib/weather';

// Simple in-memory cache for weather data
interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

// Generate cache key from location parameters
function getCacheKey(q?: string, lat?: string, lon?: string, state?: string, district?: string): string {
  // If using general query parameter
  if (q) {
    return `q:${q.toLowerCase().trim()}`;
  }
  
  if (lat && lon) {
    // Round coordinates to 2 decimal places for cache key
    const roundedLat = Math.round(parseFloat(lat) * 100) / 100;
    const roundedLon = Math.round(parseFloat(lon) * 100) / 100;
    return `coord:${roundedLat},${roundedLon}`;
  }
  if (state) {
    const normalizedState = state.toLowerCase().trim();
    const normalizedDistrict = district?.toLowerCase().trim() || '';
    return `loc:${normalizedState}:${normalizedDistrict}`;
  }
  return '';
}

// Get cached weather data if valid
function getCachedWeather(key: string): WeatherData | null {
  const entry = weatherCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    // Cache expired
    weatherCache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Store weather data in cache
function setCachedWeather(key: string, data: WeatherData): void {
  weatherCache.set(key, {
    data,
    timestamp: Date.now(),
  });
  
  // Clean up old entries if cache gets too large
  if (weatherCache.size > 100) {
    const now = Date.now();
    for (const [cacheKey, entry] of weatherCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        weatherCache.delete(cacheKey);
      }
    }
  }
}

/**
 * GET /api/crop-ai/weather
 * Get weather data for a location using weatherapi.com
 * 
 * Query Parameters:
 * - q: General location query (city name, lat/lon pair like "28.6,77.2", or IP address)
 * - lat, lon: Coordinate-based location (alternative to q)
 * - state, district: State/district-based location for India (alternative to q)
 * - days: Number of forecast days (1-10, default 3)
 * 
 * Examples:
 * - /api/crop-ai/weather?q=Mumbai
 * - /api/crop-ai/weather?q=28.6,77.2
 * - /api/crop-ai/weather?lat=28.6&lon=77.2
 * - /api/crop-ai/weather?state=Maharashtra&district=Pune
 * - /api/crop-ai/weather?q=Delhi&days=5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get location parameters
    const q = searchParams.get('q');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon') || searchParams.get('lng');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const daysParam = searchParams.get('days');
    
    // Parse days parameter (1-10, default 3)
    let days = 3;
    if (daysParam) {
      const parsedDays = parseInt(daysParam, 10);
      if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 10) {
        days = parsedDays;
      }
    }

    // Validate location data - need at least one location method
    if (!q && !lat && !lon && !state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location data required. Provide q (query), lat/lon coordinates, or state/district.',
        },
        { status: 400 }
      );
    }

    // If coordinates provided without q, validate them
    if (!q && ((lat && !lon) || (!lat && lon))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both lat and lon are required when using coordinates.',
        },
        { status: 400 }
      );
    }

    if (!q && lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid coordinates. lat and lon must be valid numbers.',
          },
          { status: 400 }
        );
      }

      if (latitude < -90 || latitude > 90) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid latitude. Must be between -90 and 90.',
          },
          { status: 400 }
        );
      }

      if (longitude < -180 || longitude > 180) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid longitude. Must be between -180 and 180.',
          },
          { status: 400 }
        );
      }
    }

    // Generate cache key
    const cacheKey = getCacheKey(
      q || undefined,
      lat || undefined,
      lon || undefined,
      state || undefined,
      district || undefined
    );

    // Check cache
    const cachedData = getCachedWeather(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: formatWeatherResponse(cachedData),
        cached: true,
        cacheExpiresIn: CACHE_TTL - (Date.now() - weatherCache.get(cacheKey)!.timestamp),
      });
    }

    // Build location input based on provided parameters
    let locationInput: { lat: number; lon: number } | { state: string; district?: string };
    
    if (q) {
      // Check if q is a coordinate pair (e.g., "28.6,77.2")
      const coordMatch = q.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        locationInput = {
          lat: parseFloat(coordMatch[1]),
          lon: parseFloat(coordMatch[2]),
        };
      } else {
        // Treat as a location name - use state/district format
        // For general queries, we'll use the state field as the general query
        locationInput = { state: q };
      }
    } else if (lat && lon) {
      locationInput = { lat: parseFloat(lat), lon: parseFloat(lon) };
    } else {
      locationInput = { state: state!, district: district || undefined };
    }

    // Fetch weather data
    const weatherData = await getWeatherData(locationInput, days);

    // Cache the result
    setCachedWeather(cacheKey, weatherData);

    return NextResponse.json({
      success: true,
      data: formatWeatherResponse(weatherData),
      cached: false,
    });

  } catch (error) {
    console.error('Weather API error:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Weather service configuration error. Please try again later.',
          },
          { status: 503 }
        );
      }
      if (error.message.includes('coordinates')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 400 }
        );
      }
      // Handle weatherapi.com specific errors
      if (error.message.includes('No matching location') || error.message.includes('Unable to find')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Location not found. Please check the location name or coordinates.',
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weather data',
      },
      { status: 500 }
    );
  }
}

// Format weather data for API response
function formatWeatherResponse(weather: WeatherData) {
  return {
    location: {
      name: weather.location.name,
      state: weather.location.state,
      country: weather.location.country,
      coordinates: {
        lat: weather.location.lat,
        lon: weather.location.lon,
      },
    },
    current: {
      temperature: weather.current.temperature,
      feelsLike: weather.current.feelsLike,
      humidity: weather.current.humidity,
      pressure: weather.current.pressure,
      windSpeed: weather.current.windSpeed,
      windDirection: weather.current.windDirection,
      visibility: weather.current.visibility,
      condition: weather.current.condition,
      description: weather.current.description,
      icon: weather.current.icon,
      cloudCover: weather.current.cloudCover,
      uvIndex: weather.current.uvIndex,
      timestamp: weather.current.timestamp.toISOString(),
    },
    forecast: weather.forecast.map(day => ({
      date: day.date instanceof Date ? day.date.toISOString().split('T')[0] : String(day.date),
      temperature: {
        min: day.temperature.min,
        max: day.temperature.max,
        day: day.temperature.day,
        night: day.temperature.night,
      },
      humidity: day.humidity,
      condition: day.condition,
      description: day.description,
      icon: day.icon,
      precipitation: day.precipitation,
      precipitationProbability: Math.round(day.precipitationProbability * 100),
      windSpeed: day.windSpeed,
    })),
    alerts: weather.alerts?.map(alert => ({
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      start: alert.start.toISOString(),
      end: alert.end.toISOString(),
    })) || [],
  };
}
