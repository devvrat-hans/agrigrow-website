'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  IconArticle,
  IconTrash,
  IconHeart,
  IconMessage,
  IconLoader2,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/components/feed/FeedItemCard';

interface PostData {
  id: string;
  content: string;
  postType: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  images?: string[];
}

interface MyPostsCardProps {
  /** User's phone number for fetching posts */
  userPhone: string;
  /** Additional class names */
  className?: string;
}

/**
 * Profile card showing user's posts with delete functionality
 */
export function MyPostsCard({ userPhone, className }: MyPostsCardProps) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/posts?phone=${encodeURIComponent(userPhone)}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setPosts(data.posts || []);
      } else {
        setError(data.error || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching user posts:', err);
      setError('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [userPhone]);

  useEffect(() => {
    if (userPhone) {
      fetchPosts();
    }
  }, [userPhone, fetchPosts]);

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/posts/${deletePostId}`, {
        method: 'DELETE',
        headers: {
          'x-user-phone': userPhone,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPosts(prev => prev.filter(post => post.id !== deletePostId));
        setDeletePostId(null);
      } else {
        setError(data.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'question': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'tip': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'problem': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'update': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'success_story': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const formatPostType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const displayedPosts = isExpanded ? posts : posts.slice(0, 3);

  return (
    <>
      <Card className={cn('p-3 sm:p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <div className="text-primary">
            <IconArticle className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground">My Posts</h3>
          <span className="text-sm text-muted-foreground ml-auto">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <IconLoader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <IconAlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && posts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <IconArticle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">You haven&apos;t created any posts yet</p>
          </div>
        )}

        {/* Posts List */}
        {!isLoading && !error && posts.length > 0 && (
          <div className="space-y-2">
            {displayedPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge 
                      variant="secondary"
                      className={cn('text-xs', getPostTypeColor(post.postType))}
                    >
                      {formatPostType(post.postType)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <IconHeart className="w-3.5 h-3.5" />
                      {post.likesCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconMessage className="w-3.5 h-3.5" />
                      {post.commentsCount}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 h-auto"
                  onClick={() => setDeletePostId(post.id)}
                >
                  <IconTrash className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {/* Show More/Less Button */}
            {posts.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <IconChevronUp className="w-4 h-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <IconChevronDown className="w-4 h-4 mr-1" />
                    Show {posts.length - 3} More
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
