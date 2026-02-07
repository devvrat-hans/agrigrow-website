'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { FormProgress, FormNavigation } from '../common';
import { LocationLandForm, type LocationLandFormValues, type LocationLandFormErrors } from './LocationLandForm';
import { SeasonSoilForm, type SeasonSoilFormValues, type SeasonSoilFormErrors } from './SeasonSoilForm';
import { WaterAvailabilityForm, type WaterAvailabilityFormValues, type WaterAvailabilityFormErrors } from './WaterAvailabilityForm';
import type { PlanningResult, PlanningFormErrors } from '@/types/planning';

/**
 * Combined form values for the planning wizard
 */
interface PlanningWizardFormValues {
  // Step 1: Location & Land
  state: string;
  district: string;
  village: string;
  landSize: string;
  landUnit: 'acres' | 'hectares' | '';
  // Step 2: Season & Soil
  season: string;
  sowingMonth: string;
  soilType: string;
  // Step 3: Water Availability
  irrigationAvailability: string;
  irrigationMethod: string;
}

/**
 * Props for PlanningWizard component
 */
interface PlanningWizardProps {
  /** Callback when planning is complete with result */
  onComplete: (result: PlanningResult, inputData: PlanningWizardFormValues) => void;
  /** Callback when user cancels the wizard */
  onCancel: () => void;
  /** Additional className */
  className?: string;
}

// Step labels for the wizard (labelKey/descKey resolved via t() inside component)
const STEPS = [
  { labelKey: 'cropAi.planning.stepLocationLand', descKey: 'cropAi.planning.locationLandDetails' },
  { labelKey: 'cropAi.planning.stepSeasonSoil', descKey: 'cropAi.planning.seasonSoilDetails' },
  { labelKey: 'cropAi.planning.stepWaterAvailability', descKey: 'cropAi.planning.waterAvailability' },
];

// Initial form values
const INITIAL_VALUES: PlanningWizardFormValues = {
  state: '',
  district: '',
  village: '',
  landSize: '',
  landUnit: '',
  season: '',
  sowingMonth: '',
  soilType: '',
  irrigationAvailability: '',
  irrigationMethod: '',
};

/**
 * PlanningWizard Component
 * 
 * Orchestrates the multi-step planning form.
 * - Step 1: LocationLandForm (state, district, village, land size, unit)
 * - Step 2: SeasonSoilForm (season, sowing month, soil type)
 * - Step 3: WaterAvailabilityForm (irrigation availability, method)
 * 
 * Features:
 * - FormProgress at top showing current step
 * - FormNavigation at bottom for navigation
 * - Step validation before proceeding
 * - API submission with loading state
 */
