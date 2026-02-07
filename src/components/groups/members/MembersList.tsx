'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GroupMemberData, MemberRole } from '@/types/group';
import { MemberCard } from './MemberCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconSearch,
  IconFilter,
  IconLayoutGrid,
  IconLayoutList,
  IconLoader2,
  IconUsers,
  IconRefresh,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

interface MembersListProps {
  /** Group ID */
  groupId: string;
  /** Current user's role in the group */
  currentUserRole?: MemberRole;
  /** Current user's ID */
  currentUserId?: string;
  /** Callback when change role is clicked */
  onChangeRole?: (member: GroupMemberData) => void;
  /** Callback when remove member is clicked */
  onRemove?: (member: GroupMemberData) => void;
  /** Callback when ban member is clicked */
  onBan?: (member: GroupMemberData) => void;
  /** Callback when message is clicked */
  onMessage?: (member: GroupMemberData) => void;
  /** Callback when member card is clicked */
  onMemberClick?: (member: GroupMemberData) => void;
  /** Additional CSS classes */
  className?: string;
}

type RoleFilter = 'all' | MemberRole;
type ViewMode = 'list' | 'grid';

const MEMBERS_PER_PAGE = 20;

/**
 * MembersList Component
 * 
 * Paginated member list/grid with search filter and role filter dropdown.
 * Supports infinite scroll pagination and two display modes.
 * 
 * @example
 * <MembersList
 *   groupId="123"
 *   currentUserRole="admin"
 *   onChangeRole={(m) => openChangeRoleModal(m)}
 * />
 */
