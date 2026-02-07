'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  IconDroplet,
  IconSunHigh,
  IconCloud,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconMist,
  IconRefresh,
  IconMapPin,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Weather condition type
 */
type WeatherCondition = 
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

/**
 * Weather data interface for the component
 */
export interface WeatherCardData {
  location: {
    name: string;
    state?: string;
    country: string;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    condition: WeatherCondition;
    description: string;
    icon: string;
    uvIndex?: number;
  };
  forecast: Array<{
    date: string;
    temperature: {
      min: number;
      max: number;
    };
    condition: WeatherCondition;
    description: string;
    icon: string;
    precipitationProbability: number;
  }>;
}

/**
 * Props for WeatherCard component
 */
interface WeatherCardProps {
  /** Weather data to display */
  weather: WeatherCardData | null;
  /** Whether the data is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Callback to refresh weather data */
  onRefresh?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Get weather icon based on condition
 */
function getWeatherIcon(condition: WeatherCondition, className?: string) {
  const iconProps = { className: cn('w-5 h-5', className) };
  
  switch (condition) {
    case 'clear':
      return <IconSunHigh {...iconProps} />;
    case 'clouds':
      return <IconCloud {...iconProps} />;
    case 'rain':
    case 'drizzle':
      return <IconCloudRain {...iconProps} />;
    case 'thunderstorm':
      return <IconCloudStorm {...iconProps} />;
    case 'snow':
      return <IconCloudSnow {...iconProps} />;
    case 'mist':
    case 'fog':
    case 'haze':
    case 'dust':
    case 'smoke':
      return <IconMist {...iconProps} />;
    default:
      return <IconSunHigh {...iconProps} />;
  }
}

/**
 * Get accent color based on weather condition
 */
function getAccentColor(condition: WeatherCondition): string {
  switch (condition) {
    case 'clear':
      return 'text-amber-500';
    case 'clouds':
      return 'text-slate-500';
    case 'rain':
    case 'drizzle':
      return 'text-blue-500';
    case 'thunderstorm':
      return 'text-purple-500';
    case 'snow':
      return 'text-cyan-400';
    case 'mist':
    case 'fog':
    case 'haze':
      return 'text-gray-400';
    default:
      return 'text-primary-500';
  }
}

/**
 * Format day name from date string
 */
function formatDayName(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tmrw';
  }
  
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * WeatherCard Skeleton Component - Compact design
 */
export function WeatherCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        'p-3 animate-pulse',
        'border border-gray-200 dark:border-gray-800',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Weather icon skeleton */}
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
        
        {/* Temperature and location */}
        <div className="flex-1 min-w-0">
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
          <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
        
        {/* Stats skeleton */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
        
        {/* Expand button skeleton */}
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>
    </Card>
  );
}

/**
 * WeatherCard Component
 * 
 * Compact weather display for the home feed.
 * Features:
 * - Collapsible design - compact by default, expandable for forecast
 * - Current temperature, humidity, and wind speed
 * - Weather condition icon and description
 * - 3-day forecast in expanded view
 * - Loading skeleton state
 * - Error state with retry button
 * - Responsive design matching app UI/UX
 */
export function WeatherCard({
  weather,
  loading = false,
  error = null,
  onRefresh,
  className,
}: WeatherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show skeleton while loading
  if (loading) {
    return <WeatherCardSkeleton className={className} />;
  }
  
  // Show error state
  if (error) {
    return (
      <Card
        className={cn(
          'p-3 border border-gray-200 dark:border-gray-800',
          className
        )}
      >
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <IconAlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="text-sm flex-1 truncate">{error}</span>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2 flex-shrink-0"
            >
              <IconRefresh className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }
  
  // No weather data
  if (!weather) {
    return null;
  }
  
  const { location, current, forecast } = weather;
  const accentColor = getAccentColor(current.condition);
  
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 ease-out',
        'border border-gray-200 dark:border-gray-800',
        'hover:border-gray-300 dark:hover:border-gray-700',
        className
      )}
    >
      {/* Compact Header - Always visible */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Weather Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              'bg-gray-100 dark:bg-gray-800',
              accentColor
            )}
          >
            {current.icon ? (
              <img
                src={current.icon.startsWith('//') ? `https:${current.icon}` : current.icon}
                alt={current.description}
                className="w-8 h-8"
              />
            ) : (
              getWeatherIcon(current.condition, 'w-5 h-5')
            )}
          </div>
          
          {/* Temperature and Location */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                {current.temperature}°C
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                {current.description}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <IconMapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {location.name}{location.state ? `, ${location.state}` : ''}
              </span>
            </div>
          </div>
          
          {/* Quick Stats - Hidden on very small screens */}
          <div className="hidden xs:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1" title="Humidity">
              <IconDroplet className="w-3.5 h-3.5 text-blue-400" />
              <span>{current.humidity}%</span>
            </div>
          </div>
          
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className={cn(
                'p-1.5 rounded-full flex-shrink-0',
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors duration-200'
              )}
              aria-label="Refresh weather"
            >
              <IconRefresh className="w-4 h-4" />
            </button>
          )}
          
          {/* Expand/Collapse Button */}
          {forecast.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'p-1.5 rounded-full flex-shrink-0',
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors duration-200'
              )}
              aria-label={isExpanded ? 'Hide forecast' : 'Show forecast'}
            >
              {isExpanded ? (
                <IconChevronUp className="w-4 h-4" />
              ) : (
                <IconChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Compact rain forecast — always visible in collapsed view */}
        {forecast.length > 0 && (
          <div className="flex items-center gap-3 mt-2 ml-[52px]">
            {forecast.slice(0, 3).map((day, index) => (
              <div
                key={index}
                className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"
              >
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {formatDayName(day.date)}
                </span>
                <IconCloudRain className={cn(
                  "w-3 h-3",
                  day.precipitationProbability > 50 ? "text-blue-500" : "text-gray-400"
                )} />
                <span className={cn(
                  day.precipitationProbability > 50 && "text-blue-500 font-medium"
                )}>
                  {day.precipitationProbability}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Expandable Forecast Section */}
      {forecast.length > 0 && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-out',
            isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-3 pb-3 pt-0">
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="flex justify-between gap-2">
                {forecast.slice(0, 3).map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex-1 text-center p-2 rounded-lg',
                      'bg-gray-50 dark:bg-gray-800/50'
                    )}
                  >
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {formatDayName(day.date)}
                    </p>
                    <div className="flex justify-center mb-1">
                      {day.icon ? (
                        <img
                          src={day.icon.startsWith('//') ? `https:${day.icon}` : day.icon}
                          alt={day.description}
                          className="w-6 h-6"
                        />
                      ) : (
                        getWeatherIcon(day.condition, 'w-4 h-4')
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{day.temperature.max}°</span>
                      <span className="text-gray-400 dark:text-gray-500 ml-1">{day.temperature.min}°</span>
                    </p>
                    {day.precipitationProbability > 0 && (
                      <p className="text-[10px] text-blue-500 flex items-center justify-center gap-0.5 mt-0.5">
                        <IconDroplet className="w-2.5 h-2.5" />
                        {day.precipitationProbability}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default WeatherCard;
