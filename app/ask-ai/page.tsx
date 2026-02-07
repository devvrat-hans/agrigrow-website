'use client';

import { useState, useCallback } from 'react';
import { IconHistory } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import {
  ChatWindow,
  ChatHeader,
  ChatHistoryList,
} from '@/components/crop-ai';
import type { ResumedConversation } from '@/components/crop-ai';

/**
 * Chat view mode
 */
type ChatViewMode = 'chat' | 'history';

/**
 * Ask AI Page
 * 
 * Dedicated page for the AI chat assistant, accessible via /ask-ai.
 * Includes the MobileBottomNav for consistent navigation.
 */
export default function AskAIPage() {
  const [chatViewMode, setChatViewMode] = useState<ChatViewMode>('chat');
  const [resumedConversation, setResumedConversation] = useState<ResumedConversation | null>(null);

  // Show chat history
  const showChatHistory = useCallback(() => {
    setChatViewMode('history');
  }, []);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setResumedConversation(null);
    setChatViewMode('chat');
  }, []);

  // Resume a conversation from history
  const resumeConversation = useCallback((conversation: {
    id: string;
    messages: Array<{
      role: 'user' | 'model';
      content: string;
      timestamp: Date;
    }>;
  }) => {
    setResumedConversation(conversation);
    setChatViewMode('chat');
  }, []);

  // Close / go back
  const handleBack = useCallback(() => {
    if (chatViewMode === 'history') {
      setChatViewMode('chat');
    } else {
      window.history.back();
    }
  }, [chatViewMode]);

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Chat Header */}
      <ChatHeader
        title={chatViewMode === 'history' ? 'Chat History' : 'Ask AI'}
        onClose={handleBack}
        leftAction={
          chatViewMode === 'history' ? (
            <button
              onClick={() => setChatViewMode('chat')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : undefined
        }
        rightAction={
          chatViewMode === 'chat' ? (
            <button
              onClick={showChatHistory}
              className={cn(
                'flex items-center justify-center',
                'min-w-[44px] min-h-[44px]',
                'rounded-full',
                'text-gray-500 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'active:bg-gray-200 dark:active:bg-gray-700',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
              )}
              aria-label="Chat history"
              title="Chat History"
            >
              <IconHistory className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      {/* Chat Content — fills remaining space between header and bottom nav */}
      <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0">
        {chatViewMode === 'history' ? (
          <ChatHistoryList
            className="flex-1 p-4 overflow-y-auto"
            onSelectConversation={resumeConversation}
            onNewConversation={startNewConversation}
          />
        ) : (
          <ChatWindow
            key={resumedConversation?.id || 'new-chat'}
            placeholder="Ask about your crops..."
            autoFocus
            showHeader={false}
            resumedConversation={resumedConversation}
            onShowHistory={showChatHistory}
            showHistoryButton={true}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
