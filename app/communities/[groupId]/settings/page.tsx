'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconSettings,
  IconLock,
  IconListDetails,
  IconAlertTriangle,
  IconCheck,
  IconMoodSad,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MobileBottomNav, PageHeader } from '@/components/common';
import {
  GroupSettingsForm,
  GroupPrivacySettings,
  GroupRulesEditor,
  GroupDangerZone,
} from '@/components/groups/settings';
import { useGroup } from '@/hooks';
import { MemberRole, GroupData } from '@/types/group';

// ============================================
// Types
// ============================================

type SettingsTab = 'general' | 'privacy' | 'rules' | 'danger';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'general', label: 'General', icon: <IconSettings className="w-4 h-4" /> },
  { id: 'privacy', label: 'Privacy', icon: <IconLock className="w-4 h-4" /> },
  { id: 'rules', label: 'Rules', icon: <IconListDetails className="w-4 h-4" /> },
  { id: 'danger', label: 'Danger Zone', icon: <IconAlertTriangle className="w-4 h-4" />, ownerOnly: true },
];

// ============================================
// Loading Skeleton
// ============================================

function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="border-b border-border p-4 sticky top-0 bg-background z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Tab skeleton */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

// ============================================
// Unauthorized State
// ============================================

interface UnauthorizedStateProps {
  groupId: string;
}

function UnauthorizedState({ groupId }: UnauthorizedStateProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/communities/${groupId}`);
    }, 2000);
    return () => clearTimeout(timer);
  }, [groupId, router]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <PageHeader showBackButton title="Access Denied" />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <IconAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-4">
            You don&apos;t have permission to access these settings. Only admins and owners can manage community settings.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Redirecting to community page...
          </p>
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
// Save Toast
// ============================================

interface SaveToastProps {
  show: boolean;
  onClose: () => void;
}

function SaveToast({ show, onClose }: SaveToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 md:bottom-6">
      <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg">
        <IconCheck className="w-4 h-4" />
        <span className="text-sm font-medium">Settings saved</span>
      </div>
    </div>
  );
}

// ============================================
// Tab Button
// ============================================

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
        isActive
          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
        tab.id === 'danger' && !isActive && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      )}
    >
      {tab.icon}
      {tab.label}
    </button>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();

  const groupId = params.groupId as string;

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Save toast state
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Check authentication
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    setIsAuthenticated(!!phone);
    setIsCheckingAuth(false);
  }, []);

  // Group data hook
  const {
    group,
    membership,
    loading: groupLoading,
    error: groupError,
    refresh: refreshGroup,
  } = useGroup(groupId, { autoFetch: true });

  // Determine user role
  const userRole: MemberRole | undefined = membership.isMember ? (membership.role || 'member') : undefined;
  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const isOwner = userRole === 'owner';

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push(`/communities/${groupId}`);
  }, [groupId, router]);

  // Handle save success
  const handleSave = useCallback((_updatedGroup: GroupData) => {
    setShowSaveToast(true);
    refreshGroup();
  }, [refreshGroup]);

  // Handle error
  const handleError = useCallback((error: string) => {
    console.error('Settings error:', error);
    // TODO: Show error toast
  }, []);

  // Handle group deleted
  const handleGroupDeleted = useCallback(() => {
    router.push('/communities');
  }, [router]);

  // Handle ownership transferred
  const handleOwnershipTransferred = useCallback(() => {
    // Refresh to get new role
    refreshGroup();
    // Redirect away from danger zone
    setActiveTab('general');
  }, [refreshGroup]);

  // Filter tabs based on role
  const visibleTabs = TABS.filter(tab => !tab.ownerOnly || isOwner);

  // Loading state
  if (isCheckingAuth || groupLoading) {
    return <SettingsPageSkeleton />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    router.push(`/auth/signin?redirect=/communities/${groupId}/settings`);
    return <SettingsPageSkeleton />;
  }

  // Error state - group not found
  if (groupError || !group) {
    return <ErrorState groupId={groupId} />;
  }

  // Unauthorized - not admin/owner
  if (!isAdmin) {
    return <UnauthorizedState groupId={groupId} />;
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <PageHeader showBackButton onBack={handleBack} title="Community Settings" />

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {visibleTabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'general' && (
            <GroupSettingsForm
              group={group}
              onSave={handleSave}
              onError={handleError}
            />
          )}

          {activeTab === 'privacy' && (
            <GroupPrivacySettings
              group={group}
              onSave={handleSave}
              onError={handleError}
            />
          )}

          {activeTab === 'rules' && (
            <GroupRulesEditor
              group={group}
              onSave={handleSave}
              onError={handleError}
            />
          )}

          {activeTab === 'danger' && isOwner && (
            <GroupDangerZone
              group={group}
              userRole={userRole!}
              onOwnershipTransferred={handleOwnershipTransferred}
              onGroupDeleted={handleGroupDeleted}
              onError={handleError}
            />
          )}
        </div>
      </main>

      {/* Save Toast */}
      <SaveToast show={showSaveToast} onClose={() => setShowSaveToast(false)} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
