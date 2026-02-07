// Weather API Client for Crop AI
// This module provides weather data fetching and farming suggestions
// based on weather conditions for Indian farmers.
// Uses weatherapi.com for weather data

import { GeminiCropAnalysisResult } from './gemini';
import type {
  WeatherApiResponse,
  ForecastDay as ApiForecastDay,
} from '@/types/weather';

// TYPE DEFINITIONS

// Weather condition codes
export type WeatherCondition = 
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'fog'
  | 'haze'
  | 'dust'
  | 'smoke';

// Weather data structure (compatible with existing code)
export interface WeatherData {
  location: {
    name: string;
    state?: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    visibility: number;
    condition: WeatherCondition;
    description: string;
    icon: string;
    cloudCover: number;
    uvIndex?: number;
    timestamp: Date;
  };
  forecast: ForecastDay[];
  alerts?: WeatherAlert[];
}

// Daily forecast structure
export interface ForecastDay {
  date: Date;
  temperature: {
    min: number;
    max: number;
    day: number;
    night: number;
  };
  humidity: number;
  condition: WeatherCondition;
  description: string;
  icon: string;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
}

// Weather alert structure
export interface WeatherAlert {
  type: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  title: string;
  description: string;
  start: Date;
  end: Date;
}

// Location input types
export interface CoordinatesInput {
  lat: number;
  lon: number;
}

export interface LocationInput {
  state: string;
  district?: string;
}

export type WeatherLocationInput = CoordinatesInput | LocationInput;

// Weather suggestions for farming
export interface WeatherSuggestion {
  type: 'rain' | 'heat' | 'cold' | 'humidity' | 'wind' | 'general';
  urgency: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actions: string[];
}

// UTILITY FUNCTIONS

// Check if input is coordinates
function isCoordinates(input: WeatherLocationInput): input is CoordinatesInput {
  return 'lat' in input && 'lon' in input;
}

// Build location query string for weatherapi.com
function buildLocationQuery(location: WeatherLocationInput): string {
  if (isCoordinates(location)) {
    return `${location.lat},${location.lon}`;
  }
  
  // For state/district, build a search query
  if (location.district) {
    return `${location.district}, ${location.state}, India`;
  }
  return `${location.state}, India`;
}

// Map weatherapi.com condition code to our WeatherCondition type
function mapConditionCode(code: number, text: string): WeatherCondition {
  // weatherapi.com condition codes: https://www.weatherapi.com/docs/weather_conditions.json
  // Clear/Sunny: 1000
  if (code === 1000) return 'clear';
  
  // Cloudy: 1003, 1006, 1009
  if ([1003, 1006, 1009].includes(code)) return 'clouds';
  
  // Mist/Fog/Freezing fog: 1030, 1135, 1147
  if (code === 1030) return 'mist';
  if ([1135, 1147].includes(code)) return 'fog';
  
  // Drizzle: 1150, 1153, 1168, 1171
  if ([1150, 1153, 1168, 1171].includes(code)) return 'drizzle';
  
  // Rain: 1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246
  if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return 'rain';
  
  // Thunderstorm: 1087, 1273, 1276, 1279, 1282
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 'thunderstorm';
  
  // Snow: 1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264
  if ([1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code)) return 'snow';
  
  // Fallback based on text
  const lowerText = text.toLowerCase();
  if (lowerText.includes('clear') || lowerText.includes('sunny')) return 'clear';
  if (lowerText.includes('cloud') || lowerText.includes('overcast')) return 'clouds';
  if (lowerText.includes('rain')) return 'rain';
  if (lowerText.includes('drizzle')) return 'drizzle';
  if (lowerText.includes('thunder')) return 'thunderstorm';
  if (lowerText.includes('snow') || lowerText.includes('sleet') || lowerText.includes('ice')) return 'snow';
  if (lowerText.includes('mist')) return 'mist';
  if (lowerText.includes('fog')) return 'fog';
  if (lowerText.includes('haze') || lowerText.includes('hazy')) return 'haze';
  if (lowerText.includes('dust')) return 'dust';
  if (lowerText.includes('smoke')) return 'smoke';
  
  return 'clear';
}

