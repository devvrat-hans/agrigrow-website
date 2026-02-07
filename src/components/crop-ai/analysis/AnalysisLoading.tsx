'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { IconPlant, IconX, IconBulb, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// TYPES

export type AnalysisStage = 'uploading' | 'analyzing' | 'processing' | 'finalizing';

export interface AnalysisLoadingProps {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current analysis stage */
  stage: AnalysisStage | string;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Whether cancel button should be shown (default: after 30 seconds) */
  showCancel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// STAGE CONFIGURATIONS

const STAGE_CONFIG: Record<AnalysisStage, { label: string; description: string }> = {
  uploading: {
    label: 'Uploading Image',
    description: 'Securely uploading your crop image...',
  },
  analyzing: {
    label: 'Analyzing Crop',
    description: 'AI is examining your crop for issues...',
  },
  processing: {
    label: 'Processing Results',
    description: 'Generating detailed recommendations...',
  },
  finalizing: {
    label: 'Finalizing',
    description: 'Preparing your personalized report...',
  },
};

// FARMING TIPS

const FARMING_TIPS = [
  {
    icon: '🌱',
    tip: 'Early detection of crop diseases can save up to 50% of your yield.',
  },
  {
    icon: '💧',
    tip: 'Water your crops early in the morning to reduce evaporation and fungal growth.',
  },
  {
    icon: '🌿',
    tip: 'Rotate crops each season to prevent soil nutrient depletion.',
  },
  {
    icon: '🐛',
    tip: 'Companion planting can naturally repel pests without chemicals.',
  },
  {
    icon: '☀️',
    tip: 'Most vegetables need 6-8 hours of direct sunlight daily.',
  },
  {
    icon: '🌾',
    tip: 'Mulching helps retain soil moisture and suppress weeds.',
  },
  {
    icon: '🧪',
    tip: 'Test your soil pH every season for optimal nutrient uptake.',
  },
  {
    icon: '🍃',
    tip: 'Remove yellow or diseased leaves promptly to prevent spread.',
  },
  {
    icon: '🌤️',
    tip: 'Monitor weather forecasts to plan irrigation and pest control.',
  },
  {
    icon: '🌻',
    tip: 'Healthy soil contains billions of beneficial microorganisms.',
  },
];

/**
 * AnalysisLoading Component
 * 
 * Full card layout showing analysis progress with animated illustrations,
 * progress bar, and farming tips carousel.
 * 
 * @example
 * <AnalysisLoading 
 *   progress={45} 
 *   stage="analyzing" 
 *   onCancel={() => cancelAnalysis()}
 * />
 */
export function AnalysisLoading({
  progress,
  stage,
  onCancel,
  showCancel: showCancelProp,
  className,
}: AnalysisLoadingProps) {
  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [autoPlayTips, setAutoPlayTips] = useState(true);

  // Normalize progress
  const normalizedProgress = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round(progress)));
  }, [progress]);

  // Get stage config
  const stageInfo = useMemo(() => {
    const knownStage = stage as AnalysisStage;
    return STAGE_CONFIG[knownStage] || {
      label: stage,
      description: 'Processing...',
    };
  }, [stage]);

  // Estimate remaining time based on progress
  const estimatedTime = useMemo(() => {
    if (normalizedProgress >= 100) return 'Almost done!';
    if (normalizedProgress <= 0) return 'Starting...';
    
    // Rough estimate: assume 30 seconds total
    const remainingPercent = 100 - normalizedProgress;
    const estimatedSeconds = Math.ceil((remainingPercent / 100) * 30);
    
    if (estimatedSeconds <= 5) return 'Just a few seconds...';
    if (estimatedSeconds <= 15) return 'Less than 15 seconds...';
    if (estimatedSeconds <= 30) return 'About 30 seconds...';
    return 'Please wait...';
  }, [normalizedProgress]);

  // Show cancel button after 30 seconds or if explicitly set
  const showCancel = showCancelProp !== undefined ? showCancelProp : elapsedTime > 30;

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-rotate tips
  useEffect(() => {
    if (!autoPlayTips) return;

    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % FARMING_TIPS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoPlayTips]);

  // Navigate tips
  const goToPreviousTip = useCallback(() => {
    setAutoPlayTips(false);
    setCurrentTipIndex((prev) => (prev - 1 + FARMING_TIPS.length) % FARMING_TIPS.length);
  }, []);

  const goToNextTip = useCallback(() => {
    setAutoPlayTips(false);
    setCurrentTipIndex((prev) => (prev + 1) % FARMING_TIPS.length);
  }, []);

  const currentTip = FARMING_TIPS[currentTipIndex];

  return (
    <Card className={cn('p-4 sm:p-6 md:p-8', className)}>
      {/* Animated Plant Illustration */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="relative">
          {/* Pulsing Background */}
          <div
            className={cn(
              'absolute inset-0 -m-4',
              'bg-primary-100 dark:bg-primary-900/30',
              'rounded-full',
              'animate-pulse'
            )}
          />
          
          {/* Plant Icon Container */}
          <div
            className={cn(
              'relative w-20 h-20 sm:w-24 sm:h-24',
              'flex items-center justify-center',
              'bg-primary-50 dark:bg-primary-900/50',
              'rounded-full',
              'border-4 border-primary-200 dark:border-primary-700'
            )}
          >
            {/* Animated Plant */}
            <IconPlant
              className={cn(
                'w-10 h-10 sm:w-12 sm:h-12',
                'text-primary-600 dark:text-primary-400',
                'animate-bounce'
              )}
              style={{ animationDuration: '2s' }}
            />
            
            {/* Scanning Animation */}
            <div
              className={cn(
                'absolute inset-0',
                'rounded-full',
                'border-4 border-primary-400/50',
                'animate-ping'
              )}
              style={{ animationDuration: '1.5s' }}
            />
          </div>
          
          {/* AI Indicator */}
          <div
            className={cn(
              'absolute -bottom-1 -right-1',
              'w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10',
              'flex items-center justify-center',
              'bg-white dark:bg-gray-800',
              'rounded-full',
              'border-2 border-primary-500',
              'text-[10px] sm:text-xs md:text-sm font-bold',
              'text-primary-600 dark:text-primary-400'
            )}
          >
            AI
          </div>
        </div>
      </div>

      {/* Stage Text */}
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
          {stageInfo.label}
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {stageInfo.description}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-primary-400">
            {normalizedProgress}%
          </span>
        </div>
        <div className="h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full',
              'bg-gradient-to-r from-primary-500 to-primary-400',
              'transition-all duration-300 ease-out'
            )}
            style={{ width: `${normalizedProgress}%` }}
          >
            {/* Shimmer Effect */}
            <div
              className={cn(
                'w-full h-full',
                'bg-gradient-to-r from-transparent via-white/30 to-transparent',
                'animate-shimmer'
              )}
            />
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
        {estimatedTime}
      </p>

      {/* Tips Carousel */}
      <div
        className={cn(
          'relative p-3 sm:p-4 rounded-lg',
          'bg-amber-50 dark:bg-amber-950/30',
          'border border-amber-200 dark:border-amber-800'
        )}
      >
        {/* Tip Header */}
        <div className="flex items-center gap-2 mb-2">
          <IconBulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            Farming Tip
          </span>
        </div>

        {/* Tip Content */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={goToPreviousTip}
            className="p-1.5 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors flex items-center justify-center"
            aria-label="Previous tip"
          >
            <IconChevronLeft className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </button>
          
          <div className="flex-1 text-center">
            <span className="text-xl sm:text-2xl mb-1 block" role="img" aria-hidden="true">
              {currentTip.icon}
            </span>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
              {currentTip.tip}
            </p>
          </div>
          
          <button
            onClick={goToNextTip}
            className="p-1.5 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors flex items-center justify-center"
            aria-label="Next tip"
          >
            <IconChevronRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </button>
        </div>

        {/* Tip Indicators */}
        <div className="flex justify-center gap-1.5 sm:gap-1 mt-3">
          {FARMING_TIPS.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoPlayTips(false);
                setCurrentTipIndex(index);
              }}
              className={cn(
                'w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full transition-colors',
                index === currentTipIndex
                  ? 'bg-amber-600 dark:bg-amber-400'
                  : 'bg-amber-300 dark:bg-amber-700'
              )}
              aria-label={`Go to tip ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Cancel Button */}
      {showCancel && onCancel && (
        <div className="mt-4 sm:mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="min-h-[44px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <IconX className="w-4 h-4 mr-1" />
            Cancel Analysis
          </Button>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Taking longer than expected?
          </p>
        </div>
      )}

      {/* Custom CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </Card>
  );
}

export default AnalysisLoading;
