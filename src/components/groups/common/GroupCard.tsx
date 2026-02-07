'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
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
  IconChevronRight
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GroupAvatar } from './GroupAvatar';
import { GroupBadge } from './GroupBadge';
import { MemberCount } from './MemberCount';
import { 
  GroupData, 
  GroupPrivacy, 
  GroupType, 
  GROUP_TYPE_LABELS 
} from '@/types/group';

/**
 * GroupCard component props
 */
interface GroupCardProps {
  /** Group data to display */
  group: GroupData;
  /** Callback when join button is clicked */
  onJoin?: (groupId: string) => void;
  /** Whether the join action is in progress */
  isJoining?: boolean;
  /** Whether to show the join button */
  showJoinButton?: boolean;
  /** Card variant for different layouts */
  variant?: 'compact' | 'full';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Privacy icon mapping
 */
const privacyIcons: Record<GroupPrivacy, React.ReactNode> = {
  public: <IconWorld className="w-3.5 h-3.5" />,
  private: <IconLock className="w-3.5 h-3.5" />,
  'invite-only': <IconMail className="w-3.5 h-3.5" />,
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
  crop: <IconPlant className="w-3.5 h-3.5" />,
  region: <IconMapPin className="w-3.5 h-3.5" />,
  topic: <IconMessages className="w-3.5 h-3.5" />,
  practice: <IconTool className="w-3.5 h-3.5" />,
};

/**
 * Group type color mapping for badges with improved colors
 */
const groupTypeColors: Record<GroupType, { bg: string; text: string; border: string }> = {
  crop: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  region: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  topic: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  practice: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

/**
 * Gradient colors for groups without cover images
 */
const gradientColors: Record<GroupType, string> = {
  crop: 'from-emerald-400 via-emerald-500 to-teal-600 dark:from-emerald-600 dark:via-emerald-700 dark:to-teal-800',
  region: 'from-blue-400 via-blue-500 to-indigo-600 dark:from-blue-600 dark:via-blue-700 dark:to-indigo-800',
  topic: 'from-purple-400 via-purple-500 to-violet-600 dark:from-purple-600 dark:via-purple-700 dark:to-violet-800',
  practice: 'from-amber-400 via-amber-500 to-orange-600 dark:from-amber-600 dark:via-amber-700 dark:to-orange-800',
};

/**
 * GroupCard component
 * 
 * Displays a group's information in a card format with support for
 * full and compact variants. Includes join functionality and navigation.
 * 
 * Features:
 * - Full variant with cover image/gradient, avatar overlay, tags, description
 * - Compact variant for list layouts with horizontal layout
 * - CSS transitions for smooth hover effects
 * - Touch-friendly 44px tap targets
 * - Full dark mode support
 * - Accessibility with proper ARIA labels
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupCard({
  group,
  onJoin,
  isJoining = false,
  showJoinButton = true,
  variant = 'full',
  className,
}: GroupCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const {
    _id,
    name,
    slug,
    description,
    coverImage,
    icon,
    groupType,
    privacy,
    memberCount,
    tags,
    isVerified,
    isJoined,
    crops,
  } = group;

  const handleJoinClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onJoin && !isJoined && !isJoining) {
      onJoin(_id);
    }
  }, [onJoin, isJoined, isJoining, _id]);

  const typeColors = groupTypeColors[groupType];
  const gradient = gradientColors[groupType];

  // Compact variant for list layouts
  if (variant === 'compact') {
    return (
      <Link 
        href={`/communities/${slug}`} 
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl"
      >
        <Card
          className={cn(
            'min-h-[80px]',
            'transition-all duration-200 ease-out',
            'border-gray-200 dark:border-gray-700',
            'hover:border-gray-300 dark:hover:border-gray-600',
            'hover:shadow-md',
            'active:scale-[0.98]',
            className
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <GroupAvatar
                  name={name}
                  icon={icon}
                  coverImage={coverImage}
                  size="md"
                />
                {/* Group type indicator dot */}
                <div 
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full',
                    'flex items-center justify-center',
                    'ring-2 ring-white dark:ring-gray-900',
                    typeColors.bg,
                    typeColors.text
                  )}
                >
                  {groupTypeIcons[groupType]}
                </div>
              </div>
              
              {/* Group info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                    {name}
                  </h3>
                  {isVerified && <GroupBadge type="verified" size="sm" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <MemberCount count={memberCount} size="sm" />
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="flex items-center gap-1">
                    {privacyIcons[privacy]}
                    {privacyLabels[privacy]}
                  </span>
                </div>
              </div>

              {/* Join button or arrow indicator */}
              {showJoinButton ? (
                <Button
                  variant={isJoined ? 'outline' : 'default'}
                  size="sm"
                  onClick={handleJoinClick}
                  disabled={isJoining}
                  className={cn(
                    'min-h-[40px] sm:min-h-[44px] min-w-[64px] sm:min-w-[72px]',
                    'transition-all duration-200',
                    isJoined && 'text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800'
                  )}
                  aria-label={isJoined ? `Joined ${name}` : `Join ${name}`}
                >
                  {isJoining ? (
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                  ) : isJoined ? (
                    <>
                      <IconCheck className="w-4 h-4" />
                      <span className="hidden sm:inline">Joined</span>
                    </>
                  ) : (
                    'Join'
                  )}
                </Button>
              ) : (
                <IconChevronRight 
                  className={cn(
                    'w-5 h-5 text-gray-400 dark:text-gray-500',
                    'transition-transform duration-200',
                    isHovered && 'translate-x-0.5'
                  )} 
                />
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Full variant with all details
  return (
    <Link 
      href={`/communities/${slug}`} 
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl group/card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          'overflow-hidden',
          'transition-all duration-300 ease-out',
          'border-gray-200 dark:border-gray-700',
          'hover:border-gray-300 dark:hover:border-gray-600',
          'hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50',
          'active:scale-[0.99]',
          isHovered && 'transform -translate-y-1',
          className
        )}
      >
        {/* Cover image or gradient background */}
        <div className="relative h-24 sm:h-28 md:h-36 overflow-hidden">
          {coverImage ? (
            <>
              <div
                className={cn(
                  'absolute inset-0 bg-cover bg-center',
                  'transition-transform duration-500 ease-out',
                  isHovered && 'scale-105'
                )}
                style={{ backgroundImage: `url(${coverImage})` }}
              />
              {/* Overlay gradient for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </>
          ) : (
            <div className={cn(
              'absolute inset-0 bg-gradient-to-br',
              gradient,
              'transition-all duration-500 ease-out',
              isHovered && 'opacity-90'
            )}>
              {/* Decorative pattern overlay */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.8)_0%,_transparent_50%)]" />
            </div>
          )}
          
          {/* Top badges row */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex items-start justify-between">
            {/* Group type badge */}
            <div
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full',
                'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
                'shadow-sm',
                typeColors.text
              )}
            >
              {groupTypeIcons[groupType]}
              <span className="text-xs font-medium">
                {GROUP_TYPE_LABELS[groupType]}
              </span>
            </div>
            
            {/* Privacy indicator */}
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full',
                'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
                'shadow-sm',
                'text-gray-700 dark:text-gray-300'
              )}
              title={privacyLabels[privacy]}
            >
              {privacyIcons[privacy]}
              <span className="text-xs font-medium hidden sm:inline">
                {privacyLabels[privacy]}
              </span>
            </div>
          </div>

          {/* Group avatar overlay */}
          <div className={cn(
            'absolute -bottom-6 sm:-bottom-8 left-3 sm:left-4',
            'transition-transform duration-300 ease-out',
            isHovered && '-translate-y-1'
          )}>
            <GroupAvatar
              name={name}
              icon={icon}
              coverImage={icon ? undefined : coverImage}
              size="xl"
              className="ring-4 ring-white dark:ring-gray-900 shadow-lg"
            />
          </div>
        </div>

        <CardContent className="pt-8 sm:pt-10 p-3 sm:p-4">
          {/* Group name and verification */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                  {name}
                </h3>
                {isVerified && <GroupBadge type="verified" size="md" />}
              </div>
              
              {/* Crops list (if crop-based group) */}
              {groupType === 'crop' && crops && crops.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                  {crops.slice(0, 3).join(', ')}{crops.length > 3 && ` +${crops.length - 3} more`}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
              {description}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={cn(
                    'text-xs font-normal px-2 py-0.5',
                    'bg-gray-50 dark:bg-gray-800',
                    'text-gray-600 dark:text-gray-400',
                    'border-gray-200 dark:border-gray-700',
                    'hover:bg-gray-100 dark:hover:bg-gray-750',
                    'transition-colors duration-150'
                  )}
                >
                  #{tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-normal px-2 py-0.5',
                    'bg-gray-50 dark:bg-gray-800',
                    'text-gray-500 dark:text-gray-500',
                    'border-gray-200 dark:border-gray-700'
                  )}
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer with member count and join button */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <MemberCount count={memberCount} icon size="md" />

            {showJoinButton && (
              <Button
                variant={isJoined ? 'outline' : 'default'}
                size="sm"
                onClick={handleJoinClick}
                disabled={isJoining}
                className={cn(
                  'min-h-[44px] min-w-[100px]',
                  'font-medium',
                  'transition-all duration-200',
                  isJoined 
                    ? 'text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950' 
                    : 'shadow-sm hover:shadow-md'
                )}
                aria-label={isJoined ? `Joined ${name}` : `Join ${name}`}
              >
                {isJoining ? (
                  <>
                    <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                    <span>Joining...</span>
                  </>
                ) : isJoined ? (
                  <>
                    <IconCheck className="w-4 h-4 mr-1" />
                    <span>Joined</span>
                  </>
                ) : (
                  'Join Group'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default GroupCard;
