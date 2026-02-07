'use client';

import React from 'react';
import { IconArrowLeft, IconArrowRight, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================
// Types
// ============================================

export interface FormNavigationProps {
  /** Callback when back button is clicked */
  onBack?: () => void;
  
  /** Callback when next button is clicked */
  onNext: () => void;
  
  /** Callback when submit button is clicked (for last step) */
  onSubmit?: () => void;
  
  /** Whether this is the last step */
  isLastStep: boolean;
  
  /** Whether this is the first step */
  isFirstStep: boolean;
  
  /** Whether a loading state is active */
  isLoading?: boolean;
  
  /** Custom label for the next button */
  nextLabel?: string;
  
  /** Custom label for the submit button */
  submitLabel?: string;
  
  /** Custom label for the back button */
  backLabel?: string;
  
  /** Whether the next/submit button is disabled */
  disabled?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

/**
 * FormNavigation Component
 * 
 * Displays navigation buttons for wizard forms.
 * Shows Back button (hidden/disabled on first step), and Next/Submit button.
 * Includes loading spinner when isLoading is true.
 * Buttons are sticky at the bottom on mobile with safe area padding.
 * 
 * @example
 * <FormNavigation
 *   isFirstStep={currentStep === 1}
 *   isLastStep={currentStep === totalSteps}
 *   onBack={() => setStep(step - 1)}
 *   onNext={() => setStep(step + 1)}
 *   onSubmit={handleSubmit}
 *   isLoading={submitting}
 * />
 */
export function FormNavigation({
  onBack,
  onNext,
  onSubmit,
  isLastStep,
  isFirstStep,
  isLoading = false,
  nextLabel = 'Next',
  submitLabel = 'Submit',
  backLabel = 'Back',
  disabled = false,
  className,
}: FormNavigationProps) {
  // Handle action button click
  const handleActionClick = () => {
    if (isLoading || disabled) return;
    
    if (isLastStep && onSubmit) {
      onSubmit();
    } else {
      onNext();
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    if (isLoading) return;
    onBack?.();
  };

  return (
    <div
      className={cn(
        // Container styles - non-sticky, part of normal flow
        'w-full',
        'bg-transparent',
        // Padding
        'pt-6',
        className
      )}
    >
      <div className="max-w-lg mx-auto flex items-center gap-3">
        {/* Back Button - Only show container when not first step */}
        {!isFirstStep && (
          <div className="flex-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleBackClick}
              disabled={isLoading}
              className={cn(
                'min-h-[48px] w-full',
                'gap-2',
                'text-gray-700 dark:text-gray-300',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <IconArrowLeft className="w-4 h-4" />
              <span>{backLabel}</span>
            </Button>
          </div>
        )}

        {/* Next/Submit Button */}
        <div className="flex-1">
          <Button
            type="button"
            size="lg"
            onClick={handleActionClick}
            disabled={isLoading || disabled}
            className={cn(
              'min-h-[48px] w-full',
              'gap-2',
              'font-semibold',
              (isLoading || disabled) && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <IconLoader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isLastStep ? submitLabel : nextLabel}</span>
                {!isLastStep && <IconArrowRight className="w-4 h-4" />}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FormNavigation;
