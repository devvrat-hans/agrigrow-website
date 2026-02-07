'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { CropData } from '@/constants/knowledge-hub';
import { IconPlayerPlay } from '@tabler/icons-react';

/**
 * Props for CropCard component
 */
interface CropCardProps {
  /** Crop data to display */
  crop: CropData;
  /** Click handler */
  onClick: (crop: CropData) => void;
  /** Whether this crop has a video available */
  hasVideo?: boolean;
  /** Whether this card is currently selected */
  isSelected?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * CropCard Component
 * 
 * Displays a crop icon and name in a card format.
 * Shows visual distinction for crops with videos vs without.
 * Touch-friendly with 44px minimum tap target.
 */
export function CropCard({
  crop,
  onClick,
  hasVideo = false,
  isSelected = false,
  className,
}: CropCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(crop)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(crop);
        }
      }}
      aria-label={`${crop.name}${hasVideo ? ' - Video available' : ' - Coming soon'}`}
      className={cn(
        // Base styles
        'relative flex flex-col items-center justify-center p-3 sm:p-4',
        'cursor-pointer transition-all duration-200 ease-out',
        // Minimum touch target (44px)
        'min-h-[80px] min-w-[80px]',
        // Border and background
        'border border-gray-200 dark:border-gray-800',
        'bg-white dark:bg-gray-950',
        // Hover and active states
        'hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800',
        'active:scale-95',
        // Focus styles for accessibility
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        // Selected state
        isSelected && 'border-primary-500 bg-primary-50 dark:bg-primary-950/50 shadow-md',
        // Video available indicator
        hasVideo && 'hover:bg-primary-50/50 dark:hover:bg-primary-950/30',
        className
      )}
    >
      {/* Video badge */}
      {hasVideo && (
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
            <IconPlayerPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
          </div>
        </div>
      )}

      {/* Crop Icon */}
      <span 
        className={cn(
          'text-3xl sm:text-4xl mb-1 sm:mb-2',
          'transition-transform duration-200',
          'group-hover:scale-110'
        )}
        role="img"
        aria-hidden="true"
      >
        {crop.icon}
      </span>

      {/* Crop Name */}
      <span 
        className={cn(
          'text-xs sm:text-sm font-medium text-center',
          'text-gray-700 dark:text-gray-300',
          'leading-tight truncate max-w-full px-1'
        )}
      >
        {crop.name}
      </span>

      {/* Coming soon label for crops without video */}
      {!hasVideo && (
        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Coming soon
        </span>
      )}
    </Card>
  );
}

export default CropCard;
