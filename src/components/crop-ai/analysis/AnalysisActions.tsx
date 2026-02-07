'use client';

import { 
  IconShare, 
  IconBookmark, 
  IconPlus 
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AnalysisActionsProps {
  /** Callback for share action */
  onShare?: () => void;
  /** Callback for save action */
  onSave?: () => void;
  /** Callback for new analysis action */
  onNewAnalysis?: () => void;
  /** Whether the analysis is saved */
  isSaved?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * AnalysisActions Component
 *
 * Touch-friendly action buttons for analysis results.
 * Stacks vertically on mobile, horizontal on larger screens.
 *
 * @example
 * <AnalysisActions
 *   onShare={handleShare}
 *   onSave={handleSave}
 *   onNewAnalysis={handleNewAnalysis}
 *   isSaved={saved}
 * />
 */
export function AnalysisActions({
  onShare,
  onSave,
  onNewAnalysis,
  isSaved = false,
  className,
}: AnalysisActionsProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-2 sm:gap-3', className)}>
      {/* Share Button */}
      {onShare && (
        <Button
          variant="outline"
          onClick={onShare}
          className="min-h-[44px] flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <IconShare className="w-4 h-4" />
          <span>Share</span>
        </Button>
      )}

      {/* Save Button */}
      {onSave && (
        <Button
          variant="outline"
          onClick={onSave}
          className={cn(
            'min-h-[44px] flex items-center justify-center gap-2 flex-1 sm:flex-none',
            isSaved && 'text-primary-600 border-primary-300 dark:text-primary-400 dark:border-primary-700'
          )}
        >
          <IconBookmark className={cn('w-4 h-4', isSaved && 'fill-current')} />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </Button>
      )}

      {/* New Analysis Button */}
      {onNewAnalysis && (
        <Button
          variant="default"
          onClick={onNewAnalysis}
          className="min-h-[44px] flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <IconPlus className="w-4 h-4" />
          <span>New Analysis</span>
        </Button>
      )}
    </div>
  );
}
