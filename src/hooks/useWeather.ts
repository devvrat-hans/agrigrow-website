'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import type { WeatherData, Coordinates, LocationInput } from '@/types/crop-ai';

// Location input for the hook
export type WeatherLocationInput = Coordinates | LocationInput;

// API response type
interface WeatherApiResponse {
  success: boolean;
  data?: WeatherData;
  error?: string;
  cached?: boolean;
  cacheExpiresIn?: number;
}

// Hook state
export interface UseWeatherState {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Hook return type
export interface UseWeatherReturn extends UseWeatherState {
  isStale: boolean;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

// Cache TTL in milliseconds (15 minutes)
const CACHE_TTL = 15 * 60 * 1000;

// Initial state
const initialState: UseWeatherState = {
  weather: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

// Check if input is coordinates
function isCoordinates(input: WeatherLocationInput): input is Coordinates {
  return 'lat' in input && 'lon' in input;
}

// Generate cache key from location
function getCacheKey(location: WeatherLocationInput): string {
  if (isCoordinates(location)) {
    const roundedLat = Math.round(location.lat * 100) / 100;
    const roundedLon = Math.round(location.lon * 100) / 100;
    return `weather:coord:${roundedLat},${roundedLon}`;
  }
  const normalizedState = location.state.toLowerCase().trim();
  const normalizedDistrict = location.district?.toLowerCase().trim() || '';
  return `weather:loc:${normalizedState}:${normalizedDistrict}`;
}

// In-memory cache for weather data
const weatherCache = new Map<string, {
  data: WeatherData;
  timestamp: number;
}>();

/**
 * Hook for fetching and managing weather data
 * 
 * @example
 * ```tsx
 * // With coordinates
 * const { weather, loading, error, isStale, refresh } = useWeather({ lat: 28.6, lon: 77.2 });
 * 
 * // With state/district
 * const { weather } = useWeather({ state: 'Maharashtra', district: 'Pune' });
 * 
 * // Without auto-fetch
 * const { refresh } = useWeather(undefined);
 * refresh({ state: 'Karnataka' });
 * ```
 */
export function useWeather(location?: WeatherLocationInput): UseWeatherReturn {
  const [state, setState] = useState<UseWeatherState>(initialState);
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);
  const locationRef = useRef(location);

  // Update location ref
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Check if cached data is stale
  const isStale = useMemo(() => {
    if (!state.lastUpdated) return true;
    return Date.now() - state.lastUpdated.getTime() > CACHE_TTL;
  }, [state.lastUpdated]);

  // Build query string from location
  const buildQueryString = useCallback((loc: WeatherLocationInput): string => {
    const params = new URLSearchParams();
    
    if (isCoordinates(loc)) {
      params.set('lat', String(loc.lat));
      params.set('lon', String(loc.lon));
    } else {
      params.set('state', loc.state);
      if (loc.district) {
        params.set('district', loc.district);
      }
    }
    
    return params.toString();
  }, []);

  // Fetch weather data
  const fetchWeather = useCallback(async (loc: WeatherLocationInput) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const cacheKey = getCacheKey(loc);
    
    // Check cache first
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setState({
        weather: cached.data,
        loading: false,
        error: null,
        lastUpdated: new Date(cached.timestamp),
      });
      fetchingRef.current = false;
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const queryString = buildQueryString(loc);
      const response = await apiClient.get<WeatherApiResponse>(
        `/api/crop-ai/weather?${queryString}`
      );

      if (!isMounted.current) return;

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch weather data');
      }

      const weatherData = response.data.data;
      const timestamp = Date.now();

      // Update cache
      weatherCache.set(cacheKey, {
        data: weatherData,
        timestamp,
      });

      setState({
        weather: weatherData,
        loading: false,
        error: null,
        lastUpdated: new Date(timestamp),
      });

    } catch (error) {
      if (!isMounted.current) return;

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch weather data';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [buildQueryString]);

  // Refresh weather data
  const refresh = useCallback(async (newLocation?: WeatherLocationInput) => {
    const loc = newLocation || locationRef.current;
    
    if (!loc) {
      setState(prev => ({
        ...prev,
        error: 'No location provided',
      }));
      return;
    }

    // Clear cache for this location to force refetch
    const cacheKey = getCacheKey(loc);
    weatherCache.delete(cacheKey);

    await fetchWeather(loc);
  }, [fetchWeather]);

  // Clear cache
  const clearCache = useCallback(() => {
    weatherCache.clear();
    setState(initialState);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Auto-fetch on mount if location is provided
  useEffect(() => {
    if (location && !state.weather && !state.loading && !fetchingRef.current) {
      fetchWeather(location);
    }
  }, [location, state.weather, state.loading, fetchWeather]);

  // Refetch when location changes
  useEffect(() => {
    if (location) {
      const cacheKey = getCacheKey(location);
      const cached = weatherCache.get(cacheKey);
      
      // If we have fresh cached data, use it
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setState({
          weather: cached.data,
          loading: false,
          error: null,
          lastUpdated: new Date(cached.timestamp),
        });
      } else if (!fetchingRef.current) {
        // Fetch new data
        fetchWeather(location);
      }
    }
  }, [location, fetchWeather]);

  return {
    ...state,
    isStale,
    refresh,
    clearCache,
  };
}

// Re-export types for convenience
export type {
  WeatherData,
  Coordinates,
  LocationInput,
};

export default useWeather;
