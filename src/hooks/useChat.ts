'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '@/lib/api-client';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Chat message structure
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Message role - user or assistant */
  role: 'user' | 'model';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Whether this message is being streamed */
  isStreaming?: boolean;
  /** Error associated with this message */
  error?: string;
}

/**
 * Conversation structure
 */
export interface Conversation {
  /** Conversation ID */
  id: string;
  /** Conversation title (auto-generated or custom) */
  title: string;
  /** Messages in the conversation */
  messages: ChatMessage[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Chat API response structure
 */
interface ChatApiResponse {
  success: boolean;
  data?: {
    response: string;
    conversationHistory: Array<{
      role: 'user' | 'model';
      parts: { text: string }[];
    }>;
  };
  error?: string;
}

/**
 * Hook options
 */
export interface UseChatOptions {
  /** Maximum number of messages to keep in history */
  maxHistoryLength?: number;
  /** Local storage key for persistence */
  storageKey?: string;
  /** Whether to persist chat to local storage */
  persistToLocalStorage?: boolean;
  /** Initial conversation (for resuming) */
  initialConversation?: Conversation | null;
}

/**
 * Hook state
 */
export interface UseChatState {
  /** Current messages in the conversation */
  messages: ChatMessage[];
  /** Whether a message is being sent */
  loading: boolean;
  /** Current error if any */
  error: string | null;
  /** Whether there's an ongoing streaming response */
  isStreaming: boolean;
  /** Current conversation ID */
  conversationId: string | null;
}

/**
 * Hook return type
 */
export interface UseChatReturn extends UseChatState {
  /** Send a message to the AI */
  sendMessage: (message: string) => Promise<void>;
  /** Retry the last failed message */
  retryLastMessage: () => Promise<void>;
  /** Clear the conversation */
  clearConversation: () => void;
  /** Load a conversation from storage */
  loadConversation: (conversationId: string) => boolean;
  /** Get all saved conversations from storage */
  getSavedConversations: () => Conversation[];
  /** Delete a saved conversation */
  deleteConversation: (conversationId: string) => void;
  /** Export current conversation */
  exportConversation: () => Conversation | null;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_HISTORY = 50;
const DEFAULT_STORAGE_KEY = 'agrigrow_chat_conversations';
const MAX_SAVED_CONVERSATIONS = 20;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 8000; // 8 seconds
const RETRY_BACKOFF_MULTIPLIER = 2;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique ID for messages
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a conversation title from the first message
 */
function generateTitle(firstMessage: string): string {
  // Take first 50 characters or first sentence
  const title = firstMessage.split(/[.!?]/)[0] || firstMessage;
  return title.length > 50 ? title.substring(0, 47) + '...' : title;
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, MAX_RETRY_DELAY);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on network errors and rate limits
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('busy') ||
      message.includes('429') ||
      message.includes('503')
    );
  }
  return false;
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Custom hook for managing AI chat conversations
 * 
 * Features:
 * - Conversation history management
 * - Retry logic with exponential backoff
 * - Local storage persistence
 * - Multiple conversation support
 * 
 * @example
 * ```tsx
 * const { messages, loading, sendMessage, clearConversation } = useChat();
 * 
 * const handleSend = async () => {
 *   await sendMessage('What crops should I grow?');
 * };
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    maxHistoryLength = DEFAULT_MAX_HISTORY,
    storageKey = DEFAULT_STORAGE_KEY,
    persistToLocalStorage = true,
    initialConversation = null,
  } = options;

  // State
  const [state, setState] = useState<UseChatState>({
    messages: initialConversation?.messages || [],
    loading: false,
    error: null,
    isStreaming: false,
    conversationId: initialConversation?.id || null,
  });

  // Refs for cleanup and retry tracking
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  // ============================================
  // LOCAL STORAGE FUNCTIONS
  // ============================================

  /**
   * Load conversations from local storage
   */
  const loadFromStorage = useCallback((): Conversation[] => {
    if (typeof window === 'undefined' || !persistToLocalStorage) return [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Conversation[];
        // Convert date strings back to Date objects
        return parsed.map(conv => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
      }
    } catch (error) {
      console.error('Failed to load chat from storage:', error);
    }
    return [];
  }, [storageKey, persistToLocalStorage]);

  /**
   * Save conversations to local storage
   */
  const saveToStorage = useCallback((conversations: Conversation[]) => {
    if (typeof window === 'undefined' || !persistToLocalStorage) return;
    try {
      // Keep only the most recent conversations
      const toSave = conversations.slice(0, MAX_SAVED_CONVERSATIONS);
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save chat to storage:', error);
    }
  }, [storageKey, persistToLocalStorage]);

  /**
   * Save current conversation
   */
  const saveCurrentConversation = useCallback(() => {
    if (!state.conversationId || state.messages.length === 0) return;

    const conversations = loadFromStorage();
    const existingIndex = conversations.findIndex(c => c.id === state.conversationId);
    
    const conversation: Conversation = {
      id: state.conversationId,
      title: generateTitle(state.messages[0]?.content || 'New Conversation'),
      messages: state.messages,
      createdAt: existingIndex >= 0 
        ? conversations[existingIndex].createdAt 
        : new Date(),
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }

    saveToStorage(conversations);
  }, [state.conversationId, state.messages, loadFromStorage, saveToStorage]);

  // ============================================
  // API FUNCTIONS
  // ============================================

  /**
   * Send message with retry logic
   */
  const sendMessageWithRetry = useCallback(async (
    userMessage: string,
    retryAttempt: number = 0
  ): Promise<string> => {
    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Convert messages to API format
      const conversationHistory = state.messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await apiClient.post<ChatApiResponse>(
        '/api/crop-ai/chat',
        {
          message: userMessage,
          conversationHistory,
        },
        {
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get response');
      }

      return response.data.data.response;

    } catch (error) {
      // Check if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }

      // Check if we should retry
      if (retryAttempt < MAX_RETRIES && isRetryableError(error)) {
        const delay = calculateRetryDelay(retryAttempt);
        console.log(`Retrying chat request (attempt ${retryAttempt + 1}/${MAX_RETRIES}) after ${delay}ms`);
        await sleep(delay);
        return sendMessageWithRetry(userMessage, retryAttempt + 1);
      }

      throw error;
    }
  }, [state.messages]);

  // ============================================
  // PUBLIC FUNCTIONS
  // ============================================

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!message.trim() || state.loading) return;

    // Store for potential retry
    lastUserMessageRef.current = message;
    retryCountRef.current = 0;

    // Create or use existing conversation ID
    const conversationId = state.conversationId || generateId();

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    // Update state with user message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      loading: true,
      error: null,
      conversationId,
    }));

    try {
      // Get AI response
      const response = await sendMessageWithRetry(message);

      if (!isMounted.current) return;

      // Add AI response
      const aiMessage: ChatMessage = {
        id: generateId(),
        role: 'model',
        content: response,
        timestamp: new Date(),
      };

      setState(prev => {
        // Trim history if needed
        let newMessages = [...prev.messages, aiMessage];
        if (newMessages.length > maxHistoryLength) {
          newMessages = newMessages.slice(-maxHistoryLength);
        }

        return {
          ...prev,
          messages: newMessages,
          loading: false,
          error: null,
        };
      });

    } catch (error) {
      if (!isMounted.current) return;

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to get response. Please try again.';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [state.loading, state.conversationId, sendMessageWithRetry, maxHistoryLength]);

  /**
   * Retry the last failed message
   */
  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!lastUserMessageRef.current || retryCountRef.current >= MAX_RETRIES) return;

    retryCountRef.current++;

    // Remove the last AI message with error (if any)
    setState(prev => {
      const messages = [...prev.messages];
      const lastMessage = messages[messages.length - 1];
      
      // If the last message is an AI message with error, remove it
      if (lastMessage?.role === 'model' && lastMessage?.error) {
        messages.pop();
      }

      return { ...prev, messages, error: null };
    });

    // Resend the last user message
    await sendMessage(lastUserMessageRef.current);
  }, [sendMessage]);

  /**
   * Clear the current conversation
   */
  const clearConversation = useCallback((): void => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      messages: [],
      loading: false,
      error: null,
      isStreaming: false,
      conversationId: null,
    });

    lastUserMessageRef.current = null;
    retryCountRef.current = 0;
  }, []);

  /**
   * Load a conversation from storage
   */
  const loadConversation = useCallback((conversationId: string): boolean => {
    const conversations = loadFromStorage();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      setState({
        messages: conversation.messages,
        loading: false,
        error: null,
        isStreaming: false,
        conversationId: conversation.id,
      });
      return true;
    }
    
    return false;
  }, [loadFromStorage]);

  /**
   * Get all saved conversations
   */
  const getSavedConversations = useCallback((): Conversation[] => {
    return loadFromStorage();
  }, [loadFromStorage]);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback((conversationId: string): void => {
    const conversations = loadFromStorage();
    const filtered = conversations.filter(c => c.id !== conversationId);
    saveToStorage(filtered);

    // If deleting current conversation, clear it
    if (state.conversationId === conversationId) {
      clearConversation();
    }
  }, [loadFromStorage, saveToStorage, state.conversationId, clearConversation]);

  /**
   * Export the current conversation
   */
  const exportConversation = useCallback((): Conversation | null => {
    if (!state.conversationId || state.messages.length === 0) return null;

    return {
      id: state.conversationId,
      title: generateTitle(state.messages[0]?.content || 'Conversation'),
      messages: state.messages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, [state.conversationId, state.messages]);

  // ============================================
  // EFFECTS
  // ============================================

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Save conversation when messages change
  useEffect(() => {
    if (state.messages.length > 0 && state.conversationId && !state.loading) {
      saveCurrentConversation();
    }
  }, [state.messages, state.conversationId, state.loading, saveCurrentConversation]);

  return {
    ...state,
    sendMessage,
    retryLastMessage,
    clearConversation,
    loadConversation,
    getSavedConversations,
    deleteConversation,
    exportConversation,
  };
}

export default useChat;
