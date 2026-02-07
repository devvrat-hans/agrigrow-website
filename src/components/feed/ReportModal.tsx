'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  IconAlertTriangle,
  IconMailOff,
  IconEyeOff,
  IconInfoCircle,
  IconMoodSad,
  IconQuestionMark,
  IconLoader2,
  IconCheck,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  REPORT_REASON_LABELS,
  REPORT_REASON_DESCRIPTIONS,
  type ReportReason,
  type ReportedItemType,
} from '@/types/report';

/**
 * Props for ReportModal component
 */
interface ReportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Type of item being reported */
  itemType: ReportedItemType;
  /** ID of the item being reported */
  itemId: string;
  /** Optional callback after successful report */
  onReportSubmitted?: () => void;
}

/**
 * Get icon for each report reason
 */
function getReasonIcon(reason: ReportReason) {
  switch (reason) {
    case 'spam':
      return IconMailOff;
    case 'inappropriate':
      return IconEyeOff;
    case 'misinformation':
      return IconInfoCircle;
    case 'harassment':
      return IconMoodSad;
    case 'other':
      return IconQuestionMark;
    default:
      return IconAlertTriangle;
  }
}

/**
 * ReportModal Component
 * Modal dialog for reporting posts or comments
 */
export function ReportModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  onReportSubmitted,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reset form state
   */
  const resetForm = useCallback(() => {
    setSelectedReason(null);
    setDescription('');
    setError(null);
    setIsSuccess(false);
  }, []);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }, [isSubmitting, resetForm, onClose]);

  /**
   * Handle report submission
   */
  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      setError('Please select a reason for your report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get user phone from localStorage
      const userPhone = localStorage.getItem('userPhone');
      if (!userPhone) {
        setError('You must be logged in to report content');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': userPhone,
        },
        body: JSON.stringify({
          itemType,
          itemId,
          reason: selectedReason,
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      // Show success state
      setIsSuccess(true);
      
      // Call the callback if provided
      onReportSubmitted?.();

      // Close the modal after a short delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReason, description, itemType, itemId, onReportSubmitted, handleClose]);

  /**
   * Handle reason selection
   */
  const handleReasonSelect = useCallback((reason: ReportReason) => {
    setSelectedReason(reason);
    setError(null);
  }, []);

  // List of all report reasons
  const reasons: ReportReason[] = ['spam', 'inappropriate', 'misinformation', 'harassment', 'other'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        variant="mobile-sheet" 
        className="max-h-[85vh] overflow-hidden !p-0"
        hideCloseButton
      >
        <div className="w-full overflow-y-auto overflow-x-hidden p-5 sm:p-6 max-h-[85vh]">
          {/* Success State */}
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <IconCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center text-lg">Report Submitted</DialogTitle>
              <DialogDescription className="text-center mt-2">
                Thank you for helping keep our community safe. Our team will review your report.
              </DialogDescription>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <DialogHeader className="!space-y-0 relative">
                <button 
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-gray-500 dark:text-gray-400 text-lg leading-none">&times;</span>
                </button>
                <div className="flex flex-col items-center text-center pt-2 pb-2">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                    <IconAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <DialogTitle className="text-lg font-semibold">
                    Report {itemType === 'post' ? 'Post' : 'Comment'}
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    Help us understand what&apos;s wrong
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Reason Selection */}
              <div className="pt-2">
                <span className="text-sm font-medium block mb-3">
                  Why are you reporting this?
                  <span className="text-red-500 ml-1">*</span>
                </span>

                <div className="space-y-2">
                  {reasons.map((reason) => {
                    const Icon = getReasonIcon(reason);
                    const isSelected = selectedReason === reason;

                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => handleReasonSelect(reason)}
                        disabled={isSubmitting}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left box-border',
                          'border-2 transition-all duration-200',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
                          isSelected
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                          isSubmitting && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {/* Radio indicator with checkmark */}
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex-shrink-0',
                            'flex items-center justify-center transition-all duration-200',
                            isSelected
                              ? 'border-red-500 bg-red-500'
                              : 'border-gray-300 dark:border-gray-600'
                          )}
                        >
                          {isSelected && (
                            <IconCheck size={12} className="text-white" strokeWidth={3} />
                          )}
                        </div>

                        {/* Icon and text */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={cn(
                              'w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-200 flex-shrink-0',
                              isSelected
                                ? 'bg-red-100 dark:bg-red-800/30'
                                : 'bg-gray-100 dark:bg-gray-800'
                            )}
                          >
                            <Icon
                              size={16}
                              className={cn(
                                'transition-colors duration-200',
                                isSelected
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                'font-medium text-sm block transition-colors duration-200',
                                isSelected
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-gray-900 dark:text-gray-100'
                              )}
                            >
                              {REPORT_REASON_LABELS[reason]}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {REPORT_REASON_DESCRIPTIONS[reason]}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Description */}
              <div className="pt-2">
                <label htmlFor="report-description" className="text-sm font-medium block mb-3">
                  Additional details (optional)
                </label>
                <Textarea
                  id="report-description"
                  placeholder="Provide any additional context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={500}
                  className="min-h-[80px] resize-none p-3 w-full box-border"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                  {description.length}/500
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Footer */}
              <DialogFooter className="gap-2 sm:gap-0 pt-2 flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReportModal;
