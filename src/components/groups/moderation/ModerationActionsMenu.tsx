'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MemberRole } from '@/types/group';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  IconDotsVertical,
  IconAlertTriangle,
  IconTrash,
  IconBan,
  IconFlag,
  IconLoader2,
  IconMessageReport,
  IconShield,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

/**
 * Content types that can be moderated
 */
export type ModeratableContentType = 'post' | 'comment';

/**
 * Moderation action types
 */
export type ModerationAction = 'warn' | 'remove' | 'ban';

interface ModerationActionsMenuProps {
  /** Type of content being moderated */
  contentType: ModeratableContentType;
  /** ID of the content (post or comment) */
  contentId: string;
  /** ID of the content author */
  authorId: string;
  /** Author's display name */
  authorName: string;
  /** Group ID */
  groupId: string;
  /** Current user's role in the group */
  currentUserRole: MemberRole;
  /** Whether the content author is the current user */
  isOwnContent?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Trigger element (defaults to three dots icon) */
  trigger?: React.ReactNode;
  /** Callback when content is removed */
  onContentRemoved?: () => void;
  /** Callback when user is warned */
  onUserWarned?: () => void;
  /** Callback when user is banned */
  onUserBanned?: () => void;
  /** Callback when report is submitted */
  onReportSubmitted?: () => void;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

/**
 * ModerationActionsMenu Component
 * 
 * Dropdown menu with moderation actions for posts and comments:
 * - Warn user (sends notification)
 * - Remove content (delete post/comment)
 * - Ban user (with reason input)
 * - Report content
 * 
 * Includes confirmation dialogs for destructive actions.
 * 
 * @example
 * <ModerationActionsMenu
 *   contentType="post"
 *   contentId="507f1f77bcf86cd799439011"
 *   authorId="author123"
 *   authorName="John Doe"
 *   groupId="group123"
 *   currentUserRole="moderator"
 *   onContentRemoved={() => refetchPosts()}
 * />
 */
export function ModerationActionsMenu({
  contentType,
  contentId,
  authorId,
  authorName,
  groupId,
  currentUserRole,
  isOwnContent = false,
  className,
  trigger,
  onContentRemoved,
  onUserWarned,
  onUserBanned,
  onReportSubmitted,
}: ModerationActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ModerationAction | 'report' | null>(null);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [banReason, setBanReason] = useState('');
  const [warnMessage, setWarnMessage] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check if user has moderation permissions
  const canModerate = ['moderator', 'admin', 'owner'].includes(currentUserRole);

  /**
   * Handle warn user
   */
  const handleWarn = useCallback(async () => {
    if (!warnMessage.trim()) {
      setError('Please provide a warning message');
      return;
    }

    setActionState('loading');
    setError(null);

    try {
      // Create a warning notification for the user
      const response = await apiClient.post('/notifications', {
        userId: authorId,
        type: 'warning',
        title: 'Moderation Warning',
        message: warnMessage,
        groupId,
        relatedId: contentId,
        relatedType: contentType,
      });

      if (response.data.success) {
        setActionState('success');
        setActiveAction(null);
        setWarnMessage('');
        if (onUserWarned) {
          onUserWarned();
        }
      }
    } catch (err: unknown) {
      console.error('Error warning user:', err);
      setActionState('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to send warning';
      setError(errorMessage);
    }
  }, [warnMessage, authorId, groupId, contentId, contentType, onUserWarned]);

  /**
   * Handle remove content
   */
  const handleRemove = useCallback(async () => {
    setActionState('loading');
    setError(null);

    try {
      let endpoint: string;
      if (contentType === 'post') {
        endpoint = `/api/groups/${groupId}/posts/${contentId}`;
      } else {
        // For comments, we need the post ID - assuming it's passed through contentId format: "postId:commentId"
        // Or use a dedicated endpoint
        endpoint = `/api/groups/${groupId}/comments/${contentId}`;
      }

      const response = await apiClient.delete(endpoint);

      if (response.data.success) {
        setActionState('success');
        setActiveAction(null);
        if (onContentRemoved) {
          onContentRemoved();
        }
      }
    } catch (err: unknown) {
      console.error('Error removing content:', err);
      setActionState('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove content';
      setError(errorMessage);
    }
  }, [contentType, groupId, contentId, onContentRemoved]);

  /**
   * Handle ban user
   */
  const handleBan = useCallback(async () => {
    setActionState('loading');
    setError(null);

    try {
      const response = await apiClient.post(`/groups/${groupId}/members/ban`, {
        userId: authorId,
        reason: banReason || undefined,
      });

      if (response.data.success) {
        setActionState('success');
        setActiveAction(null);
        setBanReason('');
        if (onUserBanned) {
          onUserBanned();
        }
      }
    } catch (err: unknown) {
      console.error('Error banning user:', err);
      setActionState('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to ban user';
      setError(errorMessage);
    }
  }, [groupId, authorId, banReason, onUserBanned]);

  /**
   * Handle report content
   */
  const handleReport = useCallback(async () => {
    if (!reportReason.trim()) {
      setError('Please provide a reason for reporting');
      return;
    }

    setActionState('loading');
    setError(null);

    try {
      const response = await apiClient.post('/reports', {
        contentType,
        contentId,
        reason: reportReason,
        groupId,
      });

      if (response.data.success) {
        setActionState('success');
        setActiveAction(null);
        setReportReason('');
        if (onReportSubmitted) {
          onReportSubmitted();
        }
      }
    } catch (err: unknown) {
      console.error('Error reporting content:', err);
      setActionState('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report';
      setError(errorMessage);
    }
  }, [contentType, contentId, reportReason, groupId, onReportSubmitted]);

  /**
   * Reset state when closing dialogs
   */
  const handleCloseDialog = useCallback(() => {
    setActiveAction(null);
    setActionState('idle');
    setError(null);
    setBanReason('');
    setWarnMessage('');
    setReportReason('');
  }, []);

  // Don't show menu for own content (unless reporting)
  if (isOwnContent && !canModerate) {
    return null;
  }

  const contentTypeLabel = contentType === 'post' ? 'Post' : 'Comment';

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', className)}
              aria-label="Moderation actions"
            >
              <IconDotsVertical className="w-4 h-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Report (available to all members) */}
          {!isOwnContent && (
            <DropdownMenuItem
              onClick={() => {
                setActiveAction('report');
                setIsOpen(false);
              }}
              className="text-orange-600 dark:text-orange-400"
            >
              <IconFlag className="w-4 h-4 mr-2" />
              Report {contentTypeLabel}
            </DropdownMenuItem>
          )}

          {/* Moderation actions (only for mods and above) */}
          {canModerate && !isOwnContent && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setActiveAction('warn');
                  setIsOpen(false);
                }}
                className="text-yellow-600 dark:text-yellow-400"
              >
                <IconAlertTriangle className="w-4 h-4 mr-2" />
                Warn User
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setActiveAction('remove');
                  setIsOpen(false);
                }}
                className="text-red-600 dark:text-red-400"
              >
                <IconTrash className="w-4 h-4 mr-2" />
                Remove {contentTypeLabel}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setActiveAction('ban');
                  setIsOpen(false);
                }}
                className="text-red-600 dark:text-red-400"
              >
                <IconBan className="w-4 h-4 mr-2" />
                Ban User
              </DropdownMenuItem>
            </>
          )}

          {/* Own content - only remove option */}
          {isOwnContent && (
            <DropdownMenuItem
              onClick={() => {
                setActiveAction('remove');
                setIsOpen(false);
              }}
              className="text-red-600 dark:text-red-400"
            >
              <IconTrash className="w-4 h-4 mr-2" />
              Delete {contentTypeLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Warn User Dialog */}
      <Dialog open={activeAction === 'warn'} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="w-5 h-5 text-yellow-500" />
              Warn User
            </DialogTitle>
            <DialogDescription>
              Send a warning to <span className="font-medium">{authorName}</span> about their {contentType}.
              They will receive a notification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="warn-message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Warning Message
              </label>
              <Textarea
                id="warn-message"
                value={warnMessage}
                onChange={(e) => setWarnMessage(e.target.value)}
                placeholder="Explain why this content is problematic..."
                className="mt-1"
                rows={4}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleWarn}
              disabled={actionState === 'loading' || !warnMessage.trim()}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {actionState === 'loading' ? (
                <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <IconMessageReport className="w-4 h-4 mr-2" />
              )}
              Send Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Content Confirmation */}
      <AlertDialog open={activeAction === 'remove'} onOpenChange={(open) => !open && handleCloseDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconTrash className="w-5 h-5 text-red-500" />
              Remove {contentTypeLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isOwnContent
                ? `Are you sure you want to delete this ${contentType}? This action cannot be undone.`
                : `Are you sure you want to remove this ${contentType} by ${authorName}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={actionState === 'loading'}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionState === 'loading' ? (
                <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <IconTrash className="w-4 h-4 mr-2" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban User Dialog */}
      <Dialog open={activeAction === 'ban'} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBan className="w-5 h-5 text-red-500" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Ban <span className="font-medium">{authorName}</span> from this group.
              They will no longer be able to view or participate in the group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="ban-reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ban Reason (optional)
              </label>
              <Textarea
                id="ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Explain why this user is being banned..."
                className="mt-1"
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This reason will be recorded for moderation history.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <IconShield className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    This action is serious
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Banned users can only be unbanned by moderators. Use this action for serious violations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleBan}
              disabled={actionState === 'loading'}
              variant="destructive"
            >
              {actionState === 'loading' ? (
                <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <IconBan className="w-4 h-4 mr-2" />
              )}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Content Dialog */}
      <Dialog open={activeAction === 'report'} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconFlag className="w-5 h-5 text-orange-500" />
              Report {contentTypeLabel}
            </DialogTitle>
            <DialogDescription>
              Report this {contentType} to group moderators for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="report-reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason for Report
              </label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Explain why you're reporting this content..."
                className="mt-1"
                rows={4}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={actionState === 'loading' || !reportReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionState === 'loading' ? (
                <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <IconFlag className="w-4 h-4 mr-2" />
              )}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ModerationActionsMenu;
