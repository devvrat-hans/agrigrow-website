'use client';

import { useState, useCallback, useEffect } from 'react';
import { IconX, IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';
import type { CropAnalysisResult } from '@/types/crop-ai';
import { AnalysisDetail } from '../analysis/AnalysisDetail';

// TYPES

export interface AnalysisDetailModalProps {
  /** Analysis ID to display */
  analysisId: string | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when analysis is deleted */
  onDeleted?: () => void;
  /** Callback for share action */
  onShare?: () => void;
}

// LOADING STATE COMPONENT

function LoadingState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <IconLoader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
      <p className="text-gray-600 dark:text-gray-400">{t('cropAi.history.loadingAnalysis')}</p>
    </div>
  );
}

// ERROR STATE COMPONENT

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
}

function ErrorState({ message, onRetry, onClose }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <IconAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
        {t('cropAi.history.failedToLoad')}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4 max-w-xs">
        {message}
      </p>
      <div className="flex gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            {t('cropAi.history.close')}
          </Button>
        )}
        {onRetry && (
          <Button onClick={onRetry}>
            {t('cropAi.history.tryAgain')}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * AnalysisDetailModal Component
 * 
 * Modal/sheet for displaying full analysis details.
 * Fetches analysis by ID and renders AnalysisDetail.
 */
export function AnalysisDetailModal({
  analysisId,
  open,
  onOpenChange,
  onDeleted,
  onShare,
}: AnalysisDetailModalProps) {
  const { t } = useTranslation();

  // Local state for analysis data
  const [analysisResult, setAnalysisResult] = useState<CropAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local delete confirmation state
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch analysis by ID
  const fetchAnalysis = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await apiClient.get<{ success: boolean; data?: CropAnalysisResult; error?: string }>(
        `/api/crop-ai/${id}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch analysis');
      }

      setAnalysisResult(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete analysis
  const deleteAnalysis = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete<{ success: boolean; error?: string }>(
        `/api/crop-ai/${id}`
      );
      return response.data.success;
    } catch {
      return false;
    }
  }, []);

  // Fetch analysis when modal opens
  useEffect(() => {
    if (open && analysisId) {
      fetchAnalysis(analysisId);
    }
  }, [open, analysisId, fetchAnalysis]);

  // Handle close
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!analysisId) return;

    setIsDeleting(true);
    try {
      const success = await deleteAnalysis(analysisId);
      if (success) {
        onOpenChange(false);
        onDeleted?.();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [analysisId, deleteAnalysis, onOpenChange, onDeleted]);

  // Handle share
  const handleShare = useCallback(() => {
    onShare?.();
  }, [onShare]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (analysisId) {
      fetchAnalysis(analysisId);
    }
  }, [analysisId, fetchAnalysis]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, handleClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Don't render if not open
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Modal Content - centered popup */}
        <div
          className={cn(
            'relative w-full max-w-3xl max-h-[85vh]',
            'bg-white dark:bg-gray-900',
            'rounded-xl',
            'shadow-xl',
            'overflow-hidden',
            'flex flex-col',
            'animate-in fade-in zoom-in-95 duration-300'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'absolute top-4 right-4 z-10',
              'p-2 rounded-full',
              'bg-gray-100 dark:bg-gray-800',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'transition-colors'
            )}
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading State */}
            {loading && <LoadingState />}

            {/* Error State */}
            {error && !loading && (
              <ErrorState
                message={error}
                onRetry={handleRetry}
                onClose={handleClose}
              />
            )}

            {/* Analysis Detail */}
            {analysisResult && !loading && !error && (
              <AnalysisDetail
                analysis={analysisResult}
                onClose={handleClose}
                onShare={handleShare}
                onDelete={handleDelete}
              />
            )}
          </div>

          {/* Deleting Overlay */}
          {isDeleting && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <IconLoader2 className="w-8 h-8 text-red-500 animate-spin mb-3" />
                <p className="text-gray-600 dark:text-gray-400">{t('cropAi.history.deleteHistory')}...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AnalysisDetailModal;
