'use client';

import { useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import type {
  CropAnalysisResult,
  LocationInput,
  AnalyzeResponse,
} from '@/types/crop-ai';

// Analysis options
export interface AnalyzeOptions {
  cropType?: string;
  location?: LocationInput;
  includeWeather?: boolean;
}

// Hook state
export interface UseCropAnalysisState {
  analyzing: boolean;
  result: CropAnalysisResult | null;
  error: string | null;
  progress: number;
  stage: 'idle' | 'uploading' | 'analyzing' | 'processing' | 'completed' | 'failed';
}

// Hook return type
export interface UseCropAnalysisReturn extends UseCropAnalysisState {
  analyzeImage: (file: File, options?: AnalyzeOptions) => Promise<CropAnalysisResult | null>;
  reset: () => void;
  retry: () => Promise<CropAnalysisResult | null>;
}

// Initial state
const initialState: UseCropAnalysisState = {
  analyzing: false,
  result: null,
  error: null,
  progress: 0,
  stage: 'idle',
};

// Maximum retry attempts
const MAX_RETRIES = 2;

// Progress stages
const PROGRESS_STAGES = {
  uploading: { min: 0, max: 30 },
  analyzing: { min: 30, max: 80 },
  processing: { min: 80, max: 100 },
};

/**
 * Hook for managing crop image analysis
 * 
 * @example
 * ```tsx
 * const { analyzing, result, error, progress, analyzeImage, reset } = useCropAnalysis();
 * 
 * const handleAnalyze = async () => {
 *   const result = await analyzeImage(selectedFile, { 
 *     cropType: 'Tomato', 
 *     includeWeather: true 
 *   });
 *   if (result) {
 *     console.log('Analysis complete:', result);
 *   }
 * };
 * ```
 */
export function useCropAnalysis(): UseCropAnalysisReturn {
  const [state, setState] = useState<UseCropAnalysisState>(initialState);
  
  // Store last analysis params for retry
  const lastAnalysisRef = useRef<{ file: File; options?: AnalyzeOptions } | null>(null);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update progress with smooth animation
  const updateProgress = useCallback((stage: UseCropAnalysisState['stage'], specificProgress?: number) => {
    setState(prev => {
      let progress = prev.progress;
      
      if (specificProgress !== undefined) {
        progress = specificProgress;
      } else if (stage !== prev.stage) {
        // Set progress based on stage
        switch (stage) {
          case 'uploading':
            progress = PROGRESS_STAGES.uploading.min;
            break;
          case 'analyzing':
            progress = PROGRESS_STAGES.analyzing.min;
            break;
          case 'processing':
            progress = PROGRESS_STAGES.processing.min;
            break;
          case 'completed':
            progress = 100;
            break;
          case 'failed':
          case 'idle':
            progress = 0;
            break;
        }
      }
      
      return { ...prev, stage, progress };
    });
  }, []);

  // Simulate progress during analysis
  const simulateProgress = useCallback((stage: UseCropAnalysisState['stage']) => {
    const stages = PROGRESS_STAGES[stage as keyof typeof PROGRESS_STAGES];
    if (!stages) return null;
    
    let currentProgress = stages.min;
    const increment = (stages.max - stages.min) / 20; // 20 steps
    
    const interval = setInterval(() => {
      currentProgress = Math.min(currentProgress + increment, stages.max - 5);
      updateProgress(stage, currentProgress);
    }, 500);
    
    return interval;
  }, [updateProgress]);

  // Main analyze function
  const analyzeImage = useCallback(async (
    file: File,
    options?: AnalyzeOptions
  ): Promise<CropAnalysisResult | null> => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Store for retry
    lastAnalysisRef.current = { file, options };
    
    // Reset state and start
    setState({
      analyzing: true,
      result: null,
      error: null,
      progress: 0,
      stage: 'uploading',
    });

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Build form data
      const formData = new FormData();
      formData.append('image', file);
      
      if (options?.cropType) {
        formData.append('cropType', options.cropType);
      }
      
      if (options?.location?.state) {
        formData.append('state', options.location.state);
        if (options.location.district) {
          formData.append('district', options.location.district);
        }
      }
      
      if (options?.includeWeather !== undefined) {
        formData.append('includeWeather', String(options.includeWeather));
      }

      // Start upload progress simulation
      progressInterval = simulateProgress('uploading');

      // Make API request
      const response = await apiClient.post<AnalyzeResponse>(
        '/api/crop-ai/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: abortControllerRef.current.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const uploadPercent = (progressEvent.loaded / progressEvent.total) * 100;
              const progress = PROGRESS_STAGES.uploading.min + 
                (uploadPercent / 100) * (PROGRESS_STAGES.uploading.max - PROGRESS_STAGES.uploading.min);
              updateProgress('uploading', progress);
            }
          },
        }
      );

      // Clear upload progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      // Start analyzing progress
      updateProgress('analyzing');
      progressInterval = simulateProgress('analyzing');

      // Short delay to show analyzing stage
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clear analyzing progress
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      // Processing stage
      updateProgress('processing');
      progressInterval = simulateProgress('processing');

      // Check response
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Analysis failed');
      }

      // Clear processing progress
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      // Success
      retryCountRef.current = 0;
      setState({
        analyzing: false,
        result: response.data.data,
        error: null,
        progress: 100,
        stage: 'completed',
      });

      return response.data.data;

    } catch (error) {
      // Clear any progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Handle abort
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({ ...prev, analyzing: false, stage: 'idle' }));
        return null;
      }

      // Extract error message
      let errorMessage = 'Failed to analyze image. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for axios error with response
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (axiosError.response?.data?.error) {
        errorMessage = axiosError.response.data.error;
      }

      // Handle rate limit error
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        errorMessage = 'You have reached the analysis limit. Please try again later.';
      }

      setState({
        analyzing: false,
        result: null,
        error: errorMessage,
        progress: 0,
        stage: 'failed',
      });

      return null;
    }
  }, [updateProgress, simulateProgress]);

  // Retry last analysis
  const retry = useCallback(async (): Promise<CropAnalysisResult | null> => {
    if (!lastAnalysisRef.current) {
      setState(prev => ({
        ...prev,
        error: 'No previous analysis to retry',
      }));
      return null;
    }

    if (retryCountRef.current >= MAX_RETRIES) {
      setState(prev => ({
        ...prev,
        error: 'Maximum retry attempts reached. Please try again later.',
      }));
      return null;
    }

    retryCountRef.current++;
    
    const { file, options } = lastAnalysisRef.current;
    return analyzeImage(file, options);
  }, [analyzeImage]);

  // Reset state
  const reset = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState(initialState);
    lastAnalysisRef.current = null;
    retryCountRef.current = 0;
  }, []);

  return {
    ...state,
    analyzeImage,
    reset,
    retry,
  };
}

export default useCropAnalysis;
