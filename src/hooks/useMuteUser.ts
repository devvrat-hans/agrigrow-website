/**
 * useMuteUser Hook
 * 
 * Manages muting/unmuting users with optimistic UI updates.
 * Integrates with the /api/feed/mute endpoint.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

/**
 * Hook return type
 */
export interface UseMuteUserReturn {
  /** Mute a user by their ID */
  muteUser: (userId: string) => Promise<boolean>;
  /** Unmute a user by their ID */
  unmuteUser: (userId: string) => Promise<boolean>;
  /** Check mute status for a user */
  checkMuteStatus: (userId: string) => Promise<boolean>;
  /** Current mute status (for the last checked user) */
  isMuted: boolean;
  /** Whether a mute/unmute action is in progress */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Get auth phone from localStorage
 */
function getAuthPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Custom hook for muting/unmuting users
 * 
 * @param initialUserId - Optional user ID to check mute status on mount
 * @returns Mute actions and state
 */
export function useMuteUser(initialUserId?: string): UseMuteUserReturn {
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Check mute status for a given user
   */
  const checkMuteStatus = useCallback(async (userId: string): Promise<boolean> => {
    const authPhone = getAuthPhone();
    if (!authPhone || !userId) return false;

    try {
      const response = await axios.get<{ success: boolean; isMuted: boolean }>(
        `/api/feed/mute?targetUserId=${encodeURIComponent(userId)}`,
        {
          headers: { 'x-user-phone': authPhone },
        }
      );

      const muted = response.data.isMuted || false;
      if (mountedRef.current) {
        setIsMuted(muted);
      }
      return muted;
    } catch (err) {
      console.error('Error checking mute status:', err);
      return false;
    }
  }, []);

  /**
   * Mute a user
   */
  const muteUser = useCallback(async (userId: string): Promise<boolean> => {
    const authPhone = getAuthPhone();
    if (!authPhone) {
      setError('Please sign in to mute users');
      return false;
    }

    if (!userId) {
      setError('Invalid user');
      return false;
    }

    // Optimistic update
    const previousMuted = isMuted;
    if (mountedRef.current) {
      setIsMuted(true);
      setIsLoading(true);
      setError(null);
    }

    try {
      await axios.post(
        '/api/feed/mute',
        { targetUserId: userId },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-phone': authPhone,
          },
        }
      );

      if (mountedRef.current) {
        setIsLoading(false);
      }
      return true;
    } catch (err) {
      // Rollback on failure
      if (mountedRef.current) {
        setIsMuted(previousMuted);
        setIsLoading(false);

        let errorMessage = 'Failed to mute user';
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        setError(errorMessage);
      }
      return false;
    }
  }, [isMuted]);

  /**
   * Unmute a user
   */
  const unmuteUser = useCallback(async (userId: string): Promise<boolean> => {
    const authPhone = getAuthPhone();
    if (!authPhone) {
      setError('Please sign in to unmute users');
      return false;
    }

    if (!userId) {
      setError('Invalid user');
      return false;
    }

    // Optimistic update
    const previousMuted = isMuted;
    if (mountedRef.current) {
      setIsMuted(false);
      setIsLoading(true);
      setError(null);
    }

    try {
      await axios.delete('/api/feed/mute', {
        data: { targetUserId: userId },
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': authPhone,
        },
      });

      if (mountedRef.current) {
        setIsLoading(false);
      }
      return true;
    } catch (err) {
      // Rollback on failure
      if (mountedRef.current) {
        setIsMuted(previousMuted);
        setIsLoading(false);

        let errorMessage = 'Failed to unmute user';
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        setError(errorMessage);
      }
      return false;
    }
  }, [isMuted]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-check mute status on mount if initialUserId is provided
  useEffect(() => {
    if (initialUserId) {
      checkMuteStatus(initialUserId);
    }
  }, [initialUserId, checkMuteStatus]);

  return {
    muteUser,
    unmuteUser,
    checkMuteStatus,
    isMuted,
    isLoading,
    error,
    clearError,
  };
}

export default useMuteUser;
