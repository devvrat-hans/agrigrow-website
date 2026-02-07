'use client';

import { useState, useCallback } from 'react';
import { IconChevronDown, IconChevronUp, IconPlant, IconMapPin } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { CropImageUpload } from './CropImageUpload';
import { CropTypeSelector } from './CropTypeSelector';
import { LocationSelector, LocationValue } from './LocationSelector';
import { AnalyzeButton } from './AnalyzeButton';

// TYPES

export interface UploadData {
  /** The selected image file */
  image: File;
  /** Optional crop type */
  cropType?: string;
  /** Optional location data */
  location?: LocationValue;
}

export interface UploadSectionProps {
  /** Callback when analyze button is clicked with all data */
  onAnalyze: (data: UploadData) => void;
  /** Whether the analysis is in progress */
  loading?: boolean;
  /** Progress percentage during analysis */
  progress?: number;
  /** Current analysis stage text */
  stage?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to disable all inputs */
  disabled?: boolean;
}

/**
 * UploadSection Component
 * 
 * Composes all upload-related components into a cohesive section.
 * Manages local state for image, crop type, and location.
 * Optional fields are collapsed by default with an "Add details" toggle.
 * 
 * @example
 * <UploadSection 
 *   onAnalyze={(data) => handleAnalysis(data)} 
 *   loading={isAnalyzing}
 *   progress={analysisProgress}
 * />
 */
export function UploadSection({
  onAnalyze,
  loading = false,
  progress = 0,
  stage,
  className,
  disabled = false,
}: UploadSectionProps) {
  // State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [cropType, setCropType] = useState<string>('');
  const [location, setLocation] = useState<LocationValue>({ state: '', district: '' });
  const [showDetails, setShowDetails] = useState(false);

  // Check if we can analyze
  const canAnalyze = selectedImage !== null && !loading && !disabled;

  // Handle image selection
  const handleImageSelect = useCallback((file: File | null) => {
    setSelectedImage(file);
  }, []);

  // Handle analyze click
  const handleAnalyze = useCallback(() => {
    if (!selectedImage) return;

    const data: UploadData = {
      image: selectedImage,
    };

    // Add optional fields if provided
    if (cropType) {
      data.cropType = cropType;
    }

    if (location.state) {
      data.location = location;
    }

    onAnalyze(data);
  }, [selectedImage, cropType, location, onAnalyze]);

  // Toggle details section
  const toggleDetails = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  // Check if any details are filled
  const hasDetails = Boolean(cropType || location.state);

  return (
    <Card className={cn('p-3 sm:p-4 md:p-6', className)}>
      {/* Image Upload */}
      <div className="mb-3 sm:mb-4 md:mb-6">
        <CropImageUpload
          onImageSelect={handleImageSelect}
          selectedImage={selectedImage}
          disabled={loading || disabled}
        />
      </div>

      {/* Details Toggle Button */}
      <button
        type="button"
        onClick={toggleDetails}
        className={cn(
          'w-full flex items-center justify-between',
          'px-4 py-3 mb-4 min-h-[44px]',
          'bg-gray-50 dark:bg-gray-800/50',
          'border border-gray-200 dark:border-gray-700',
          'rounded-lg',
          'text-sm font-medium',
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
        )}
        aria-expanded={showDetails}
        aria-controls="upload-details"
      >
        <span className="flex items-center gap-2">
          {hasDetails ? (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          ) : null}
          <span>
            {hasDetails ? 'Edit details' : 'Add details'}{' '}
            <span className="text-gray-500 dark:text-gray-400 font-normal">
              (optional)
            </span>
          </span>
        </span>
        {showDetails ? (
          <IconChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <IconChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Collapsible Details Section */}
      <div
        id="upload-details"
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          showDetails ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700/50">
          {/* Crop Type Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <IconPlant className="w-4 h-4" />
              Crop Type
            </label>
            <CropTypeSelector
              value={cropType}
              onChange={setCropType}
              disabled={loading || disabled}
              placeholder="Select or enter crop type"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Helps improve analysis accuracy
            </p>
          </div>

          {/* Location Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <IconMapPin className="w-4 h-4" />
              Location
            </label>
            <LocationSelector
              value={location}
              onChange={setLocation}
              disabled={loading || disabled}
              showGPSButton={true}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enables weather-based recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Details Summary (when collapsed but has data) */}
      {!showDetails && hasDetails && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cropType && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full">
              <IconPlant className="w-3.5 h-3.5" />
              {cropType}
            </span>
          )}
          {location.state && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
              <IconMapPin className="w-3.5 h-3.5" />
              {location.district ? `${location.district}, ` : ''}{location.state}
            </span>
          )}
        </div>
      )}

      {/* Analyze Button */}
      <AnalyzeButton
        onClick={handleAnalyze}
        loading={loading}
        disabled={!canAnalyze}
        progress={progress}
        stage={stage}
      />

      {/* Help Text */}
      {!selectedImage && !loading && (
        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          Upload a clear photo of your crop for AI-powered analysis
        </p>
      )}
    </Card>
  );
}

export default UploadSection;
