/**
 * useShare Hook
 * 
 * Provides share functionality including sharing to different platforms,
 * generating share links, and tracking share analytics.
 */

import { useState, useCallback, useRef } from 'react';
import {
  sharePost as apiSharePost,
  generateShareLink,
  getShareAnalytics as apiGetShareAnalytics,
  type Share,
  type ApiError,
} from '@/lib/api-client';

/**
 * Share type options
 */
export type ShareType = 'repost' | 'external' | 'message';

/**
 * Platform options for external shares
 */
export type SharePlatform = 'whatsapp' | 'facebook' | 'twitter' | 'link' | 'other';

/**
 * Share analytics data
 */
export interface ShareAnalytics {
  totalShares: number;
  byType: Record<string, number>;
  byPlatform: Record<string, number>;
}

/**
 * Standardized error object for consistent error handling
 */
export interface ShareError {
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Share state interface
 */
export interface ShareState {
  isSharing: boolean;
  error: ShareError | null;
  lastShareType: ShareType | null;
  lastSharePlatform: SharePlatform | null;
  analytics: ShareAnalytics | null;
  analyticsLoading: boolean;
}

/**
 * useShare hook options
 */
export interface UseShareOptions {
  /** Callback when share succeeds */
  onSuccess?: (share: Share) => void;
  /** Callback when share fails */
  onError?: (error: string) => void;
  /** Callback when link is copied */
  onLinkCopied?: () => void;
}

/**
 * useShare hook return type
 */
export interface UseShareReturn {
  // State
  isSharing: boolean;
  error: ShareError | null;
  analytics: ShareAnalytics | null;
  analyticsLoading: boolean;
  
  // Actions
  sharePost: (postId: string, shareType: ShareType, platform?: SharePlatform) => Promise<Share | null>;
  shareToWhatsApp: (postId: string, postContent?: string) => Promise<boolean>;
  shareToFacebook: (postId: string) => Promise<boolean>;
  shareToTwitter: (postId: string, postContent?: string) => Promise<boolean>;
  copyShareLink: (postId: string) => Promise<boolean>;
  repost: (postId: string) => Promise<Share | null>;
  
