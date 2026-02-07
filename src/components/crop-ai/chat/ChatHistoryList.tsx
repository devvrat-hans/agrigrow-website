'use client';

import { useState, useCallback } from 'react';
import {
  IconMessageCircle,
  IconTrash,
  IconClock,
  IconSearch,
  IconChevronRight,
  IconAlertCircle,
  IconPlus,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useChatHistory, ConversationListItem } from '@/hooks/useChatHistory';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ChatHistoryListProps {
  /** Callback when a conversation is selected for resumption */
  onSelectConversation: (conversation: {
    id: string;
    messages: Array<{
      role: 'user' | 'model';
      content: string;
      timestamp: Date;
    }>;
  }) => void;
  /** Callback to start a new conversation */
  onNewConversation: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

// ============================================
// CONVERSATION CARD COMPONENT
// ============================================

interface ConversationCardProps {
  conversation: ConversationListItem;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ConversationCard({
  conversation,
  onSelect,
  onDelete,
  isDeleting,
}: ConversationCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative p-4 rounded-xl border cursor-pointer transition-all duration-200',
        'bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        'hover:border-primary-300 dark:hover:border-primary-600',
        'hover:shadow-md',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Main Content */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <IconMessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {conversation.title}
          </h3>
          
          {conversation.lastMessagePreview && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {conversation.lastMessagePreview}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <IconClock className="w-3.5 h-3.5" />
              {formatRelativeTime(conversation.updatedAt)}
            </span>
            <span>{conversation.messageCount} messages</span>
          </div>

          {/* Crops Tags */}
          {conversation.cropsContext && conversation.cropsContext.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {conversation.cropsContext.slice(0, 3).map((crop, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                >
                  {crop}
                </span>
              ))}
              {conversation.cropsContext.length > 3 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  +{conversation.cropsContext.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Arrow / Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {showDeleteConfirm ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelDelete}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Delete'
                )}
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={handleDeleteClick}
                className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Delete conversation"
              >
                <IconTrash className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </button>
              <IconChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * ChatHistoryList Component
 * 
 * Displays a list of past chat conversations with search,
 * pagination, and ability to resume or delete conversations.
 */
export function ChatHistoryList({
  onSelectConversation,
  onNewConversation,
  className,
}: ChatHistoryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Use chat history hook
  const {
    conversations,
    loading,
    operationLoading,
    error,
    pagination,
    fetchMore,
    searchConversations,
    loadConversation,
    deleteConversation,
    refresh,
  } = useChatHistory({
    autoFetch: true,
    limit: 20,
  });

  // Handle search
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      searchConversations(searchQuery.trim());
    } else {
      refresh();
    }
  }, [searchQuery, searchConversations, refresh]);

  // Handle search input keydown
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    refresh();
  }, [refresh]);

  // Handle select conversation
  const handleSelect = useCallback(async (conversationId: string) => {
    const fullConversation = await loadConversation(conversationId);
    if (fullConversation) {
      onSelectConversation({
        id: fullConversation._id,
        messages: fullConversation.messages,
      });
    }
  }, [loadConversation, onSelectConversation]);

  // Handle delete conversation
  const handleDelete = useCallback(async (conversationId: string) => {
    setDeletingId(conversationId);
    await deleteConversation(conversationId);
    setDeletingId(null);
  }, [deleteConversation]);

  // Render error state
  if (error && conversations.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <IconAlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with New Chat Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Chat History
        </h2>
        <Button
          onClick={onNewConversation}
          size="sm"
          className="flex items-center gap-2"
        >
          <IconPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : conversations.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={<IconMessageCircle className="w-12 h-12" />}
          message="No conversations yet"
          description="Start a new chat to get AI-powered farming advice"
          action={
            <Button onClick={onNewConversation} className="mt-4">
              <IconPlus className="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
          }
        />
      ) : (
        /* Conversation List */
        <>
          <div className="flex-1 overflow-y-auto space-y-3">
            {conversations.map((conversation) => (
              <ConversationCard
                key={conversation._id}
                conversation={conversation}
                onSelect={() => handleSelect(conversation._id)}
                onDelete={() => handleDelete(conversation._id)}
                isDeleting={deletingId === conversation._id}
              />
            ))}

            {/* Load More */}
            {pagination.hasMore && (
              <div className="pt-4 pb-2 flex justify-center">
                <Button
                  variant="outline"
                  onClick={fetchMore}
                  disabled={loading || operationLoading}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {pagination.total} conversation{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatHistoryList;
