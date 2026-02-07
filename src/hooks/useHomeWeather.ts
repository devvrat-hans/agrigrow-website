'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import type { WeatherCardData } from '@/components/feed/WeatherCard';

/**
 * State for the useHomeWeather hook
 */
export interface UseHomeWeatherState {
  weather: WeatherCardData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Return type for the useHomeWeather hook
 */
export interface UseHomeWeatherReturn extends UseHomeWeatherState {
  refresh: () => Promise<void>;
  isStale: boolean;
}

/**
 * Weather API response format
 */
interface WeatherApiResponse {
  success: boolean;
  data?: {
    location: {
      name: string;
      state?: string;
      country: string;
      coordinates: {
        lat: number;
        lon: number;
      };
    };
    current: {
      temperature: number;
      feelsLike: number;
      humidity: number;
      pressure: number;
      windSpeed: number;
      windDirection: number;
      visibility: number;
      condition: string;
      description: string;
      icon: string;
      cloudCover: number;
      uvIndex?: number;
      timestamp: string;
    };
    forecast: Array<{
      date: string;
      temperature: {
        min: number;
        max: number;
        day: number;
        night: number;
      };
      humidity: number;
      condition: string;
      description: string;
      icon: string;
      precipitation: number;
      precipitationProbability: number;
      windSpeed: number;
    }>;
    alerts?: Array<{
      type: string;
      severity: string;
      title: string;
      description: string;
      start: string;
      end: string;
    }>;
  };
  error?: string;
  cached?: boolean;
}

// Cache TTL - 15 minutes
const CACHE_TTL = 15 * 60 * 1000;

// Local storage key for cached weather
const CACHE_KEY = 'agrigrow_home_weather';

// Initial state
const initialState: UseHomeWeatherState = {
  weather: null,
  loading: true,
  error: null,
  lastUpdated: null,
};

/**
 * Get cached weather from localStorage
 */
function getCachedWeather(): { weather: WeatherCardData; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (!parsed.weather || !parsed.timestamp) return null;
    
    // Check if cache is still valid
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save weather to localStorage cache
 */
function setCachedWeather(weather: WeatherCardData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      weather,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Transform API response to WeatherCardData
 */
function transformResponse(response: WeatherApiResponse): WeatherCardData | null {
  if (!response.success || !response.data) return null;
  
  const { data } = response;
  
  return {
    location: {
      name: data.location.name,
      state: data.location.state,
      country: data.location.country,
    },
    current: {
      temperature: data.current.temperature,
      feelsLike: data.current.feelsLike,
      humidity: data.current.humidity,
      windSpeed: data.current.windSpeed,
      condition: data.current.condition as WeatherCardData['current']['condition'],
      description: data.current.description,
      icon: data.current.icon,
      uvIndex: data.current.uvIndex,
    },
    forecast: data.forecast.map(day => ({
      date: day.date,
      temperature: {
        min: day.temperature.min,
        max: day.temperature.max,
      },
      condition: day.condition as WeatherCardData['forecast'][0]['condition'],
      description: day.description,
      icon: day.icon,
      precipitationProbability: day.precipitationProbability,
    })),
  };
}

/**
 * Get user's location using Geolocation API
 */
async function getUserGeolocation(): Promise<{ lat: number; lon: number } | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 5000, maximumAge: 300000 } // 5 second timeout, cache for 5 minutes
    );
  });
}

/**
 * Get user profile location (state/district)
 */
async function getUserProfileLocation(): Promise<{ state: string; district?: string } | null> {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data?: {
        state?: string;
        district?: string;
      };
    }>('/user/me');
    
    // Access the data property from AxiosResponse
    const responseData = response.data;
    
    if (responseData.success && responseData.data?.state) {
      return {
        state: responseData.data.state,
        district: responseData.data.district,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Custom hook to fetch weather data for the home feed page
 * 
 * Priority for location:
 * 1. User's profile location (state/district)
 * 2. Browser geolocation
 * 3. Default location (Delhi, India)
 * 
 * Features:
 * - Caches weather data in localStorage for 15 minutes
 * - Provides loading and error states
 * - Supports manual refresh
 * - Detects stale data
 * 
 * @example
 * ```tsx
 * const { weather, loading, error, refresh, isStale } = useHomeWeather();
 * 
 * if (loading) return <WeatherCardSkeleton />;
 * if (error) return <WeatherCard error={error} onRefresh={refresh} />;
 * return <WeatherCard weather={weather} onRefresh={refresh} />;
 * ```
 */
export function useHomeWeather(): UseHomeWeatherReturn {
  // Always start with initialState to prevent hydration mismatch
  // Server and client must render the same initial state
  const [state, setState] = useState<UseHomeWeatherState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);
  
  // Hydration effect - runs only on client after initial render
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Check if data is stale
  const isStale = state.lastUpdated 
    ? Date.now() - state.lastUpdated.getTime() > CACHE_TTL
    : true;
  
  /**
   * Fetch weather data
   */
  const fetchWeather = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    
    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = getCachedWeather();
      if (cached && isMounted.current) {
        setState({
          weather: cached.weather,
          loading: false,
          error: null,
          lastUpdated: new Date(cached.timestamp),
        });
        return;
      }
    }
    
    fetchingRef.current = true;
    
    if (isMounted.current) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }
    
    try {
      // Try to get location in order of priority
      let queryParams: string;
      
      // 1. Try user's profile location
      const profileLocation = await getUserProfileLocation();
      if (profileLocation) {
        const params = new URLSearchParams();
        params.set('state', profileLocation.state);
        if (profileLocation.district) {
          params.set('district', profileLocation.district);
        }
        params.set('days', '3');
        queryParams = params.toString();
      } else {
        // 2. Try geolocation
        const geoLocation = await getUserGeolocation();
        if (geoLocation) {
          queryParams = `lat=${geoLocation.lat}&lon=${geoLocation.lon}&days=3`;
        } else {
          // 3. Default to Delhi
          queryParams = 'q=Delhi,India&days=3';
        }
      }
      
      // Fetch weather data
      const response = await apiClient.get<WeatherApiResponse>(
        `/crop-ai/weather?${queryParams}`
      );
      
      // Access the data property from AxiosResponse
      const responseData = response.data;
      
      const weather = transformResponse(responseData);
      
      if (!isMounted.current) return;
      
      if (weather) {
        setCachedWeather(weather);
        setState({
          weather,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } else {
        setState({
          weather: null,
          loading: false,
          error: responseData.error || 'Failed to load weather data',
          lastUpdated: null,
        });
      }
    } catch (error) {
      if (!isMounted.current) return;
      
      setState({
        weather: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load weather data',
        lastUpdated: null,
      });
    } finally {
      fetchingRef.current = false;
    }
  }, []);
  
  /**
   * Refresh weather data
   */
  const refresh = useCallback(async () => {
    await fetchWeather(true);
  }, [fetchWeather]);
  
  // Check cache immediately after hydration
  useEffect(() => {
    if (!isHydrated) return;
    
    // Try to load from cache after hydration
    const cached = getCachedWeather();
    if (cached) {
      setState({
        weather: cached.weather,
        loading: false,
        error: null,
        lastUpdated: new Date(cached.timestamp),
      });
    }
  }, [isHydrated]);
  
  // Initial fetch on mount
  useEffect(() => {
    isMounted.current = true;
    
    // Wait for hydration to complete before fetching
    if (!isHydrated) return;
    
    // Only fetch if we don't have cached data or it's stale
    if (!state.weather || isStale) {
      fetchWeather();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [isHydrated]);
  
  return {
    ...state,
    refresh,
    isStale,
  };
}

export default useHomeWeather;
