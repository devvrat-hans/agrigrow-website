'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { SearchableDropdown, SingleSelectGroup } from '../common';
import { Input } from '@/components/ui/input';
import { INDIAN_STATES, STATE_DISTRICTS } from '@/constants/indian-locations';

/**
 * Values for the LocationLandForm
 */
export interface LocationLandFormValues {
  state: string;
  district: string;
  village: string;
  landSize: string;
  landUnit: 'acres' | 'hectares' | '';
}

/**
 * Errors for LocationLandForm fields
 */
export interface LocationLandFormErrors {
  state?: string;
  district?: string;
  village?: string;
  landSize?: string;
  landUnit?: string;
}

/**
 * Props for LocationLandForm component
 */
interface LocationLandFormProps {
  /** Current form values */
  values: LocationLandFormValues;
  /** Callback when values change */
  onChange: (values: LocationLandFormValues) => void;
  /** Field-specific error messages */
  errors?: LocationLandFormErrors;
  /** Additional className */
  className?: string;
}

// Land unit options (labelKeys resolved via t() inside component)
const LAND_UNIT_OPTIONS_KEYS = [
  {
    value: 'acres',
    labelKey: 'cropAi.planning.acres',
    description: 'Common unit in India',
  },
  {
    value: 'hectares',
    labelKey: 'cropAi.planning.hectares',
    description: '1 hectare = 2.47 acres',
  },
];

/**
 * LocationLandForm Component
 * 
 * Step 1 of the crop planning wizard.
 * Collects location and land information:
 * - State (searchable dropdown from INDIAN_STATES)
 * - District (filtered by selected state)
 * - Village (optional text input)
 * - Land size (number input)
 * - Land unit (acres/hectares)
 */
export function LocationLandForm({
  values,
  onChange,
  errors = {},
  className,
}: LocationLandFormProps) {
  const { t } = useTranslation();
  // Convert INDIAN_STATES to dropdown options
  const stateOptions = useMemo(() =>
    INDIAN_STATES.map(state => ({
      value: state.code,
      label: state.name,
      description: state.type === 'union_territory' ? 'Union Territory' : undefined,
    })),
    []
  );

  // Get districts for selected state
  const districtOptions = useMemo(() => {
    if (!values.state) return [];
    const districts = STATE_DISTRICTS[values.state] || [];
    return districts.map(district => ({
      value: district,
      label: district,
    }));
  }, [values.state]);

  // Handle state change
  const handleStateChange = (value: string) => {
    onChange({
      ...values,
      state: value,
      // Reset district when state changes
      district: '',
    });
  };

  // Handle district change
  const handleDistrictChange = (value: string) => {
    onChange({
      ...values,
      district: value,
    });
  };

  // Handle village change
  const handleVillageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...values,
      village: e.target.value,
    });
  };

  // Handle land size change
  const handleLandSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow positive numbers
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onChange({
        ...values,
        landSize: value,
      });
    }
  };

  // Handle land unit change
  const handleLandUnitChange = (value: string) => {
    onChange({
      ...values,
      landUnit: value as 'acres' | 'hectares',
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* State - Required */}
      <div className="space-y-2">
        <label
          htmlFor="state"
          className={cn(
            'block text-sm font-medium',
            errors.state ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          State / Union Territory <span className="text-red-500">*</span>
        </label>
        <SearchableDropdown
          options={stateOptions}
          value={values.state}
          onChange={handleStateChange}
          placeholder={t('cropAi.planning.selectState')}
          className={errors.state ? 'border-red-500 focus:border-red-500' : ''}
        />
        {errors.state && (
          <p className="text-sm text-red-500 mt-1">{errors.state}</p>
        )}
      </div>

      {/* District - Required */}
      <div className="space-y-2">
        <label
          htmlFor="district"
          className={cn(
            'block text-sm font-medium',
            errors.district ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {t('cropAi.planning.district')} <span className="text-red-500">*</span>
        </label>
        <SearchableDropdown
          options={districtOptions}
          value={values.district}
          onChange={handleDistrictChange}
          placeholder={
            values.state
              ? t('cropAi.planning.selectDistrict')
              : t('cropAi.planning.selectStateFirst')
          }
          disabled={!values.state}
          className={errors.district ? 'border-red-500 focus:border-red-500' : ''}
        />
        {errors.district && (
          <p className="text-sm text-red-500 mt-1">{errors.district}</p>
        )}
      </div>

      {/* Village - Optional */}
      <div className="space-y-2">
        <label
          htmlFor="village"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('cropAi.planning.village')} <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <Input
          id="village"
          type="text"
          value={values.village}
          onChange={handleVillageChange}
          placeholder={t('cropAi.planning.villagePlaceholder')}
          className={cn(
            'w-full',
            errors.village ? 'border-red-500 focus:border-red-500' : ''
          )}
        />
        {errors.village && (
          <p className="text-sm text-red-500 mt-1">{errors.village}</p>
        )}
      </div>

      {/* Land Size - Required */}
      <div className="space-y-2">
        <label
          htmlFor="landSize"
          className={cn(
            'block text-sm font-medium',
            errors.landSize ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {t('cropAi.planning.landSize')} <span className="text-red-500">*</span>
        </label>
        <Input
          id="landSize"
          type="text"
          inputMode="decimal"
          value={values.landSize}
          onChange={handleLandSizeChange}
          placeholder={t('cropAi.planning.landSizePlaceholder')}
          className={cn(
            'w-full',
            errors.landSize ? 'border-red-500 focus:border-red-500' : ''
          )}
        />
        {errors.landSize && (
          <p className="text-sm text-red-500 mt-1">{errors.landSize}</p>
        )}
      </div>

      {/* Land Unit - Required */}
      <div className="space-y-3">
        <label
          className={cn(
            'block text-sm font-medium',
            errors.landUnit ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}
        >
          Land Unit <span className="text-red-500">*</span>
        </label>
        <SingleSelectGroup
          options={LAND_UNIT_OPTIONS_KEYS.map(o => ({ value: o.value, label: t(o.labelKey), description: o.description }))}
          value={values.landUnit}
          onChange={handleLandUnitChange}
          columns={2}
        />
        {errors.landUnit && (
          <p className="text-sm text-red-500 mt-1">{errors.landUnit}</p>
        )}
      </div>
    </div>
  );
}

export type { LocationLandFormProps };
