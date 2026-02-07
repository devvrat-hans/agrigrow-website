'use client';

/**
 * FollowersModal Component
 * 
 * A modal/drawer showing the followers list for a user.
 * Mobile-friendly with bottom sheet behavior on small screens.
 */

import { useState, useCallback, useEffect } from 'react';
import { IconX, IconSearch, IconUsers } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useFollowers } from '@/hooks/useFollowers';
import { UserList } from '../UserList';
import type { FollowUser } from '@/types/follow';

/**
 * FollowersModal Props
 */
export interface FollowersModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Phone number of the user whose followers to display */
  userPhone: string;
  /** Callback when a user is clicked */
  onUserClick?: (user: FollowUser) => void;
}

/**
 * FollowersModal Component
 */
export function FollowersModal({
  isOpen,
  onClose,
  userPhone,
  onUserClick,
}: FollowersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch followers
  const {
    followers,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    updateFollowerStatus,
  } = useFollowers(isOpen ? userPhone : null, {
    searchQuery: debouncedQuery,
    skipInitialFetch: !isOpen,
  });

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Handle user click
  const handleUserClick = useCallback((user: FollowUser) => {
    onUserClick?.(user);
    onClose();
  }, [onUserClick, onClose]);

  // Handle follow change
  const handleFollowChange = useCallback((targetPhone: string, isFollowing: boolean) => {
    updateFollowerStatus(targetPhone, { isFollowing });
  }, [updateFollowerStatus]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex items-end sm:items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        'animate-in fade-in duration-200'
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="followers-modal-title"
    >
      {/* Modal content */}
      <div
        className={cn(
          'relative w-full sm:max-w-md',
          'max-h-[85vh] sm:max-h-[80vh]',
          'bg-white dark:bg-gray-900',
          'rounded-t-2xl sm:rounded-2xl',
          'shadow-xl',
          'flex flex-col',
          'animate-in slide-in-from-bottom sm:zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <IconUsers className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2
              id="followers-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Followers
            </h2>
            {totalCount > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({totalCount})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-full',
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-green-500'
            )}
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search followers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-9 pr-4 py-2',
                'text-sm',
                'bg-gray-50 dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'rounded-lg',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
                'transition-colors duration-200'
              )}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <UserList
              users={followers}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              showFollowButtons={true}
              onUserClick={handleUserClick}
              onFollowChange={handleFollowChange}
              emptyTitle="No Followers"
              emptyMessage={
                debouncedQuery
                  ? `No followers found matching "${debouncedQuery}"`
                  : "This user doesn't have any followers yet"
              }
            />
          )}
        </div>

        {/* Mobile drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

export default FollowersModal;
