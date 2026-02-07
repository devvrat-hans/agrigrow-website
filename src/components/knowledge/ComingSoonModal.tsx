'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IconClock } from '@tabler/icons-react';

/**
 * Props for ComingSoonModal component
 */
interface ComingSoonModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Crop name to display */
  cropName: string;
  /** Crop icon emoji */
  cropIcon: string;
  /** Additional class names */
  className?: string;
}

/**
 * ComingSoonModal Component
 * 
 * Displays a friendly "Coming Soon" message for crops without videos.
 * Mobile-optimized design matching the app's UI/UX.
 */
export function ComingSoonModal({
  isOpen,
  onClose,
  cropName,
  cropIcon,
  className,
}: ComingSoonModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        variant="mobile-sheet"
        hideCloseButton
        className={cn(
          // Mobile: full width bottom sheet
          'w-full max-w-none',
          'p-6',
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-800',
          'text-center',
          // Desktop: regular dialog
          'sm:w-auto sm:max-w-sm sm:p-8',
          className
        )}
      >
        <DialogHeader className="space-y-4">
          {/* Icon area */}
          <div className="flex flex-col items-center gap-3">
            {/* Crop icon with animated background */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="text-4xl" role="img" aria-hidden="true">
                  {cropIcon}
                </span>
              </div>
              {/* Clock badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center border-2 border-white dark:border-gray-900">
                <IconClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Coming Soon!
            </DialogTitle>
          </div>

          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            Video tutorials for <span className="font-medium text-primary-600 dark:text-primary-400">{cropName}</span> are coming soon! 
            <br className="hidden sm:inline" />
            Stay tuned for expert guidance.
          </DialogDescription>
        </DialogHeader>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={onClose}
            className="w-full"
            size="lg"
          >
            Got it!
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We&apos;re working hard to bring you quality content
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ComingSoonModal;