// Convert wind degree to direction string
function getWindDirection(degree: number): number {
  return degree;
}

// Map severity string from API to our type
function mapSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
  const lowerSeverity = severity.toLowerCase();
  if (lowerSeverity.includes('extreme')) return 'extreme';
  if (lowerSeverity.includes('severe')) return 'severe';
  if (lowerSeverity.includes('moderate')) return 'moderate';
  return 'minor';
}

// Transform weatherapi.com response to our WeatherData format
function transformApiResponse(
  apiResponse: WeatherApiResponse,
  originalLocation?: LocationInput
): WeatherData {
  const { location, current, forecast, alerts } = apiResponse;
  
  // Transform current weather
  const transformedCurrent = {
    temperature: Math.round(current.temp_c),
    feelsLike: Math.round(current.feelslike_c),
    humidity: current.humidity,
    pressure: current.pressure_mb,
    windSpeed: current.wind_kph / 3.6, // Convert km/h to m/s
    windDirection: getWindDirection(current.wind_degree),
    visibility: current.vis_km,
    condition: mapConditionCode(current.condition.code, current.condition.text),
    description: current.condition.text,
    icon: current.condition.icon,
    cloudCover: current.cloud,
    uvIndex: current.uv,
    timestamp: new Date(current.last_updated_epoch * 1000),
  };
  
  // Transform forecast days
  const transformedForecast: ForecastDay[] = (forecast?.forecastday || []).map(
    (day: ApiForecastDay) => {
      // Calculate average day/night temperatures from hourly if available
      const hourlyTemps = day.hour || [];
      const dayHours = hourlyTemps.filter(h => {
        const hour = new Date(h.time_epoch * 1000).getHours();
        return hour >= 6 && hour < 18;
      });
      const nightHours = hourlyTemps.filter(h => {
        const hour = new Date(h.time_epoch * 1000).getHours();
        return hour < 6 || hour >= 18;
      });
      
      const avgDayTemp = dayHours.length > 0
        ? dayHours.reduce((sum, h) => sum + h.temp_c, 0) / dayHours.length
        : day.day.avgtemp_c;
      const avgNightTemp = nightHours.length > 0
        ? nightHours.reduce((sum, h) => sum + h.temp_c, 0) / nightHours.length
        : day.day.mintemp_c;
      
      return {
        date: new Date(day.date_epoch * 1000),
        temperature: {
          min: Math.round(day.day.mintemp_c),
          max: Math.round(day.day.maxtemp_c),
          day: Math.round(avgDayTemp),
          night: Math.round(avgNightTemp),
        },
        humidity: day.day.avghumidity,
        condition: mapConditionCode(day.day.condition.code, day.day.condition.text),
        description: day.day.condition.text,
        icon: day.day.condition.icon,
        precipitation: day.day.totalprecip_mm,
        precipitationProbability: day.day.daily_chance_of_rain / 100,
        windSpeed: day.day.maxwind_kph / 3.6, // Convert km/h to m/s
      };
    }
  );
  
  // Transform alerts if present
  const transformedAlerts: WeatherAlert[] | undefined = alerts?.alert?.map(alert => ({
    type: alert.event,
    severity: mapSeverity(alert.severity),
    title: alert.headline || alert.event,
    description: alert.desc,
    start: new Date(alert.effective),
    end: new Date(alert.expires),
  }));
  
  return {
    location: {
      name: location.name,
      state: originalLocation?.state || location.region,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
    },
    current: transformedCurrent,
    forecast: transformedForecast,
    alerts: transformedAlerts && transformedAlerts.length > 0 ? transformedAlerts : undefined,
  };
}

// MAIN API FUNCTIONS

/**
 * Get weather data for a location using weatherapi.com
 * @param location - Either coordinates {lat, lon} or location {state, district?}
 * @param days - Number of forecast days (1-10, default 3)
 * @returns Promise<WeatherData>
 */
