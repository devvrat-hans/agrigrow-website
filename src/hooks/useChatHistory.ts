'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '@/lib/api-client';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Conversation list item (without full messages)
 */
export interface ConversationListItem {
  _id: string;
  title: string;
  messageCount: number;
  lastMessagePreview?: string;
  cropsContext?: string[];
  updatedAt: Date;
  createdAt: Date;
}

/**
 * Full conversation with messages
 */
export interface FullConversation {
  _id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
  }>;
  cropsContext?: string[];
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination state
 */
export interface ChatHistoryPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * Hook state
 */
export interface UseChatHistoryState {
  /** List of conversations */
  conversations: ConversationListItem[];
  /** Currently loaded full conversation */
  currentConversation: FullConversation | null;
  /** Loading state */
  loading: boolean;
  /** Loading state for individual operations */
  operationLoading: boolean;
  /** Error message */
  error: string | null;
  /** Pagination info */
  pagination: ChatHistoryPagination;
}

/**
 * Hook return type
 */
export interface UseChatHistoryReturn extends UseChatHistoryState {
  /** Fetch conversation list */
  fetchConversations: (page?: number) => Promise<void>;
  /** Load more conversations */
  fetchMore: () => Promise<void>;
  /** Search conversations */
  searchConversations: (query: string) => Promise<void>;
  /** Load a specific conversation */
  loadConversation: (conversationId: string) => Promise<FullConversation | null>;
  /** Save/update a conversation */
  saveConversation: (data: {
    conversationId?: string;
    title?: string;
    messages: Array<{
      role: 'user' | 'model';
      content: string;
      timestamp?: Date;
    }>;
    cropsContext?: string[];
  }) => Promise<{ conversationId: string; title: string } | null>;
  /** Delete a conversation */
  deleteConversation: (conversationId: string, permanent?: boolean) => Promise<boolean>;
  /** Clear current conversation */
  clearCurrentConversation: () => void;
  /** Refresh the list */
  refresh: () => Promise<void>;
}

/**
 * Hook options
 */
export interface UseChatHistoryOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Items per page */
  limit?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

interface ConversationListResponse {
  success: boolean;
  data?: {
    conversations: ConversationListItem[];
    pagination: ChatHistoryPagination;
  };
  error?: string;
}

interface ConversationDetailResponse {
  success: boolean;
  data?: FullConversation;
  error?: string;
}

interface SaveConversationResponse {
  success: boolean;
  data?: {
    conversationId: string;
    title: string;
  };
  error?: string;
}

interface DeleteConversationResponse {
  success: boolean;
  error?: string;
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Hook for managing chat conversation history
 * 
 * @example
 * ```tsx
 * const { conversations, loadConversation, saveConversation } = useChatHistory();
 * 
 * // Load a conversation
 * const conv = await loadConversation('conversationId');
 * 
 * // Save a conversation
 * await saveConversation({
 *   messages: [{ role: 'user', content: 'Hello' }]
 * });
 * ```
 */
export function useChatHistory(options: UseChatHistoryOptions = {}): UseChatHistoryReturn {
  const { autoFetch = true, limit = 20 } = options;

  // State
  const [state, setState] = useState<UseChatHistoryState>({
    conversations: [],
    currentConversation: null,
    loading: false,
    operationLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit,
      total: 0,
      hasMore: false,
    },
  });

  // Refs
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  // ============================================
  // FETCH CONVERSATIONS
  // ============================================

