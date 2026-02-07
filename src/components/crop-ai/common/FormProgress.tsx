'use client';

import React from 'react';
import { IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  className?: string;
}

export function FormProgress({
  currentStep,
  totalSteps,
  stepLabels,
  className,
}: FormProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex items-center justify-between px-4 sm:px-8">
        <div 
          className="absolute top-[20px] sm:top-[22px] h-1 bg-gray-200 dark:bg-gray-700 rounded-full"
          style={{ left: '40px', right: '40px' }}
        />
        <div 
          className="absolute top-[20px] sm:top-[22px] h-1 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500 ease-out"
          style={{
            left: '40px',
            width: currentStep > 1 
              ? `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - 80px)`
              : '0%',
          }}
        />
        {steps.map((step) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isFuture = step > currentStep;
          
          return (
            <div key={step} className="relative flex flex-col items-center z-10">
              <div
                className={cn(
                  'flex items-center justify-center',
                  'w-10 h-10 sm:w-11 sm:h-11 rounded-full',
                  'text-sm font-bold',
                  'transition-all duration-300 ease-out',
                  'min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]',
                  isCompleted && [
                    'bg-gradient-to-br from-primary-500 to-primary-600',
                    'text-white',
                    'shadow-md shadow-primary-500/30',
                    'border-2 border-primary-400',
                  ],
                  isCurrent && [
                    'bg-white dark:bg-gray-800',
                    'border-[3px] border-primary-500',
                    'text-primary-600 dark:text-primary-400',
                    'shadow-lg shadow-primary-500/25',
                    'ring-4 ring-primary-100 dark:ring-primary-900/40',
                  ],
                  isFuture && [
                    'bg-gray-100 dark:bg-gray-800',
                    'border-2 border-gray-300 dark:border-gray-600',
                    'text-gray-400 dark:text-gray-500',
                  ]
                )}
              >
                {isCompleted ? (
                  <IconCheck className="w-5 h-5 drop-shadow-sm" stroke={3} />
                ) : (
                  <span className={cn(isCurrent && 'text-base font-extrabold')}>{step}</span>
                )}
              </div>
              {stepLabels && stepLabels[step - 1] && (
                <span
                  className={cn(
                    'mt-2.5 text-[11px] sm:text-xs font-medium text-center',
                    'max-w-[70px] sm:max-w-[90px] leading-tight',
                    'transition-all duration-300',
                    isCompleted && 'text-primary-600 dark:text-primary-400 font-semibold',
                    isCurrent && 'text-primary-700 dark:text-primary-300 font-bold',
                    isFuture && 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {stepLabels[step - 1]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FormProgress;
