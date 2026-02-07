'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { IconBell, IconArrowRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { NotificationItem, type NotificationData } from './NotificationItem';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';

/**
 * Props for NotificationBell component
 */
interface NotificationBellProps {
  /** Array of recent notifications to display in dropdown */
  notifications?: NotificationData[];
  /** Count of unread notifications */
  unreadCount?: number;
  /** Whether notifications are loading */
  isLoading?: boolean;
  /** Handler to fetch/refresh notifications */
  onFetchNotifications?: () => void;
  /** Handler when a notification is clicked */
  onNotificationClick?: (notification: NotificationData) => void;
  /** Handler to mark all notifications as read */
  onMarkAllRead?: () => void;
  /** Maximum number of notifications to show in dropdown */
  maxDropdownItems?: number;
  /** Additional class names */
  className?: string;
}

/**
 * NotificationBell Component
 * Navbar component showing bell icon with unread count badge
 * Clicking opens a dropdown panel with recent notifications
 */
export function NotificationBell({
  notifications = [],
  unreadCount = 0,
  isLoading = false,
  onFetchNotifications,
  onNotificationClick,
  onMarkAllRead,
  maxDropdownItems = 5,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Close dropdown on Escape key
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  /**
   * Toggle dropdown and fetch notifications when opening
   */
  const handleToggle = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen && onFetchNotifications) {
      onFetchNotifications();
    }
  }, [isOpen, onFetchNotifications]);

  /**
   * Handle notification click
   */
  const handleNotificationClick = useCallback(
    (notification: NotificationData) => {
      setIsOpen(false);
      onNotificationClick?.(notification);
    },
    [onNotificationClick]
  );

  // Get recent notifications for dropdown
  const recentNotifications = notifications.slice(0, maxDropdownItems);
  const _hasMore = notifications.length > maxDropdownItems;

  return (
    <div className={cn('relative', className)}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          'relative p-2 rounded-full',
          'text-gray-600 dark:text-gray-400',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'transition-colors duration-200',
          isOpen && 'bg-gray-100 dark:bg-gray-800'
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <IconBell size={22} />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <Badge
            className={cn(
              'absolute -top-0.5 -right-0.5',
              'min-w-5 h-5 px-1.5',
              'text-[10px] font-bold',
              'bg-red-500 text-white border-2 border-white dark:border-gray-900',
              'flex items-center justify-center'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 mt-2 z-50',
            'w-80 sm:w-96',
            'bg-white dark:bg-gray-900',
            'rounded-xl shadow-lg',
            'border border-gray-200 dark:border-gray-800',
            'overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
            'duration-200'
          )}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="notifications-menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && onMarkAllRead && (
              <button
                onClick={() => {
                  onMarkAllRead();
                }}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading && recentNotifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<IconBell size={40} className="text-gray-400" />}
                  message="No notifications"
                  description="You're all caught up!"
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer - See all link */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center justify-center gap-2',
                'text-sm font-medium',
                'text-primary-600 hover:text-primary-700 dark:text-primary-400',
                'transition-colors duration-200'
              )}
            >
              See all notifications
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
