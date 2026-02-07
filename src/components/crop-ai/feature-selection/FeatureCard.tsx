'use client';

import { ReactNode } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Props for the FeatureCard component
 */
interface FeatureCardProps {
  /** Title of the feature */
  title: string;
  /** Description of the feature (2-3 lines) */
  description: string;
  /** Icon to display at the top of the card */
  icon: ReactNode;
  /** Callback when card is clicked/tapped */
  onClick: () => void;
  /** Tailwind gradient classes for background */
  gradient: string;
  /** Additional className for the card */
  className?: string;
}

/**
 * FeatureCard Component
 * 
 * Displays a large, tappable card for selecting a feature.
 * Used on the Crop AI landing page for feature selection.
 * 
 * Features:
 * - Large icon at top
 * - Title below icon
 * - 2-3 line description
 * - Subtle arrow indicating it's tappable
 * - Hover/active states
 * - Minimum height for touch friendliness
 */
export function FeatureCard({
  title,
  description,
  icon,
  onClick,
  gradient,
  className,
}: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Base styles
        'group relative w-full rounded-2xl p-6 text-left',
        'min-h-[200px] sm:min-h-[240px]',
        'flex flex-col items-center justify-center',
        
        // Gradient background
        gradient,
        
        // Border and shadow
        'border border-white/20',
        'shadow-lg shadow-black/5',
        
        // Transition
        'transition-all duration-300 ease-out',
        
        // Hover states
        'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/10',
        'hover:border-white/30',
        
        // Active/pressed state
        'active:scale-[0.98] active:shadow-md',
        
        // Focus ring for accessibility
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        
        className
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          'flex items-center justify-center',
          'w-16 h-16 sm:w-20 sm:h-20',
          'rounded-2xl',
          'bg-white/20 backdrop-blur-sm',
          'mb-4 sm:mb-5',
          'transition-transform duration-300',
          'group-hover:scale-110',
          '[&>svg]:w-8 [&>svg]:h-8 sm:[&>svg]:w-10 sm:[&>svg]:h-10',
          '[&>svg]:text-white'
        )}
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'text-lg sm:text-xl font-semibold',
          'text-white',
          'mb-2',
          'text-center'
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-sm sm:text-base',
          'text-white/80',
          'text-center',
          'line-clamp-3',
          'max-w-[200px] sm:max-w-[240px]',
          'leading-relaxed'
        )}
      >
        {description}
      </p>

      {/* Arrow indicator */}
      <div
        className={cn(
          'absolute bottom-4 right-4',
          'flex items-center justify-center',
          'w-8 h-8 sm:w-10 sm:h-10',
          'rounded-full',
          'bg-white/10',
          'transition-all duration-300',
          'group-hover:bg-white/20',
          'group-hover:translate-x-1'
        )}
      >
        <IconArrowRight
          className={cn(
            'w-4 h-4 sm:w-5 sm:h-5',
            'text-white',
            'transition-transform duration-300',
            'group-hover:translate-x-0.5'
          )}
        />
      </div>
    </button>
  );
}

export type { FeatureCardProps };
