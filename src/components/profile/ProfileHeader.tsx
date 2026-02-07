'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { IconDotsVertical, IconVolume, IconVolume3 } from '@tabler/icons-react';
import { useMuteUser } from '@/hooks';
import { useTranslation } from '@/hooks/useTranslation';

interface ProfileHeaderProps {
  /** User's MongoDB _id for mute API calls */
  userId?: string;
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
  userId,
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
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);
  const { t } = useTranslation();
  
  // Track local counts that can update after follow actions
  const [localFollowersCount, setLocalFollowersCount] = useState(followersCount);
  const [localFollowingCount, setLocalFollowingCount] = useState(followingCount);

  // Mute user hook - only initialize for other users' profiles
  const {
    isMuted,
    isLoading: muteLoading,
    muteUser,
    unmuteUser,
  } = useMuteUser(!isOwnProfile && userId ? userId : undefined);

  // Sync with parent props when they change (e.g., after re-fetch)
  useEffect(() => {
    setLocalFollowersCount(followersCount);
  }, [followersCount]);

  useEffect(() => {
    setLocalFollowingCount(followingCount);
  }, [followingCount]);

  const handleFollowersClick = () => {
    setIsFollowersModalOpen(true);
  };

  const handleFollowingClick = () => {
    setIsFollowingModalOpen(true);
  };

  const handleFollowChange = (nowFollowing: boolean) => {
    // Update local follower count based on new follow state
    setLocalFollowersCount((prev) => (nowFollowing ? prev + 1 : prev - 1));
    onFollowChange?.();
  };

  /** Handle mute/unmute action from the dropdown */
  const handleMuteToggle = async () => {
    if (!userId) return;

    if (isMuted) {
      // Unmute immediately — no confirmation needed
      await unmuteUser(userId);
    } else {
      // Show confirmation dialog before muting
      setShowMuteConfirm(true);
    }
  };

  /** Confirm mute action from the dialog */
  const handleConfirmMute = async () => {
    if (!userId) return;
    await muteUser(userId);
    setShowMuteConfirm(false);
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
              
              {/* Follow Button & More Options - Only show for other profiles */}
              {!isOwnProfile && (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <FollowButton
                    userPhone={userPhone}
                    size="sm"
                    onFollowChange={handleFollowChange}
                  />
                  
                  {/* Three-dot menu with mute option */}
                  {userId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                        >
                          <IconDotsVertical size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={handleMuteToggle}
                          disabled={muteLoading}
                          className="gap-2"
                        >
                          {isMuted ? (
                            <>
                              <IconVolume size={16} />
                              <span>{t('profile.unmuteUser')}</span>
                            </>
                          ) : (
                            <>
                              <IconVolume3 size={16} />
                              <span>{t('profile.muteUser')}</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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

      {/* Mute Confirmation Dialog */}
      <AlertDialog open={showMuteConfirm} onOpenChange={setShowMuteConfirm}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.muteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profile.muteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmMute}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('profile.mute')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
