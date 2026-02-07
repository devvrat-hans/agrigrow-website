'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GroupMemberData, MemberRole } from '@/types/group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  IconBan,
  IconUserOff,
  IconUserPlus,
  IconSearch,
  IconLoader2,
  IconRefresh,
  IconUser,
  IconAlertTriangle,
  IconFilter,
  IconX,
  IconCalendar,
  IconBrandHipchat,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

interface BannedMembersListProps {
  /** Group ID */
  groupId: string;
  /** Current user's role in the group */
  currentUserRole: MemberRole;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a member is unbanned */
  onMemberUnbanned?: (member: GroupMemberData) => void;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';
type SortOption = 'recent' | 'oldest' | 'name';

/**
 * Get default avatar URL
 */
function getDefaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&size=128`;
}

/**
 * Format date for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown date';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

/**
 * Banned Member Card Component
 */
interface BannedMemberCardProps {
  member: GroupMemberData;
  onUnban: () => void;
  isLoading: boolean;
}

function BannedMemberCard({ member, onUnban, isLoading }: BannedMemberCardProps) {
  const name = member.user?.fullName || 'Unknown User';
  const image = member.user?.profileImage || getDefaultAvatar(name);

  return (
    <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={image}
          alt={name}
          className="w-12 h-12 rounded-full object-cover grayscale opacity-60"
        />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <IconBan className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {name}
          </h4>
          <Badge variant="destructive" className="text-xs">
            Banned
          </Badge>
        </div>

        {member.user?.role && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {member.user.role}
          </p>
        )}

        {/* Ban Info */}
        <div className="mt-2 space-y-1">
          {member.bannedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <IconCalendar className="w-3.5 h-3.5" />
              Banned {formatRelativeTime(member.bannedAt)}
            </p>
          )}
          
          {member.banReason && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
              <p className="text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <IconBrandHipchat className="w-3.5 h-3.5" />
                Reason:
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                {member.banReason}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unban Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onUnban}
        disabled={isLoading}
        className="flex-shrink-0 text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
      >
        {isLoading ? (
          <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
        ) : (
          <IconUserPlus className="w-4 h-4 mr-1" />
        )}
        Unban
      </Button>
    </div>
  );
}

/**
 * BannedMembersList Component
 * 
 * Displays a list of banned members with:
 * - Ban reason and ban date
 * - Unban button with confirmation
 * - Search and filter functionality
 * - Sort by recent, oldest, or name
 * 
 * @example
 * <BannedMembersList
 *   groupId="507f1f77bcf86cd799439011"
 *   currentUserRole="admin"
 *   onMemberUnbanned={(member) => console.log('Unbanned:', member)}
 * />
 */
export function BannedMembersList({
  groupId,
  currentUserRole,
  className,
  onMemberUnbanned,
}: BannedMembersListProps) {
  const [bannedMembers, setBannedMembers] = useState<GroupMemberData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [memberToUnban, setMemberToUnban] = useState<GroupMemberData | null>(null);
  const [unbanState, setUnbanState] = useState<ActionState>('idle');

  // Check if user has moderation permissions
  const canModerate = ['moderator', 'admin', 'owner'].includes(currentUserRole);

  /**
   * Fetch banned members
   */
  const fetchBannedMembers = useCallback(async () => {
    if (!canModerate) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get(
        `/api/groups/${groupId}/members?status=banned&limit=100`
      );

      if (response.data.success) {
        const members = response.data.data.members || [];
        setBannedMembers(members.filter((m: GroupMemberData) => m.status === 'banned'));
      }
    } catch (err: unknown) {
      console.error('Error fetching banned members:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load banned members';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, canModerate]);

  useEffect(() => {
    fetchBannedMembers();
  }, [fetchBannedMembers]);

  /**
   * Handle unban member
   */
  const handleUnban = useCallback(async () => {
    if (!memberToUnban) return;

    setUnbanState('loading');
    setActionStates(prev => ({ ...prev, [memberToUnban._id]: 'loading' }));

    try {
      const response = await apiClient.post(`/groups/${groupId}/members/unban`, {
        userId: memberToUnban.userId,
      });

      if (response.data.success) {
        setUnbanState('success');
        setActionStates(prev => ({ ...prev, [memberToUnban._id]: 'success' }));
        
        // Remove from list
        setBannedMembers(prev => prev.filter(m => m._id !== memberToUnban._id));
        
        if (onMemberUnbanned) {
          onMemberUnbanned({ ...memberToUnban, status: 'active' });
        }

        setMemberToUnban(null);
      }
    } catch (err: unknown) {
      console.error('Error unbanning member:', err);
      setUnbanState('error');
      setActionStates(prev => ({ ...prev, [memberToUnban._id]: 'error' }));
    }
  }, [groupId, memberToUnban, onMemberUnbanned]);

  /**
   * Filter and sort members
   */
  const filteredMembers = useMemo(() => {
    let result = [...bannedMembers];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (member) =>
          member.user?.fullName?.toLowerCase().includes(query) ||
          member.banReason?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => {
          const dateA = a.bannedAt ? new Date(a.bannedAt).getTime() : 0;
          const dateB = b.bannedAt ? new Date(b.bannedAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          const dateA = a.bannedAt ? new Date(a.bannedAt).getTime() : 0;
          const dateB = b.bannedAt ? new Date(b.bannedAt).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'name':
        result.sort((a, b) => {
          const nameA = a.user?.fullName || '';
          const nameB = b.user?.fullName || '';
          return nameA.localeCompare(nameB);
        });
        break;
    }

    return result;
  }, [bannedMembers, searchQuery, sortBy]);

  // Don't show if user can't moderate
  if (!canModerate) {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconUserOff className="w-5 h-5" />
            Banned Members
            {bannedMembers.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {bannedMembers.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBannedMembers}
            disabled={isLoading}
          >
            <IconRefresh className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-4">
            <IconAlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchBannedMembers} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Search and Filter Bar */}
        {bannedMembers.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <IconX className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-full sm:w-40">
                <IconFilter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <IconLoader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Loading banned members...
            </p>
          </div>
        ) : bannedMembers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <IconUser className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              No Banned Members
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              No users have been banned from this group
            </p>
          </div>
        ) : filteredMembers.length === 0 ? (
          /* No Results State */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <IconSearch className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              No Results Found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              No banned members match your search
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="mt-2">
              Clear Search
            </Button>
          </div>
        ) : (
          /* Members List */
          <div className="space-y-3">
            {/* Results count */}
            {searchQuery && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredMembers.length} of {bannedMembers.length} banned members
              </p>
            )}

            {filteredMembers.map((member) => (
              <BannedMemberCard
                key={member._id}
                member={member}
                onUnban={() => setMemberToUnban(member)}
                isLoading={actionStates[member._id] === 'loading'}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Unban Confirmation Dialog */}
      <AlertDialog
        open={memberToUnban !== null}
        onOpenChange={(open) => !open && setMemberToUnban(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconUserPlus className="w-5 h-5 text-green-500" />
              Unban Member?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unban{' '}
              <span className="font-medium">
                {memberToUnban?.user?.fullName || 'this user'}
              </span>
              ? They will be able to rejoin and participate in the group again.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {memberToUnban?.banReason && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Original ban reason:
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {memberToUnban.banReason}
              </p>
              {memberToUnban.bannedAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Banned on {formatDate(memberToUnban.bannedAt)}
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToUnban(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnban}
              disabled={unbanState === 'loading'}
              className="bg-green-600 hover:bg-green-700"
            >
              {unbanState === 'loading' ? (
                <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <IconUserPlus className="w-4 h-4 mr-2" />
              )}
              Unban Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default BannedMembersList;
