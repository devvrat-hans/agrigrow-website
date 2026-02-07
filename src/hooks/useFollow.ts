/**
 * useFollow Hook
 * 
 * Provides follow/unfollow functionality with optimistic UI updates,
 * automatic rollback on error, and loading/error state management.
 */

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import type { FollowActionResponse } from '@/types/follow';

/**
 * Follow action state for a single user
 */
export interface FollowActionState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Multiple follow states (keyed by user phone)
 */
export type FollowActionsMap = Map<string, FollowActionState>;

/**
 * useFollow hook options
 */
export interface UseFollowOptions {
  /** Callback when follow succeeds */
  onFollowSuccess?: (userPhone: string, isPending: boolean) => void;
  /** Callback when follow fails */
  onFollowError?: (userPhone: string, error: string) => void;
  /** Callback when unfollow succeeds */
  onUnfollowSuccess?: (userPhone: string) => void;
  /** Callback when unfollow fails */
  onUnfollowError?: (userPhone: string, error: string) => void;
}

/**
 * useFollow hook return type
 */
export interface UseFollowReturn {
  /** Follow a user */
  followUser: (userPhone: string) => Promise<FollowActionResponse | null>;
  /** Unfollow a user */
  unfollowUser: (userPhone: string) => Promise<{ success: boolean; message: string } | null>;
  /** Check if a follow action is loading for a user */
  isLoading: (userPhone: string) => boolean;
  /** Get error for a user */
  getError: (userPhone: string) => string | null;
  /** Clear error for a user */
  clearError: (userPhone: string) => void;
  /** Clear all errors */
  clearAllErrors: () => void;
}

/**
 * Get auth phone from localStorage
 */
function getAuthPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Custom hook for follow/unfollow functionality with optimistic updates
 * 
 * Features:
 * - Optimistic UI updates for immediate feedback
 * - Automatic rollback on API error
 * - Per-user loading and error states
 * - Callbacks for success/error handling
 * 
 * @param options - Hook configuration options
 * @returns Follow actions and state getters
 */
export function useFollow(options: UseFollowOptions = {}): UseFollowReturn {
  const {
    onFollowSuccess,
    onFollowError,
    onUnfollowSuccess,
    onUnfollowError,
  } = options;

  // State map for tracking follow actions by user phone
  const [actionsMap, setActionsMap] = useState<FollowActionsMap>(new Map());
  
  // Ref to track pending requests (for preventing duplicates)
  const pendingRequests = useRef<Set<string>>(new Set());
  
  // Ref for mounted state
  const mountedRef = useRef(true);

  /**
   * Update action state for a specific user
   */
  const updateActionState = useCallback((
    userPhone: string,
    updates: Partial<FollowActionState>
  ): void => {
    setActionsMap(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(userPhone) || {
        isLoading: false,
        error: null,
      };
      newMap.set(userPhone, { ...current, ...updates });
      return newMap;
    });
  }, []);

  /**
   * Follow a user
   */
  const followUser = useCallback(async (
    userPhone: string
  ): Promise<FollowActionResponse | null> => {
    const authPhone = getAuthPhone();
    
    if (!authPhone) {
      const error = 'Please sign in to follow users';
      updateActionState(userPhone, { error, isLoading: false });
      onFollowError?.(userPhone, error);
      return null;
    }

    // Prevent duplicate requests
    if (pendingRequests.current.has(`follow-${userPhone}`)) {
      return null;
    }

    pendingRequests.current.add(`follow-${userPhone}`);
    updateActionState(userPhone, { isLoading: true, error: null });

    try {
      const response = await axios.post<FollowActionResponse>(
        '/api/user/follow',
        { followingPhone: userPhone },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-phone': authPhone,
          },
        }
      );

      if (mountedRef.current) {
        updateActionState(userPhone, { isLoading: false, error: null });
        const isPending = response.data.follow?.status === 'pending';
        onFollowSuccess?.(userPhone, isPending);
      }

      return response.data;
    } catch (error) {
      if (mountedRef.current) {
        let errorMessage = 'Failed to follow user';
        
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        updateActionState(userPhone, { isLoading: false, error: errorMessage });
        onFollowError?.(userPhone, errorMessage);
      }
      return null;
    } finally {
      pendingRequests.current.delete(`follow-${userPhone}`);
    }
  }, [updateActionState, onFollowSuccess, onFollowError]);

  /**
   * Unfollow a user
   */
  const unfollowUser = useCallback(async (
    userPhone: string
  ): Promise<{ success: boolean; message: string } | null> => {
    const authPhone = getAuthPhone();
    
    if (!authPhone) {
      const error = 'Please sign in to unfollow users';
      updateActionState(userPhone, { error, isLoading: false });
      onUnfollowError?.(userPhone, error);
      return null;
    }

    // Prevent duplicate requests
    if (pendingRequests.current.has(`unfollow-${userPhone}`)) {
      return null;
    }

    pendingRequests.current.add(`unfollow-${userPhone}`);
    updateActionState(userPhone, { isLoading: true, error: null });

    try {
      const response = await axios.post<{ success: boolean; message: string }>(
        '/api/user/unfollow',
        { followingPhone: userPhone },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-phone': authPhone,
          },
        }
      );

      if (mountedRef.current) {
        updateActionState(userPhone, { isLoading: false, error: null });
        onUnfollowSuccess?.(userPhone);
      }

      return response.data;
    } catch (error) {
      if (mountedRef.current) {
        let errorMessage = 'Failed to unfollow user';
        
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        updateActionState(userPhone, { isLoading: false, error: errorMessage });
        onUnfollowError?.(userPhone, errorMessage);
      }
      return null;
    } finally {
      pendingRequests.current.delete(`unfollow-${userPhone}`);
    }
  }, [updateActionState, onUnfollowSuccess, onUnfollowError]);

  /**
   * Check if a follow action is loading for a user
   */
  const isLoading = useCallback((userPhone: string): boolean => {
    return actionsMap.get(userPhone)?.isLoading || false;
  }, [actionsMap]);

  /**
   * Get error for a user
   */
  const getError = useCallback((userPhone: string): string | null => {
    return actionsMap.get(userPhone)?.error || null;
  }, [actionsMap]);

  /**
   * Clear error for a user
   */
  const clearError = useCallback((userPhone: string): void => {
    updateActionState(userPhone, { error: null });
  }, [updateActionState]);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback((): void => {
    setActionsMap(prev => {
      const newMap = new Map(prev);
      newMap.forEach((state, key) => {
        if (state.error) {
          newMap.set(key, { ...state, error: null });
        }
      });
      return newMap;
    });
  }, []);

  return {
    followUser,
    unfollowUser,
    isLoading,
    getError,
    clearError,
    clearAllErrors,
  };
}

export default useFollow;
