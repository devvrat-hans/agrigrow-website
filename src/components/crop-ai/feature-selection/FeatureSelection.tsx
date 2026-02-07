'use client';

import { IconPlant2, IconCalendarEvent } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { FeatureCard } from './FeatureCard';

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
          Crop AI Assistant
        </h1>
        <p
          className={cn(
            'text-base sm:text-lg',
            'text-gray-600 dark:text-gray-300',
            'max-w-xl mx-auto',
            'leading-relaxed'
          )}
        >
          Get AI-powered help for your farming needs. Diagnose crop problems or
          plan what to grow next based on your land and conditions.
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
          title="AI Crop Diagnosis"
          description="Upload a photo of your crop and get instant AI analysis for diseases, pests, and deficiencies."
          icon={<IconPlant2 stroke={1.5} />}
          onClick={onSelectDiagnosis}
          gradient="bg-gradient-to-br from-green-500 to-green-700"
        />

        {/* Crop Planning Card */}
        <FeatureCard
          title="Crop Planning"
          description="Get personalized crop recommendations based on your location, soil type, season, and water availability."
          icon={<IconCalendarEvent stroke={1.5} />}
          onClick={onSelectPlanning}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
        />
      </div>
    </div>
  );
}

export type { FeatureSelectionProps };
