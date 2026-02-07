'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GroupPostData, MemberRole } from '@/types/group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconClock,
  IconPhoto,
  IconChartBar,
  IconMessage,
  IconDots,
  IconEye,
  IconCheckbox,
  IconAlertTriangle,
  IconRefresh,
  IconInbox,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

interface PendingPostsQueueProps {
  /** Group ID */
  groupId: string;
  /** Current user's role in the group */
  currentUserRole: MemberRole;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a post is approved */
  onPostApproved?: (post: GroupPostData) => void;
  /** Callback when a post is rejected */
  onPostRejected?: (postId: string) => void;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Get default avatar URL
 */
function getDefaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&size=128`;
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get post type badge color
 */
function getPostTypeColor(postType: string): string {
  switch (postType) {
    case 'question':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'announcement':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'poll':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'resource':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

/**
 * Pending Post Card Component
 */
interface PendingPostCardProps {
  post: GroupPostData;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onPreview: () => void;
  isLoading: boolean;
}

function PendingPostCard({
  post,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onPreview,
  isLoading,
}: PendingPostCardProps) {
  const authorName = post.authorInfo?.fullName || 'Unknown User';
  const authorImage = post.authorInfo?.profileImage || getDefaultAvatar(authorName);
  
  // Truncate content for preview
  const truncatedContent = post.content.length > 200 
    ? post.content.slice(0, 200) + '...' 
    : post.content;

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-colors',
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        <div className="pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Select post by ${authorName}`}
          />
        </div>

        {/* Author Avatar */}
        <img
          src={authorImage}
          alt={authorName}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />

        {/* Post Content */}
        <div className="flex-1 min-w-0">
          {/* Author Info & Time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white">
              {authorName}
            </span>
            {post.authorInfo?.role && (
              <Badge variant="outline" className="text-xs">
                {post.authorInfo.role}
              </Badge>
            )}
            <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
              <IconClock className="w-3.5 h-3.5" />
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>

          {/* Post Type */}
          <div className="mt-1 flex items-center gap-2">
            <Badge className={cn('text-xs capitalize', getPostTypeColor(post.postType))}>
              {post.postType}
            </Badge>
            {post.images.length > 0 && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <IconPhoto className="w-3 h-3" />
                {post.images.length} image{post.images.length > 1 ? 's' : ''}
              </Badge>
            )}
            {post.poll && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <IconChartBar className="w-3 h-3" />
                Poll
              </Badge>
            )}
          </div>

          {/* Content Preview */}
          <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap break-words">
            {truncatedContent}
          </p>

          {/* Poll Preview */}
          {post.poll && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {post.poll.question}
              </p>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {post.poll.options.length} options
              </div>
            </div>
          )}

          {/* Image Preview */}
          {post.images.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {post.images.slice(0, 3).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                />
              ))}
              {post.images.length > 3 && (
                <div className="w-16 h-16 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    +{post.images.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-shrink-0" disabled={isLoading}>
              <IconDots className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <IconEye className="w-4 h-4 mr-2" />
              View Full Post
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onApprove} className="text-green-600 dark:text-green-400">
              <IconCheck className="w-4 h-4 mr-2" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject} className="text-red-600 dark:text-red-400">
              <IconX className="w-4 h-4 mr-2" />
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Action Buttons */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          disabled={isLoading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {isLoading ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconX className="w-4 h-4 mr-1" />}
          Reject
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onApprove}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconCheck className="w-4 h-4 mr-1" />}
          Approve
        </Button>
      </div>
    </div>
  );
}

/**
 * Post Preview Modal
 */
interface PostPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: GroupPostData | null;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

