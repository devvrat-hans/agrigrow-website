'use client';

import { useState, useCallback } from 'react';
import type { DiagnosisResult, DiagnosisApiRequest } from '@/types/diagnosis';

/**
 * State for the diagnosis hook
 */
interface UseDiagnosisState {
  /** Whether a diagnosis is in progress */
  loading: boolean;
  /** Error message if diagnosis failed */
  error: string | null;
  /** Diagnosis result if successful */
  result: DiagnosisResult | null;
}

/**
 * Return type for the useDiagnosis hook
 */
export interface UseDiagnosisReturn {
  /** Perform a diagnosis with the given input */
  diagnose: (input: DiagnosisApiRequest) => Promise<DiagnosisResult | null>;
  /** Whether a diagnosis is in progress */
  loading: boolean;
  /** Error message if diagnosis failed */
  error: string | null;
  /** Diagnosis result if successful */
  result: DiagnosisResult | null;
  /** Reset the hook state */
  reset: () => void;
}

/**
 * Initial state for the hook
 */
const INITIAL_STATE: UseDiagnosisState = {
  loading: false,
  error: null,
  result: null,
};

/**
 * useDiagnosis Hook
 * 
 * Manages the diagnosis API call state including loading,
 * error handling, and result management.
 * 
 * Features:
 * - diagnose function to call the API
 * - Loading state tracking
 * - User-friendly error messages
 * - Result state management
 * - Reset function to clear state
 * 
 * @example
 * ```tsx
 * const { diagnose, loading, error, result, reset } = useDiagnosis();
 * 
 * const handleSubmit = async () => {
 *   const result = await diagnose({
 *     cropName: 'tomato',
 *     growthStage: 'flowering',
 *     imageBase64: 'data:image/...',
 *     affectedPart: 'leaf',
 *   });
 *   
 *   if (result) {
 *     console.log('Diagnosis complete:', result);
 *   }
 * };
 * ```
 */
export function useDiagnosis(): UseDiagnosisReturn {
  const [state, setState] = useState<UseDiagnosisState>(INITIAL_STATE);

  /**
   * Perform a crop diagnosis
   */
  const diagnose = useCallback(async (
    input: DiagnosisApiRequest
  ): Promise<DiagnosisResult | null> => {
    // Set loading state
    setState({
      loading: true,
      error: null,
      result: null,
    });

    try {
      // Make API request
      const response = await fetch('/api/crop-ai/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      // Check for errors
      if (!response.ok) {
        throw new Error(data.error || getErrorMessage(response.status));
      }

      if (!data.success) {
        throw new Error(data.error || 'Diagnosis failed. Please try again.');
      }

      // Set success state
      const result = data.data as DiagnosisResult;
      setState({
        loading: false,
        error: null,
        result,
      });

      return result;
    } catch (error) {
      // Handle error
      const errorMessage = getUserFriendlyError(error);
      
      setState({
        loading: false,
        error: errorMessage,
        result: null,
      });

      return null;
    }
  }, []);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    diagnose,
    loading: state.loading,
    error: state.error,
    result: state.result,
    reset,
  };
}

/**
 * Get a user-friendly error message based on HTTP status
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your inputs and try again.';
    case 401:
      return 'Please sign in to use the diagnosis feature.';
    case 403:
      return 'You do not have permission to use this feature.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Our servers are having trouble. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Convert any error to a user-friendly message
 */
function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      return 'Unable to connect to the server. This may be due to a slow connection or large image size. Please check your internet connection and try again.';
    }
    
    // Check for timeout
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      return 'The request took too long. Please try again with a smaller image or check your internet connection.';
    }
    
    // Check for payload too large
    if (error.message.includes('413') || error.message.includes('too large') || error.message.includes('body exceeded')) {
      return 'The image is too large. Please try with a smaller image.';
    }
    
    // Return the error message if it's already user-friendly
    if (error.message && !error.message.includes('Error:')) {
      return error.message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}
