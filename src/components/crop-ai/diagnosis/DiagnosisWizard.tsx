'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { FormProgress, FormNavigation } from '../common';
import { CropInfoForm, type CropInfoFormValues, type CropInfoFormErrors } from './CropInfoForm';
import { ImageUploadForm, type ImageUploadFormValues, type ImageUploadFormErrors } from './ImageUploadForm';
import type { DiagnosisResult, DiagnosisFormErrors } from '@/types/diagnosis';

/**
 * Combined form values for the diagnosis wizard
 */
interface DiagnosisWizardFormValues {
  // Step 1: Crop Info
  cropName: string;
  cropVariety: string;
  growthStage: string;
  // Step 2: Image Upload
  imageFile: File | null;
  imagePreview: string;
  affectedPart: string;
}

/**
 * Props for DiagnosisWizard component
 */
interface DiagnosisWizardProps {
  /** Callback when diagnosis is complete with result */
  onComplete: (result: DiagnosisResult) => void;
  /** Callback when user cancels the wizard */
  onCancel: () => void;
  /** Additional className */
  className?: string;
}

// Step labels for the wizard (labelKey/descKey resolved via t() inside component)
const STEPS = [
  { labelKey: 'cropAi.diagnosis.stepCropInfo', descKey: 'cropAi.diagnosis.growthStageDesc' },
  { labelKey: 'cropAi.diagnosis.stepImageUpload', descKey: 'cropAi.diagnosis.uploadDesc' },
];

// Initial form values
const INITIAL_VALUES: DiagnosisWizardFormValues = {
  cropName: '',
  cropVariety: '',
  growthStage: '',
  imageFile: null,
  imagePreview: '',
  affectedPart: '',
};

/**
 * DiagnosisWizard Component
 * 
 * Orchestrates the multi-step diagnosis form.
 * - Step 1: CropInfoForm (crop name, variety, growth stage)
 * - Step 2: ImageUploadForm (image, affected part)
 * 
 * Features:
 * - FormProgress at top showing current step
 * - FormNavigation at bottom for navigation
 * - Step validation before proceeding
 * - API submission with loading state
 */
export function DiagnosisWizard({
  onComplete,
  onCancel,
  className,
}: DiagnosisWizardProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formValues, setFormValues] = useState<DiagnosisWizardFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<DiagnosisFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate Step 1: Crop Info
  const validateStep1 = useCallback((): boolean => {
    const newErrors: CropInfoFormErrors = {};

    if (!formValues.cropName.trim()) {
      newErrors.cropName = t('cropAi.diagnosis.selectCropRequired');
    }

    if (!formValues.growthStage) {
      newErrors.growthStage = t('cropAi.diagnosis.selectGrowthStage');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formValues.cropName, formValues.growthStage]);

  // Validate Step 2: Image Upload
  const validateStep2 = useCallback((): boolean => {
    const newErrors: ImageUploadFormErrors = {};

    if (!formValues.imageFile || !formValues.imagePreview) {
      newErrors.imageFile = t('cropAi.diagnosis.uploadImageRequired');
    }

    if (!formValues.affectedPart) {
      newErrors.affectedPart = t('cropAi.diagnosis.selectAffectedArea');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formValues.imageFile, formValues.imagePreview, formValues.affectedPart]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setErrors({});
        setCurrentStep(2);
      }
    }
  }, [currentStep, validateStep1]);

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
    if (!validateStep2()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare API request payload
      const payload = {
        cropName: formValues.cropName,
        cropVariety: formValues.cropVariety || undefined,
        growthStage: formValues.growthStage,
        imageBase64: formValues.imagePreview,
        affectedPart: formValues.affectedPart,
      };

      // Call the diagnosis API
      const response = await fetch('/api/crop-ai/diagnose', {
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

      // Call onComplete with the result
      onComplete(data.data as DiagnosisResult);
    } catch (error) {
      console.error('Diagnosis error:', error);
      setErrors({
        imageFile: error instanceof Error ? error.message : t('cropAi.common.error'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formValues, validateStep2, onComplete]);

  // Handle CropInfoForm values change
  const handleCropInfoChange = useCallback((values: CropInfoFormValues) => {
    setFormValues(prev => ({
      ...prev,
      cropName: values.cropName,
      cropVariety: values.cropVariety,
      growthStage: values.growthStage,
    }));
    // Clear related errors when user changes values
    if (errors.cropName || errors.growthStage) {
      setErrors(prev => ({
        ...prev,
        cropName: undefined,
        growthStage: undefined,
      }));
    }
  }, [errors]);

  // Handle ImageUploadForm values change
  const handleImageUploadChange = useCallback((values: ImageUploadFormValues) => {
    setFormValues(prev => ({
      ...prev,
      imageFile: values.imageFile,
      imagePreview: values.imagePreview,
      affectedPart: values.affectedPart,
    }));
    // Clear related errors when user changes values
    if (errors.imageFile || errors.affectedPart) {
      setErrors(prev => ({
        ...prev,
        imageFile: undefined,
        affectedPart: undefined,
      }));
    }
  }, [errors]);

  // Get crop info form values
  const cropInfoValues: CropInfoFormValues = {
    cropName: formValues.cropName,
    cropVariety: formValues.cropVariety,
    growthStage: formValues.growthStage,
  };

  // Get image upload form values
  const imageUploadValues: ImageUploadFormValues = {
    imageFile: formValues.imageFile,
    imagePreview: formValues.imagePreview,
    affectedPart: formValues.affectedPart,
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
          <CropInfoForm
            values={cropInfoValues}
            onChange={handleCropInfoChange}
            errors={{
              cropName: errors.cropName,
              cropVariety: errors.cropVariety,
              growthStage: errors.growthStage,
            }}
          />
        )}

        {currentStep === 2 && (
          <ImageUploadForm
            values={imageUploadValues}
            onChange={handleImageUploadChange}
            errors={{
              imageFile: errors.imageFile,
              imagePreview: errors.imagePreview,
              affectedPart: errors.affectedPart,
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
        backLabel={currentStep === 1 ? t('cropAi.diagnosis.cancel') : t('cropAi.common.back')}
        submitLabel={t('cropAi.diagnosis.analyze')}
      />
    </div>
  );
}

export type { DiagnosisWizardProps };
