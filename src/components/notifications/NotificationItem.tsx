'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconHeart,
  IconMessageCircle,
  IconMessageReply,
  IconAt,
  IconUserPlus,
  IconShare,
  IconRepeat,
  IconThumbUp,
  IconTrophy,
  IconBell,
  IconUser,
  IconUsersGroup,
  IconUserCheck,
  IconCircleCheck,
  IconSpeakerphone,
  IconShieldCheck,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/models/Notification';

/**
 * Group-related notification metadata
 */
export interface NotificationGroupMetadata {
  groupId?: string;
  groupName?: string;
  groupSlug?: string;
  groupPostId?: string;
  groupCommentId?: string;
  previousRole?: string;
  newRole?: string;
}

/**
 * Notification data structure for display
 */
export interface NotificationData {
  _id: string;
  type: NotificationType;
  fromUser?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  postId?: string;
  commentId?: string;
  groupId?: string;
  groupPostId?: string;
  message: string;
  metadata?: NotificationGroupMetadata;
  isRead: boolean;
  createdAt: string | Date;
}

/**
 * Props for NotificationItem component
 */
interface NotificationItemProps {
  /** Notification data */
  notification: NotificationData;
  /** Handler when notification is clicked */
  onClick?: (notification: NotificationData) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Get icon component based on notification type
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'like':
      return { icon: IconHeart, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' };
    case 'comment':
      return { icon: IconMessageCircle, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
    case 'reply':
      return { icon: IconMessageReply, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30' };
    case 'mention':
      return { icon: IconAt, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' };
    case 'follow':
      return { icon: IconUserPlus, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' };
    case 'share':
      return { icon: IconShare, color: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30' };
    case 'repost':
      return { icon: IconRepeat, color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30' };
    case 'helpful':
      return { icon: IconThumbUp, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' };
    case 'post_milestone':
      return { icon: IconTrophy, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' };
    // Group notification types
    case 'group_invite':
      return { icon: IconUsersGroup, color: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30' };
    case 'group_join_request':
      return { icon: IconUserPlus, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' };
    case 'group_join_approved':
      return { icon: IconUserCheck, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' };
    case 'group_post_approved':
      return { icon: IconCircleCheck, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' };
    case 'group_post_mention':
    case 'group_comment_mention':
      return { icon: IconAt, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' };
    case 'group_post_comment':
      return { icon: IconMessageCircle, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
    case 'group_comment_reply':
      return { icon: IconMessageReply, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30' };
    case 'group_post_like':
      return { icon: IconHeart, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' };
    case 'group_announcement':
      return { icon: IconSpeakerphone, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
    case 'group_role_change':
      return { icon: IconShieldCheck, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' };
    case 'system':
    default:
      return { icon: IconBell, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
  }
}

/**
 * Format relative time for notification
 */
function formatNotificationTime(date: string | Date): string {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return notificationDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Generate navigation URL for notification
 */
function getNotificationUrl(notification: NotificationData): string {
  // Group-related notifications
  if (isGroupNotificationType(notification.type)) {
    const groupSlug = notification.metadata?.groupSlug || notification.groupId;
    const groupPostId = notification.metadata?.groupPostId || notification.groupPostId;
    const commentId = notification.metadata?.groupCommentId;

    switch (notification.type) {
      case 'group_invite':
      case 'group_join_approved':
      case 'group_role_change':
        return groupSlug ? `/communities/${groupSlug}` : '/communities';
      
      case 'group_join_request':
        return groupSlug ? `/communities/${groupSlug}/members` : '/communities';
      
      case 'group_post_approved':
      case 'group_post_like':
      case 'group_post_mention':
        if (groupSlug && groupPostId) {
          return `/communities/${groupSlug}?post=${groupPostId}`;
        }
        return groupSlug ? `/communities/${groupSlug}` : '/communities';
      
      case 'group_post_comment':
      case 'group_comment_reply':
      case 'group_comment_mention':
        if (groupSlug && groupPostId) {
          if (commentId) {
            return `/communities/${groupSlug}?post=${groupPostId}&comment=${commentId}`;
          }
          return `/communities/${groupSlug}?post=${groupPostId}`;
        }
        return groupSlug ? `/communities/${groupSlug}` : '/communities';
      
      case 'group_announcement':
        if (groupSlug && groupPostId) {
          return `/communities/${groupSlug}?post=${groupPostId}`;
        }
        return groupSlug ? `/communities/${groupSlug}` : '/communities';
      
      default:
        return groupSlug ? `/communities/${groupSlug}` : '/communities';
    }
  }

  // Regular post notifications
  if (notification.postId) {
    if (notification.commentId) {
      return `/home?post=${notification.postId}&comment=${notification.commentId}`;
    }
    return `/home?post=${notification.postId}`;
  }
  
  if (notification.type === 'follow' && notification.fromUser) {
    return `/profile/${notification.fromUser._id}`;
  }
  
  return '/home';
}

/**
 * Check if notification type is group-related
 */
function isGroupNotificationType(type: NotificationType): boolean {
  return type.startsWith('group_');
}

/**
 * NotificationItem Component
 * Displays a single notification with icon, user info, message, and timestamp
 */
export function NotificationItem({
  notification,
  onClick,
  className,
}: NotificationItemProps) {
  const { icon: Icon, color } = getNotificationIcon(notification.type);
  const url = getNotificationUrl(notification);

  const handleClick = () => {
    onClick?.(notification);
  };

  return (
    <Link
      href={url}
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        'transition-colors duration-200',
        'cursor-pointer',
        !notification.isRead && 'bg-primary-50/50 dark:bg-primary-900/10',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full',
          'flex items-center justify-center',
          color
        )}
      >
        <Icon size={20} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* User avatar and message */}
        <div className="flex items-start gap-2">
          {/* From user avatar */}
          {notification.fromUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {notification.fromUser.avatar ? (
                <img
                  src={notification.fromUser.avatar}
                  alt={notification.fromUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <IconUser size={16} className="text-gray-400" />
                </div>
              )}
            </div>
          )}

          {/* Message text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {notification.fromUser && (
                <span className="font-medium">{notification.fromUser.name}</span>
              )}{' '}
              <span className="text-gray-600 dark:text-gray-400">
                {notification.message}
              </span>
            </p>

            {/* Timestamp */}
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {formatNotificationTime(notification.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
        </div>
      )}
    </Link>
  );
}

export default NotificationItem;
