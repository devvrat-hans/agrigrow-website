'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupInvitationData, InvitationStatus } from '@/types/group';

// ============================================
// Types
// ============================================

export interface InvitationError {
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface CreateInvitationInput {
  /** User ID for direct invite */
  invitedUserId?: string;
  /** Phone number for direct invite */
  invitedPhone?: string;
  /** Max uses for invite code (1-100) */
  maxUses?: number;
  /** Expiration date (ISO 8601) */
  expiresAt?: string;
  /** Role for invitee */
  role?: 'member' | 'moderator' | 'admin';
  /** Personal message */
  message?: string;
}

export interface InviteLinkResult {
  inviteCode: string;
  shareLink: string;
  expiresAt: string;
  maxUses?: number;
}

export interface InvitePreview {
  invitation: {
    _id: string;
    inviteCode: string;
    expiresAt: string;
    isExpired: boolean;
    remainingUses: number | 'unlimited';
  };
  group: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    coverImage?: string;
    icon?: string;
    memberCount: number;
    groupType: string;
    privacy: string;
    isVerified: boolean;
  };
  inviter: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  isAlreadyMember?: boolean;
}

interface InvitationsState {
  invitations: GroupInvitationData[];
  isLoading: boolean;
  error: InvitationError | null;
  hasMore: boolean;
  page: number;
}

export interface UseGroupInvitationsOptions {
  /** Auto-fetch invitations on mount */
  autoFetch?: boolean;
  /** Filter by invitation type */
  type?: 'direct' | 'code';
  /** Filter by status */
  status?: InvitationStatus;
  /** Items per page */
  pageSize?: number;
}

export interface UseGroupInvitationsReturn {
  /** List of invitations */
  invitations: GroupInvitationData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: InvitationError | null;
  /** Whether more invitations are available */
  hasMore: boolean;
  /** Create a direct invitation to a user */
  createInvitation: (input: CreateInvitationInput) => Promise<GroupInvitationData | null>;
  /** Create a shareable invite link */
  createInviteLink: (options?: { maxUses?: number; expiresAt?: string; role?: 'member' | 'moderator' | 'admin' }) => Promise<InviteLinkResult | null>;
  /** Cancel/revoke an invitation */
  cancelInvitation: (invitationId: string) => Promise<boolean>;
  /** Accept an invite code */
  acceptInvite: (code: string) => Promise<{ success: boolean; groupSlug?: string }>;
  /** Get invite preview by code */
  getInvitePreview: (code: string) => Promise<InvitePreview | null>;
  /** Respond to direct invitation */
  respondToInvitation: (invitationId: string, action: 'accept' | 'decline') => Promise<{ success: boolean; groupSlug?: string }>;
  /** Load more invitations */
  loadMore: () => Promise<void>;
  /** Refresh invitations list */
  refresh: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
  /** Creating invitation state */
  isCreating: boolean;
  /** Cancelling invitation state */
  isCancelling: boolean;
  /** Accepting invite state */
  isAccepting: boolean;
}

// ============================================
// Hook Implementation
// ============================================

