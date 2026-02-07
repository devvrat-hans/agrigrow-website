'use client';

import { useState, useCallback } from 'react';
import type { PlanningResult, PlanningApiRequest } from '@/types/planning';

/**
 * State for the planning hook
 */
interface UsePlanningState {
  /** Whether a planning request is in progress */
  loading: boolean;
  /** Error message if planning failed */
  error: string | null;
  /** Planning result if successful */
  result: PlanningResult | null;
}

/**
 * Return type for the usePlanning hook
 */
export interface UsePlanningReturn {
  /** Get crop planning recommendations with the given input */
  plan: (input: PlanningApiRequest) => Promise<PlanningResult | null>;
  /** Whether a planning request is in progress */
  loading: boolean;
  /** Error message if planning failed */
  error: string | null;
  /** Planning result if successful */
  result: PlanningResult | null;
  /** Reset the hook state */
  reset: () => void;
}

/**
 * Initial state for the hook
 */
const INITIAL_STATE: UsePlanningState = {
  loading: false,
  error: null,
  result: null,
};

/**
 * usePlanning Hook
 * 
 * Manages the planning API call state including loading,
 * error handling, and result management.
 * 
 * Features:
 * - plan function to call the API
 * - Loading state tracking
 * - User-friendly error messages
 * - Result state management
 * - Reset function to clear state
 * 
 * @example
 * ```tsx
 * const { plan, loading, error, result, reset } = usePlanning();
 * 
 * const handleSubmit = async () => {
 *   const result = await plan({
 *     state: 'MH',
 *     district: 'Pune',
 *     landSize: 5,
 *     landUnit: 'acres',
 *     season: 'kharif',
 *     sowingMonth: '6',
 *     soilType: 'black',
 *     irrigationAvailability: 'assured',
 *     irrigationMethod: 'drip',
 *   });
 *   
 *   if (result) {
 *     console.log('Planning complete:', result);
 *   }
 * };
 * ```
 */
export function usePlanning(): UsePlanningReturn {
  const [state, setState] = useState<UsePlanningState>(INITIAL_STATE);

  /**
   * Get crop planning recommendations
   */
  const plan = useCallback(async (
    input: PlanningApiRequest
  ): Promise<PlanningResult | null> => {
    // Set loading state
    setState({
      loading: true,
      error: null,
      result: null,
    });

    try {
      // Make API request
      const response = await fetch('/api/crop-ai/plan', {
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
        throw new Error(data.error || 'Planning failed. Please try again.');
      }

      // Set success state
      const result = data.data as PlanningResult;
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
    plan,
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
      return 'Please sign in to use the crop planning feature.';
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
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    // Check for timeout
    if (error.message.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    
    // Return the error message if it's already user-friendly
    if (error.message && !error.message.includes('Error:')) {
      return error.message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}
