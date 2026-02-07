'use client';

import { useCallback } from 'react';
import { IconPlant2, IconCamera, IconArrowUp } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// TYPES

export interface EmptyHistoryProps {
  /** Custom title text */
  title?: string;
  /** Custom description text */
  description?: string;
  /** ID of the upload section element to scroll to */
  uploadSectionId?: string;
  /** Callback when start analysis button is clicked */
  onStartAnalysis?: () => void;
  /** Whether to show as compact version */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyHistory Component
 * 
 * Displays an encouraging empty state when user has no crop analyses.
 * Includes illustration, helpful text, and a button to start analysis.
 * 
 * @example
 * <EmptyHistory onStartAnalysis={() => scrollToUpload()} />
 * <EmptyHistory 
 *   compact 
 *   title="No analyses yet" 
 *   description="Upload a crop image to get started"
 * />
 */
export function EmptyHistory({
  title = 'No Crop Analyses Yet',
  description = 'Upload a photo of your crop to get AI-powered insights, disease detection, and personalized recommendations.',
  uploadSectionId = 'upload-section',
  onStartAnalysis,
  compact = false,
  className,
}: EmptyHistoryProps) {
  // Handle start analysis click
  const handleStartAnalysis = useCallback(() => {
    if (onStartAnalysis) {
      onStartAnalysis();
    } else {
      // Default behavior: scroll to upload section
      const uploadSection = document.getElementById(uploadSectionId);
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // If no upload section found, scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [onStartAnalysis, uploadSectionId]);

  if (compact) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center py-8 px-4',
          className
        )}
      >
        {/* Compact Icon */}
        <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center mb-3">
          <IconPlant2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>

        {/* Compact Text */}
        <p className="text-sm text-muted-foreground mb-4">
          {title}
        </p>

        {/* Compact Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleStartAnalysis}
          className="gap-2"
        >
          <IconArrowUp className="w-4 h-4" />
          Start Analysis
        </Button>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'p-8 sm:p-12',
        className
      )}
    >
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        {/* Illustration */}
        <div className="relative mb-6">
          {/* Main Circle */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-950/30 flex items-center justify-center">
            <IconPlant2 className="w-12 h-12 sm:w-16 sm:h-16 text-primary-600 dark:text-primary-400" />
          </div>

          {/* Camera Icon Badge */}
          <div className="absolute -bottom-1 -right-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center border-2 border-primary-100 dark:border-primary-900">
            <IconCamera className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">
          {title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">
          {description}
        </p>

        {/* Features List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 w-full">
          <FeatureItem
            icon="🔍"
            label="Disease Detection"
          />
          <FeatureItem
            icon="💧"
            label="Nutrient Analysis"
          />
          <FeatureItem
            icon="📊"
            label="Health Score"
          />
        </div>

        {/* Start Analysis Button */}
        <Button
          size="lg"
          onClick={handleStartAnalysis}
          className="gap-2"
        >
          <IconCamera className="w-5 h-5" />
          Start Your First Analysis
        </Button>

        {/* Helper Text */}
        <p className="text-xs text-muted-foreground mt-4">
          Take a clear photo of your crop leaf or plant for best results
        </p>
      </div>
    </Card>
  );
}

// FEATURE ITEM COMPONENT

interface FeatureItemProps {
  icon: string;
  label: string;
}

function FeatureItem({ icon, label }: FeatureItemProps) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <span className="text-xl">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
