'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

/**
 * Loading skeleton for Crop AI page
 * Matches the layout of UploadSection and HistorySection
 */
export default function CropAILoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Skeleton */}
      <header className="border-b border-border p-4 sticky top-0 bg-background z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Left - Logo and badge */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          {/* Right - History button */}
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
          {/* Upload Section Skeleton */}
          <Card className="p-6">
            <div className="space-y-6">
              {/* Title */}
              <div className="text-center space-y-2">
                <Skeleton className="h-7 w-48 mx-auto" />
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>

              {/* Upload Area Skeleton */}
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8">
                <div className="flex flex-col items-center gap-4">
                  {/* Upload icon */}
                  <Skeleton className="h-16 w-16 rounded-full" />
                  {/* Text */}
                  <div className="space-y-2 text-center">
                    <Skeleton className="h-5 w-40 mx-auto" />
                    <Skeleton className="h-4 w-56 mx-auto" />
                  </div>
                  {/* Upload button */}
                  <Skeleton className="h-10 w-32 rounded-md" />
                </div>
              </div>

              {/* Add Details Toggle Skeleton */}
              <div className="flex items-center justify-center">
                <Skeleton className="h-9 w-32" />
              </div>

              {/* Analyze Button Skeleton */}
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </Card>

          {/* History Section Skeleton */}
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-16" />
            </div>

            {/* History Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <HistoryCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* FAB Skeleton */}
      <Skeleton className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-28 md:h-12 rounded-full md:rounded-lg" />

      {/* Mobile Bottom Nav Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden border-t border-border bg-background p-2">
        <div className="flex items-center justify-around">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for individual history cards
 */
function HistoryCardSkeleton() {
  return (
    <Card className="p-3 space-y-3">
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-full rounded-lg" />
      
      {/* Content */}
      <div className="space-y-2">
        {/* Crop type and health */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        
        {/* Disease/issues count */}
        <Skeleton className="h-4 w-32" />
        
        {/* Date */}
        <Skeleton className="h-3 w-24" />
      </div>
    </Card>
  );
}
