'use client';

import React, { useState } from 'react';
import {
  IconPencil,
  IconBell,
  IconBellOff,
  IconShare,
  IconDotsVertical,
  IconFlag,
  IconUserPlus,
  IconLink,
  IconBrandTwitter,
  IconBrandWhatsapp,
  IconDoorExit,
  IconLoader2,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupMemberData } from '@/types/group';

/**
 * GroupActionBar component props
 */
interface GroupActionBarProps {
  /** Group ID */
  groupId: string;
  /** Group name for sharing */
  groupName: string;
  /** Current user's membership data (null if not a member) */
  membership: GroupMemberData | null;
  /** Whether notifications are enabled for this group */
  notificationsEnabled?: boolean;
  /** Callback when create post button is clicked */
  onCreatePost?: () => void;
  /** Callback when notifications toggle is clicked */
  onToggleNotifications?: () => void;
  /** Callback when share is clicked */
  onShare?: () => void;
  /** Callback when invite is clicked */
  onInvite?: () => void;
  /** Callback when report is clicked */
  onReport?: () => void;
  /** Callback when leave is clicked */
  onLeave?: () => void;
  /** Whether notification toggle is in progress */
  isTogglingNotifications?: boolean;
  /** Whether leave action is in progress */
  isLeaving?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Check if user can create posts
 */
function canCreatePosts(membership: GroupMemberData | null): boolean {
  return membership?.status === 'active';
}

/**
 * GroupActionBar component
 * 
 * Sticky action bar below header on mobile showing quick actions.
 * 
 * Features:
 * - Create post button (for members)
 * - Notifications toggle
 * - Share button
 * - More options menu (invite, report, leave)
 * - Mobile-friendly sticky positioning
 * - Touch-friendly 44px targets
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupActionBar({
  groupId,
  groupName,
  membership,
  notificationsEnabled = true,
  onCreatePost,
  onToggleNotifications,
  onShare: _onShare,
  onInvite,
  onReport,
  onLeave,
  isTogglingNotifications = false,
  isLeaving = false,
  className,
}: GroupActionBarProps) {
  const [copied, setCopied] = useState(false);
  const isMember = membership?.status === 'active';
  const userRole = membership?.role;

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/communities/${groupId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareTwitter = () => {
    const shareUrl = `${window.location.origin}/communities/${groupId}`;
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(`Check out ${groupName} on Agrigrow!`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleShareWhatsapp = () => {
    const shareUrl = `${window.location.origin}/communities/${groupId}`;
    const text = encodeURIComponent(`Check out ${groupName} on Agrigrow! ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-40',
        'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
        'border-b border-gray-200 dark:border-gray-800',
        'px-3 sm:px-4 py-2',
        'flex items-center justify-between gap-2 sm:gap-3',
        'md:hidden', // Only show on mobile
        className
      )}
    >
      {/* Left section - Create post button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {canCreatePosts(membership) && (
          <Button
            variant="default"
            size="sm"
            onClick={onCreatePost}
            className="min-h-[44px] shadow-sm text-sm active:scale-[0.95]"
            aria-label="Create post"
          >
            <IconPencil className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
            Post
          </Button>
        )}
      </div>

      {/* Right section - Action buttons */}
      <div className="flex items-center gap-1">
        {/* Notifications toggle (only for members) */}
        {isMember && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleNotifications}
            disabled={isTogglingNotifications}
            className={cn(
              'min-h-[44px] min-w-[44px] p-2 text-sm',
              'active:scale-[0.95]',
              notificationsEnabled && 'text-primary-600 dark:text-primary-400'
            )}
            aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
            aria-pressed={notificationsEnabled}
          >
            {isTogglingNotifications ? (
              <IconLoader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : notificationsEnabled ? (
              <IconBell className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <IconBellOff className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>
        )}

        {/* Share dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px] p-2 text-sm active:scale-[0.95]"
              aria-label="Share group"
            >
              <IconShare className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopyLink}>
              <IconLink className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy link'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareTwitter}>
              <IconBrandTwitter className="w-4 h-4 mr-2" />
              Share on Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareWhatsapp}>
              <IconBrandWhatsapp className="w-4 h-4 mr-2" />
              Share on WhatsApp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px] p-2 text-sm active:scale-[0.95]"
              aria-label="More options"
            >
              <IconDotsVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isMember && (
              <DropdownMenuItem onClick={onInvite}>
                <IconUserPlus className="w-4 h-4 mr-2" />
                Invite members
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onReport}>
              <IconFlag className="w-4 h-4 mr-2" />
              Report group
            </DropdownMenuItem>
            {isMember && userRole !== 'owner' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLeave}
                  disabled={isLeaving}
                  className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                >
                  {isLeaving ? (
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <IconDoorExit className="w-4 h-4 mr-2" />
                  )}
                  Leave group
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default GroupActionBar;
