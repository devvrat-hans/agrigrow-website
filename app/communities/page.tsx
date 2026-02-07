'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconPlus, IconLogin } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { MobileBottomNav, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  GroupCategoryTabs,
  GroupSearchBar,
  GroupsGrid,
  RecommendedGroups,
  PopularGroups,
} from '@/components/groups/discovery';
import { useGroups, useGroupDiscovery } from '@/hooks';
import { GroupType } from '@/types/group';

// ============================================
// Types
// ============================================

type CategoryType = 'all' | GroupType;

// ============================================
// FloatingActionButton Component
// ============================================

interface FloatingActionButtonProps {
  onClick?: () => void;
  className?: string;
}

function _FloatingActionButton({ onClick, className }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-50',
        'min-w-[56px] min-h-[56px] rounded-full',
        'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 active:scale-[0.9]',
        'text-white shadow-lg hover:shadow-xl',
        'flex items-center justify-center',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        className
      )}
      aria-label="Create Community"
    >
      <IconPlus className="w-6 h-6" />
    </button>
  );
}

// ============================================
// Login Prompt Component
// ============================================

interface LoginPromptProps {
  className?: string;
}

function LoginPrompt({ className }: LoginPromptProps) {
  return (
    <div className={cn(
      'bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-950/50 dark:to-emerald-950/50',
      'border border-primary-200 dark:border-primary-800',
      'rounded-xl p-3 sm:p-4 md:p-6',
      className
    )}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Join the Agrigrow Community
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sign in to join communities, connect with farmers, and share knowledge.
          </p>
        </div>
        <Link href="/auth/signin">
          <Button className="gap-2 whitespace-nowrap">
            <IconLogin className="w-4 h-4" />
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function CommunitiesPage() {
  const router = useRouter();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Join state
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  
  // Infinite scroll ref
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Check authentication
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    setIsAuthenticated(!!phone);
    setIsCheckingAuth(false);
  }, []);
  
  // Groups hook with filtering
  const {
    groups,
    loading: groupsLoading,
    hasMore,
    fetchMore,
    search,
    setFilters,
    refresh: refreshGroups,
    error: groupsError,
    pagination: _pagination,
  } = useGroups({
    initialFilters: {
      groupType: selectedCategory === 'all' ? null : selectedCategory,
      sortBy: 'popular',
    },
    autoFetch: true,
    limit: 12,
  });
  
  // Initial loading state for skeletons
  const showInitialLoading = isCheckingAuth || (groupsLoading && groups.length === 0 && !groupsError);
  
  // Discovery hook for recommended and popular
  const {
    recommendedGroups,
    popularGroups,
    loadingRecommended,
    loadingPopular,
    refreshRecommendations,
    refreshPopular,
  } = useGroupDiscovery({
    autoFetch: true,
    limit: 6,
  });
  
  // Handle category change
  const handleCategoryChange = useCallback((category: CategoryType) => {
    setSelectedCategory(category);
    setFilters({
      groupType: category === 'all' ? null : category,
    });
  }, [setFilters]);
  
  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    search(query);
  }, [search]);
  
  // Handle join - use membership hook
  const handleJoin = useCallback(async (groupId: string) => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }
    
    setJoiningGroupId(groupId);
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': localStorage.getItem('userPhone') || '',
        },
      });
      
      if (response.ok) {
        // Refresh data after join
        refreshGroups();
        refreshRecommendations();
        refreshPopular();
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    } finally {
      setJoiningGroupId(null);
    }
  }, [isAuthenticated, router, refreshGroups, refreshRecommendations, refreshPopular]);
  
  // Handle create group
  const _handleCreateGroup = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }
    router.push('/communities/create');
  }, [isAuthenticated, router]);
  
  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !groupsLoading) {
          fetchMore();
        }
      },
      { threshold: 0.1 }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasMore, groupsLoading, fetchMore]);
  
  // Determine if we should show the recommended section
  const showRecommended = isAuthenticated && recommendedGroups.length > 0;
  
  // Determine if we should show the popular section
  const showPopular = popularGroups.length > 0 && !searchQuery;
  
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      {/* Header */}
      <PageHeader
        title="Communities"
        rightAction={
          isAuthenticated ? (
            <Link href="/communities/create">
              <Button variant="outline" size="sm" className="gap-2">
                <IconPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </Link>
          ) : null
        }
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 space-y-4 sm:space-y-6">
        {/* Search Bar */}
        <GroupSearchBar
          value={searchQuery}
          onSearch={handleSearch}
          placeholder="Search communities..."
          isLoading={groupsLoading && !groupsError}
        />
        
        {/* Category Tabs */}
        <GroupCategoryTabs
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategoryChange}
        />
        
        {/* Login Prompt for unauthenticated users */}
        {!isAuthenticated && !isCheckingAuth && (
          <LoginPrompt />
        )}
        
        {/* Recommended Groups Section (authenticated only, no search active) */}
        {showRecommended && !searchQuery && (
          <RecommendedGroups
            groups={recommendedGroups}
            isLoading={loadingRecommended}
            onJoin={handleJoin}
            joiningGroupId={joiningGroupId}
            seeAllLink="/communities?sort=recommended"
          />
        )}
        
        {/* Popular Groups Section (no search active) */}
        {showPopular && (
          <PopularGroups
            groups={popularGroups}
            isLoading={loadingPopular}
            onJoin={handleJoin}
            joiningGroupId={joiningGroupId}
            seeAllLink="/communities?sort=popular"
            title="Trending Communities"
            icon="flame"
          />
        )}
        
        {/* All Groups Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {searchQuery 
                ? `Search Results for "${searchQuery}"` 
                : selectedCategory === 'all' 
                  ? 'All Communities' 
                  : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Communities`
              }
            </h2>
            {groups.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {groups.length} {groups.length === 1 ? 'community' : 'communities'}
              </span>
            )}
          </div>
          
          <GroupsGrid
            groups={groups}
            isLoading={showInitialLoading || (groupsLoading && groups.length === 0 && !groupsError)}
            onJoin={handleJoin}
            joiningGroupId={joiningGroupId}
            variant="full"
            emptyMessage={
              groupsError
                ? 'Unable to load communities'
                : searchQuery 
                  ? 'No communities found' 
                  : selectedCategory === 'all'
                    ? 'No communities available'
                    : `No ${selectedCategory} communities found`
            }
            emptyDescription={
              groupsError
                ? 'Please check your internet connection and try again.'
                : searchQuery
                  ? 'Try a different search term or browse all communities.'
                  : 'Be the first to create a community in this category!'
            }
          />
          
          {/* Load More Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {groupsLoading && groups.length > 0 && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading more...</span>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
