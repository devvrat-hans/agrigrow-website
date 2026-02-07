'use client';

import { useState, useCallback, useMemo } from 'react';
import { IconCloud, IconCloudRain, IconSun, IconDroplet, IconWind, IconChevronDown, IconChevronUp, IconUmbrella, IconFlame } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { WeatherData, WeatherSuggestionsGrouped, WeatherCondition, ForecastDay } from '@/types/crop-ai';

// TYPES

export interface WeatherAlertProps {
  /** Weather data object */
  weather: WeatherData;
  /** Weather suggestions object */
  suggestions: WeatherSuggestionsGrouped;
  /** Additional CSS classes */
  className?: string;
  /** Default expanded state */
  defaultExpanded?: boolean;
}

// WEATHER CONDITION CONFIGURATIONS

interface WeatherConditionConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const WEATHER_CONDITION_CONFIG: Record<string, WeatherConditionConfig> = {
  clear: {
    icon: IconSun,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
  },
  clouds: {
    icon: IconCloud,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
  },
  rain: {
    icon: IconCloudRain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  drizzle: {
    icon: IconCloudRain,
    color: 'text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  thunderstorm: {
    icon: IconCloudRain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
  },
  snow: {
    icon: IconCloud,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
  mist: {
    icon: IconCloud,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
  },
  fog: {
    icon: IconCloud,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
  },
  haze: {
    icon: IconCloud,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  dust: {
    icon: IconCloud,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  smoke: {
    icon: IconCloud,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
};

const DEFAULT_CONDITION_CONFIG: WeatherConditionConfig = {
  icon: IconCloud,
  color: 'text-gray-500',
  bgColor: 'bg-gray-50 dark:bg-gray-800/50',
};

// HELPER FUNCTIONS

function getConditionConfig(condition: WeatherCondition | string): WeatherConditionConfig {
  const key = condition.toLowerCase();
  return WEATHER_CONDITION_CONFIG[key] || DEFAULT_CONDITION_CONFIG;
}

function isRainExpected(forecast: ForecastDay[]): boolean {
  return forecast.some(
    (day) =>
      day.precipitationProbability > 0.5 ||
      ['rain', 'drizzle', 'thunderstorm'].includes(day.condition.toLowerCase())
  );
}

function isHighTemperature(temp: number): boolean {
  return temp >= 35;
}

/**
 * WeatherAlert Component
 * 
 * Alert card showing current weather conditions with rain/heat warnings.
 * Collapsible detail section with full forecast and suggestions.
 */
export function WeatherAlert({
  weather,
  suggestions,
  className,
  defaultExpanded = false,
}: WeatherAlertProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Get current weather config
  const conditionConfig = useMemo(
    () => getConditionConfig(weather.current.condition),
    [weather.current.condition]
  );

  // Check for alerts
  const hasRainAlert = useMemo(
    () => isRainExpected(weather.forecast),
    [weather.forecast]
  );

  const hasHeatAlert = useMemo(
    () => isHighTemperature(weather.current.temperature),
    [weather.current.temperature]
  );

  // Get icon component
  const WeatherIcon = conditionConfig.icon;

  // Determine card urgency
  const urgencyColor = hasRainAlert
    ? 'border-blue-300 dark:border-blue-700'
    : hasHeatAlert
    ? 'border-orange-300 dark:border-orange-700'
    : 'border-gray-200 dark:border-gray-700';

  const urgencyBg = hasRainAlert
    ? 'bg-blue-50 dark:bg-blue-950/20'
    : hasHeatAlert
    ? 'bg-orange-50 dark:bg-orange-950/20'
    : '';

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        urgencyColor,
        className
      )}
    >
      {/* Main Weather Card */}
      <div className={cn('p-3 sm:p-4', urgencyBg)}>
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Weather Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Weather Icon */}
            <div
              className={cn(
                'flex items-center justify-center',
                'w-12 h-12 sm:w-14 sm:h-14 rounded-xl',
                conditionConfig.bgColor
              )}
            >
              <WeatherIcon className={cn('w-6 h-6 sm:w-8 sm:h-8', conditionConfig.color)} />
            </div>

            {/* Temperature and Details */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {Math.round(weather.current.temperature)}°
                </span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">C</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 capitalize">
                {weather.current.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {weather.location.name}
                {weather.location.state && `, ${weather.location.state}`}
              </p>
            </div>
          </div>

          {/* Weather Stats */}
          <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <IconDroplet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-sm sm:text-base font-medium">{weather.current.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <IconWind className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-sm sm:text-base font-medium">{weather.current.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rain Alert */}
      {hasRainAlert && (
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-100 dark:bg-blue-900/30 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex-shrink-0">
              <IconUmbrella className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-blue-800 dark:text-blue-200">
                Rain Expected
              </h4>
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                Prepare your crops for upcoming rain. Check drainage and harvest mature crops.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Heat Alert */}
      {hasHeatAlert && !hasRainAlert && (
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-orange-100 dark:bg-orange-900/30 border-t border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-200 dark:bg-orange-800 flex-shrink-0">
              <IconFlame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-orange-800 dark:text-orange-200">
                High Temperature Warning
              </h4>
              <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                Ensure adequate watering and consider shade for sensitive crops.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        type="button"
        onClick={toggleExpanded}
        className={cn(
          'w-full flex items-center justify-center gap-2',
          'py-2.5 sm:py-3 px-4',
          'min-h-[44px]',
          'text-sm font-medium',
          'text-gray-600 dark:text-gray-400',
          'bg-gray-50 dark:bg-gray-800/30',
          'hover:bg-gray-100 dark:hover:bg-gray-700/30',
          'border-t border-gray-200 dark:border-gray-700',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/20',
          'active:bg-gray-200 dark:active:bg-gray-600/30'
        )}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <>
            <IconChevronUp className="w-4 h-4" />
            Hide Details
          </>
        ) : (
          <>
            <IconChevronDown className="w-4 h-4" />
            View Forecast & Tips
          </>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* 7-Day Forecast */}
          <div className="p-3 sm:p-4">
            <h5 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              7-Day Forecast
            </h5>
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
              {weather.forecast.slice(0, 7).map((day, index) => {
                const dayConfig = getConditionConfig(day.condition);
                const DayIcon = dayConfig.icon;
                const date = new Date(day.date);
                const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <div
                    key={day.date}
                    className={cn(
                      'flex flex-col items-center gap-1',
                      'px-2.5 sm:px-3 py-2',
                      'min-w-[56px] sm:min-w-[60px]',
                      'rounded-lg',
                      'bg-gray-50 dark:bg-gray-800/50',
                      'snap-start'
                    )}
                  >
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {dayName}
                    </span>
                    <DayIcon className={cn('w-4 h-4 sm:w-5 sm:h-5', dayConfig.color)} />
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {Math.round(day.temperature.max)}°
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {Math.round(day.temperature.min)}°
                      </span>
                    </div>
                    {day.precipitationProbability > 0.2 && (
                      <div className="flex items-center gap-0.5 text-xs text-blue-500">
                        <IconDroplet className="w-3 h-3" />
                        <span>{Math.round(day.precipitationProbability * 100)}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggestions */}
          {(suggestions.current.length > 0 ||
            suggestions.upcoming.length > 0 ||
            suggestions.rainPreparation.length > 0) && (
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
              <h5 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Farming Suggestions
              </h5>
              <div className="space-y-3 sm:space-y-4">
                {/* Current Suggestions */}
                {suggestions.current.length > 0 && (
                  <div>
                    <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                      For Today
                    </h6>
                    <ul className="space-y-2">
                      {suggestions.current.map((suggestion, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rain Preparation */}
                {suggestions.rainPreparation.length > 0 && (
                  <div>
                    <h6 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                      <IconCloudRain className="w-3 h-3" />
                      Rain Preparation
                    </h6>
                    <ul className="space-y-2">
                      {suggestions.rainPreparation.map((suggestion, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upcoming Suggestions */}
                {suggestions.upcoming.length > 0 && (
                  <div>
                    <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                      Upcoming Week
                    </h6>
                    <ul className="space-y-2">
                      {suggestions.upcoming.map((suggestion, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default WeatherAlert;
