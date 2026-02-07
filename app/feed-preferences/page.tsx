'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MobileBottomNav,
  PageHeader,
  LoadingSpinner,
  EmptyState,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  IconChevronDown,
  IconChevronUp,
  IconUserOff,
  IconHeart,
  IconBell,
  IconX,
  IconRefresh,
  IconLoader2,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Interface for muted user data
 */
interface MutedUser {
  _id: string;
  fullName: string;
  profileImage?: string;
}

/**
 * Feed preferences data structure
 */
interface FeedPreferences {
  hiddenPosts: string[];
  mutedUsers: string[];
  likedTopics: Record<string, number>;
  likedCrops: Record<string, number>;
  settings: {
    showReposts: boolean;
    prioritizeFollowing: boolean;
    contentTypes: string[];
  };
  viewedPostsCount: number;
}

/**
 * Collapsible Section Component
 */
interface CollapsibleSectionProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  badge?: string | number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

function CollapsibleSection({
  title,
  description,
  icon,
  badge,
  children,
  defaultExpanded = false,
  className,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left min-h-[56px]"
        aria-expanded={isExpanded}
      >
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {title}
                {badge !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                )}
              </CardTitle>
              {description && (
                <CardDescription className="text-sm mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-muted-foreground ml-2">
            {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
          </div>
        </CardHeader>
      </button>
      {isExpanded && (
        <CardContent className="px-4 sm:px-5 pt-0 pb-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Topic/Interest Tag with weight indicator
 */
interface InterestTagProps {
  name: string;
  weight: number;
  maxWeight: number;
  onRemove: () => void;
  isRemoving?: boolean;
}

function InterestTag({ name, weight, maxWeight, onRemove, isRemoving }: InterestTagProps) {
  // Calculate weight percentage for visual indicator
  const weightPercentage = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2 group">
      <div className="relative flex-1">
        <Badge
          variant="secondary"
          className={cn(
            'relative overflow-hidden pr-8 py-1.5',
            'hover:bg-muted transition-colors'
          )}
        >
          {/* Weight indicator bar */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-primary-200 dark:bg-primary-800/50 -z-10"
            style={{ width: `${weightPercentage}%` }}
          />
          <span className="capitalize">{name}</span>
          <span className="ml-1 text-xs text-muted-foreground">({weight})</span>
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={isRemoving}
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Remove ${name}`}
      >
        {isRemoving ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : (
          <IconX size={14} />
        )}
      </Button>
    </div>
  );
}

/**
 * Muted User Item Component
 */
interface MutedUserItemProps {
  user: MutedUser;
  onUnmute: () => void;
  isUnmuting?: boolean;
}

function MutedUserItem({ user, onUnmute, isUnmuting }: MutedUserItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.fullName}
            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-medium">{user.fullName}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onUnmute}
        disabled={isUnmuting}
      >
        {isUnmuting ? (
          <IconLoader2 size={16} className="animate-spin mr-2" />
        ) : null}
        Unmute
      </Button>
    </div>
  );
}

export default function FeedPreferencesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<FeedPreferences | null>(null);
  const [mutedUsersData, setMutedUsersData] = useState<MutedUser[]>([]);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  
  // Operation states
  const [unmutingUserId, setUnmutingUserId] = useState<string | null>(null);
  const [removingTopic, setRemovingTopic] = useState<string | null>(null);
  const [removingCrop, setRemovingCrop] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState<string | null>(null);
  
  // Success feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Show success feedback
   */
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  /**
   * Fetch feed preferences
   */
  const fetchPreferences = useCallback(async (phone: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/feed/preferences', {
        headers: {
          'x-user-phone': phone,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.data);
        
        // Fetch muted users details if there are any
        if (data.data.mutedUsers && data.data.mutedUsers.length > 0) {
          await fetchMutedUsersDetails(data.data.mutedUsers, phone);
        }
      } else {
        setError(data.error || 'Failed to load preferences');
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch details for muted users
   */
  const fetchMutedUsersDetails = async (userIds: string[], phone: string) => {
    try {
      // Fetch user details for each muted user
      const userPromises = userIds.map(async (userId) => {
        try {
          const response = await fetch(`/api/user/${userId}`, {
            headers: {
              'x-user-phone': phone,
            },
          });
          const data = await response.json();
          if (data.success && data.user) {
            return {
              _id: userId,
              fullName: data.user.fullName || data.user.name || 'Unknown User',
              profileImage: data.user.profileImage,
            };
          }
          return {
            _id: userId,
            fullName: 'Unknown User',
          };
        } catch {
          return {
            _id: userId,
            fullName: 'Unknown User',
          };
        }
      });
      
      const users = await Promise.all(userPromises);
      setMutedUsersData(users);
    } catch (err) {
      console.error('Error fetching muted users details:', err);
    }
  };

  /**
   * Update preferences with debouncing
   * @deprecated Use individual toggle handlers instead
   */
  const _updatePreferences = useCallback(async (
    updates: Record<string, unknown>,
    successMsg: string
  ) => {
    if (!userPhone) return;
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce the API call
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/feed/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-phone': userPhone,
          },
          body: JSON.stringify(updates),
        });
        
        const data = await response.json();
        
        if (data.success) {
          showSuccess(successMsg);
        } else {
          setError(data.error || 'Failed to update preferences');
        }
      } catch (err) {
        console.error('Error updating preferences:', err);
        setError('Failed to update preferences');
      }
    }, 300); // 300ms debounce
  }, [userPhone, showSuccess]);

  /**
   * Handle unmuting a user
   */
  const handleUnmuteUser = useCallback(async (userId: string) => {
    if (!userPhone || !preferences) return;
    
    setUnmutingUserId(userId);
    
    try {
      const response = await fetch('/api/feed/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': userPhone,
        },
        body: JSON.stringify({
          mutedUsers: {
            operation: 'remove',
            ids: [userId],
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setPreferences({
          ...preferences,
          mutedUsers: preferences.mutedUsers.filter((id) => id !== userId),
        });
        setMutedUsersData((prev) => prev.filter((u) => u._id !== userId));
        showSuccess('User unmuted successfully');
      } else {
        setError(data.error || 'Failed to unmute user');
      }
    } catch (err) {
      console.error('Error unmuting user:', err);
      setError('Failed to unmute user');
    } finally {
      setUnmutingUserId(null);
    }
  }, [userPhone, preferences, showSuccess]);

  /**
   * Handle removing a topic interest
   */
  const handleRemoveTopic = useCallback(async (topic: string) => {
    if (!userPhone || !preferences) return;
    
    setRemovingTopic(topic);
    
    try {
      // Create new topics object without the removed topic
      const newTopics = { ...preferences.likedTopics };
      delete newTopics[topic];
      
      const response = await fetch('/api/feed/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': userPhone,
        },
        body: JSON.stringify({
          likedTopics: newTopics,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setPreferences({
          ...preferences,
          likedTopics: newTopics,
        });
        showSuccess('Topic removed from interests');
      } else {
        setError(data.error || 'Failed to remove topic');
      }
    } catch (err) {
      console.error('Error removing topic:', err);
      setError('Failed to remove topic');
    } finally {
      setRemovingTopic(null);
    }
  }, [userPhone, preferences, showSuccess]);

  /**
   * Handle removing a crop interest
   */
  const handleRemoveCrop = useCallback(async (crop: string) => {
    if (!userPhone || !preferences) return;
    
    setRemovingCrop(crop);
    
    try {
      // Create new crops object without the removed crop
      const newCrops = { ...preferences.likedCrops };
      delete newCrops[crop];
      
      const response = await fetch('/api/feed/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': userPhone,
        },
        body: JSON.stringify({
          likedCrops: newCrops,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setPreferences({
          ...preferences,
          likedCrops: newCrops,
        });
        showSuccess('Crop removed from interests');
      } else {
        setError(data.error || 'Failed to remove crop');
      }
    } catch (err) {
      console.error('Error removing crop:', err);
      setError('Failed to remove crop');
    } finally {
      setRemovingCrop(null);
    }
  }, [userPhone, preferences, showSuccess]);

  /**
   * Handle settings toggle
   */
  const handleSettingToggle = useCallback(async (
    setting: keyof FeedPreferences['settings'],
    value: boolean
  ) => {
    if (!userPhone || !preferences) return;
    
    setSavingSettings(setting);
    
    // Optimistically update UI
    setPreferences({
      ...preferences,
      settings: {
        ...preferences.settings,
        [setting]: value,
      },
    });
    
    try {
      const response = await fetch('/api/feed/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': userPhone,
        },
        body: JSON.stringify({
          settings: {
            [setting]: value,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccess('Setting updated');
      } else {
        // Revert on failure
        setPreferences({
          ...preferences,
          settings: {
            ...preferences.settings,
            [setting]: !value,
          },
        });
        setError(data.error || 'Failed to update setting');
      }
    } catch (err) {
      // Revert on error
      setPreferences({
        ...preferences,
        settings: {
          ...preferences.settings,
          [setting]: !value,
        },
      });
      console.error('Error updating setting:', err);
      setError('Failed to update setting');
    } finally {
      setSavingSettings(null);
    }
  }, [userPhone, preferences, showSuccess]);

  // Get user phone from localStorage
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
      router.push('/auth/signin');
      return;
    }
    setUserPhone(phone);
    fetchPreferences(phone);
  }, [router, fetchPreferences]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Calculate max weights for visual indicators
  const maxTopicWeight = preferences?.likedTopics
    ? Math.max(...Object.values(preferences.likedTopics), 1)
    : 1;
  const maxCropWeight = preferences?.likedCrops
    ? Math.max(...Object.values(preferences.likedCrops), 1)
    : 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <PageHeader title="Feed Preferences" showBackButton />
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="lg" />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <PageHeader title="Feed Preferences" showBackButton />

      {/* Success Feedback */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg">
            <IconCheck size={18} />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            <IconAlertCircle size={18} />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Muted Users Section */}
        <CollapsibleSection
          title="Muted Users"
          description="Users whose posts won't appear in your feed"
          icon={<IconUserOff size={20} />}
          badge={mutedUsersData.length}
          defaultExpanded={mutedUsersData.length > 0}
        >
          {mutedUsersData.length === 0 ? (
            <EmptyState
              message="No muted users"
              description="When you mute someone, they'll appear here"
              size="sm"
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {mutedUsersData.map((user) => (
                <MutedUserItem
                  key={user._id}
                  user={user}
                  onUnmute={() => handleUnmuteUser(user._id)}
                  isUnmuting={unmutingUserId === user._id}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Interest Tuning - Topics */}
        <CollapsibleSection
          title="Topics You Like"
          description="Topics you've shown interest in through your activity"
          icon={<IconHeart size={20} />}
          badge={Object.keys(preferences?.likedTopics || {}).length}
          defaultExpanded
        >
          {Object.keys(preferences?.likedTopics || {}).length === 0 ? (
            <EmptyState
              message="No topics tracked yet"
              description="Like and engage with posts to build your interests"
              size="sm"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(preferences?.likedTopics || {})
                .sort(([, a], [, b]) => b - a)
                .map(([topic, weight]) => (
                  <InterestTag
                    key={topic}
                    name={topic}
                    weight={weight}
                    maxWeight={maxTopicWeight}
                    onRemove={() => handleRemoveTopic(topic)}
                    isRemoving={removingTopic === topic}
                  />
                ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Interest Tuning - Crops */}
        <CollapsibleSection
          title="Crops You Follow"
          description="Crops you've shown interest in through your activity"
          icon={<IconHeart size={20} />}
          badge={Object.keys(preferences?.likedCrops || {}).length}
        >
          {Object.keys(preferences?.likedCrops || {}).length === 0 ? (
            <EmptyState
              message="No crops tracked yet"
              description="Engage with crop-related posts to personalize your feed"
              size="sm"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(preferences?.likedCrops || {})
                .sort(([, a], [, b]) => b - a)
                .map(([crop, weight]) => (
                  <InterestTag
                    key={crop}
                    name={crop}
                    weight={weight}
                    maxWeight={maxCropWeight}
                    onRemove={() => handleRemoveCrop(crop)}
                    isRemoving={removingCrop === crop}
                  />
                ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Feed Settings */}
        <CollapsibleSection
          title="Feed Settings"
          description="Customize how your feed works"
          icon={<IconBell size={20} />}
          defaultExpanded
        >
          <div className="space-y-4">
            {/* Show Reposts Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="showReposts" className="text-sm font-medium">
                  Show Reposts
                </label>
                <p className="text-xs text-muted-foreground">
                  Include reposted content in your feed
                </p>
              </div>
              <Switch
                id="showReposts"
                checked={preferences?.settings.showReposts ?? true}
                onCheckedChange={(checked) => handleSettingToggle('showReposts', checked)}
                disabled={savingSettings === 'showReposts'}
              />
            </div>

            {/* Prioritize Following Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="prioritizeFollowing" className="text-sm font-medium">
                  Prioritize Following
                </label>
                <p className="text-xs text-muted-foreground">
                  Show posts from people you follow first
                </p>
              </div>
              <Switch
                id="prioritizeFollowing"
                checked={preferences?.settings.prioritizeFollowing ?? true}
                onCheckedChange={(checked) => handleSettingToggle('prioritizeFollowing', checked)}
                disabled={savingSettings === 'prioritizeFollowing'}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Refresh Preferences Button */}
        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => userPhone && fetchPreferences(userPhone)}
            disabled={isLoading}
          >
            <IconRefresh size={18} className={cn('mr-2', isLoading && 'animate-spin')} />
            Refresh Preferences
          </Button>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
