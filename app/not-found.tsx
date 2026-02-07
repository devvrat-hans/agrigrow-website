'use client';

import Link from 'next/link';
import { IconHome, IconArrowLeft, IconPlant2 } from '@tabler/icons-react';

/**
 * Custom 404 Page
 * 
 * Mobile-optimized, responsive 404 error page for the Agrigrow platform.
 * Features a clean, minimal design with agriculture-themed illustrations.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6">
      {/* Main Content */}
      <div className="w-full max-w-md text-center space-y-6 sm:space-y-8">
        {/* Icon / Illustration */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <IconPlant2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 dark:text-green-400" />
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-300 dark:bg-green-700 animate-pulse" />
            <div className="absolute -bottom-1 -left-2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-200 dark:bg-green-800 animate-pulse delay-300" />
          </div>
        </div>

        {/* Error Text */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-6xl sm:text-7xl font-bold text-green-500 dark:text-green-400">
            404
          </h1>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved to a different location.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
          <Link
            href="/home"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm sm:text-base transition-colors active:scale-[0.97] min-h-[48px]"
          >
            <IconHome className="w-4 h-4 sm:w-5 sm:h-5" />
            Go Home
          </Link>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.back();
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm sm:text-base transition-colors active:scale-[0.97] min-h-[48px]"
          >
            <IconArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Go Back
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <p className="mt-12 sm:mt-16 text-xs text-gray-400 dark:text-gray-500">
        Agrigrow &mdash; Empowering Farmers
      </p>
    </div>
  );
}