  const fetchConversations = useCallback(async (page: number = 1): Promise<void> => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get<ConversationListResponse>(
        `/crop-ai/chat/history?page=${page}&limit=${limit}`
      );

      if (!isMounted.current) return;

      if (response.data.success && response.data.data) {
        const { conversations, pagination } = response.data.data;
        
        // Parse dates
        const parsedConversations = conversations.map(c => ({
          ...c,
          updatedAt: new Date(c.updatedAt),
          createdAt: new Date(c.createdAt),
        }));

        setState(prev => ({
          ...prev,
          conversations: page === 1 
            ? parsedConversations 
            : [...prev.conversations, ...parsedConversations],
          pagination,
          loading: false,
        }));
      } else {
        throw new Error(response.data.error || 'Failed to fetch conversations');
      }
    } catch (error) {
      if (!isMounted.current) return;
      
      const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
      setState(prev => ({ ...prev, loading: false, error: message }));
    } finally {
      fetchingRef.current = false;
    }
  }, [limit]);

  // ============================================
  // FETCH MORE (PAGINATION)
  // ============================================

  const fetchMore = useCallback(async (): Promise<void> => {
    if (!state.pagination.hasMore || state.loading) return;
    await fetchConversations(state.pagination.page + 1);
  }, [state.pagination.hasMore, state.pagination.page, state.loading, fetchConversations]);

  // ============================================
  // SEARCH CONVERSATIONS
  // ============================================

  const searchConversations = useCallback(async (query: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get<ConversationListResponse>(
        `/crop-ai/chat/history?search=${encodeURIComponent(query)}&limit=${limit}`
      );

      if (!isMounted.current) return;

      if (response.data.success && response.data.data) {
        const { conversations, pagination } = response.data.data;
        
        const parsedConversations = conversations.map(c => ({
          ...c,
          updatedAt: new Date(c.updatedAt),
          createdAt: new Date(c.createdAt),
        }));

        setState(prev => ({
          ...prev,
          conversations: parsedConversations,
          pagination,
          loading: false,
        }));
      } else {
        throw new Error(response.data.error || 'Search failed');
      }
    } catch (error) {
      if (!isMounted.current) return;
      
      const message = error instanceof Error ? error.message : 'Search failed';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [limit]);

  // ============================================
  // LOAD SINGLE CONVERSATION
  // ============================================

  const loadConversation = useCallback(async (conversationId: string): Promise<FullConversation | null> => {
    setState(prev => ({ ...prev, operationLoading: true, error: null }));

    try {
      const response = await apiClient.get<ConversationDetailResponse>(
        `/crop-ai/chat/history?id=${conversationId}`
      );

      if (!isMounted.current) return null;

      if (response.data.success && response.data.data) {
        const conversation = {
          ...response.data.data,
          updatedAt: new Date(response.data.data.updatedAt),
          createdAt: new Date(response.data.data.createdAt),
          messages: response.data.data.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        };

        setState(prev => ({
          ...prev,
          currentConversation: conversation,
          operationLoading: false,
        }));

        return conversation;
      } else {
        throw new Error(response.data.error || 'Failed to load conversation');
      }
    } catch (error) {
      if (!isMounted.current) return null;
      
      const message = error instanceof Error ? error.message : 'Failed to load conversation';
      setState(prev => ({ ...prev, operationLoading: false, error: message }));
      return null;
    }
  }, []);

  // ============================================
  // SAVE CONVERSATION
  // ============================================

  const saveConversation = useCallback(async (data: {
    conversationId?: string;
    title?: string;
    messages: Array<{
      role: 'user' | 'model';
      content: string;
      timestamp?: Date;
    }>;
    cropsContext?: string[];
  }): Promise<{ conversationId: string; title: string } | null> => {
    setState(prev => ({ ...prev, operationLoading: true, error: null }));

    try {
      const response = await apiClient.post<SaveConversationResponse>(
        '/crop-ai/chat/history',
        data
      );

      if (!isMounted.current) return null;

      if (response.data.success && response.data.data) {
        // Refresh conversations list
        await fetchConversations(1);
        
        setState(prev => ({ ...prev, operationLoading: false }));
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to save conversation');
      }
    } catch (error) {
      if (!isMounted.current) return null;
      
      const message = error instanceof Error ? error.message : 'Failed to save conversation';
      setState(prev => ({ ...prev, operationLoading: false, error: message }));
      return null;
    }
  }, [fetchConversations]);

  // ============================================
  // DELETE CONVERSATION
  // ============================================

  const deleteConversation = useCallback(async (
    conversationId: string,
    permanent: boolean = false
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, operationLoading: true, error: null }));

    try {
      const response = await apiClient.delete<DeleteConversationResponse>(
        `/crop-ai/chat/history?id=${conversationId}${permanent ? '&permanent=true' : ''}`
      );

      if (!isMounted.current) return false;

      if (response.data.success) {
        // Remove from local state
        setState(prev => ({
          ...prev,
          conversations: prev.conversations.filter(c => c._id !== conversationId),
          currentConversation: prev.currentConversation?._id === conversationId 
            ? null 
            : prev.currentConversation,
          operationLoading: false,
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total - 1,
          },
        }));
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to delete conversation');
      }
    } catch (error) {
      if (!isMounted.current) return false;
      
      const message = error instanceof Error ? error.message : 'Failed to delete conversation';
      setState(prev => ({ ...prev, operationLoading: false, error: message }));
      return false;
    }
  }, []);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const clearCurrentConversation = useCallback((): void => {
    setState(prev => ({ ...prev, currentConversation: null }));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchConversations(1);
  }, [fetchConversations]);

  // ============================================
  // EFFECTS
  // ============================================

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchConversations(1);
    }
  }, [autoFetch, fetchConversations]);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    ...state,
    fetchConversations,
    fetchMore,
    searchConversations,
    loadConversation,
    saveConversation,
    deleteConversation,
    clearCurrentConversation,
    refresh,
  };
}

export default useChatHistory;
