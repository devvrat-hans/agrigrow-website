'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ProfileAvatarSection } from './ProfileAvatarSection';
import { ProfileNameBadge } from './ProfileNameBadge';
import { TrustScoreSection } from './TrustScoreSection';
import { formatPhoneNumber } from './ProfileAvatarCard';
import {
  FollowButton,
  FollowStats,
  FollowersModal,
  FollowingModal,
} from '@/components/follow';
import { useFollowStatus } from '@/hooks/useFollowStatus';

interface ProfileHeaderProps {
  /** User's ID or phone for API calls */
  userPhone: string;
  /** User's full name */
  fullName: string;
  /** User's phone number (for display) */
  displayPhone?: string;
  /** User's bio */
  bio?: string;
  /** User's role */
  role: 'farmer' | 'student' | 'business';
  /** User's profile image URL */
  avatarUrl?: string;
  /** Whether viewing own profile */
  isOwnProfile: boolean;
  /** Followers count */
  followersCount: number;
  /** Following count */
  followingCount: number;
  /** Trust score for the user */
  trustScore?: number;
  /** Additional class names */
  className?: string;
  /** Callback when follow state changes */
  onFollowChange?: () => void;
}

/**
 * Profile header component with follow integration.
 * Shows FollowStats for all profiles.
 * Shows FollowButton only when viewing another user's profile.
 */
export function ProfileHeader({
  userPhone,
  fullName,
  displayPhone,
  bio,
  role,
  avatarUrl,
  isOwnProfile,
  followersCount,
  followingCount,
  trustScore,
  className,
  onFollowChange,
}: ProfileHeaderProps) {
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  
  // Track local counts that can update after follow actions
  const [localFollowersCount, setLocalFollowersCount] = useState(followersCount);
  const [localFollowingCount] = useState(followingCount);

  // Get follow status for the user being viewed (only needed for non-own profiles)
  const { isFollowing } = useFollowStatus(isOwnProfile ? '' : userPhone);

  const handleFollowersClick = () => {
    setIsFollowersModalOpen(true);
  };

  const handleFollowingClick = () => {
    setIsFollowingModalOpen(true);
  };

  const handleFollowChange = () => {
    // Update local follower count based on follow state
    setLocalFollowersCount((prev) => (isFollowing ? prev - 1 : prev + 1));
    onFollowChange?.();
  };

  return (
    <>
      <Card className={cn('p-4 sm:p-6', className)}>
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
          <ProfileAvatarSection avatarUrl={avatarUrl} fullName={fullName} />
          
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2">
              <ProfileNameBadge 
                fullName={fullName} 
                role={role} 
                className="justify-center sm:justify-start" 
              />
              
              {/* Follow Button - Only show for other profiles */}
              {!isOwnProfile && (
                <div className="flex justify-center sm:justify-start">
                  <FollowButton
                    userPhone={userPhone}
                    size="sm"
                    onFollowChange={handleFollowChange}
                  />
                </div>
              )}
            </div>
            
            {displayPhone && (
              <p className="text-sm text-muted-foreground mb-2">
                {formatPhoneNumber(displayPhone)}
              </p>
            )}
            
            {bio && (
              <p className="text-sm text-foreground line-clamp-2">{bio}</p>
            )}

            {/* Trust Score - Show for all profiles */}
            {trustScore !== undefined && trustScore > 0 && (
              <div className="mt-3 flex justify-center sm:justify-start">
                <TrustScoreSection score={trustScore} />
              </div>
            )}
          </div>
        </div>

        {/* Follow Stats */}
        <div className="mt-4 pt-4 border-t border-border">
          <FollowStats
            followersCount={localFollowersCount}
            followingCount={localFollowingCount}
            onFollowersClick={handleFollowersClick}
            onFollowingClick={handleFollowingClick}
            size="md"
          />
        </div>
      </Card>

      {/* Followers Modal */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userPhone={userPhone}
      />

      {/* Following Modal */}
      <FollowingModal
        isOpen={isFollowingModalOpen}
        onClose={() => setIsFollowingModalOpen(false)}
        userPhone={userPhone}
      />
    </>
  );
}
