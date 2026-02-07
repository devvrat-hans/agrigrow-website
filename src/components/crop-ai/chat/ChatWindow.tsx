'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { IconRobot, IconHistory } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import apiClient from '@/lib/api-client';
import { ChatInput } from './ChatInput';
import { ChatMessage, ChatMessageData } from './ChatMessage';

// TYPES

interface ChatHistoryMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatApiResponse {
  success: boolean;
  data?: {
    response: string;
    conversationHistory: ChatHistoryMessage[];
  };
  error?: string;
}

/**
 * Resumed conversation structure
 */
export interface ResumedConversation {
  id: string;
  messages: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
  }>;
}

export interface ChatWindowProps {
  /** Initial message to display */
  initialMessage?: string;
  /** Resumed conversation to continue */
  resumedConversation?: ResumedConversation | null;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder for input */
  placeholder?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Callback when history button is clicked */
  onShowHistory?: () => void;
  /** Title for the chat header */
  headerTitle?: string;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Whether to show the history button */
  showHistoryButton?: boolean;
}

// HELPER FUNCTIONS

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createUserMessage(content: string): ChatMessageData {
  return {
    id: generateId(),
    content,
    role: 'user',
    timestamp: new Date().toISOString(),
  };
}

function createAssistantMessage(content: string, id?: string): ChatMessageData {
  return {
    id: id || generateId(),
    content,
    role: 'assistant',
    timestamp: new Date().toISOString(),
  };
}

// WELCOME MESSAGE

const WELCOME_MESSAGE = createAssistantMessage(
  "Hello! I'm AgriGrow AI, your agriculture assistant 🌱\n\nI can help you discover trending topics, get crop and market insights, find expert suggestions, understand schemes, and explore useful agronomic information across the agri ecosystem.\n\nWhat would you like to explore today?"
);

/**
 * ChatWindow Component
 * 
 * Complete chat interface with message history and input.
 * Manages conversation state and API communication.
 * Supports resuming conversations from history.
 */
