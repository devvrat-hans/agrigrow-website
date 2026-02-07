'use client';

/**
 * Notifications Page
 * 
 * Displays all user notifications with grouping by time period.
 * Allows users to view and manage their notifications.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconBell, IconArrowLeft, IconCheck, IconBellOff } from '@tabler/icons-react';
import { NotificationList } from '@/components/notifications';
import type { NotificationData } from '@/components/notifications/NotificationItem';
import { useNotifications } from '@/hooks';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common';

export default function NotificationsPage() {
  const router = useRouter();
  
  // Get user phone from localStorage
  const userPhone = typeof window !== 'undefined' 
    ? localStorage.getItem('userPhone') 
    : null;

  const {
    notifications,
    isLoading,
    error,
    unreadCount,
    pagination,
    isLoadingMore,
    isMarkingAllRead,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    enablePolling: true,
    pollingInterval: 30000,
    pageSize: 20,
  });

  const hasMore = pagination.hasMore;
  const errorMessage = error?.message || null;

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('userPhone')) {
      router.push('/auth/signin');
    }
  }, [router]);

  // Initial fetch
  useEffect(() => {
    if (userPhone) {
      fetchNotifications();
    }
  }, [userPhone, fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = (notification: NotificationData) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigate based on notification data
    if (notification.groupId) {
      const groupIdentifier = notification.metadata?.groupSlug || notification.groupId;
      if (notification.groupPostId) {
        router.push(`/communities/${groupIdentifier}?post=${notification.groupPostId}`);
      } else {
        router.push(`/communities/${groupIdentifier}`);
      }
    } else if (notification.fromUser?._id) {
      router.push(`/profile/${notification.fromUser._id}`);
    } else if (notification.postId) {
      router.push(`/home?post=${notification.postId}`);
    }
  };

  if (!userPhone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <IconArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <IconBell className="w-5 h-5 text-primary-600" />
              <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>
          
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isMarkingAllRead}
              className="text-primary-600 hover:text-primary-700"
            >
              {isMarkingAllRead ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <IconCheck className="w-4 h-4 mr-1" />
                  Mark all read
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <IconBellOff className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center mb-4">{errorMessage}</p>
            <Button onClick={() => fetchNotifications()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <IconBell className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h2>
            <p className="text-gray-500 text-center max-w-xs">
              When you receive notifications about activity on your posts, comments, or groups, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            error={errorMessage}
            onMarkAllRead={markAllAsRead}
            onNotificationClick={handleNotificationClick}
            isMarkingAllRead={isMarkingAllRead}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            className="divide-y divide-gray-100"
          />
        )}
      </div>
    </div>
  );
}