export function PlanningWizard({
  onComplete,
  onCancel,
  className,
}: PlanningWizardProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formValues, setFormValues] = useState<PlanningWizardFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<PlanningFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate Step 1: Location & Land
  const validateStep1 = useCallback((): boolean => {
    const newErrors: LocationLandFormErrors = {};

    if (!formValues.state) {
      newErrors.state = t('cropAi.planning.selectStateRequired');
    }

    if (!formValues.district) {
      newErrors.district = t('cropAi.planning.selectDistrictRequired');
    }

    if (!formValues.landSize || parseFloat(formValues.landSize) <= 0) {
      newErrors.landSize = t('cropAi.planning.enterLandSize');
    }

    if (!formValues.landUnit) {
      newErrors.landUnit = t('cropAi.planning.enterLandSize');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formValues.state, formValues.district, formValues.landSize, formValues.landUnit]);

  // Validate Step 2: Season & Soil
  const validateStep2 = useCallback((): boolean => {
    const newErrors: SeasonSoilFormErrors = {};

    if (!formValues.season) {
      newErrors.season = t('cropAi.planning.selectSeasonRequired');
    }

    if (!formValues.sowingMonth) {
      newErrors.sowingMonth = t('cropAi.planning.selectSowingMonthRequired');
    }

    if (!formValues.soilType) {
      newErrors.soilType = t('cropAi.planning.selectSoilTypeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formValues.season, formValues.sowingMonth, formValues.soilType]);

  // Validate Step 3: Water Availability
  const validateStep3 = useCallback((): boolean => {
    const newErrors: WaterAvailabilityFormErrors = {};

    if (!formValues.irrigationAvailability) {
      newErrors.irrigationAvailability = t('cropAi.planning.selectIrrigationRequired');
    }

    // Irrigation method required if not rainfed
    if (formValues.irrigationAvailability !== 'rainfed' && !formValues.irrigationMethod) {
      newErrors.irrigationMethod = t('cropAi.planning.selectIrrigationMethodRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formValues.irrigationAvailability, formValues.irrigationMethod]);

  // Handle next step
  const handleNext = useCallback(() => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }

    if (isValid) {
      setErrors({});
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep1, validateStep2]);

  // Handle previous step
  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      onCancel();
    } else {
      setErrors({});
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, onCancel]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateStep3()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare API request payload
      const payload = {
        state: formValues.state,
        district: formValues.district,
        village: formValues.village || undefined,
        landSize: parseFloat(formValues.landSize),
        landUnit: formValues.landUnit,
        season: formValues.season,
        sowingMonth: formValues.sowingMonth,
        soilType: formValues.soilType,
        irrigationAvailability: formValues.irrigationAvailability,
        irrigationMethod: formValues.irrigationAvailability !== 'rainfed' 
          ? formValues.irrigationMethod 
          : undefined,
      };

      // Call the planning API
      const response = await fetch('/api/crop-ai/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('cropAi.common.error'));
      }

      // Call onComplete with the result and input data
      onComplete(data.data as PlanningResult, formValues);
    } catch (error) {
      console.error('Planning error:', error);
      setErrors({
        irrigationAvailability: error instanceof Error 
          ? error.message 
          : t('cropAi.common.error'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formValues, validateStep3, onComplete]);

  // Handle LocationLandForm values change
  const handleLocationLandChange = useCallback((values: LocationLandFormValues) => {
    setFormValues(prev => ({
      ...prev,
      state: values.state,
      district: values.district,
      village: values.village,
      landSize: values.landSize,
      landUnit: values.landUnit,
    }));
    // Clear related errors when user changes values
    if (errors.state || errors.district || errors.landSize || errors.landUnit) {
      setErrors(prev => ({
        ...prev,
        state: undefined,
        district: undefined,
        landSize: undefined,
        landUnit: undefined,
      }));
    }
  }, [errors]);

  // Handle SeasonSoilForm values change
  const handleSeasonSoilChange = useCallback((values: SeasonSoilFormValues) => {
    setFormValues(prev => ({
      ...prev,
      season: values.season,
      sowingMonth: values.sowingMonth,
      soilType: values.soilType,
    }));
    // Clear related errors when user changes values
    if (errors.season || errors.sowingMonth || errors.soilType) {
      setErrors(prev => ({
        ...prev,
        season: undefined,
        sowingMonth: undefined,
        soilType: undefined,
      }));
    }
  }, [errors]);

  // Handle WaterAvailabilityForm values change
  const handleWaterChange = useCallback((values: WaterAvailabilityFormValues) => {
    setFormValues(prev => ({
      ...prev,
      irrigationAvailability: values.irrigationAvailability,
      irrigationMethod: values.irrigationMethod,
    }));
    // Clear related errors when user changes values
    if (errors.irrigationAvailability || errors.irrigationMethod) {
      setErrors(prev => ({
        ...prev,
        irrigationAvailability: undefined,
        irrigationMethod: undefined,
      }));
    }
  }, [errors]);

  // Get form values for each step
  const locationLandValues: LocationLandFormValues = {
    state: formValues.state,
    district: formValues.district,
    village: formValues.village,
    landSize: formValues.landSize,
    landUnit: formValues.landUnit,
  };

  const seasonSoilValues: SeasonSoilFormValues = {
    season: formValues.season,
    sowingMonth: formValues.sowingMonth,
    soilType: formValues.soilType,
  };

  const waterValues: WaterAvailabilityFormValues = {
    irrigationAvailability: formValues.irrigationAvailability,
    irrigationMethod: formValues.irrigationMethod,
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Progress indicator */}
      <FormProgress
        currentStep={currentStep}
        totalSteps={STEPS.length}
        stepLabels={STEPS.map(s => t(s.labelKey))}
        className="mb-8"
      />

      {/* Step title and description */}
      <div className="mb-6">
        <h2
          className={cn(
            'text-xl sm:text-2xl font-semibold',
            'text-gray-900 dark:text-white',
            'mb-2'
          )}
        >
          {t(STEPS[currentStep - 1].labelKey)}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          {t(STEPS[currentStep - 1].descKey)}
        </p>
      </div>

      {/* Form content */}
      <div className="mb-8">
        {currentStep === 1 && (
          <LocationLandForm
            values={locationLandValues}
            onChange={handleLocationLandChange}
            errors={{
              state: errors.state,
              district: errors.district,
              village: errors.village,
              landSize: errors.landSize,
              landUnit: errors.landUnit,
            }}
          />
        )}

        {currentStep === 2 && (
          <SeasonSoilForm
            values={seasonSoilValues}
            onChange={handleSeasonSoilChange}
            errors={{
              season: errors.season,
              sowingMonth: errors.sowingMonth,
              soilType: errors.soilType,
            }}
          />
        )}

        {currentStep === 3 && (
          <WaterAvailabilityForm
            values={waterValues}
            onChange={handleWaterChange}
            errors={{
              irrigationAvailability: errors.irrigationAvailability,
              irrigationMethod: errors.irrigationMethod,
            }}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <FormNavigation
        isFirstStep={currentStep === 1}
        isLastStep={currentStep === STEPS.length}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        backLabel={currentStep === 1 ? 'Cancel' : 'Back'}
        submitLabel="Get Recommendations"
      />
    </div>
  );
}

export type { PlanningWizardProps, PlanningWizardFormValues };
