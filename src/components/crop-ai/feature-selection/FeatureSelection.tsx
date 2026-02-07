'use client';

import { IconPlant2, IconCalendarEvent } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { FeatureCard } from './FeatureCard';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Props for the FeatureSelection component
 */
interface FeatureSelectionProps {
  /** Callback when AI Crop Diagnosis is selected */
  onSelectDiagnosis: () => void;
  /** Callback when Crop Planning is selected */
  onSelectPlanning: () => void;
  /** Additional className */
  className?: string;
}

/**
 * FeatureSelection Component
 * 
 * Landing screen for the Crop AI page.
 * Displays two feature cards for users to choose between:
 * - AI Crop Diagnosis: Analyze crop problems with AI
 * - Crop Planning: Get crop recommendations
 * 
 * Layout:
 * - Side by side on desktop
 * - Stacked on mobile
 */
export function FeatureSelection({
  onSelectDiagnosis,
  onSelectPlanning,
  className,
}: FeatureSelectionProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4', className)}>
      {/* Intro section */}
      <div className="text-center mb-8 sm:mb-10">
        <h1
          className={cn(
            'text-2xl sm:text-3xl font-bold',
            'text-gray-900 dark:text-white',
            'mb-3'
          )}
        >
          {t('cropAi.assistant')}
        </h1>
        <p
          className={cn(
            'text-base sm:text-lg',
            'text-gray-600 dark:text-gray-300',
            'max-w-xl mx-auto',
            'leading-relaxed'
          )}
        >
          {t('cropAi.assistantFullDesc')}
        </p>
      </div>

      {/* Feature cards grid */}
      <div
        className={cn(
          'grid gap-4 sm:gap-6',
          'grid-cols-1 sm:grid-cols-2',
          'max-w-2xl mx-auto'
        )}
      >
        {/* AI Crop Diagnosis Card */}
        <FeatureCard
          title={t('cropAi.featureSelection.diagnosisTitle')}
          description={t('cropAi.featureSelection.diagnosisDesc')}
          icon={<IconPlant2 stroke={1.5} />}
          onClick={onSelectDiagnosis}
          gradient="bg-gradient-to-br from-green-500 to-green-700"
        />

        {/* Crop Planning Card */}
        <FeatureCard
          title={t('cropAi.featureSelection.planningTitle')}
          description={t('cropAi.featureSelection.planningDesc')}
          icon={<IconCalendarEvent stroke={1.5} />}
          onClick={onSelectPlanning}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
        />
      </div>
    </div>
  );
}

export type { FeatureSelectionProps };
