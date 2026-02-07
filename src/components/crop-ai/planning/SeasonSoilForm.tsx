'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SearchableDropdown, SingleSelectGroup } from '../common';
import { SEASONS, SOIL_TYPES, MONTHS } from '@/constants/crop-ai';
import type { SelectOption } from '../common';

/**
 * Values for the SeasonSoilForm
 */
export interface SeasonSoilFormValues {
  season: string;
  sowingMonth: string;
  soilType: string;
}

/**
 * Errors for SeasonSoilForm fields
 */
export interface SeasonSoilFormErrors {
  season?: string;
  sowingMonth?: string;
  soilType?: string;
}

/**
 * Props for SeasonSoilForm component
 */
interface SeasonSoilFormProps {
  /** Current form values */
  values: SeasonSoilFormValues;
  /** Callback when values change */
  onChange: (values: SeasonSoilFormValues) => void;
  /** Field-specific error messages */
  errors?: SeasonSoilFormErrors;
  /** Additional className */
  className?: string;
}

/**
 * SeasonSoilForm Component
 * 
 * Step 2 of the crop planning wizard.
 * Collects season and soil information:
 * - Season (kharif/rabi/zaid with descriptions)
 * - Planned sowing month (searchable dropdown)
 * - Soil type (with descriptions)
 */
export function SeasonSoilForm({
  values,
  onChange,
  errors = {},
  className,
}: SeasonSoilFormProps) {
  // Convert SEASONS to single select options
  const seasonOptions: SelectOption[] = useMemo(() =>
    SEASONS.map(season => ({
      value: season.id,
      label: season.name,
      description: `${season.months} - ${season.description}`,
    })),
    []
  );

  // Convert MONTHS to dropdown options
  const monthOptions = useMemo(() =>
    MONTHS.map(month => ({
      value: String(month.id),
      label: month.name,
      description: month.nameHi,
    })),
    []
  );

  // Convert SOIL_TYPES to single select options
  const soilTypeOptions: SelectOption[] = useMemo(() =>
    SOIL_TYPES.map(soil => ({
      value: soil.id,
      label: soil.name,
      description: soil.description,
    })),
    []
  );

  // Handle season change
  const handleSeasonChange = (value: string) => {
    onChange({
      ...values,
      season: value,
    });
  };

  // Handle sowing month change
  const handleSowingMonthChange = (value: string) => {
    onChange({
      ...values,
      sowingMonth: value,
    });
  };

  // Handle soil type change
  const handleSoilTypeChange = (value: string) => {
    onChange({
      ...values,
      soilType: value,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Season - Required */}
      <div className="space-y-3">
        <label
          className={cn(
            'block text-sm font-medium',
            errors.season ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          Cropping Season <span className="text-red-500">*</span>
        </label>
        <SingleSelectGroup
          options={seasonOptions}
          value={values.season}
          onChange={handleSeasonChange}
          columns={1}
        />
        {errors.season && (
          <p className="text-sm text-red-500 mt-1">{errors.season}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select the season during which you plan to grow crops.
        </p>
      </div>

      {/* Planned Sowing Month - Required */}
      <div className="space-y-2">
        <label
          htmlFor="sowingMonth"
          className={cn(
            'block text-sm font-medium',
            errors.sowingMonth ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          Planned Sowing Month <span className="text-red-500">*</span>
        </label>
        <SearchableDropdown
          options={monthOptions}
          value={values.sowingMonth}
          onChange={handleSowingMonthChange}
          placeholder="Select your planned sowing month..."
          className={errors.sowingMonth ? 'border-red-500 focus:border-red-500' : ''}
        />
        {errors.sowingMonth && (
          <p className="text-sm text-red-500 mt-1">{errors.sowingMonth}</p>
        )}
      </div>

      {/* Soil Type - Required */}
      <div className="space-y-3">
        <label
          className={cn(
            'block text-sm font-medium',
            errors.soilType ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          Soil Type <span className="text-red-500">*</span>
        </label>
        <SingleSelectGroup
          options={soilTypeOptions}
          value={values.soilType}
          onChange={handleSoilTypeChange}
          columns={1}
        />
        {errors.soilType && (
          <p className="text-sm text-red-500 mt-1">{errors.soilType}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          If unsure about your soil type, consider getting a soil test done at your local KVK.
        </p>
      </div>
    </div>
  );
}

export type { SeasonSoilFormProps };
