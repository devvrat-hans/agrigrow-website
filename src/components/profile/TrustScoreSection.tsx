'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  IconShieldCheck,
  IconThumbUp,
  IconMessageCheck,
  IconActivityHeartbeat,
  IconUserCheck,
  IconStar,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TrustScoreSectionProps {
  /** Trust score value */
  score: number;
  /** Additional class names */
  className?: string;
}

/**
 * Get trust level based on score
 */
function getTrustLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 800) {
    return { 
      label: 'Expert', 
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30'
    };
  }
  if (score >= 500) {
    return { 
      label: 'Trusted', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30'
    };
  }
  if (score >= 200) {
    return { 
      label: 'Active', 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30'
    };
  }
  return { 
    label: 'New', 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50'
  };
}

/**
 * Trust score increase methods
 */
const TRUST_METHODS = [
  {
    icon: IconThumbUp,
    label: 'Useful posts & videos',
    description: 'Share helpful content that benefits the community',
  },
  {
    icon: IconMessageCheck,
    label: 'Farmers marking advice as helpful',
    description: 'When others find your advice valuable',
  },
  {
    icon: IconActivityHeartbeat,
    label: 'Regular activity',
    description: 'Stay active by posting and engaging regularly',
  },
  {
    icon: IconUserCheck,
    label: 'Verified identity',
    description: 'Complete your profile verification',
  },
];

/**
 * TrustScoreSection Component
 * 
 * Displays the user's trust score with a clickable badge.
 * Opens a modal explaining how the score increases.
 */
export function TrustScoreSection({
  score,
  className,
}: TrustScoreSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const trustLevel = getTrustLevel(score);

  return (
    <>
      {/* Trust Score Badge - Clickable */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          'transition-all duration-200',
          'hover:scale-105 active:scale-95',
          trustLevel.bgColor,
          className
        )}
        aria-label={`Trust Score: ${score}. Tap to learn more`}
      >
        <IconShieldCheck className={cn('w-4 h-4', trustLevel.color)} />
        <span className={cn('text-sm font-semibold', trustLevel.color)}>
          {score}
        </span>
        <span className={cn('text-xs', trustLevel.color)}>
          Trust Score
        </span>
      </button>

      {/* Trust Score Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          variant="mobile-sheet"
          hideCloseButton={true}
          className={cn(
            'w-[calc(100vw-2rem)] max-w-sm',
            'p-0 overflow-hidden',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-800',
            // Mobile: full width bottom sheet
            'sm:w-[calc(100vw-2rem)]'
          )}
        >
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                trustLevel.bgColor
              )}>
                <IconShieldCheck className={cn('w-6 h-6', trustLevel.color)} />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your Trust Score
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-2xl font-bold', trustLevel.color)}>
                    {score}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    trustLevel.bgColor,
                    trustLevel.color
                  )}>
                    {trustLevel.label}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="px-5 pb-5">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your trust score reflects your reputation in the AgriGrow community.
            </p>

            {/* How it increases */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <IconStar className="w-4 h-4 text-amber-500" />
                How it increases:
              </h3>
              <ul className="space-y-3">
                {TRUST_METHODS.map((method, index) => {
                  const Icon = method.icon;
                  return (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {method.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {method.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Close Button */}
            <Button
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-5"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TrustScoreSection;