export function ChatWindow({
  initialMessage,
  resumedConversation,
  className,
  placeholder,
  autoFocus = true,
  onClose,
  onShowHistory,
  headerTitle = 'Ask AI',
  showHeader = true,
  showHistoryButton = true,
}: ChatWindowProps) {
  const { t } = useTranslation();

  // Messages state
  const [messages, setMessages] = useState<ChatMessageData[]>(() => {
    // If resuming a conversation, convert messages to display format
    if (resumedConversation?.messages?.length) {
      return resumedConversation.messages.map((msg, index) => ({
        id: `resumed-${index}-${Date.now()}`,
        content: msg.content,
        role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
        timestamp: msg.timestamp.toISOString(),
      }));
    }
    return [WELCOME_MESSAGE];
  });
  
  const [conversationHistory, setConversationHistory] = useState<ChatHistoryMessage[]>(() => {
    // If resuming a conversation, convert messages to API format
    if (resumedConversation?.messages?.length) {
      return resumedConversation.messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));
    }
    return [];
  });
  
  const [conversationId, setConversationId] = useState<string | null>(
    resumedConversation?.id || null
  );
  // Ref to always have the latest conversationId in callbacks/closures
  const conversationIdRef = useRef<string | null>(conversationId);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  // Keep conversationIdRef in sync with state
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    // Use multiple strategies to ensure scroll happens after rendering
    const doScroll = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };
    // Try immediately, after rAF, and after a delay
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 100);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * Persist conversation to MongoDB via history API.
   * Runs in background (non-blocking) to avoid slowing chat UX.
   */
  const persistConversation = useCallback(async (
    allMessages: ChatMessageData[],
    currentConversationId: string | null
  ) => {
    try {
      // Filter out welcome/loading messages and convert to API format
      const apiMessages = allMessages
        .filter(msg => msg.content.trim() !== '') // skip empty (loading) msgs
        .map(msg => ({
          role: (msg.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }));

      // Only persist if there's at least one user message
      if (!apiMessages.some(m => m.role === 'user')) return;

      const payload: {
        conversationId?: string;
        messages: typeof apiMessages;
      } = { messages: apiMessages };

      if (currentConversationId) {
        payload.conversationId = currentConversationId;
      }

      const response = await apiClient.post<{
        success: boolean;
        data?: { conversationId: string; title: string };
        error?: string;
      }>('/crop-ai/chat/history', payload);

      if (response.data.success && response.data.data) {
        // Store the conversation ID for subsequent updates
        const newId = response.data.data.conversationId;
        conversationIdRef.current = newId;
        setConversationId(newId);
      }
    } catch (error) {
      // Silently fail — persistence is non-critical for chat UX
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosErr = error as { response?: { status?: number; data?: unknown } };
        console.error('Failed to persist conversation:', axiosErr.response?.status, axiosErr.response?.data);
      } else {
        console.error('Failed to persist conversation:', error);
      }
    }
  }, []);

  // Send message to API
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    const userMessage = createUserMessage(content);
    setMessages((prev) => [...prev, userMessage]);

    // Create loading message
    const loadingId = generateId();
    setLoadingMessageId(loadingId);
    setIsLoading(true);

    // Add loading placeholder
    setMessages((prev) => [
      ...prev,
      createAssistantMessage('', loadingId),
    ]);

    try {
      // Call chat API
      const response = await apiClient.post<ChatApiResponse>('/crop-ai/chat', {
        message: content,
        conversationHistory,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get response');
      }

      const { response: aiResponse, conversationHistory: newHistory } = response.data.data;

      // Update conversation history
      setConversationHistory(newHistory);

      // Replace loading message with actual response and persist to DB
      let updatedMessages: ChatMessageData[] = [];
      setMessages((prev) => {
        updatedMessages = prev.map((msg) =>
          msg.id === loadingId
            ? createAssistantMessage(aiResponse, loadingId)
            : msg
        );
        return updatedMessages;
      });

      // Persist conversation to MongoDB (await to ensure conversationId is set before next message)
      await persistConversation(updatedMessages, conversationIdRef.current);
    } catch (error) {
      console.error('Chat error:', error);

      // Replace loading with error message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? createAssistantMessage(
                t('cropAi.chat.errorMessage'),
                loadingId
              )
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setLoadingMessageId(null);
    }
  }, [isLoading, conversationHistory, persistConversation]);

  // Handle initial message
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      // Small delay to ensure component is mounted
      setTimeout(() => {
        sendMessage(initialMessage);
      }, 500);
    }
  }, [initialMessage, sendMessage]);

  // Check if this is a resumed conversation
  const isResumedConversation = Boolean(resumedConversation?.id);

  return (
    <div className={cn('flex flex-col flex-1 min-h-0', className)}>
      {/* Chat Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {headerTitle}
            </h2>
            {isResumedConversation && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                Resumed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showHistoryButton && onShowHistory && (
              <button
                onClick={onShowHistory}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Chat History"
              >
                <IconHistory className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Close"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4 min-h-0"
        style={{ minHeight: '100px' }}
      >
        {/* Welcome Header - only show for new conversations */}
        {!isResumedConversation && (
          <div className="flex flex-col items-center text-center py-3 sm:py-4 mb-3 sm:mb-4">
            <div
              className={cn(
                'flex items-center justify-center',
                'w-12 h-12 sm:w-14 sm:h-14 mb-2 sm:mb-3',
                'rounded-full',
                'bg-primary-100 dark:bg-primary-900/50'
              )}
            >
              <IconRobot className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {t('cropAi.chat.welcomeTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('cropAi.chat.welcomeSubtitle')}
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLoading={message.id === loadingMessageId}
          />
        ))}
      </div>

      {/* Input Section - Sticky at the very bottom of the ChatWindow */}
      <div 
        className={cn(
          'shrink-0 mt-auto',
          'px-3 sm:px-4 py-2 sm:py-3',
          'border-t border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-900'
        )}
      >
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          loading={false}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}

export default ChatWindow;
