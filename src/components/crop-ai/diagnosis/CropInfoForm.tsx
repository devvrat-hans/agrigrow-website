'use client';

import { cn } from '@/lib/utils';
import { SearchableDropdown, SingleSelectGroup } from '../common';
import { CROP_LIST } from '@/constants/crops';
import { GROWTH_STAGES } from '@/constants/crop-ai';
import { Input } from '@/components/ui/input';
import type { SelectOption } from '../common';

/**
 * Values for the CropInfoForm
 */
export interface CropInfoFormValues {
  cropName: string;
  cropVariety: string;
  growthStage: string;
}

/**
 * Errors for CropInfoForm fields
 */
export interface CropInfoFormErrors {
  cropName?: string;
  cropVariety?: string;
  growthStage?: string;
}

/**
 * Props for CropInfoForm component
 */
interface CropInfoFormProps {
  /** Current form values */
  values: CropInfoFormValues;
  /** Callback when values change */
  onChange: (values: CropInfoFormValues) => void;
  /** Field-specific error messages */
  errors?: CropInfoFormErrors;
  /** Additional className */
  className?: string;
}

/**
 * CropInfoForm Component
 * 
 * Step 1 of the diagnosis wizard.
 * Collects basic crop information:
 * - Crop name (searchable dropdown from CROP_LIST)
 * - Crop variety (optional text input)
 * - Growth stage (single select from GROWTH_STAGES)
 */
export function CropInfoForm({
  values,
  onChange,
  errors = {},
  className,
}: CropInfoFormProps) {
  // Convert CROP_LIST to dropdown options
  const cropOptions = CROP_LIST.map(crop => ({
    value: crop.id,
    label: crop.name,
    description: crop.nameHindi,
  }));

  // Convert GROWTH_STAGES to single select options
  const growthStageOptions: SelectOption[] = GROWTH_STAGES.map(stage => ({
    value: stage.id,
    label: stage.name,
    description: stage.description,
  }));

  // Handle crop name change
  const handleCropChange = (value: string) => {
    onChange({
      ...values,
      cropName: value,
    });
  };

  // Handle variety change
  const handleVarietyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...values,
      cropVariety: e.target.value,
    });
  };

  // Handle growth stage change
  const handleGrowthStageChange = (value: string) => {
    onChange({
      ...values,
      growthStage: value,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Crop Name - Required */}
      <div className="space-y-2">
        <label
          htmlFor="cropName"
          className={cn(
            'block text-sm font-medium',
            errors.cropName ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          Crop Name <span className="text-red-500">*</span>
        </label>
        <SearchableDropdown
          options={cropOptions}
          value={values.cropName}
          onChange={handleCropChange}
          placeholder="Search and select your crop..."
          className={errors.cropName ? 'border-red-500 focus:border-red-500' : ''}
        />
        {errors.cropName && (
          <p className="text-sm text-red-500 mt-1">{errors.cropName}</p>
        )}
      </div>

      {/* Crop Variety - Optional */}
      <div className="space-y-2">
        <label
          htmlFor="cropVariety"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Crop Variety <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <Input
          id="cropVariety"
          type="text"
          value={values.cropVariety}
          onChange={handleVarietyChange}
          placeholder="e.g., Basmati, Desi, Hybrid..."
          className={cn(
            'w-full',
            errors.cropVariety ? 'border-red-500 focus:border-red-500' : ''
          )}
        />
        {errors.cropVariety && (
          <p className="text-sm text-red-500 mt-1">{errors.cropVariety}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          If you know the specific variety, enter it here for more accurate diagnosis.
        </p>
      </div>

      {/* Growth Stage - Required */}
      <div className="space-y-3">
        <label
          className={cn(
            'block text-sm font-medium',
            errors.growthStage ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          Growth Stage <span className="text-red-500">*</span>
        </label>
        <SingleSelectGroup
          options={growthStageOptions}
          value={values.growthStage}
          onChange={handleGrowthStageChange}
          columns={2}
        />
        {errors.growthStage && (
          <p className="text-sm text-red-500 mt-1">{errors.growthStage}</p>
        )}
      </div>
    </div>
  );
}

export type { CropInfoFormProps };
