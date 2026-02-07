'use client';

import React, { useState } from 'react';
import { 
  IconLock, 
  IconWorld, 
  IconMail, 
  IconCheck, 
  IconLoader2,
  IconPlant,
  IconMapPin,
  IconMessages,
  IconTool,
  IconShare,
  IconSettings,
  IconDoorExit,
  IconChevronDown,
  IconUsers,
  IconMessageCircle,
  IconCalendar,
  IconRosetteDiscountCheck
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupAvatar } from '../common/GroupAvatar';
import { 
  GroupData, 
  GroupMemberData,
  GroupPrivacy, 
  GroupType, 
  MemberRole,
  GROUP_TYPE_LABELS 
} from '@/types/group';

/**
 * GroupHeader component props
 */
interface GroupHeaderProps {
  /** Group data */
  group: GroupData;
  /** Current user's membership data (null if not a member) */
  membership: GroupMemberData | null;
  /** Callback when join button is clicked */
  onJoin?: () => void;
  /** Callback when leave button is clicked */
  onLeave?: () => void;
  /** Callback when settings button is clicked */
  onSettings?: () => void;
  /** Callback when share button is clicked */
  onShare?: () => void;
  /** Whether join action is in progress */
  isJoining?: boolean;
  /** Whether leave action is in progress */
  isLeaving?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Privacy icon mapping
 */
const privacyIcons: Record<GroupPrivacy, React.ReactNode> = {
  public: <IconWorld className="w-4 h-4" />,
  private: <IconLock className="w-4 h-4" />,
  'invite-only': <IconMail className="w-4 h-4" />,
};

/**
 * Privacy labels for accessibility
 */
const privacyLabels: Record<GroupPrivacy, string> = {
  public: 'Public',
  private: 'Private',
  'invite-only': 'Invite only',
};

/**
 * Group type icons mapping
 */
const groupTypeIcons: Record<GroupType, React.ReactNode> = {
  crop: <IconPlant className="w-4 h-4" />,
  region: <IconMapPin className="w-4 h-4" />,
  topic: <IconMessages className="w-4 h-4" />,
  practice: <IconTool className="w-4 h-4" />,
};

/**
 * Group type color mapping
 */
const groupTypeColors: Record<GroupType, { bg: string; text: string }> = {
  crop: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  region: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  topic: {
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    text: 'text-purple-700 dark:text-purple-300',
  },
  practice: {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
};

/**
 * Gradient colors for groups without cover images
 */
const gradientColors: Record<GroupType, string> = {
  crop: 'from-emerald-400 via-emerald-500 to-teal-600',
  region: 'from-blue-400 via-blue-500 to-indigo-600',
  topic: 'from-purple-400 via-purple-500 to-violet-600',
  practice: 'from-amber-400 via-amber-500 to-orange-600',
};

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format number with abbreviation
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Check if user has admin or owner role
 */
function isAdminOrOwner(role?: MemberRole): boolean {
  return role === 'admin' || role === 'owner';
}

/**
 * GroupHeader component
 * 
 * Prominent header for group detail page showing cover image,
 * avatar, name, badges, description, and stats.
 * 
 * Features:
 * - Full-width cover image (or gradient placeholder)
 * - Group avatar overlapping bottom of cover
 * - Group name as h1
 * - groupType and privacy badges
 * - Description paragraph
 * - Stats row (members, posts, created date)
 * - Join/Joined/Settings action button
 * - Share button
 * - Responsive cover height
 * - Proper ARIA labels
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupHeader({
  group,
  membership,
  onJoin,
  onLeave,
  onSettings,
  onShare,
  isJoining = false,
  isLeaving = false,
  className,
}: GroupHeaderProps) {
  const [shareOpen, setShareOpen] = useState(false);
  
  const {
    name,
    description,
    coverImage,
    icon,
    groupType,
    privacy,
    memberCount,
    postCount,
    isVerified,
    createdAt,
  } = group;

  const userRole = membership?.role;
  const isMember = membership?.status === 'active';
  const canManageSettings = isAdminOrOwner(userRole);
  const typeColors = groupTypeColors[groupType];
  const gradient = gradientColors[groupType];

  const handleShareClick = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior - copy to clipboard
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        setShareOpen(true);
        setTimeout(() => setShareOpen(false), 2000);
      });
    }
  };

  return (
    <header className={cn('relative', className)}>
      {/* Cover image or gradient */}
      <div className="relative h-24 sm:h-32 md:h-40 lg:h-56 overflow-hidden">
        {coverImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
          </>
        ) : (
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br',
            gradient
          )}>
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="2" fill="white" opacity="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#pattern)" />
              </svg>
            </div>
          </div>
        )}

        {/* Share button on cover */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShareClick}
            className={cn(
              'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm',
              'shadow-lg',
              'min-h-[44px] min-w-[44px]',
              'hover:bg-white dark:hover:bg-gray-900',
              'active:scale-[0.95]'
            )}
            aria-label="Share group"
          >
            <IconShare className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          {shareOpen && (
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg">
              Link copied!
            </div>
          )}
        </div>
      </div>

      {/* Content section */}
      <div className="relative px-3 sm:px-4 md:px-6 pb-4 -mt-8 sm:-mt-10 md:-mt-12">
        <div className="max-w-4xl mx-auto">
          {/* Avatar and badges row */}
          <div className="flex items-end gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Avatar */}
            <GroupAvatar
              name={name}
              icon={icon}
              coverImage={icon ? undefined : coverImage}
              size="xl"
              className="ring-4 ring-white dark:ring-gray-900 shadow-xl flex-shrink-0"
            />

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              {/* Group type badge */}
              <Badge
                className={cn(
                  'flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1',
                  'border-0',
                  'text-xs',
                  typeColors.bg,
                  typeColors.text
                )}
              >
                {groupTypeIcons[groupType]}
                <span className="hidden sm:inline">{GROUP_TYPE_LABELS[groupType]}</span>
              </Badge>

              {/* Privacy badge */}
              <Badge
                variant="outline"
                className={cn(
                  'flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1',
                  'bg-gray-100 dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300',
                  'border-gray-200 dark:border-gray-700',
                  'text-xs'
                )}
              >
                {privacyIcons[privacy]}
                <span className="hidden sm:inline">{privacyLabels[privacy]}</span>
              </Badge>

              {/* Verified badge */}
              {isVerified && (
                <Badge
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1',
                    'border-0',
                    'bg-blue-100 dark:bg-blue-900/50',
                    'text-blue-700 dark:text-blue-300',
                    'text-xs'
                  )}
                >
                  <IconRosetteDiscountCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Verified</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Name */}
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2 line-clamp-2">
            {name}
          </h1>

          {/* Description */}
          {description && (
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 max-w-2xl line-clamp-3">
              {description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <IconUsers className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatNumber(memberCount)}
              </span>
              <span>members</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-1.5">
              <IconMessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatNumber(postCount)}
              </span>
              <span>posts</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-1.5">
              <IconCalendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Created </span>
              <span>{formatDate(createdAt)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isMember ? (
              <>
                {/* Settings button for admins/owners */}
                {canManageSettings && onSettings && (
                  <Button
                    variant="default"
                    onClick={onSettings}
                    className="min-h-[44px] active:scale-[0.95]"
                    aria-label="Group settings"
                  >
                    <IconSettings className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                )}

                {/* Joined dropdown with leave option */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={canManageSettings ? 'outline' : 'default'}
                      className={cn(
                        'min-h-[44px]',
                        'active:scale-[0.95]',
                        !canManageSettings && 'text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800'
                      )}
                      disabled={isLeaving}
                    >
                      {isLeaving ? (
                        <IconLoader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                      ) : (
                        <IconCheck className="w-4 h-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">Joined</span>
                      <IconChevronDown className="w-4 h-4 ml-1 sm:ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem className="text-gray-600 dark:text-gray-400" disabled>
                      Member since {membership && formatDate(membership.joinedAt)}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onLeave}
                      className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                      disabled={isLeaving || userRole === 'owner'}
                    >
                      <IconDoorExit className="w-4 h-4 mr-2" />
                      {userRole === 'owner' ? 'Transfer ownership first' : 'Leave group'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              /* Join button for non-members */
              <Button
                variant="default"
                onClick={onJoin}
                disabled={isJoining}
                className="min-h-[44px] min-w-[100px] sm:min-w-[120px] shadow-md active:scale-[0.95]"
                aria-label={`Join ${name}`}
              >
                {isJoining ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Joining...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : privacy === 'private' ? (
                  <span className="text-sm sm:text-base">Request to Join</span>
                ) : privacy === 'invite-only' ? (
                  'Invite Only'
                ) : (
                  <span className="text-sm sm:text-base">Join Group</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default GroupHeader;