export function MembersList({
  groupId,
  currentUserRole = 'member',
  currentUserId,
  onChangeRole,
  onRemove,
  onBan,
  onMessage,
  onMemberClick,
  className,
}: MembersListProps) {
  // State
  const [members, setMembers] = useState<GroupMemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch members from API
   */
  const fetchMembers = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: MEMBERS_PER_PAGE.toString(),
        });

        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }

        if (roleFilter !== 'all') {
          params.set('role', roleFilter);
        }

        const response = await apiClient.get<{ success: boolean; data: GroupMemberData[]; pagination?: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasMore?: boolean } }>(
          `/groups/${groupId}/members?${params.toString()}`
        );

        if (response.data.success) {
          const newMembers = response.data.data;
          const pagination = response.data.pagination;

          if (append) {
            setMembers((prev) => [...prev, ...(Array.isArray(newMembers) ? newMembers : [])]);
          } else {
            setMembers(Array.isArray(newMembers) ? newMembers : []);
          }

          setHasMore(pagination?.hasNextPage ?? false);
          setTotal(pagination?.total ?? 0);
          setPage(pageNum);
        }
      } catch (err: unknown) {
        console.error('Error fetching members:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load members. Please try again.'
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [groupId, searchQuery, roleFilter]
  );

  /**
   * Initial load and filter changes
   */
  useEffect(() => {
    fetchMembers(1);
  }, [roleFilter]); // Don't include searchQuery here, we handle it with debounce

  /**
   * Debounced search
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchMembers(1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchMembers]);

  /**
   * Infinite scroll observer
   */
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchMembers(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, page, fetchMembers]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setSearchQuery('');
    setRoleFilter('all');
    fetchMembers(1);
  };

  /**
   * Remove member from local state (after API success)
   */
  const handleMemberRemoved = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m._id !== memberId));
    setTotal((prev) => prev - 1);
  };

  /**
   * Update member in local state (after role change)
   */
  const handleMemberUpdated = (updatedMember: GroupMemberData) => {
    setMembers((prev) =>
      prev.map((m) => (m._id === updatedMember._id ? updatedMember : m))
    );
  };

  // Expose methods via ref or callbacks for parent to use
  // This allows parent components to update the list after mutations
  React.useEffect(() => {
    // Store update functions in a way parent can access if needed
    (window as unknown as Record<string, unknown>).__membersListMethods = {
      handleMemberRemoved,
      handleMemberUpdated,
      refresh: () => fetchMembers(1),
    };

    return () => {
      delete (window as unknown as Record<string, unknown>).__membersListMethods;
    };
  }, [fetchMembers]);

  // Loading skeleton
  const renderSkeleton = () => (
    <div className={cn(
      viewMode === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'
        : 'space-y-3 sm:space-y-4'
    )}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800',
            viewMode === 'grid' ? 'h-40 sm:h-48 p-3 sm:p-4' : 'h-16 sm:h-20 p-3 sm:p-4'
          )}
        >
          {/* Skeleton content structure */}
          <div className="flex items-start gap-2 sm:gap-3 h-full">
            {/* Avatar skeleton */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-2 sm:h-3 w-16 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-2 sm:h-3 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Error state
  if (error && !loading) {
    return (
      <div className={cn('p-4 sm:p-6 text-center', className)}>
        <div className="text-sm sm:text-base text-red-500 dark:text-red-400 mb-3 sm:mb-4">{error}</div>
        <Button variant="outline" onClick={() => fetchMembers(1)} className="min-h-[44px] active:scale-[0.95]">
          <IconRefresh className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>

        {/* Role Filter */}
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as RoleFilter)}
        >
          <SelectTrigger className="w-full sm:w-40 min-h-[44px]">
            <IconFilter className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owners</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="moderator">Moderators</SelectItem>
            <SelectItem value="member">Members</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-10 sm:h-11 px-3 rounded-r-none min-h-[44px] active:scale-[0.95]"
            onClick={() => setViewMode('list')}
          >
            <IconLayoutList className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-10 sm:h-11 px-3 rounded-l-none min-h-[44px] active:scale-[0.95]"
            onClick={() => setViewMode('grid')}
          >
            <IconLayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          className="h-10 sm:h-11 min-h-[44px] min-w-[44px] active:scale-[0.95]"
          onClick={handleRefresh}
        >
          <IconRefresh className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Member Count */}
      {!loading && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
          <span className="flex items-center gap-1 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            <IconUsers className="h-4 w-4 sm:h-5 sm:w-5" />
            {total} {total === 1 ? 'member' : 'members'}
            {(searchQuery || roleFilter !== 'all') && <span className="text-sm font-normal text-gray-500"> found</span>}
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && renderSkeleton()}

      {/* Empty State */}
      {!loading && members.length === 0 && (
        <div className="py-8 sm:py-12 text-center px-4">
          <IconUsers className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-300 dark:text-gray-600 mb-2 sm:mb-3" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1">
            {searchQuery || roleFilter !== 'all'
              ? 'No members found'
              : 'No members yet'}
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            {searchQuery || roleFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Be the first to join this group!'}
          </p>
          {(searchQuery || roleFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 sm:mt-4 min-h-[40px] active:scale-[0.95]"
              onClick={handleRefresh}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Members Grid/List */}
      {!loading && members.length > 0 && (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'
              : 'space-y-3 sm:space-y-4'
          )}
        >
          {members.map((member) => (
            <MemberCard
              key={member._id}
              member={member}
              variant={viewMode}
              currentUserRole={currentUserRole}
              isCurrentUser={member.userId === currentUserId}
              onChangeRole={onChangeRole}
              onRemove={onRemove}
              onBan={onBan}
              onMessage={onMessage}
              onClick={onMemberClick}
            />
          ))}
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && !loading && members.length > 0 && (
        <div
          ref={loadMoreRef}
          className="py-4 flex justify-center"
        >
          {loadingMore && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <IconLoader2 className="h-4 w-4 animate-spin" />
              Loading more...
            </div>
          )}
        </div>
      )}

      {/* End of List */}
      {!hasMore && members.length > 0 && (
        <div className="py-3 sm:py-4 text-center text-xs sm:text-sm text-gray-400 dark:text-gray-500">
          Showing all {total} members
        </div>
      )}
    </div>
  );
}

export default MembersList;
