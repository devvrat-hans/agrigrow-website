'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GroupMemberData, MemberRole } from '@/types/group';
import { MemberRoleBadge, canManageRole } from './MemberRoleBadge';
import { MemberAvatar } from './common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  IconDotsVertical,
  IconUserEdit,
  IconUserMinus,
  IconBan,
  IconMessageCircle,
  IconClock,
  IconCalendar,
} from '@tabler/icons-react';

interface MemberCardProps {
  /** Member data */
  member: GroupMemberData;
  /** Current user's role in the group */
  currentUserRole?: MemberRole;
  /** Display mode */
  variant?: 'list' | 'grid';
  /** Callback when change role is clicked */
  onChangeRole?: (member: GroupMemberData) => void;
  /** Callback when remove member is clicked */
  onRemove?: (member: GroupMemberData) => void;
  /** Callback when ban member is clicked */
  onBan?: (member: GroupMemberData) => void;
  /** Callback when message is clicked */
  onMessage?: (member: GroupMemberData) => void;
  /** Callback when member card is clicked */
  onClick?: (member: GroupMemberData) => void;
  /** Whether the member is the current user */
  isCurrentUser?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format date to relative time
 */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short' 
  });
}

/**
 * Format join date
 */
function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get default avatar URL
 */
function getDefaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&size=128`;
}

/**
 * MemberCard Component
 * 
 * Displays member information with avatar, name, role badge, timestamps,
 * and admin action menu (change role, remove, ban).
 * 
 * @example
 * <MemberCard
 *   member={memberData}
 *   currentUserRole="admin"
 *   onChangeRole={(m) => handleChangeRole(m)}
 * />
 */
export function MemberCard({
  member,
  currentUserRole = 'member',
  variant = 'list',
  onChangeRole,
  onRemove,
  onBan,
  onMessage,
  onClick,
  isCurrentUser = false,
  className,
}: MemberCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const user = member.user;
  const displayName = user?.fullName || 'Unknown User';
  const profileImage = user?.profileImage || getDefaultAvatar(displayName);
  const userRole = user?.role || '';
  const isBanned = member.status === 'banned';
  const isPending = member.status === 'pending';
  
  // Check if current user can manage this member
  const canManage = currentUserRole && canManageRole(currentUserRole, member.role);
  const showActionMenu = canManage && !isCurrentUser && !isBanned;

  const handleCardClick = () => {
    if (onClick) {
      onClick(member);
    }
  };

  // Grid variant
  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center p-3 sm:p-4 rounded-xl border border-gray-200 bg-white',
          'dark:border-gray-700 dark:bg-gray-800',
          'hover:border-primary-300 hover:shadow-md dark:hover:border-primary-600',
          'active:bg-muted/50',
          'transition-all duration-200',
          isBanned && 'opacity-60',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={handleCardClick}
      >
        {/* Action Menu */}
        {showActionMenu && (
          <div className="absolute top-2 right-2">
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] active:scale-[0.95]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onChangeRole && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeRole(member);
                    }}
                  >
                    <IconUserEdit className="h-4 w-4 mr-2" />
                    Change Role
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(member);
                    }}
                  >
                    <IconUserMinus className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                )}
                {onBan && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onBan(member);
                      }}
                      className="text-red-600 dark:text-red-400"
                    >
                      <IconBan className="h-4 w-4 mr-2" />
                      Ban
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Avatar */}
        <div className="relative mb-2 sm:mb-3">
          <MemberAvatar
            imageUrl={profileImage}
            name={displayName}
            size="lg"
          />
        </div>

        {/* Name */}
        <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center line-clamp-1">
          {displayName}
          {isCurrentUser && (
            <span className="text-xs text-gray-500 ml-1">(You)</span>
          )}
        </h4>

        {/* User Role (Farmer, Expert, etc.) */}
        {userRole && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {userRole}
          </p>
        )}

        {/* Role Badge */}
        <div className="mt-1.5 sm:mt-2">
          <MemberRoleBadge role={member.role} size="sm" />
        </div>

        {/* Status Badges */}
        {isBanned && (
          <Badge variant="destructive" className="mt-1.5 sm:mt-2 text-xs">
            Banned
          </Badge>
        )}
        {isPending && (
          <Badge variant="secondary" className="mt-1.5 sm:mt-2 text-xs">
            Pending
          </Badge>
        )}

        {/* Joined Date */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 sm:mt-2">
          Joined {formatJoinDate(member.joinedAt)}
        </p>
      </div>
    );
  }

  // List variant (default)
  return (
    <div
      className={cn(
        'flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 bg-white',
        'dark:border-gray-700 dark:bg-gray-800',
        'hover:border-primary-300 hover:bg-gray-50 dark:hover:border-primary-600 dark:hover:bg-gray-750',
        'active:bg-muted/50',
        'transition-all duration-200',
        isBanned && 'opacity-60',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <MemberAvatar
          imageUrl={profileImage}
          name={displayName}
          size="md"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white line-clamp-1">
            {displayName}
            {isCurrentUser && (
              <span className="text-xs text-gray-500 ml-1">(You)</span>
            )}
          </h4>
          <MemberRoleBadge role={member.role} size="sm" />
          {isBanned && (
            <Badge variant="destructive" className="text-xs">
              Banned
            </Badge>
          )}
          {isPending && (
            <Badge variant="secondary" className="text-xs">
              Pending
            </Badge>
          )}
        </div>

        {/* User Role */}
        {userRole && (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
            {userRole}
          </p>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <IconCalendar className="h-3 w-3" />
            <span className="hidden sm:inline">Joined </span>{formatJoinDate(member.joinedAt)}
          </span>
          {member.lastActivityAt && (
            <span className="flex items-center gap-1">
              <IconClock className="h-3 w-3" />
              <span className="hidden sm:inline">Active </span>{formatRelativeTime(member.lastActivityAt)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        {onMessage && !isCurrentUser && !isBanned && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-10 p-0 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] text-gray-500 hover:text-primary-600 active:scale-[0.95]"
            onClick={(e) => {
              e.stopPropagation();
              onMessage(member);
            }}
          >
            <IconMessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}

        {showActionMenu && (
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] text-gray-500 active:scale-[0.95]"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDotsVertical className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onChangeRole && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeRole(member);
                  }}
                >
                  <IconUserEdit className="h-4 w-4 mr-2" />
                  Change Role
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(member);
                  }}
                >
                  <IconUserMinus className="h-4 w-4 mr-2" />
                  Remove Member
                </DropdownMenuItem>
              )}
              {onBan && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onBan(member);
                    }}
                    className="text-red-600 dark:text-red-400"
                  >
                    <IconBan className="h-4 w-4 mr-2" />
                    Ban Member
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export default MemberCard;