function PostPreviewModal({
  open,
  onOpenChange,
  post,
  onApprove,
  onReject,
  isLoading,
}: PostPreviewModalProps) {
  if (!post) return null;

  const authorName = post.authorInfo?.fullName || 'Unknown User';
  const authorImage = post.authorInfo?.profileImage || getDefaultAvatar(authorName);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <IconEye className="w-5 h-5" />
            Post Preview
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left">
              {/* Author */}
              <div className="flex items-center gap-3 mt-4">
                <img
                  src={authorImage}
                  alt={authorName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {authorName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <IconClock className="w-3.5 h-3.5" />
                    {formatRelativeTime(post.createdAt)}
                  </p>
                </div>
                <Badge className={cn('ml-auto capitalize', getPostTypeColor(post.postType))}>
                  {post.postType}
                </Badge>
              </div>

              {/* Content */}
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              {/* Poll */}
              {post.poll && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <IconChartBar className="w-4 h-4" />
                    {post.poll.question}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {post.poll.options.map((option, index) => (
                      <li
                        key={index}
                        className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm"
                      >
                        {option.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Images */}
              {post.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {post.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-4 flex gap-1 flex-wrap">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Close</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isLoading}
          >
            {isLoading ? <IconLoader2 className="w-4 h-4 animate-spin mr-2" /> : <IconX className="w-4 h-4 mr-2" />}
            Reject Post
          </Button>
          <Button
            onClick={onApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <IconLoader2 className="w-4 h-4 animate-spin mr-2" /> : <IconCheck className="w-4 h-4 mr-2" />}
            Approve Post
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * PendingPostsQueue Component
 * 
 * Displays a list of posts awaiting approval in groups with requirePostApproval enabled.
 * Features:
 * - Individual approve/reject buttons for each post
 * - Post preview with full content
 * - Batch actions for multiple posts
 * - Author info and submission timestamp
 * - Post type badges
 * 
 * @example
 * <PendingPostsQueue
 *   groupId="507f1f77bcf86cd799439011"
 *   currentUserRole="moderator"
 *   onPostApproved={(post) => console.log('Approved:', post)}
 * />
 */
export function PendingPostsQueue({
  groupId,
  currentUserRole,
  className,
  onPostApproved,
  onPostRejected,
}: PendingPostsQueueProps) {
  const [pendingPosts, setPendingPosts] = useState<GroupPostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [batchActionState, setBatchActionState] = useState<ActionState>('idle');
  const [previewPost, setPreviewPost] = useState<GroupPostData | null>(null);
  const [confirmBatchAction, setConfirmBatchAction] = useState<'approve' | 'reject' | null>(null);

  // Check if user has moderation permissions
  const canModerate = ['moderator', 'admin', 'owner'].includes(currentUserRole);

  /**
   * Fetch pending posts
   */
  const fetchPendingPosts = useCallback(async () => {
    if (!canModerate) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch posts with isApproved=false filter
      const response = await apiClient.get(
        `/api/groups/${groupId}/posts?isApproved=false&limit=50`
      );

      if (response.data.success) {
        // Filter to only show unapproved posts
        const allPosts = [...(response.data.data.pinnedPosts || []), ...(response.data.data.posts || [])];
        const unapproved = allPosts.filter((post: GroupPostData) => !post.isApproved);
        setPendingPosts(unapproved);
      }
    } catch (err: unknown) {
      console.error('Error fetching pending posts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pending posts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, canModerate]);

  useEffect(() => {
    fetchPendingPosts();
  }, [fetchPendingPosts]);

  /**
   * Approve a single post
   */
  const handleApprove = useCallback(async (postId: string) => {
    setActionStates(prev => ({ ...prev, [postId]: 'loading' }));

    try {
      const response = await apiClient.post(
        `/api/groups/${groupId}/posts/${postId}/approve`
      );

      if (response.data.success) {
        setActionStates(prev => ({ ...prev, [postId]: 'success' }));
        
        // Remove from list
        const approvedPost = pendingPosts.find(p => p._id === postId);
        setPendingPosts(prev => prev.filter(p => p._id !== postId));
        setSelectedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });

        if (approvedPost && onPostApproved) {
          onPostApproved({ ...approvedPost, isApproved: true });
        }
      }
    } catch (err: unknown) {
      console.error('Error approving post:', err);
      setActionStates(prev => ({ ...prev, [postId]: 'error' }));
    }
  }, [groupId, pendingPosts, onPostApproved]);

  /**
   * Reject a single post (delete it)
   */
  const handleReject = useCallback(async (postId: string) => {
    setActionStates(prev => ({ ...prev, [postId]: 'loading' }));

    try {
      const response = await apiClient.delete(
        `/api/groups/${groupId}/posts/${postId}`
      );

      if (response.data.success) {
        setActionStates(prev => ({ ...prev, [postId]: 'success' }));
        
        // Remove from list
        setPendingPosts(prev => prev.filter(p => p._id !== postId));
        setSelectedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });

        if (onPostRejected) {
          onPostRejected(postId);
        }
      }
    } catch (err: unknown) {
      console.error('Error rejecting post:', err);
      setActionStates(prev => ({ ...prev, [postId]: 'error' }));
    }
  }, [groupId, onPostRejected]);

  /**
   * Toggle post selection
   */
  const handleSelectPost = useCallback((postId: string, selected: boolean) => {
    setSelectedPostIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all posts
   */
  const handleSelectAll = useCallback(() => {
    if (selectedPostIds.size === pendingPosts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(pendingPosts.map(p => p._id)));
    }
  }, [pendingPosts, selectedPostIds.size]);

  /**
   * Batch approve selected posts
   */
  const handleBatchApprove = useCallback(async () => {
    setConfirmBatchAction(null);
    setBatchActionState('loading');

    const postIds = Array.from(selectedPostIds);
    let successCount = 0;

    for (const postId of postIds) {
      try {
        const response = await apiClient.post(
          `/api/groups/${groupId}/posts/${postId}/approve`
        );

        if (response.data.success) {
          successCount++;
          const approvedPost = pendingPosts.find(p => p._id === postId);
          if (approvedPost && onPostApproved) {
            onPostApproved({ ...approvedPost, isApproved: true });
          }
        }
      } catch (err) {
        console.error(`Error approving post ${postId}:`, err);
      }
    }

    // Remove approved posts from list
    setPendingPosts(prev => prev.filter(p => !selectedPostIds.has(p._id)));
    setSelectedPostIds(new Set());
    setBatchActionState(successCount === postIds.length ? 'success' : 'error');

    setTimeout(() => setBatchActionState('idle'), 2000);
  }, [groupId, selectedPostIds, pendingPosts, onPostApproved]);

  /**
   * Batch reject selected posts
   */
  const handleBatchReject = useCallback(async () => {
    setConfirmBatchAction(null);
    setBatchActionState('loading');

    const postIds = Array.from(selectedPostIds);
    let successCount = 0;

    for (const postId of postIds) {
      try {
        const response = await apiClient.delete(
          `/api/groups/${groupId}/posts/${postId}`
        );

        if (response.data.success) {
          successCount++;
          if (onPostRejected) {
            onPostRejected(postId);
          }
        }
      } catch (err) {
        console.error(`Error rejecting post ${postId}:`, err);
      }
    }

    // Remove rejected posts from list
    setPendingPosts(prev => prev.filter(p => !selectedPostIds.has(p._id)));
    setSelectedPostIds(new Set());
    setBatchActionState(successCount === postIds.length ? 'success' : 'error');

    setTimeout(() => setBatchActionState('idle'), 2000);
  }, [groupId, selectedPostIds, onPostRejected]);

  // Don't show if user can't moderate
  if (!canModerate) {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconMessage className="w-5 h-5" />
            Pending Posts
            {pendingPosts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingPosts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPendingPosts}
            disabled={isLoading}
          >
            <IconRefresh className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-4">
            <IconAlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchPendingPosts} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <IconLoader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Loading pending posts...
            </p>
          </div>
        ) : pendingPosts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <IconInbox className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              All caught up!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              No posts pending approval
            </p>
          </div>
        ) : (
          <>
            {/* Batch Actions Bar */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedPostIds.size === pendingPosts.length && pendingPosts.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all posts"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedPostIds.size > 0
                    ? `${selectedPostIds.size} selected`
                    : 'Select all'}
                </span>
              </div>

              {selectedPostIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmBatchAction('reject')}
                    disabled={batchActionState === 'loading'}
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    {batchActionState === 'loading' ? (
                      <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <IconX className="w-4 h-4 mr-1" />
                    )}
                    Reject All
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setConfirmBatchAction('approve')}
                    disabled={batchActionState === 'loading'}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {batchActionState === 'loading' ? (
                      <IconLoader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <IconCheck className="w-4 h-4 mr-1" />
                    )}
                    Approve All
                  </Button>
                </div>
              )}
            </div>

            {/* Posts List */}
            <div className="space-y-3">
              {pendingPosts.map((post) => (
                <PendingPostCard
                  key={post._id}
                  post={post}
                  isSelected={selectedPostIds.has(post._id)}
                  onSelect={(selected) => handleSelectPost(post._id, selected)}
                  onApprove={() => handleApprove(post._id)}
                  onReject={() => handleReject(post._id)}
                  onPreview={() => setPreviewPost(post)}
                  isLoading={actionStates[post._id] === 'loading'}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Post Preview Modal */}
      <PostPreviewModal
        open={previewPost !== null}
        onOpenChange={(open) => !open && setPreviewPost(null)}
        post={previewPost}
        onApprove={() => {
          if (previewPost) {
            handleApprove(previewPost._id);
            setPreviewPost(null);
          }
        }}
        onReject={() => {
          if (previewPost) {
            handleReject(previewPost._id);
            setPreviewPost(null);
          }
        }}
        isLoading={previewPost ? actionStates[previewPost._id] === 'loading' : false}
      />

      {/* Batch Action Confirmation */}
      <AlertDialog
        open={confirmBatchAction !== null}
        onOpenChange={(open) => !open && setConfirmBatchAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconCheckbox className="w-5 h-5" />
              {confirmBatchAction === 'approve' ? 'Approve' : 'Reject'} {selectedPostIds.size} Posts?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBatchAction === 'approve'
                ? `You are about to approve ${selectedPostIds.size} posts. They will be visible to all group members.`
                : `You are about to reject ${selectedPostIds.size} posts. They will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchAction === 'approve' ? handleBatchApprove : handleBatchReject}
              className={
                confirmBatchAction === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmBatchAction === 'approve' ? 'Approve All' : 'Reject All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default PendingPostsQueue;