  // Utilities
  generateShareLink: (postId: string) => string;
  fetchShareAnalytics: (postId: string) => Promise<ShareAnalytics | null>;
  clearError: () => void;
}

/**
 * Platform share URL templates
 */
const SHARE_URL_TEMPLATES: Record<SharePlatform, (url: string, text?: string) => string> = {
  whatsapp: (url, text) => 
    `https://api.whatsapp.com/send?text=${encodeURIComponent((text ? `${text}\n\n` : '') + url)}`,
  facebook: (url) => 
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  twitter: (url, text) => 
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}${text ? `&text=${encodeURIComponent(text)}` : ''}`,
  link: (url) => url,
  other: (url) => url,
};

/**
 * Custom hook for share functionality with platform integration
 * 
 * Features:
 * - Share to WhatsApp, Facebook, Twitter
 * - Copy link to clipboard
 * - Repost functionality
 * - Share analytics tracking
 * 
 * @param options - Hook configuration options
 * @returns Share actions and state
 */
export function useShare(options: UseShareOptions = {}): UseShareReturn {
  const { onSuccess, onError, onLinkCopied } = options;

  // State
  const [state, setState] = useState<ShareState>({
    isSharing: false,
    error: null,
    lastShareType: null,
    lastSharePlatform: null,
    analytics: null,
    analyticsLoading: false,
  });

  // Ref for mounted state
  const mountedRef = useRef(true);

  /**
   * Share a post via API and track the share
   */
  const sharePost = useCallback(async (
    postId: string,
    shareType: ShareType,
    platform?: SharePlatform
  ): Promise<Share | null> => {
    setState(prev => ({
      ...prev,
      isSharing: true,
      error: null,
    }));

    try {
      const response = await apiSharePost(postId, {
        shareType,
        platform: shareType === 'external' ? platform : undefined,
      });

      if (!mountedRef.current) return null;

      setState(prev => ({
        ...prev,
        isSharing: false,
        lastShareType: shareType,
        lastSharePlatform: platform || null,
      }));

      onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      if (!mountedRef.current) return null;

      const apiError = err as ApiError;
      const errorMessage = apiError.error || 'Failed to share post';

      setState(prev => ({
        ...prev,
        isSharing: false,
        error: {
          message: errorMessage,
          code: apiError.statusCode?.toString(),
          retryable: false,
        },
      }));

      onError?.(errorMessage);
      return null;
    }
  }, [onSuccess, onError]);

  /**
   * Open share URL in new window/tab
   */
  const openShareUrl = useCallback((url: string): void => {
    if (typeof window === 'undefined') return;

    // Open URL — use window.open which works on both mobile and desktop
    window.open(url, '_blank');
  }, []);

  /**
   * Share to WhatsApp
   */
  const shareToWhatsApp = useCallback(async (
    postId: string,
    postContent?: string
  ): Promise<boolean> => {
    try {
      const shareLink = generateShareLink(postId);
      const shareUrl = SHARE_URL_TEMPLATES.whatsapp(shareLink, postContent);
      
      openShareUrl(shareUrl);
      
      // Track the share in background — don't let tracking failure break the share
      sharePost(postId, 'external', 'whatsapp').catch(() => {});
      
      return true;
    } catch {
      return false;
    }
  }, [sharePost, openShareUrl]);

  /**
   * Share to Facebook
   */
  const shareToFacebook = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const shareLink = generateShareLink(postId);
      const shareUrl = SHARE_URL_TEMPLATES.facebook(shareLink);
      
      openShareUrl(shareUrl);
      
      // Track in background
      sharePost(postId, 'external', 'facebook').catch(() => {});
      
      return true;
    } catch {
      return false;
    }
  }, [sharePost, openShareUrl]);

  /**
   * Share to Twitter
   */
  const shareToTwitter = useCallback(async (
    postId: string,
    postContent?: string
  ): Promise<boolean> => {
    try {
      const shareLink = generateShareLink(postId);
      const truncatedContent = postContent 
        ? postContent.slice(0, 200) + (postContent.length > 200 ? '...' : '')
        : undefined;
      const shareUrl = SHARE_URL_TEMPLATES.twitter(shareLink, truncatedContent);
      
      openShareUrl(shareUrl);
      
      // Track in background
      sharePost(postId, 'external', 'twitter').catch(() => {});
      
      return true;
    } catch {
      return false;
    }
  }, [sharePost, openShareUrl]);

  /**
   * Copy share link to clipboard
   */
  const copyShareLink = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const shareLink = generateShareLink(postId);
      
      // Step 1: Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // Step 2: Notify success BEFORE tracking (clipboard worked)
      onLinkCopied?.();

      // Step 3: Track the share in background — don't let tracking failure affect the copy
      sharePost(postId, 'external', 'link').catch(() => {});
      
      return true;
    } catch {
      setState(prev => ({
        ...prev,
        error: {
          message: 'Failed to copy link to clipboard',
          retryable: true,
        },
      }));
      return false;
    }
  }, [sharePost, onLinkCopied]);

  /**
   * Repost (share within platform)
   */
  const repost = useCallback(async (postId: string): Promise<Share | null> => {
    return sharePost(postId, 'repost');
  }, [sharePost]);

  /**
   * Fetch share analytics for a post
   */
  const fetchShareAnalytics = useCallback(async (
    postId: string
  ): Promise<ShareAnalytics | null> => {
    setState(prev => ({ ...prev, analyticsLoading: true }));

    try {
      const response = await apiGetShareAnalytics(postId);

      if (!mountedRef.current) return null;

      const analytics: ShareAnalytics = response.data;

      setState(prev => ({
        ...prev,
        analytics,
        analyticsLoading: false,
      }));

      return analytics;
    } catch {
      if (!mountedRef.current) return null;

      setState(prev => ({
        ...prev,
        analyticsLoading: false,
      }));

      return null;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Use native Web Share API if available
   */
  const useNativeShare = useCallback(async (
    postId: string,
    title: string,
    text?: string
  ): Promise<boolean> => {
    if (!navigator.share) return false;

    try {
      const shareLink = generateShareLink(postId);
      
      await navigator.share({
        title,
        text: text || title,
        url: shareLink,
      });

      // Track in background
      sharePost(postId, 'external', 'other').catch(() => {});
      
      return true;
    } catch (err) {
      // User cancelled or error
      if ((err as Error).name !== 'AbortError') {
        console.error('Native share failed:', err);
      }
      return false;
    }
  }, [sharePost]);

  return {
    // State
    isSharing: state.isSharing,
    error: state.error,
    analytics: state.analytics,
    analyticsLoading: state.analyticsLoading,
    
    // Actions
    sharePost,
    shareToWhatsApp,
    shareToFacebook,
    shareToTwitter,
    copyShareLink,
    repost,
    
    // Utilities
    generateShareLink,
    fetchShareAnalytics,
    clearError,
    
    // Bonus: Native share (can be added to return if needed)
    // @ts-expect-error - Adding extra utility
    useNativeShare,
  };
}

/**
 * Simple hook for quick share actions without state tracking
 */
export function useQuickShare() {
  /**
   * Share via native Web Share API
   */
  const nativeShare = useCallback(async (
    url: string,
    title?: string,
    text?: string
  ): Promise<boolean> => {
    if (!navigator.share) return false;
    
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.cssText = 'position:fixed;left:-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }, []);

  /**
   * Check if Web Share API is available
   */
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return {
    nativeShare,
    copyToClipboard,
    canShare,
    generateShareLink,
  };
}

export default useShare;
