'use client';

import { useState } from 'react';
import {
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconMap,
  IconDroplet,
  IconCoin,
  IconClock,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconPlant,
  IconCloud,
  IconBulb,
  IconCheck,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { 
  PlanningResult as PlanningResultType, 
  CropRecommendation,
  MarketDemand,
  InvestmentLevel,
} from '@/types/planning';
import type { PlanningWizardFormValues } from './PlanningWizard';
import { INDIAN_STATES } from '@/constants/indian-locations';
import { SEASONS, SOIL_TYPES, IRRIGATION_AVAILABILITY, MONTHS } from '@/constants/crop-ai';

/**
 * Props for PlanningResult component
 */
interface PlanningResultProps {
  /** The planning result data */
  result: PlanningResultType;
  /** The original input data for context */
  inputData: PlanningWizardFormValues;
  /** Callback when user wants to start a new planning session */
  onNewPlanning: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Get display text for market demand
 */
function getMarketDemandDisplay(demand: MarketDemand): { 
  label: string; 
  color: string;
  icon: React.ReactNode;
} {
  switch (demand) {
    case 'high':
      return { 
        label: 'High Demand', 
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: <IconTrendingUp className="w-4 h-4" />,
      };
    case 'medium':
      return { 
        label: 'Medium Demand', 
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <IconMinus className="w-4 h-4" />,
      };
    case 'low':
      return { 
        label: 'Low Demand', 
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: <IconTrendingDown className="w-4 h-4" />,
      };
  }
}

/**
 * Get display text for investment level
 */
function getInvestmentDisplay(level: InvestmentLevel): { label: string; color: string } {
  switch (level) {
    case 'low':
      return { 
        label: 'Low Investment', 
        color: 'text-green-600 dark:text-green-400',
      };
    case 'medium':
      return { 
        label: 'Medium Investment', 
        color: 'text-yellow-600 dark:text-yellow-400',
      };
    case 'high':
      return { 
        label: 'High Investment', 
        color: 'text-red-600 dark:text-red-400',
      };
  }
}

/**
 * Get suitability color based on score
 */
function getSuitabilityColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Input Summary Section (Collapsible)
 */
function InputSummary({ inputData }: { inputData: PlanningWizardFormValues }) {
  const [isOpen, setIsOpen] = useState(false);

  // Get display values
  const stateName = INDIAN_STATES.find(s => s.code === inputData.state)?.name || inputData.state;
  const seasonName = SEASONS.find(s => s.id === inputData.season)?.name || inputData.season;
  const soilName = SOIL_TYPES.find(s => s.id === inputData.soilType)?.name || inputData.soilType;
  const irrigationName = IRRIGATION_AVAILABILITY.find(i => i.id === inputData.irrigationAvailability)?.name || inputData.irrigationAvailability;
  const monthName = MONTHS.find(m => String(m.id) === inputData.sowingMonth)?.name || inputData.sowingMonth;

  return (
    <div
      className={cn(
        'rounded-xl border',
        'bg-gray-50 dark:bg-gray-800/50',
        'border-gray-200 dark:border-gray-700'
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between',
          'p-4',
          'hover:bg-gray-100 dark:hover:bg-gray-700/50',
          'transition-colors duration-200'
        )}
      >
        <div className="flex items-center gap-2">
          <IconMap className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Your Input Summary
          </span>
        </div>
        {isOpen ? (
          <IconChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <IconChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-500">Location:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {inputData.district}, {stateName}
            </span>
            
            <span className="text-gray-500">Land Size:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {inputData.landSize} {inputData.landUnit}
            </span>
            
            <span className="text-gray-500">Season:</span>
            <span className="text-gray-700 dark:text-gray-300">{seasonName}</span>
            
            <span className="text-gray-500">Sowing Month:</span>
            <span className="text-gray-700 dark:text-gray-300">{monthName}</span>
            
            <span className="text-gray-500">Soil Type:</span>
            <span className="text-gray-700 dark:text-gray-300">{soilName}</span>
            
            <span className="text-gray-500">Irrigation:</span>
            <span className="text-gray-700 dark:text-gray-300">{irrigationName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Expandable Crop Card Component
 */
function CropCard({ crop, index }: { crop: CropRecommendation; index: number }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const marketDisplay = getMarketDemandDisplay(crop.marketDemand);
  const investmentDisplay = getInvestmentDisplay(crop.investmentLevel);
  const suitabilityColor = getSuitabilityColor(crop.suitabilityScore);

  return (
    <div
      className={cn(
        'rounded-xl border',
        'bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        'overflow-hidden',
        'shadow-sm'
      )}
    >
      {/* Header (always visible) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between',
          'p-4',
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          'transition-colors duration-200'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center',
              'w-12 h-12 rounded-lg',
              'bg-primary-100 dark:bg-primary-900/30'
            )}
          >
            <IconPlant className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {crop.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-sm font-medium', suitabilityColor)}>
                {crop.suitabilityScore}% suitable
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  'px-2 py-0.5 rounded-full',
                  'text-xs font-medium',
                  marketDisplay.color
                )}
              >
                {marketDisplay.icon}
                {marketDisplay.label}
              </span>
            </div>
          </div>
        </div>
        {isExpanded ? (
          <IconChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <IconChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          {/* Quick info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <IconDroplet className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-300">
                {crop.waterRequirement}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IconCoin className={cn('w-4 h-4', investmentDisplay.color)} />
              <span className="text-gray-600 dark:text-gray-300">
                {investmentDisplay.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IconClock className="w-4 h-4 text-purple-500" />
              <span className="text-gray-600 dark:text-gray-300">
                {crop.timeline}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IconTrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-gray-600 dark:text-gray-300">
                {crop.expectedYield}
              </span>
            </div>
          </div>

          {/* Reasons */}
          {crop.reasons.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Why This Crop?
              </h5>
              <ul className="space-y-1">
                {crop.reasons.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <IconCheck className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {crop.tips.length > 0 && (
            <div
              className={cn(
                'p-3 rounded-lg',
                'bg-yellow-50 dark:bg-yellow-900/20',
                'border border-yellow-100 dark:border-yellow-800'
              )}
            >
              <h5 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
                <IconBulb className="w-4 h-4" />
                Tips for Growing
              </h5>
              <ul className="space-y-1">
                {crop.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-sm text-yellow-700 dark:text-yellow-300"
                  >
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PlanningResult Component
 * 
 * Displays the crop planning recommendations including:
 * - Collapsible input summary
 * - Recommended crops as expandable cards
 * - Soil analysis section
 * - Weather considerations
 * - General farming tips
 * - Option to start a new planning session
 */
export function PlanningResult({
  result,
  inputData,
  onNewPlanning,
  className,
}: PlanningResultProps) {
  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2
          className={cn(
            'text-xl sm:text-2xl font-bold',
            'text-gray-900 dark:text-white',
            'mb-2'
          )}
        >
          Crop Recommendations
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          Based on your location, soil, and conditions
        </p>
      </div>

      {/* Input Summary */}
      <div className="mb-6">
        <InputSummary inputData={inputData} />
      </div>

      {/* Recommended Crops */}
      {result.recommendedCrops.length > 0 && (
        <div className="mb-8">
          <h3
            className={cn(
              'text-lg font-semibold',
              'text-gray-900 dark:text-white',
              'mb-4'
            )}
          >
            Recommended Crops ({result.recommendedCrops.length})
          </h3>
          <div className="space-y-4">
            {result.recommendedCrops.map((crop, index) => (
              <CropCard key={index} crop={crop} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Soil Analysis */}
      {result.soilAnalysis && (
        <div className="mb-6">
          <h3
            className={cn(
              'text-lg font-semibold',
              'text-gray-900 dark:text-white',
              'mb-3'
            )}
          >
            Soil Analysis
          </h3>
          <div
            className={cn(
              'p-4 rounded-xl',
              'bg-amber-50 dark:bg-amber-900/20',
              'border border-amber-100 dark:border-amber-800'
            )}
          >
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              {result.soilAnalysis}
            </p>
          </div>
        </div>
      )}

      {/* Weather Considerations */}
      {result.weatherConsiderations && (
        <div className="mb-6">
          <h3
            className={cn(
              'text-lg font-semibold',
              'text-gray-900 dark:text-white',
              'mb-3 flex items-center gap-2'
            )}
          >
            <IconCloud className="w-5 h-5 text-blue-500" />
            Weather Considerations
          </h3>
          <div
            className={cn(
              'p-4 rounded-xl',
              'bg-blue-50 dark:bg-blue-900/20',
              'border border-blue-100 dark:border-blue-800'
            )}
          >
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              {result.weatherConsiderations}
            </p>
          </div>
        </div>
      )}

      {/* General Tips */}
      {result.generalTips.length > 0 && (
        <div className="mb-8">
          <h3
            className={cn(
              'text-lg font-semibold',
              'text-gray-900 dark:text-white',
              'mb-3 flex items-center gap-2'
            )}
          >
            <IconBulb className="w-5 h-5 text-yellow-500" />
            General Farming Tips
          </h3>
          <div
            className={cn(
              'p-4 rounded-xl',
              'bg-gray-50 dark:bg-gray-800/50',
              'border border-gray-200 dark:border-gray-700'
            )}
          >
            <ul className="space-y-2">
              {result.generalTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <IconCheck className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {tip}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* No Recommendations */}
      {result.recommendedCrops.length === 0 && (
        <div
          className={cn(
            'p-6 rounded-xl text-center',
            'bg-yellow-50 dark:bg-yellow-900/20',
            'border border-yellow-100 dark:border-yellow-800',
            'mb-8'
          )}
        >
          <IconPlant className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
            No Specific Recommendations
          </h3>
          <p className="text-sm text-yellow-600 dark:text-yellow-300">
            We couldn&apos;t find specific crop recommendations for your criteria.
            Consider consulting your local agricultural extension office.
          </p>
        </div>
      )}

      {/* New Planning Button */}
      <div className="flex justify-center">
        <Button
          onClick={onNewPlanning}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <IconRefresh className="w-5 h-5" />
          Plan for Different Conditions
        </Button>
      </div>
    </div>
  );
}

export type { PlanningResultProps };
