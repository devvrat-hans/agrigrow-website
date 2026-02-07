'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { IconVolume3, IconVolume } from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** Shape of a muted user returned from the API */
interface MutedUser {
  _id: string;
  fullName: string;
  profileImage: string;
  role: 'farmer' | 'student' | 'business';
}

/**
 * Get initials from a full name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Role badge label mapping
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case 'farmer':
      return 'Farmer';
    case 'student':
      return 'Student';
    case 'business':
      return 'Business';
    default:
      return 'User';
  }
}

export default function MutedUsersPage() {
  const router = useRouter();
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unmutingIds, setUnmutingIds] = useState<Set<string>>(new Set());

  /** Fetch the list of muted users */
  const fetchMutedUsers = useCallback(async () => {
    try {
      const authPhone = localStorage.getItem('userPhone');
      if (!authPhone) {
        router.push('/auth/signin');
        return;
      }

      const response = await axios.get<{
        success: boolean;
        mutedUsers: MutedUser[];
        error?: string;
      }>('/api/feed/mute/list', {
        headers: { 'x-user-phone': authPhone },
      });

      if (response.data.success) {
        setMutedUsers(response.data.mutedUsers);
      } else {
        setError(response.data.error || 'Failed to load muted users');
      }
    } catch (err) {
      console.error('Error fetching muted users:', err);
      setError('Failed to load muted users');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMutedUsers();
  }, [fetchMutedUsers]);

  /** Unmute a specific user */
  const handleUnmute = async (userId: string) => {
    const authPhone = localStorage.getItem('userPhone');
    if (!authPhone) return;

    // Optimistic update
    setUnmutingIds((prev) => new Set(prev).add(userId));
    setMutedUsers((prev) => prev.filter((u) => u._id !== userId));

    try {
      await axios.delete('/api/feed/mute', {
        data: { targetUserId: userId },
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': authPhone,
        },
      });
    } catch (err) {
      console.error('Error unmuting user:', err);
      // Rollback — re-fetch the list
      fetchMutedUsers();
    } finally {
      setUnmutingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  /** Navigate to a user's profile */
  const handleViewProfile = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader showBackButton title="Muted Users" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader showBackButton title="Muted Users" />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">
        {/* Description */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
              <IconVolume3 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Muted Users
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Posts from muted users won&apos;t appear in your feed. You can unmute
            them anytime.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-red-600"
              onClick={() => {
                setError('');
                setIsLoading(true);
                fetchMutedUsers();
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!error && mutedUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <IconVolume className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              No muted users
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              You haven&apos;t muted anyone yet. Mute users from their profile or
              from post options to hide their posts from your feed.
            </p>
          </div>
        )}

        {/* Muted users list */}
        {mutedUsers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {mutedUsers.map((user, index) => (
              <div
                key={user._id}
                className={`flex items-center justify-between p-4 ${
                  index < mutedUsers.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-700'
                    : ''
                }`}
              >
                {/* User info */}
                <button
                  onClick={() => handleViewProfile(user._id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        {getInitials(user.fullName)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.fullName}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-xs mt-0.5"
                    >
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </button>

                {/* Unmute button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnmute(user._id)}
                  disabled={unmutingIds.has(user._id)}
                  className="ml-3 flex-shrink-0 gap-1.5 text-xs"
                >
                  {unmutingIds.has(user._id) ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <IconVolume size={14} />
                  )}
                  Unmute
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
