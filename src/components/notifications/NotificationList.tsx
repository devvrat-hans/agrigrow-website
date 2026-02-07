'use client';

import React, { useMemo } from 'react';
import { IconCheck, IconInbox } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationItem, type NotificationData } from './NotificationItem';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';

/**
 * Group notifications by time period
 */
type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';

interface GroupedNotifications {
  today: NotificationData[];
  yesterday: NotificationData[];
  thisWeek: NotificationData[];
  older: NotificationData[];
}

/**
 * Props for NotificationList component
 */
interface NotificationListProps {
  /** Array of notifications to display */
  notifications: NotificationData[];
  /** Whether notifications are loading */
  isLoading?: boolean;
  /** Error message if fetch failed */
  error?: string | null;
  /** Handler to mark all notifications as read */
  onMarkAllRead?: () => void;
  /** Handler when a notification is clicked */
  onNotificationClick?: (notification: NotificationData) => void;
  /** Whether mark all as read is in progress */
  isMarkingAllRead?: boolean;
  /** Handler to load more notifications */
  onLoadMore?: () => void;
  /** Whether there are more notifications to load */
  hasMore?: boolean;
  /** Whether more notifications are loading */
  isLoadingMore?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Get the time group for a notification
 */
function getTimeGroup(date: string | Date): TimeGroup {
  const now = new Date();
  const notificationDate = new Date(date);
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (notificationDate >= today) {
    return 'today';
  } else if (notificationDate >= yesterday) {
    return 'yesterday';
  } else if (notificationDate >= weekAgo) {
    return 'thisWeek';
  }
  return 'older';
}

/**
 * Get display label for time group
 */
function getGroupLabel(group: TimeGroup): string {
  switch (group) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'thisWeek':
      return 'This Week';
    case 'older':
      return 'Older';
  }
}

/**
 * NotificationList Component
 * Displays grouped notifications with time-based sections
 */
export function NotificationList({
  notifications,
  isLoading = false,
  error = null,
  onMarkAllRead,
  onNotificationClick,
  isMarkingAllRead = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  className,
}: NotificationListProps) {
  // Group notifications by time period
  const groupedNotifications = useMemo<GroupedNotifications>(() => {
    const groups: GroupedNotifications = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    notifications.forEach((notification) => {
      const group = getTimeGroup(notification.createdAt);
      groups[group].push(notification);
    });

    return groups;
  }, [notifications]);

  // Check if there are any unread notifications
  const hasUnread = notifications.some((n) => !n.isRead);

  // Render a notification group section
  const renderGroup = (group: TimeGroup, items: NotificationData[]) => {
    if (items.length === 0) return null;

    return (
      <div key={group}>
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {getGroupLabel(group)}
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onClick={onNotificationClick}
            />
          ))}
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('px-4 py-8', className)}>
        <EmptyState
          icon={<IconInbox size={48} className="text-gray-400" />}
          message="Failed to load notifications"
          description={error}
        />
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className={cn('px-4 py-8', className)}>
        <EmptyState
          icon={<IconInbox size={48} className="text-gray-400" />}
          message="No notifications"
          description="You're all caught up! New notifications will appear here."
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header with mark all read button */}
      {hasUnread && onMarkAllRead && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {notifications.filter((n) => !n.isRead).length} unread
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            disabled={isMarkingAllRead}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {isMarkingAllRead ? (
              <LoadingSpinner size="sm" />
            ) : (
              <IconCheck size={16} className="mr-1" />
            )}
            Mark all as read
          </Button>
        </div>
      )}

      {/* Notification groups */}
      <div className="flex-1 overflow-y-auto">
        {renderGroup('today', groupedNotifications.today)}
        {renderGroup('yesterday', groupedNotifications.yesterday)}
        {renderGroup('thisWeek', groupedNotifications.thisWeek)}
        {renderGroup('older', groupedNotifications.older)}

        {/* Load more */}
        {hasMore && (
          <div className="px-4 py-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <span className="mr-2"><LoadingSpinner size="sm" /></span>
              ) : null}
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationList;