export async function getWeatherData(
  location: WeatherLocationInput,
  days: number = 3
): Promise<WeatherData> {
  const apiKey = process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'Weather API key is not configured. Please set WEATHER_API_KEY environment variable.'
    );
  }
  
  const query = buildLocationQuery(location);
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=${days}&aqi=no&alerts=yes`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    // Cache for 15 minutes
    next: { revalidate: 900 },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Weather API error:', response.status, errorText);
    
    // Parse error if possible
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error?.message || 'Failed to fetch weather data');
    } catch {
      throw new Error('Failed to fetch weather data. Please try again later.');
    }
  }
  
  const data = await response.json() as WeatherApiResponse;
  
  // Transform and return
  const originalLocation = !isCoordinates(location) ? location : undefined;
  return transformApiResponse(data, originalLocation);
}

/**
 * Get weather data with fallback for errors
 */
export async function getWeatherDataSafe(
  location: WeatherLocationInput,
  days: number = 3
): Promise<WeatherData | null> {
  try {
    return await getWeatherData(location, days);
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

// WEATHER SUGGESTIONS GENERATION

/**
 * Generate weather-based farming suggestions
 */
export function getWeatherSuggestions(
  weather: WeatherData,
  analysisResult?: GeminiCropAnalysisResult
): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const { current, forecast } = weather;
  
  // Check for rain in forecast
  const rainExpected = forecast.some(
    day => day.precipitationProbability > 0.5 || day.condition === 'rain'
  );
  const heavyRainExpected = forecast.some(
    day => day.precipitation > 10 || day.precipitationProbability > 0.8
  );
  
  // Current rain suggestions
  if (current.condition === 'rain' || current.condition === 'drizzle') {
    suggestions.push({
      type: 'rain',
      urgency: 'high',
      title: 'Rain Ongoing',
      description: 'It is currently raining in your area.',
      actions: [
        'Pause any spraying activities',
        'Ensure proper drainage in fields',
        'Check for waterlogging in low-lying areas',
        'Delay harvesting of ripened crops',
      ],
    });
  } else if (rainExpected) {
    suggestions.push({
      type: 'rain',
      urgency: heavyRainExpected ? 'high' : 'medium',
      title: 'Rain Expected',
      description: `Rain is expected in the next ${heavyRainExpected ? '24-48 hours' : 'few days'}.`,
      actions: [
        'Complete any pending pesticide or fertilizer applications today',
        'Prepare drainage channels',
        'Harvest mature crops if possible',
        'Secure any loose farming equipment',
        heavyRainExpected ? 'Consider staking tall crops to prevent lodging' : '',
      ].filter(Boolean),
    });
  }
  
  // Heat stress suggestions
  if (current.temperature > 38) {
    suggestions.push({
      type: 'heat',
      urgency: 'high',
      title: 'Extreme Heat Warning',
      description: `Temperature is very high at ${current.temperature}°C.`,
      actions: [
        'Water crops early morning or late evening',
        'Apply mulch to retain soil moisture',
        'Provide shade for sensitive crops if possible',
        'Increase irrigation frequency',
        'Avoid working in fields during peak heat hours (11 AM - 4 PM)',
      ],
    });
  } else if (current.temperature > 35) {
    suggestions.push({
      type: 'heat',
      urgency: 'medium',
      title: 'High Temperature Alert',
      description: `Current temperature is ${current.temperature}°C.`,
      actions: [
        'Ensure adequate irrigation',
        'Consider mulching to reduce soil temperature',
        'Water plants in early morning',
      ],
    });
  }
  
  // Cold stress suggestions
  if (current.temperature < 10) {
    suggestions.push({
      type: 'cold',
      urgency: current.temperature < 5 ? 'high' : 'medium',
      title: current.temperature < 5 ? 'Frost Risk' : 'Cold Weather Alert',
      description: `Temperature is low at ${current.temperature}°C.`,
      actions: [
        'Cover sensitive crops with cloth or plastic',
        'Water soil in evening to retain heat',
        'Delay transplanting of seedlings',
        current.temperature < 5 ? 'Light smoke fires upwind to protect from frost' : '',
      ].filter(Boolean),
    });
  }
  
  // High humidity suggestions
  if (current.humidity > 85) {
    const hasDiseases = analysisResult?.diseases && analysisResult.diseases.length > 0;
    suggestions.push({
      type: 'humidity',
      urgency: hasDiseases ? 'high' : 'medium',
      title: 'High Humidity Alert',
      description: `Humidity is ${current.humidity}%. ${hasDiseases ? 'This can worsen existing diseases.' : 'This increases disease risk.'}`,
      actions: [
        'Monitor crops for fungal diseases',
        'Ensure good air circulation between plants',
        'Apply preventive fungicides if needed',
        'Avoid overhead irrigation',
        'Remove infected plant parts promptly',
      ],
    });
  }
  
  // Strong wind suggestions
  if (current.windSpeed > 10) {
    suggestions.push({
      type: 'wind',
      urgency: current.windSpeed > 15 ? 'high' : 'low',
      title: 'Windy Conditions',
      description: `Wind speed is ${Math.round(current.windSpeed)} m/s.`,
      actions: [
        'Do not spray pesticides or fertilizers',
        'Stake tall plants to prevent damage',
        'Secure shade nets and polytunnels',
        current.windSpeed > 15 ? 'Avoid field work until winds subside' : '',
      ].filter(Boolean),
    });
  }
  
  // General seasonal suggestions based on weather patterns
  const avgForecastTemp = forecast.reduce((sum, d) => sum + d.temperature.day, 0) / forecast.length;
  
  if (avgForecastTemp > 30 && !rainExpected) {
    suggestions.push({
      type: 'general',
      urgency: 'low',
      title: 'Dry Weather Ahead',
      description: 'Warm and dry conditions expected this week.',
      actions: [
        'Plan irrigation schedule carefully',
        'Good time for harvesting and drying crops',
        'Check soil moisture levels regularly',
        'Consider drip irrigation to conserve water',
      ],
    });
  }
  
  // Add crop-specific suggestions if analysis is provided
  if (analysisResult) {
    const cropName = analysisResult.cropIdentification.name;
    const healthStatus = analysisResult.healthAssessment.status;
    
    if (healthStatus === 'critical' && (current.humidity > 80 || rainExpected)) {
      suggestions.push({
        type: 'general',
        urgency: 'high',
        title: `${cropName} Critical Care`,
        description: `Your ${cropName} crop needs urgent attention. Current weather may worsen its condition.`,
        actions: [
          'Apply recommended treatments immediately before rain',
          'Improve field drainage',
          'Consider protective covering if feasible',
          'Consult local agricultural officer',
        ],
      });
    }
  }
  
  // Sort by urgency
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  
  return suggestions;
}

/**
 * Get a simple weather summary for display
 */
export function getWeatherSummary(weather: WeatherData): string {
  const { current, forecast } = weather;
  
  let summary = `Currently ${current.temperature}°C with ${current.description}.`;
  
  const tomorrowForecast = forecast[0];
  if (tomorrowForecast) {
    summary += ` Tomorrow: ${tomorrowForecast.temperature.min}°C - ${tomorrowForecast.temperature.max}°C, ${tomorrowForecast.description}.`;
    
    if (tomorrowForecast.precipitationProbability > 0.5) {
      summary += ` ${Math.round(tomorrowForecast.precipitationProbability * 100)}% chance of rain.`;
    }
  }
  
  return summary;
}

/**
 * Get weather icon URL from weatherapi.com
 * Icons are already full URLs from the API, but we can normalize them
 */
export function getWeatherIconUrl(iconUrl: string): string {
  // weatherapi.com returns icons like //cdn.weatherapi.com/weather/64x64/day/113.png
  // Ensure it has https protocol
  if (iconUrl.startsWith('//')) {
    return `https:${iconUrl}`;
  }
  if (!iconUrl.startsWith('http')) {
    return `https://cdn.weatherapi.com/weather/64x64/${iconUrl}`;
  }
  return iconUrl;
}

// EXPORTS

export default {
  getWeatherData,
  getWeatherDataSafe,
  getWeatherSuggestions,
  getWeatherSummary,
  getWeatherIconUrl,
};
