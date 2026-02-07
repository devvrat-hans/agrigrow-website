'use client';

import { useState, useCallback, useEffect } from 'react';
import { IconChevronRight, IconPlus, IconArrowLeft } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CropAnalysisResult } from '@/types/crop-ai';
import { AnalysisSummary } from './AnalysisSummary';
import { AnalysisDetail } from './AnalysisDetail';

// TYPES

export interface AnalysisResultProps {
  /** Full analysis result */
  result: CropAnalysisResult;
  /** Callback for new analysis */
  onNewAnalysis?: () => void;
  /** Callback for share action */
  onShare?: () => void;
  /** Callback for save action */
  onSave?: () => void;
  /** Callback for delete action */
  onDelete?: () => void;
  /** Whether the analysis is saved */
  isSaved?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// HOOK FOR MOBILE DETECTION

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * AnalysisResult Component
 * 
 * Main result display showing AnalysisSummary with expandable AnalysisDetail.
 * On mobile, full screen detail view with back button.
 */
export function AnalysisResult({
  result,
  onNewAnalysis,
  onShare,
  onSave,
  onDelete,
  isSaved = false,
  className,
}: AnalysisResultProps) {
  const [showDetail, setShowDetail] = useState(false);
  const isMobile = useIsMobile();

  // Handle expand/collapse
  const handleViewDetails = useCallback(() => {
    setShowDetail(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowDetail(false);
  }, []);

  // Handle escape key to close details
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDetail) {
        setShowDetail(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showDetail]);

  // Lock body scroll when detail is open on mobile
  useEffect(() => {
    if (showDetail && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showDetail, isMobile]);

  // Mobile full screen detail view
  if (showDetail && isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={handleCloseDetails}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Go back"
          >
            <IconArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Analysis Details
          </h2>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto">
          <AnalysisDetail
            analysis={result}
            onClose={handleCloseDetails}
            onShare={onShare}
            onDelete={onDelete}
          />
        </div>

        {/* Mobile Footer */}
        {onNewAnalysis && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <Button
              onClick={onNewAnalysis}
              className="w-full flex items-center justify-center gap-2"
            >
              <IconPlus className="w-4 h-4" />
              New Analysis
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Card */}
      <AnalysisSummary
        analysis={result}
        onShare={onShare}
        onSave={onSave}
        isSaved={isSaved}
        showActions
      />

      {/* View Details Button */}
      <Button
        variant="outline"
        onClick={handleViewDetails}
        className="w-full flex items-center justify-center gap-2"
      >
        View Full Details
        <IconChevronRight className="w-4 h-4" />
      </Button>

      {/* Desktop Expandable Detail */}
      {showDetail && !isMobile && (
        <div
          className={cn(
            'animate-in slide-in-from-top-4 fade-in duration-300',
            'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
            'bg-white dark:bg-gray-900'
          )}
        >
          <AnalysisDetail
            analysis={result}
            onClose={handleCloseDetails}
            onShare={onShare}
            onDelete={onDelete}
          />
        </div>
      )}

      {/* New Analysis Button */}
      {onNewAnalysis && !showDetail && (
        <div className="flex justify-center">
          <Button
            onClick={onNewAnalysis}
            className="flex items-center gap-2"
          >
            <IconPlus className="w-4 h-4" />
            Analyze Another Crop
          </Button>
        </div>
      )}
    </div>
  );
}

export default AnalysisResult;
