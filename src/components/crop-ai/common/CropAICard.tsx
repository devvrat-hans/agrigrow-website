'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PaddingSize = 'none' | 'sm' | 'md' | 'lg';

interface CropAICardProps {
  /** Card content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Padding size - responsive by default */
  padding?: PaddingSize;
}

/**
 * Padding classes for different sizes.
 * Each size has responsive values for mobile, tablet, and desktop.
 */
const paddingClasses: Record<PaddingSize, string> = {
  none: '',
  sm: 'p-2 sm:p-3',
  md: 'p-3 sm:p-4 md:p-6',
  lg: 'p-4 sm:p-5 md:p-8',
};

/**
 * CropAICard Component
 *
 * Base card component for all crop-ai sections with responsive padding.
 * Used as a consistent container throughout the Crop AI feature.
 *
 * @example
 * <CropAICard padding="md">
 *   <h2>Analysis Results</h2>
 *   <p>Your crop looks healthy!</p>
 * </CropAICard>
 */
export function CropAICard({
  children,
  className,
  padding = 'md',
}: CropAICardProps) {
  return (
    <Card className={cn(paddingClasses[padding], className)}>
      {children}
    </Card>
  );
}
