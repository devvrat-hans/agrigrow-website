'use client';

import { useState, useCallback, useMemo } from 'react';
import { IconChevronDown, IconChevronUp, IconDroplet, IconSunHigh, IconFlame, IconLeaf } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { NutrientDeficiency } from '@/types/crop-ai';

// TYPES

export interface NutrientDeficiencyCardProps {
  /** Nutrient deficiency data */
  deficiency: NutrientDeficiency;
  /** Whether the card is expanded */
  expanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onToggle?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Default expanded state (for uncontrolled usage) */
  defaultExpanded?: boolean;
}

// NUTRIENT CONFIGURATIONS

interface NutrientConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NUTRIENT_CONFIG: Record<string, NutrientConfig> = {
  nitrogen: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: IconLeaf,
  },
  phosphorus: {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: IconFlame,
  },
  potassium: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: IconSunHigh,
  },
  calcium: {
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
    icon: IconDroplet,
  },
  magnesium: {
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
    icon: IconLeaf,
  },
  sulfur: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: IconFlame,
  },
  iron: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: IconDroplet,
  },
  zinc: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: IconDroplet,
  },
  manganese: {
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-200 dark:border-pink-800',
    icon: IconLeaf,
  },
  boron: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: IconSunHigh,
  },
  copper: {
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: IconDroplet,
  },
  molybdenum: {
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    icon: IconDroplet,
  },
};

const DEFAULT_NUTRIENT_CONFIG: NutrientConfig = {
  color: 'text-primary-600 dark:text-primary-400',
  bgColor: 'bg-primary-50 dark:bg-primary-950/30',
  borderColor: 'border-primary-200 dark:border-primary-800',
  icon: IconDroplet,
};

/**
 * NutrientDeficiencyCard Component
 * 
 * Expandable card showing nutrient deficiency details.
 * Color-coded based on nutrient type.
 */
export function NutrientDeficiencyCard({
  deficiency,
  expanded: controlledExpanded,
  onToggle,
  className,
  defaultExpanded = false,
}: NutrientDeficiencyCardProps) {
  // Internal expanded state for uncontrolled usage
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled or internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // Handle toggle
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  }, [onToggle]);

  // Get nutrient config
  const nutrientConfig = useMemo(() => {
    const nutrientKey = deficiency.nutrient.toLowerCase();
    return NUTRIENT_CONFIG[nutrientKey] || DEFAULT_NUTRIENT_CONFIG;
  }, [deficiency.nutrient]);

  // Convert confidence to percentage
  const confidencePercent = Math.round(deficiency.confidence * 100);

  // Get icon component
  const IconComponent = nutrientConfig.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        nutrientConfig.borderColor,
        className
      )}
    >
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between gap-3',
          'p-3 sm:p-4',
          'text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/20',
          'active:bg-gray-100 dark:active:bg-gray-800'
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Nutrient Icon */}
          <div
            className={cn(
              'flex items-center justify-center',
              'w-9 h-9 sm:w-10 sm:h-10 rounded-lg',
              nutrientConfig.bgColor
            )}
          >
            <IconComponent className={cn('w-4 h-4 sm:w-5 sm:h-5', nutrientConfig.color)} />
          </div>

          {/* Nutrient Name */}
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white capitalize line-clamp-1">
              {deficiency.nutrient} Deficiency
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {confidencePercent}% confidence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Confidence Badge */}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              nutrientConfig.bgColor,
              nutrientConfig.color
            )}
          >
            {confidencePercent}%
          </span>
          
          {/* Expand Icon */}
          {isExpanded ? (
            <IconChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <IconChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Symptoms Section */}
          <div className={cn('p-3 sm:p-4', nutrientConfig.bgColor)}>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Symptoms
            </h5>
            <ul className="space-y-2">
              {deficiency.symptoms.map((symptom, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3"
                >
                  <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                  {symptom}
                </li>
              ))}
            </ul>
          </div>

          {/* Solution Section */}
          <div className="p-3 sm:p-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Recommended Solutions
            </h5>
            <ul className="space-y-2">
              {deficiency.solution.map((solution, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3"
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0',
                      'bg-primary-500'
                    )}
                  />
                  {solution}
                </li>
              ))}
            </ul>
          </div>

          {/* Fertilizer Recommendations */}
          {deficiency.fertilizer && deficiency.fertilizer.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Fertilizer Options
              </h5>
              <div className="flex flex-wrap gap-2">
                {deficiency.fertilizer.map((fertilizer, index) => (
                  <span
                    key={index}
                    className={cn(
                      'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full',
                      'text-xs font-medium',
                      'bg-white dark:bg-gray-700',
                      'border border-gray-200 dark:border-gray-600',
                      'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {fertilizer}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default NutrientDeficiencyCard;
