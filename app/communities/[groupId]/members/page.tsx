'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconUserPlus,
  IconShieldCheck,
  IconLoader2,
  IconMoodSad,
  IconCheck,
  IconX,
  IconClock,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MobileBottomNav, PageHeader } from '@/components/common';
import { MembersList, InviteMemberModal, ManageMemberModal } from '@/components/groups/members';
import { useGroup, useGroupModeration } from '@/hooks';
import { MemberRole, GroupMemberData } from '@/types/group';

// ============================================
// Types
// ============================================

interface JoinRequest {
  _id: string;
  userId: string;
  user?: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  requestedAt: string;
  message?: string;
}

// ============================================
// Loading Skeleton
// ============================================

function MembersPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="border-b border-border p-4 sticky top-0 bg-background z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="space-y-1">
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Search skeleton */}
        <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4" />

        {/* Member cards skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

// ============================================
// Error State
// ============================================

function ErrorState({ groupId: _groupId }: { groupId: string }) {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <PageHeader showBackButton title="Community Not Found" />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <IconMoodSad className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Community Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            The community you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/communities">
            <Button>Browse Communities</Button>
          </Link>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

// ============================================
// Pending Join Requests Section
// ============================================

interface PendingRequestsProps {
  requests: JoinRequest[];
  isLoading: boolean;
  onApprove: (userId: string) => Promise<boolean>;
  onReject: (userId: string) => Promise<boolean>;
}

function PendingRequestsSection({ requests, isLoading, onApprove, onReject }: PendingRequestsProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    await onApprove(userId);
    setProcessingId(null);
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    await onReject(userId);
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IconClock className="w-4 h-4 text-amber-600" />
          Pending Join Requests
          <Badge variant="secondary" className="ml-auto">
            {requests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => (
          <div
            key={request._id}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <img
              src={request.user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.user?.fullName || 'User')}&background=16a34a&color=fff&size=40`}
              alt={request.user?.fullName || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {request.user?.fullName || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Requested {new Date(request.requestedAt).toLocaleDateString()}
              </p>
              {request.message && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  &ldquo;{request.message}&rdquo;
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(request.userId)}
                disabled={processingId === request.userId}
                className="h-8 px-2"
              >
                {processingId === request.userId ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconX className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove(request.userId)}
                disabled={processingId === request.userId}
                className="h-8 px-2"
              >
                {processingId === request.userId ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconCheck className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Manage Admins Section
// ============================================

interface ManageAdminsProps {
  groupId: string;
  admins: GroupMemberData[];
  onChangeRole: (member: GroupMemberData) => void;
}

function _ManageAdminsSection({ groupId: _groupId, admins, onChangeRole }: ManageAdminsProps) {
  if (admins.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IconShieldCheck className="w-4 h-4 text-blue-600" />
          Admins & Moderators
          <Badge variant="secondary" className="ml-auto">
            {admins.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {admins.map((admin) => (
          <div
            key={admin._id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <img
              src={admin.user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.user?.fullName || 'User')}&background=16a34a&color=fff&size=40`}
              alt={admin.user?.fullName || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {admin.user?.fullName || 'Unknown User'}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  admin.role === 'owner' && 'border-amber-500 text-amber-600',
                  admin.role === 'admin' && 'border-blue-500 text-blue-600',
                  admin.role === 'moderator' && 'border-purple-500 text-purple-600'
                )}
              >
                {admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}
              </Badge>
            </div>
            {admin.role !== 'owner' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChangeRole(admin)}
                className="h-8"
              >
                Manage
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function GroupMembersPage() {
  const params = useParams();
  const router = useRouter();

  const groupId = params.groupId as string;

  // Auth state
  const [_isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMemberData | null>(null);

  // Check authentication
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    setIsAuthenticated(!!phone);
    setIsCheckingAuth(false);

    if (phone) {
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
    refresh: refreshGroup,
  } = useGroup(groupId, { autoFetch: true });

  // Moderation hook for pending requests
  const {
    pendingJoinRequests,
    loadingRequests,
    loadJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    isModerator: _isModerator,
  } = useGroupModeration(groupId, { autoFetch: false });

  // Determine user role
  const userRole: MemberRole | undefined = membership.isMember ? (membership.role || 'member') : undefined;
  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const _isOwner = userRole === 'owner';

  // Load join requests for private groups (admins only)
  useEffect(() => {
    if (isAdmin && group?.privacy === 'private') {
      loadJoinRequests();
    }
  }, [isAdmin, group?.privacy, loadJoinRequests]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push(`/communities/${groupId}`);
  }, [groupId, router]);

  // Handle change role
  const handleChangeRole = useCallback((member: GroupMemberData) => {
    setSelectedMember(member);
  }, []);

  // Handle remove member
  const handleRemove = useCallback(async (member: GroupMemberData) => {
    // TODO: Implement remove with confirmation
    console.log('Remove member:', member);
  }, []);

  // Handle ban member
  const handleBan = useCallback(async (member: GroupMemberData) => {
    // TODO: Implement ban with confirmation
    console.log('Ban member:', member);
  }, []);

  // Handle approve join request
  const handleApproveRequest = useCallback(async (userId: string) => {
    return await approveJoinRequest(userId);
  }, [approveJoinRequest]);

  // Handle reject join request
  const handleRejectRequest = useCallback(async (userId: string) => {
    return await rejectJoinRequest(userId);
  }, [rejectJoinRequest]);

  // Get admins from group
  const _adminMembers: GroupMemberData[] = [];
  // Note: We'll need to fetch this from the members list with role filter

  // Loading state
  if (isCheckingAuth || groupLoading) {
    return <MembersPageSkeleton />;
  }

  // Error state - group not found
  if (groupError || !group) {
    return <ErrorState groupId={groupId} />;
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <PageHeader
        showBackButton
        onBack={handleBack}
        title="Members"
        rightAction={
          isAdmin ? (
            <Button
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="gap-2"
            >
              <IconUserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          ) : undefined
        }
      />

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Pending Join Requests (for private groups, admins only) */}
        {isAdmin && group.privacy === 'private' && (
          <PendingRequestsSection
            requests={pendingJoinRequests}
            isLoading={loadingRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
          />
        )}

        {/* Members List */}
        <MembersList
          groupId={groupId}
          currentUserRole={userRole}
          currentUserId={currentUserId || undefined}
          onChangeRole={handleChangeRole}
          onRemove={handleRemove}
          onBan={handleBan}
        />
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          groupId={groupId}
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          currentUserRole={userRole || 'member'}
          groupName={group.name}
          onInviteSent={() => {
            setShowInviteModal(false);
            // Show success toast
          }}
        />
      )}

      {/* Manage Member Modal */}
      {selectedMember && (
        <ManageMemberModal
          groupId={groupId}
          member={selectedMember}
          currentUserRole={userRole || 'member'}
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          action="change-role"
          onMemberUpdated={() => {
            setSelectedMember(null);
            refreshGroup();
          }}
          onMemberRemoved={() => {
            setSelectedMember(null);
            refreshGroup();
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
