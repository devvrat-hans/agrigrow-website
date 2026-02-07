'use client';

/**
 * UserListItem Component
 * 
 * Displays a single user in followers/following lists.
 * Shows avatar, name, phone (masked), location, and optional FollowButton.
 */

import { useCallback } from 'react';
import { IconUser, IconMapPin } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { FollowButton } from '../FollowButton';
import { ResponsiveImage } from '@/components/common';
import type { FollowUser } from '@/types/follow';

/**
 * UserListItem Props
 */
export interface UserListItemProps {
  /** User data to display */
  user: FollowUser;
  /** Whether to show the follow button */
  showFollowButton?: boolean;
  /** Callback when the user row is clicked */
  onUserClick?: (user: FollowUser) => void;
  /** Additional CSS classes */
  className?: string;
  /** Callback when follow status changes */
  onFollowChange?: (userPhone: string, isFollowing: boolean) => void;
}

/**
 * Mask phone number for privacy (show last 4 digits)
 */
function maskPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length <= 4) return cleanPhone;
  const lastFour = cleanPhone.slice(-4);
  const masked = '•'.repeat(cleanPhone.length - 4);
  return `${masked}${lastFour}`;
}

/**
 * Get user initials for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * UserListItem Component
 */
export function UserListItem({
  user,
  showFollowButton = true,
  onUserClick,
  className,
  onFollowChange,
}: UserListItemProps) {
  const hasLocation = user.state || user.district;
  const locationText = [user.district, user.state].filter(Boolean).join(', ');

  const handleRowClick = useCallback(() => {
    onUserClick?.(user);
  }, [onUserClick, user]);

  const handleFollowChange = useCallback((isFollowing: boolean) => {
    onFollowChange?.(user.phone, isFollowing);
  }, [onFollowChange, user.phone]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onUserClick?.(user);
    }
  }, [onUserClick, user]);

  return (
    <div
      role={onUserClick ? 'button' : undefined}
      tabIndex={onUserClick ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={onUserClick ? handleKeyDown : undefined}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-white dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        onUserClick && [
          'cursor-pointer',
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset',
        ],
        className
      )}
      aria-label={`${user.fullName}'s profile`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {user.profileImage ? (
          <ResponsiveImage
            src={user.profileImage}
            alt={user.fullName}
            containerClassName="w-12 h-12 border-2 border-gray-100 dark:border-gray-700"
            isAvatar
            loading="lazy"
            fallbackComponent={
              <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                {getInitials(user.fullName) || <IconUser className="w-5 h-5" />}
              </div>
            }
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(user.fullName) || <IconUser className="w-5 h-5" />}
          </div>
        )}
        
        {/* Mutual follow indicator */}
        {user.isFollowing && user.isFollowedBy && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
            title="Mutual follow"
          >
            <span className="text-white text-[10px]">✓</span>
          </div>
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {user.fullName}
          </h4>
          {user.role && (
            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">
              {user.role}
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {maskPhone(user.phone)}
        </p>
        
        {hasLocation && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            <IconMapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
        )}
        
        {user.bio && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            {user.bio}
          </p>
        )}
      </div>

      {/* Follow button */}
      {showFollowButton && (
        <div 
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <FollowButton
            userPhone={user.phone}
            size="sm"
            onFollowChange={handleFollowChange}
          />
        </div>
      )}
    </div>
  );
}

export default UserListItem;
