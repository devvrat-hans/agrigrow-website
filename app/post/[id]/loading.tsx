import { IconLoader2 } from '@tabler/icons-react';

/**
 * Loading state for the post detail page
 * Shown by Next.js while the page component loads
 */
export default function PostDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="w-12 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </header>

      {/* Content loading */}
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <IconLoader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading post...</p>
      </div>
    </div>
  );
}
