'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  IconLock,
  IconMail,
  IconArrowLeft,
  IconAlertTriangle,
  IconMoodSad,
  IconShare,
  IconSettings,
  IconUserPlus,
  IconMessageCircle,
  IconLoader2,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { MobileBottomNav } from '@/components/common';
import { GroupHeader, GroupTabs, GroupAbout } from '@/components/groups/detail';
import { GroupPostList, GroupPostComposer } from '@/components/groups/posts';
import { MembersList } from '@/components/groups/members';
import { useGroup } from '@/hooks';
import { MemberRole, GroupMemberData } from '@/types/group';

// ============================================
// Types
// ============================================

type TabType = 'posts' | 'about' | 'members';

// ============================================
// Loading Skeleton
// ============================================

function GroupPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      {/* Header skeleton */}
      <div className="border-b border-border p-3 sm:p-4 sticky top-0 bg-background z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-5 sm:h-6 w-32 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Banner skeleton */}
      <div className="h-24 sm:h-32 md:h-40 bg-gray-200 dark:bg-gray-700 animate-pulse" />

      {/* Content skeleton */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 -mt-8 sm:-mt-10 md:-mt-12 relative z-10">
        <div className="flex items-end gap-3 sm:gap-4 mb-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-gray-900 animate-pulse" />
          <div className="flex-1 space-y-2 pb-2">
            <div className="h-5 sm:h-6 w-32 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-3 sm:gap-4 border-b border-border py-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 sm:h-8 w-16 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>

        {/* Posts skeleton */}
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-2 sm:h-3 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 sm:h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 sm:h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

// ============================================
// Error State
// ============================================

interface ErrorStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

function ErrorState({ title, message, icon, action }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      <header className="border-b border-border p-4 sticky top-0 bg-background z-40">
        <div className="max-w-4xl mx-auto">
          <Link href="/communities" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            <IconArrowLeft className="w-5 h-5" />
            <span>Back to Communities</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {icon || <IconMoodSad className="w-8 h-8 text-gray-400" />}
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            {message}
          </p>
          {action}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

// ============================================
// Access Denied State
// ============================================

interface AccessDeniedProps {
  privacy: 'private' | 'invite-only';
  groupName?: string;
  onRequestJoin?: () => void;
  isRequesting?: boolean;
}

function AccessDenied({ privacy, groupName, onRequestJoin, isRequesting }: AccessDeniedProps) {
  const isPrivate = privacy === 'private';

  return (
    <ErrorState
      title={isPrivate ? 'This is a Private Community' : 'Invite Only Community'}
      message={
        isPrivate
          ? `${groupName || 'This community'} is private. Request to join to see posts and interact with members.`
          : `${groupName || 'This community'} is invite-only. You need an invitation link to join.`
      }
      icon={isPrivate ? <IconLock className="w-8 h-8 text-gray-400" /> : <IconMail className="w-8 h-8 text-gray-400" />}
      action={
        isPrivate && onRequestJoin ? (
          <Button onClick={onRequestJoin} disabled={isRequesting} className="gap-2">
            {isRequesting ? (
              <>
                <IconLoader2 className="w-4 h-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <IconUserPlus className="w-4 h-4" />
                Request to Join
              </>
            )}
          </Button>
        ) : (
          <Link href="/communities">
            <Button variant="outline">Browse Other Communities</Button>
          </Link>
        )
      }
    />
  );
}

// ============================================
// Join Prompt Banner
// ============================================

interface JoinPromptBannerProps {
  groupName: string;
  isPrivate: boolean;
  onJoin: () => void;
  isJoining: boolean;
  isPending?: boolean;
}

function JoinPromptBanner({ groupName, isPrivate, onJoin, isJoining, isPending }: JoinPromptBannerProps) {
  if (isPending) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <IconAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Your join request is pending approval
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              An admin will review your request soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-950/50 dark:to-emerald-950/50 border border-primary-200 dark:border-primary-800 rounded-xl p-4 mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {isPrivate ? 'Request to join' : 'Join'} {groupName}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isPrivate
              ? 'Your request will be reviewed by an admin.'
              : 'Become a member to post and interact.'}
          </p>
        </div>
        <Button onClick={onJoin} disabled={isJoining} className="gap-2 whitespace-nowrap">
          {isJoining ? (
            <>
              <IconLoader2 className="w-4 h-4 animate-spin" />
              {isPrivate ? 'Requesting...' : 'Joining...'}
            </>
          ) : (
            <>
              <IconUserPlus className="w-4 h-4" />
              {isPrivate ? 'Request to Join' : 'Join Community'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Mobile Bottom Action Bar
// ============================================

interface MobileActionBarProps {
  isMember: boolean;
  isAdmin: boolean;
  groupId: string;
  onShare: () => void;
  onSettings: () => void;
}

function MobileActionBar({ isMember, isAdmin, groupId, onShare, onSettings }: MobileActionBarProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3 md:hidden z-40">
      <div className="flex items-center justify-around gap-2">
        <button
          onClick={onShare}
          className="flex-1 flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400 hover:text-primary-600"
        >
          <IconShare className="w-5 h-5" />
          <span className="text-xs">Share</span>
        </button>

        {isMember && (
          <Link
            href={`/communities/${groupId}?tab=posts#compose`}
            className="flex-1 flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400 hover:text-primary-600"
          >
            <IconMessageCircle className="w-5 h-5" />
            <span className="text-xs">Post</span>
          </Link>
        )}

        {isAdmin && (
          <button
            onClick={onSettings}
            className="flex-1 flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400 hover:text-primary-600"
          >
            <IconSettings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const groupId = params.groupId as string;
  const activeTab = (searchParams.get('tab') as TabType) || 'posts';

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    setIsAuthenticated(!!phone);
    setIsCheckingAuth(false);

    if (phone) {
      // Fetch user ID
      fetch(`/api/user/me?phone=${phone}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCurrentUserId(data.user.id);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Group data hook
  const {
    group,
    membership,
    loading: groupLoading,
    error: groupError,
    isJoining,
    join,
    leave,
    refresh: refreshGroup,
  } = useGroup(groupId, { autoFetch: true });

  // Determine user role
  const userRole: MemberRole | undefined = membership.isMember ? (membership.role || 'member') : undefined;
  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const _isModerator = isAdmin || userRole === 'moderator';
  const isMember = membership.isMember;

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: string) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('tab', tabId);
      router.push(`/communities/${groupId}?${newParams.toString()}`, { scroll: false });
    },
    [groupId, router, searchParams]
  );

  // Handle join
  const handleJoin = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }
    await join();
  }, [isAuthenticated, router, join]);

  // Handle leave
  const handleLeave = useCallback(async () => {
    await leave();
  }, [leave]);

  // Handle share
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: group?.name || 'Community',
        text: group?.description || 'Check out this community on Agrigrow!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast
    }
  }, [group]);

  // Handle settings
  const handleSettings = useCallback(() => {
    router.push(`/communities/${groupId}/settings`);
  }, [groupId, router]);

  // Loading state
  if (isCheckingAuth || groupLoading) {
    return <GroupPageSkeleton />;
  }

  // Error state - group not found
  if (groupError || !group) {
    return (
      <ErrorState
        title="Community Not Found"
        message="The community you're looking for doesn't exist or has been removed."
        icon={<IconMoodSad className="w-8 h-8 text-gray-400" />}
        action={
          <Link href="/communities">
            <Button>Browse Communities</Button>
          </Link>
        }
      />
    );
  }

  // Access control for invite-only groups
  if (group.privacy === 'invite-only' && !isMember) {
    return (
      <AccessDenied
        privacy="invite-only"
        groupName={group.name}
      />
    );
  }

  // Show limited view for private groups (can still see header and request to join)
  const showLimitedView = group.privacy === 'private' && !isMember && !membership.isPending;

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      {/* Minimal header with back button */}
      <header className="border-b border-border p-4 sticky top-0 bg-background/95 backdrop-blur z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/communities')}
              className="min-w-[44px] min-h-[44px] -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.95] transition-all flex items-center justify-center"
              aria-label="Back to Communities"
            >
              <IconArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">
              {group.name}
            </h1>
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-2">
              <IconShare className="w-4 h-4" />
              Share
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={handleSettings} className="gap-2">
                <IconSettings className="w-4 h-4" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Group Header */}
      <GroupHeader
        group={group}
        membership={isMember ? ({ role: userRole, status: 'active' } as GroupMemberData) : null}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onSettings={handleSettings}
        onShare={handleShare}
        isJoining={isJoining}
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
        {/* Join prompt for non-members of public/private groups */}
        {!isMember && group.privacy !== 'invite-only' && (
          <JoinPromptBanner
            groupName={group.name}
            isPrivate={group.privacy === 'private'}
            onJoin={handleJoin}
            isJoining={isJoining}
            isPending={membership.isPending}
          />
        )}

        {/* Tab Navigation */}
        <GroupTabs
          postCount={group.postCount}
          memberCount={group.memberCount}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          useUrlParams={false}
        />

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'posts' && (
            <>
              {/* Post composer for members */}
              {isMember && (
                <div id="compose" className="mb-4">
                  <GroupPostComposer
                    groupId={groupId}
                    onPostCreated={refreshGroup}
                  />
                </div>
              )}

              {/* Limited view for private groups */}
              {showLimitedView ? (
                <AccessDenied
                  privacy="private"
                  groupName={group.name}
                  onRequestJoin={handleJoin}
                  isRequesting={isJoining}
                />
              ) : (
                <GroupPostList
                  groupId={groupId}
                  currentUserId={currentUserId || undefined}
                  currentUserRole={userRole}
                />
              )}
            </>
          )}

          {activeTab === 'about' && (
            <GroupAbout
              group={group}
            />
          )}

          {activeTab === 'members' && (
            <>
              {showLimitedView ? (
                <AccessDenied
                  privacy="private"
                  groupName={group.name}
                  onRequestJoin={handleJoin}
                  isRequesting={isJoining}
                />
              ) : (
                <MembersList
                  groupId={groupId}
                  currentUserRole={userRole}
                  currentUserId={currentUserId || undefined}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Action Bar */}
      {isAuthenticated && (
        <MobileActionBar
          isMember={isMember}
          isAdmin={isAdmin}
          groupId={groupId}
          onShare={handleShare}
          onSettings={handleSettings}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