export function useGroupInvitations(
  groupId: string | null | undefined,
  options: UseGroupInvitationsOptions = {}
): UseGroupInvitationsReturn {
  const {
    autoFetch = false,
    type,
    status = 'pending',
    pageSize = 20,
  } = options;

  const [state, setState] = useState<InvitationsState>({
    invitations: [],
    isLoading: false,
    error: null,
    hasMore: false,
    page: 1,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Fetch invitations list (admin view)
  const fetchInvitations = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!groupId || fetchingRef.current) return;
    
    fetchingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        status,
      });
      if (type) params.append('type', type);

      const response = await apiClient.get(`/groups/${groupId}/invitations?${params}`);
      
      if (!mountedRef.current) return;

      if (response.data.success) {
        const { invitations: newInvitations, pagination } = response.data.data;
        setState(prev => ({
          ...prev,
          invitations: append ? [...prev.invitations, ...newInvitations] : newInvitations,
          hasMore: pagination?.hasMore ?? false,
          page,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to fetch invitations' },
          isLoading: false,
        }));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to fetch invitations';
      setState(prev => ({
        ...prev,
        error: { message, retryable: true },
        isLoading: false,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [groupId, pageSize, status, type]);

  // Create a direct invitation
  const createInvitation = useCallback(async (input: CreateInvitationInput): Promise<GroupInvitationData | null> => {
    if (!groupId) return null;

    setIsCreating(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await apiClient.post(`/groups/${groupId}/invitations`, input);
      
      if (!mountedRef.current) return null;

      if (response.data.success) {
        const newInvitation = response.data.data;
        // Add to list if it's a direct invite (status pending)
        setState(prev => ({
          ...prev,
          invitations: [newInvitation, ...prev.invitations],
        }));
        return newInvitation;
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to create invitation' },
        }));
        return null;
      }
    } catch (err) {
      if (!mountedRef.current) return null;
      const message = err instanceof Error ? err.message : 'Failed to create invitation';
      setState(prev => ({ ...prev, error: { message } }));
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [groupId]);

  // Create a shareable invite link
  const createInviteLink = useCallback(async (
    options?: { maxUses?: number; expiresAt?: string; role?: 'member' | 'moderator' | 'admin' }
  ): Promise<InviteLinkResult | null> => {
    if (!groupId) return null;

    setIsCreating(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await apiClient.post(`/groups/${groupId}/invitations`, {
        maxUses: options?.maxUses,
        expiresAt: options?.expiresAt,
        role: options?.role || 'member',
      });
      
      if (!mountedRef.current) return null;

      if (response.data.success) {
        const data = response.data.data;
        // Add to list
        setState(prev => ({
          ...prev,
          invitations: [data, ...prev.invitations],
        }));
        return {
          inviteCode: data.inviteCode,
          shareLink: data.shareLink || `${typeof window !== 'undefined' ? window.location.origin : ''}/groups/invite/${data.inviteCode}`,
          expiresAt: data.expiresAt,
          maxUses: data.maxUses,
        };
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to create invite link' },
        }));
        return null;
      }
    } catch (err) {
      if (!mountedRef.current) return null;
      const message = err instanceof Error ? err.message : 'Failed to create invite link';
      setState(prev => ({ ...prev, error: { message } }));
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [groupId]);

  // Cancel an invitation
  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    if (!groupId) return false;

    setIsCancelling(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await apiClient.delete(`/groups/${groupId}/invitations/${invitationId}`);
      
      if (!mountedRef.current) return false;

      if (response.data.success) {
        // Remove from list
        setState(prev => ({
          ...prev,
          invitations: prev.invitations.filter(inv => inv._id !== invitationId),
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to cancel invitation' },
        }));
        return false;
      }
    } catch (err) {
      if (!mountedRef.current) return false;
      const message = err instanceof Error ? err.message : 'Failed to cancel invitation';
      setState(prev => ({ ...prev, error: { message } }));
      return false;
    } finally {
      setIsCancelling(false);
    }
  }, [groupId]);

  // Accept an invite code (public)
  const acceptInvite = useCallback(async (code: string): Promise<{ success: boolean; groupSlug?: string }> => {
    setIsAccepting(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await apiClient.post(`/groups/invite/${code}`);
      
      if (!mountedRef.current) return { success: false };

      if (response.data.success) {
        return {
          success: true,
          groupSlug: response.data.data?.group?.slug,
        };
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to accept invitation' },
        }));
        return { success: false };
      }
    } catch (err) {
      if (!mountedRef.current) return { success: false };
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      setState(prev => ({ ...prev, error: { message } }));
      return { success: false };
    } finally {
      setIsAccepting(false);
    }
  }, []);

  // Get invite preview by code (public)
  const getInvitePreview = useCallback(async (code: string): Promise<InvitePreview | null> => {
    try {
      const response = await apiClient.get(`/groups/invite/${code}`);
      
      if (!mountedRef.current) return null;

      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Respond to direct invitation (accept/decline)
  const respondToInvitation = useCallback(async (
    invitationId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; groupSlug?: string }> => {
    if (!groupId) return { success: false };

    setIsAccepting(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await apiClient.put(`/groups/${groupId}/invitations/${invitationId}`, { action });
      
      if (!mountedRef.current) return { success: false };

      if (response.data.success) {
        // Update invitation status in list
        setState(prev => ({
          ...prev,
          invitations: prev.invitations.map(inv =>
            inv._id === invitationId
              ? { ...inv, status: action === 'accept' ? 'accepted' : 'declined' as InvitationStatus }
              : inv
          ),
        }));
        return {
          success: true,
          groupSlug: response.data.data?.group?.slug,
        };
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || `Failed to ${action} invitation` },
        }));
        return { success: false };
      }
    } catch (err) {
      if (!mountedRef.current) return { success: false };
      const message = err instanceof Error ? err.message : `Failed to ${action} invitation`;
      setState(prev => ({ ...prev, error: { message } }));
      return { success: false };
    } finally {
      setIsAccepting(false);
    }
  }, [groupId]);

  // Load more invitations
  const loadMore = useCallback(async () => {
    if (state.hasMore && !state.isLoading) {
      await fetchInvitations(state.page + 1, true);
    }
  }, [fetchInvitations, state.hasMore, state.isLoading, state.page]);

  // Refresh invitations
  const refresh = useCallback(async () => {
    await fetchInvitations(1, false);
  }, [fetchInvitations]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch && groupId) {
      fetchInvitations(1, false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, groupId, fetchInvitations]);

  return {
    invitations: state.invitations,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    createInvitation,
    createInviteLink,
    cancelInvitation,
    acceptInvite,
    getInvitePreview,
    respondToInvitation,
    loadMore,
    refresh,
    clearError,
    isCreating,
    isCancelling,
    isAccepting,
  };
}

export default useGroupInvitations;
