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
import { useTranslation } from '@/hooks/useTranslation';

interface TrustScoreSectionProps {
  /** Trust score value */
  score: number;
  /** Additional class names */
  className?: string;
}

/**
 * Get trust level based on score
 */
function getTrustLevel(score: number): { labelKey: string; color: string; bgColor: string } {
  if (score >= 800) {
    return { 
      labelKey: 'profile.trustScoreModal.expert', 
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30'
    };
  }
  if (score >= 500) {
    return { 
      labelKey: 'profile.trustScoreModal.trusted', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30'
    };
  }
  if (score >= 200) {
    return { 
      labelKey: 'profile.trustScoreModal.active', 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30'
    };
  }
  return { 
    labelKey: 'profile.trustScoreModal.new', 
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
    labelKey: 'profile.trustScoreModal.usefulPosts',
    descriptionKey: 'profile.trustScoreModal.usefulPostsDesc',
  },
  {
    icon: IconMessageCheck,
    labelKey: 'profile.trustScoreModal.helpfulAdvice',
    descriptionKey: 'profile.trustScoreModal.helpfulAdviceDesc',
  },
  {
    icon: IconActivityHeartbeat,
    labelKey: 'profile.trustScoreModal.regularActivity',
    descriptionKey: 'profile.trustScoreModal.regularActivityDesc',
  },
  {
    icon: IconUserCheck,
    labelKey: 'profile.trustScoreModal.verifiedIdentity',
    descriptionKey: 'profile.trustScoreModal.verifiedIdentityDesc',
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
  const { t } = useTranslation();
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
          {t('profile.trustScore')}
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
                  {t('profile.trustScoreModal.title')}
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
                    {t(trustLevel.labelKey)}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="px-5 pb-5">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('profile.trustScoreModal.description')}
            </p>

            {/* How it increases */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <IconStar className="w-4 h-4 text-amber-500" />
                {t('profile.trustScoreModal.howItIncreases')}
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
                          {t(method.labelKey)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t(method.descriptionKey)}
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
              {t('profile.trustScoreModal.gotIt')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TrustScoreSection;
