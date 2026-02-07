'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconHome, IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { MobileBottomNav, PageHeader } from '@/components/common';
import { CreateGroupForm } from '@/components/groups/create';

// ============================================
// Breadcrumb Component
// ============================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <IconChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <IconHome className="w-4 h-4" />
                    <span className="sr-only sm:not-sr-only">{item.label}</span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function CreatePageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      <header className="border-b border-border p-4 sticky top-0 bg-background z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Step indicator skeleton */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                {i < 4 && <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 mx-2" />}
              </div>
            ))}
          </div>
          
          {/* Form skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mb-3" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}

// ============================================
// Login Redirect Component
// ============================================

function LoginRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Small delay for better UX
    const timer = setTimeout(() => {
      router.push('/auth/signin?redirect=/communities/create');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="text-center px-4">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to sign in...
        </p>
      </div>
      <MobileBottomNav />
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function CreateGroupPage() {
  const router = useRouter();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Check authentication
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      return;
    }
    setIsAuthenticated(true);
    setIsCheckingAuth(false);
  }, []);
  
  // Handle back navigation
  const handleBack = () => {
    router.back();
  };
  
  // Show loading state during auth check
  if (isCheckingAuth) {
    return <CreatePageSkeleton />;
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginRedirect />;
  }
  
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      {/* Header */}
      <PageHeader showBackButton onBack={handleBack} title="Create Community" />

      {/* Breadcrumb - hidden on mobile */}
      <div className="hidden sm:block max-w-2xl mx-auto px-3 sm:px-4 md:px-6 pt-2">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Communities', href: '/communities' },
            { label: 'Create Community' },
          ]}
        />
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <CreateGroupForm />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
