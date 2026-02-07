'use client';

import { useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { getYouTubeEmbedUrl } from '@/constants/knowledge-hub';

/**
 * Props for VideoModal component
 */
interface VideoModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** YouTube video URL */
  videoUrl: string;
  /** Crop name to display in header */
  cropName: string;
  /** Additional class names */
  className?: string;
}

/**
 * VideoModal Component
 * 
 * Displays a responsive YouTube video embed in a modal dialog.
 * Features:
 * - Responsive 16:9 aspect ratio
 * - Auto-play when opened
 * - Mobile-optimized sizing
 * - Dark mode support
 * - Close button in header
 */
export function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  cropName,
  className,
}: VideoModalProps) {
  // Get embed URL with autoplay
  const embedUrl = getYouTubeEmbedUrl(videoUrl, true);

  // Handle escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!embedUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        hideCloseButton
        className={cn(
          // Mobile: full width with padding
          'w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-3xl',
          // Remove default padding to allow full-width video
          'p-0 overflow-hidden',
          // Dark mode background
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-800',
          className
        )}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {cropName} - Video Tutorial
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close video"
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Video Container - 16:9 aspect ratio */}
        <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={embedUrl}
            title={`${cropName} video tutorial`}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Footer with close button for mobile */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 sm:hidden">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VideoModal;
