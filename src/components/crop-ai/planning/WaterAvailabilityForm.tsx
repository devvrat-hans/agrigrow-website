'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SingleSelectGroup } from '../common';
import { IRRIGATION_AVAILABILITY, IRRIGATION_METHODS } from '@/constants/crop-ai';
import type { SelectOption } from '../common';

/**
 * Values for the WaterAvailabilityForm
 */
export interface WaterAvailabilityFormValues {
  irrigationAvailability: string;
  irrigationMethod: string;
}

/**
 * Errors for WaterAvailabilityForm fields
 */
export interface WaterAvailabilityFormErrors {
  irrigationAvailability?: string;
  irrigationMethod?: string;
}

/**
 * Props for WaterAvailabilityForm component
 */
interface WaterAvailabilityFormProps {
  /** Current form values */
  values: WaterAvailabilityFormValues;
  /** Callback when values change */
  onChange: (values: WaterAvailabilityFormValues) => void;
  /** Field-specific error messages */
  errors?: WaterAvailabilityFormErrors;
  /** Additional className */
  className?: string;
}

/**
 * WaterAvailabilityForm Component
 * 
 * Step 3 of the crop planning wizard.
 * Collects water/irrigation information:
 * - Irrigation availability (assured/partial/rainfed)
 * - Irrigation method (only shown if not rainfed)
 */
export function WaterAvailabilityForm({
  values,
  onChange,
  errors = {},
  className,
}: WaterAvailabilityFormProps) {
  // Convert IRRIGATION_AVAILABILITY to single select options
  const availabilityOptions: SelectOption[] = useMemo(() =>
    IRRIGATION_AVAILABILITY.map(item => ({
      value: item.id,
      label: item.name,
      description: item.description,
    })),
    []
  );

  // Convert IRRIGATION_METHODS to single select options
  const methodOptions: SelectOption[] = useMemo(() =>
    IRRIGATION_METHODS.map(method => ({
      value: method.id,
      label: method.name,
      description: `${method.description} (${method.waterEfficiency} efficient)`,
    })),
    []
  );

  // Check if irrigation method should be shown
  const showIrrigationMethod = values.irrigationAvailability && values.irrigationAvailability !== 'rainfed';

  // Handle irrigation availability change
  const handleAvailabilityChange = (value: string) => {
    // If switching to rainfed, clear irrigation method
    const newIrrigationMethod = value === 'rainfed' ? '' : values.irrigationMethod;
    
    onChange({
      ...values,
      irrigationAvailability: value,
      irrigationMethod: newIrrigationMethod,
    });
  };

  // Handle irrigation method change
  const handleMethodChange = (value: string) => {
    onChange({
      ...values,
      irrigationMethod: value,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Irrigation Availability - Required */}
      <div className="space-y-3">
        <label
          className={cn(
            'block text-sm font-medium',
            errors.irrigationAvailability ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          Water / Irrigation Availability <span className="text-red-500">*</span>
        </label>
        <SingleSelectGroup
          options={availabilityOptions}
          value={values.irrigationAvailability}
          onChange={handleAvailabilityChange}
          columns={1}
        />
        {errors.irrigationAvailability && (
          <p className="text-sm text-red-500 mt-1">{errors.irrigationAvailability}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select the level of irrigation access available for your land.
        </p>
      </div>

      {/* Irrigation Method - Required only if not rainfed */}
      {showIrrigationMethod && (
        <div className="space-y-3">
          <label
            className={cn(
              'block text-sm font-medium',
              errors.irrigationMethod ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
            )}
          >
            Irrigation Method <span className="text-red-500">*</span>
          </label>
          <SingleSelectGroup
            options={methodOptions}
            value={values.irrigationMethod}
            onChange={handleMethodChange}
            columns={1}
          />
          {errors.irrigationMethod && (
            <p className="text-sm text-red-500 mt-1">{errors.irrigationMethod}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Drip irrigation is most water-efficient but requires initial investment.
          </p>
        </div>
      )}

      {/* Rainfed info message */}
      {values.irrigationAvailability === 'rainfed' && (
        <div
          className={cn(
            'p-4 rounded-xl',
            'bg-blue-50 dark:bg-blue-900/20',
            'border border-blue-100 dark:border-blue-800'
          )}
        >
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Rainfed Farming:</strong> Your crop recommendations will focus on 
            drought-tolerant varieties and crops that can thrive with monsoon rainfall alone.
          </p>
        </div>
      )}
    </div>
  );
}

export type { WaterAvailabilityFormProps };
