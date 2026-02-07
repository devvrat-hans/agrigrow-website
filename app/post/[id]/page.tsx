'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconLoader2,
  IconAlertCircle,
  IconHome,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { FeedItemCard, type FeedItemData, type FeedItemAuthor } from '@/components/feed/FeedItemCard';
import apiClient from '@/lib/api-client';

/**
 * API response shape for a single post
 */
interface PostApiResponse {
  success: boolean;
  data: {
    _id: string;
    content: string;
    postType?: string;
    type?: string;
    crops?: string[];
    tags?: string[];
    images?: string[];
    visibility?: string;
    likesCount: number;
    commentsCount: number;
    sharesCount?: number;
    viewsCount?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    isRepost?: boolean;
    originalPost?: {
      _id: string;
      content: string;
      createdAt: string;
      author: {
        _id: string;
        fullName: string;
        role: string;
        profileImage?: string | null;
      } | null;
    } | null;
    createdAt: string;
    updatedAt?: string;
    author: {
      _id: string;
      fullName: string;
      role: string;
      profileImage?: string | null;
      badges?: string[];
      experienceLevel?: string;
    };
    recentComments?: unknown[];
    totalComments?: number;
  };
  error?: string;
}

/**
 * Transform API post data to FeedItemData format
 */
function transformPostToFeedItem(data: PostApiResponse['data']): FeedItemData {
  const author: FeedItemAuthor = {
    id: data.author._id,
    _id: data.author._id,
    name: data.author.fullName,
    fullName: data.author.fullName,
    role: data.author.role,
    avatar: data.author.profileImage || undefined,
    profileImage: data.author.profileImage || undefined,
  };

  const postType = (data.postType || data.type || 'post') as FeedItemData['type'];

  return {
    id: data._id,
    _id: data._id,
    type: postType,
    postType: postType,
    author,
    content: data.content,
    images: data.images,
    likesCount: data.likesCount,
    commentsCount: data.commentsCount,
    sharesCount: data.sharesCount,
    createdAt: data.createdAt,
    tags: data.tags || data.crops,
    crops: data.crops,
    isLiked: data.isLiked,
    isSaved: data.isSaved,
    isRepost: data.isRepost,
    originalPost: data.originalPost ? {
      _id: data.originalPost._id,
      content: data.originalPost.content,
      createdAt: data.originalPost.createdAt,
      author: data.originalPost.author ? {
        id: data.originalPost.author._id,
        _id: data.originalPost.author._id,
        name: data.originalPost.author.fullName,
        fullName: data.originalPost.author.fullName,
        role: data.originalPost.author.role,
        profileImage: data.originalPost.author.profileImage || undefined,
      } : {
        id: '',
        _id: '',
        name: 'Unknown User',
        role: 'farmer',
      },
    } : undefined,
  };
}

/**
 * Post Detail Page
 * 
 * Displays a single post with full details, comments section expanded,
 * and all actions (like, comment, share, save, report).
 * Accessed via share links at /post/[id].
 */
export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<FeedItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — only render dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Fetch user identity from localStorage
   */
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
      setUserPhone(phone);
      // Fetch user ID
      fetch(`/api/user/me?phone=${phone}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setCurrentUserId(data.data._id);
          }
        })
        .catch(() => {
          // User not logged in — post is still viewable
        });
    }
  }, []);

  /**
   * Fetch the post data
   */
  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<PostApiResponse>(
          `/posts/${postId}?includeComments=true&commentsLimit=10`
        );

        if (response.data.success && response.data.data) {
          setPost(transformPostToFeedItem(response.data.data));
        } else {
          setError(response.data.error || 'Post not found');
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setError('This post has been deleted or does not exist.');
        } else if (status === 400) {
          setError('Invalid post link.');
        } else {
          setError('Failed to load post. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  /**
   * Handle like action — update local state
   */
  const handleLike = useCallback(
    (id: string, isLiked: boolean, likesCount: number) => {
      if (!post || post.id !== id) return;
      setPost((prev) =>
        prev ? { ...prev, isLiked, likesCount } : prev
      );
    },
    [post]
  );

  /**
   * Handle delete post — redirect to home after deletion
   */
  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userPhone) return false;

      try {
        const response = await fetch(`/api/posts/${id}`, {
          method: 'DELETE',
          headers: { 'x-user-phone': userPhone },
        });
        const data = await response.json();

        if (data.success) {
          router.push('/home');
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [userPhone, router]
  );

  /**
   * Handle save post toggle
   */
  const handleSave = useCallback(
    async (id: string): Promise<{ isSaved: boolean; message: string } | null> => {
      if (!userPhone) return null;

      try {
        const response = await apiClient.post(`/posts/${id}/save`);
        const data = response.data;

        if (data.success) {
          const saved = data.data?.saved ?? !post?.isSaved;
          setPost((prev) => (prev ? { ...prev, isSaved: saved } : prev));
          return {
            isSaved: saved,
            message: saved ? 'Post saved' : 'Post unsaved',
          };
        }
        return null;
      } catch {
        return null;
      }
    },
    [userPhone, post?.isSaved]
  );

  /**
   * Loading state
   */
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <PostDetailHeader />
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <IconLoader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading post...</p>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <PostDetailHeader />
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <IconAlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Post Not Found
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {error || 'This post may have been deleted or the link is invalid.'}
            </p>
          </div>
          <Link
            href="/home"
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <IconHome className="w-4 h-4" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Post detail view
   */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PostDetailHeader />

      {/* Post content */}
      <main className="max-w-2xl mx-auto pb-8">
        <FeedItemCard
          item={post}
          currentUserId={currentUserId}
          onLike={handleLike}
          onDelete={handleDelete}
          onSave={handleSave}
          className="rounded-none sm:rounded-lg sm:mt-2 sm:mx-2"
        />
      </main>
    </div>
  );
}

/**
 * Header component for the post detail page
 * Provides navigation back and branding
 */
function PostDetailHeader() {
  const router = useRouter();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-white dark:bg-gray-900',
        'border-b border-gray-200 dark:border-gray-800',
        'px-4 py-3 flex items-center gap-3'
      )}
    >
      <button
        onClick={() => router.back()}
        className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Go back"
      >
        <IconArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
      <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        Post
      </h1>
    </header>
  );
}
