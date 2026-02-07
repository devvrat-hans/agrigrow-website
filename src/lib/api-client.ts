/**
 * API Client Library for Agrigrow Feed
 * 
 * Centralized API client for all feed-related calls using axios.
 * All functions include proper error handling, typed responses,
 * and authentication headers from localStorage.
 * 
 * Supports mock data mode for development and testing.
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import type { PostType, PostVisibility, PostCategory } from '@/models/Post';
import {
  isMockDataEnabled,
  mockFeedResponse,
  mockCommentsResponse,
  mockNotificationsResponse as _mockNotificationsResponse,
  mockPost,
  mockComment,
  simulateDelay,
} from './mock-data';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Author information in posts/comments
 */
export interface Author {
  _id: string;
  fullName: string;
  profileImage?: string;
  role: string;
  badges?: string[];
  experienceLevel?: string;
}

/**
 * Post location data
 */
export interface PostLocation {
  state?: string;
  district?: string;
}

/**
 * Post data structure from API
 */
export interface Post {
  _id: string;
  author: Author;
  authorPhone: string;
  content: string;
  images: string[];
  postType: PostType;
  category: PostCategory;
  crops: string[];
  tags: string[];
  location: PostLocation;
  likes: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savedBy: string[];
  visibility: PostVisibility;
  isVerified: boolean;
  engagementScore: number;
  viewsCount: number;
  helpfulMarksCount: number;
  isRepost: boolean;
  originalPost?: Post;
  createdAt: string;
  updatedAt: string;
  feedScore?: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

/**
 * Comment data structure from API
 */
export interface Comment {
  _id: string;
  postId: string;
  author: Author;
  content: string;
  parentComment?: string;
  likes: string[];
  likesCount: number;
  isHelpful: boolean;
  helpfulMarkedBy?: string;
  mentions: string[];
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  repliesCount?: number;
  isLiked?: boolean;
}

/**
 * Share data structure
 */
export interface Share {
  _id: string;
  postId: string;
  sharedBy: string;
  shareType: 'repost' | 'external' | 'message';
  platform?: 'whatsapp' | 'facebook' | 'twitter' | 'link' | 'other';
  createdAt: string;
}

/**
 * User feed preferences
 */
export interface FeedPreferences {
  showReposts?: boolean;
  prioritizeFollowing?: boolean;
  contentTypes?: string[];
  hiddenPosts?: string[];
  mutedUsers?: string[];
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}

/**
 * Single item response structure
 */
export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Error response structure
 */
export interface ApiError {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}

/**
 * Like toggle response
 */
export interface LikeResponse {
  success: boolean;
  liked: boolean;
  likesCount: number;
}

/**
 * Create post input
 */
export interface CreatePostInput {
  content: string;
  images?: string[];
  postType?: PostType;
  category?: PostCategory;
  crops?: string[];
  visibility?: PostVisibility;
}

/**
 * Update post input
 */
export interface UpdatePostInput {
  content?: string;
  images?: string[];
  postType?: PostType;
  category?: PostCategory;
  crops?: string[];
  visibility?: PostVisibility;
}

/**
 * Create comment input
 */
export interface CreateCommentInput {
  content: string;
  parentCommentId?: string;
}

/**
 * Update comment input
 */
export interface UpdateCommentInput {
  content: string;
}

/**
 * Share post input
 */
export interface SharePostInput {
  shareType: 'repost' | 'external' | 'message';
  platform?: 'whatsapp' | 'facebook' | 'twitter' | 'link' | 'other';
  recipientId?: string;
}

// ============================================
// AXIOS INSTANCE CONFIGURATION
// ============================================

/**
 * Get authentication phone from localStorage
 */
function getAuthPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add auth headers
 */
apiClient.interceptors.request.use(
  (config: import('axios').InternalAxiosRequestConfig) => {
    const phone = getAuthPhone();
    if (phone) {
      config.headers['x-user-phone'] = phone;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    const apiError: ApiError = {
      success: false,
      error: 'An unexpected error occurred',
      statusCode: error.response?.status,
    };

    if (error.response?.data) {
      apiError.error = error.response.data.error || error.response.data.message || apiError.error;
      apiError.message = error.response.data.message;
    } else if (error.message) {
      apiError.error = error.message;
    }

    // Handle specific status codes
    if (error.response?.status === 401) {
      apiError.error = 'Please sign in to continue';
      // Optionally redirect to login
      if (typeof window !== 'undefined') {
        // Could dispatch to auth state or redirect
        console.error('Authentication required');
      }
    } else if (error.response?.status === 403) {
      apiError.error = 'You do not have permission to perform this action';
    } else if (error.response?.status === 404) {
      apiError.error = 'The requested resource was not found';
    } else if (error.response?.status === 429) {
      apiError.error = 'Too many requests. Please try again later';
    } else if (error.response?.status === 500) {
      apiError.error = 'Server error. Please try again later';
    }

    return Promise.reject(apiError);
  }
);

// ============================================
// POSTS API FUNCTIONS
// ============================================

/**
 * Fetch personalized feed
 * 
 * @param options - Pagination and filter options
 * @returns Paginated posts response
 */
export async function fetchFeed(options: {
  page?: number;
  limit?: number;
  category?: PostType;
  cursor?: string;
  crop?: string;
  sortBy?: 'newest' | 'engagement';
} = {}): Promise<PaginatedResponse<Post>> {
  const { page = 1, limit = 10, category, cursor, crop, sortBy } = options;

  // Use mock data if enabled
  if (isMockDataEnabled()) {
    const mockResponse = await mockFeedResponse(page, limit);
    return {
      success: true,
      data: mockResponse.data as unknown as Post[],
      hasMore: mockResponse.pagination.hasMore,
      nextCursor: mockResponse.pagination.nextCursor,
      total: mockResponse.pagination.total,
    };
  }
  
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (category) params.append('category', category);
  if (cursor) params.append('cursor', cursor);
  if (crop) params.append('crop', crop);
  if (sortBy) params.append('sortBy', sortBy);

  const response = await apiClient.get<PaginatedResponse<Post>>(`/posts?${params.toString()}`);
  return response.data;
}

/**
 * Create a new post
 * 
 * @param input - Post creation data
 * @returns Created post
 */
export async function createPost(input: CreatePostInput): Promise<SingleResponse<Post>> {
  // Use mock data if enabled
  if (isMockDataEnabled()) {
    await simulateDelay(500);
    const postTypeValue = (input.postType || 'general') as 'crop_update' | 'question' | 'solution' | 'market_info' | 'weather_update' | 'general';
    const newPost = mockPost({
      content: input.content,
      images: input.images || [],
      postType: postTypeValue,
    });
    return {
      success: true,
      data: newPost as unknown as Post,
      message: 'Post created successfully',
    };
  }

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    throw { success: false, error: 'Post content is required' } as ApiError;
  }
  if (input.content.length > 2000) {
    throw { success: false, error: 'Post content exceeds maximum length of 2000 characters' } as ApiError;
  }

  // Validate images
  if (input.images && input.images.length > 5) {
    throw { success: false, error: 'Maximum 5 images allowed per post' } as ApiError;
  }

  const response = await apiClient.post<SingleResponse<Post>>('/posts', input);
  return response.data;
}

/**
 * Fetch a single post by ID
 * 
 * @param postId - Post ID
 * @returns Post with full details
 */
export async function fetchPostById(postId: string): Promise<SingleResponse<Post>> {
  const response = await apiClient.get<SingleResponse<Post>>(`/posts/${postId}`);
  return response.data;
}

/**
 * Update an existing post
 * 
 * @param postId - Post ID
 * @param input - Update data
 * @returns Updated post
 */
export async function updatePost(postId: string, input: UpdatePostInput): Promise<SingleResponse<Post>> {
  // Validate content if provided
  if (input.content !== undefined) {
    if (input.content.trim().length === 0) {
      throw { success: false, error: 'Post content cannot be empty' } as ApiError;
    }
    if (input.content.length > 2000) {
      throw { success: false, error: 'Post content exceeds maximum length of 2000 characters' } as ApiError;
    }
  }

  const response = await apiClient.put<SingleResponse<Post>>(`/posts/${postId}`, input);
  return response.data;
}

/**
 * Delete a post
 * 
 * @param postId - Post ID
 * @returns Success response
 */
export async function deletePost(postId: string): Promise<SingleResponse<null>> {
  const response = await apiClient.delete<SingleResponse<null>>(`/posts/${postId}`);
  return response.data;
}

/**
 * Toggle like on a post
 * 
 * @param postId - Post ID
 * @returns Like status and count
 */
export async function toggleLike(postId: string): Promise<LikeResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: { isLiked: boolean; likesCount: number; engagementScore?: number };
    message?: string;
  }>(`/posts/${postId}/like`);
  
  // Extract and normalize the response
  return {
    success: response.data.success,
    liked: response.data.data.isLiked,
    likesCount: response.data.data.likesCount,
  };
}

/**
 * Fetch trending posts
 * 
 * @param limit - Number of posts to fetch
 * @returns Array of trending posts
 */
export async function fetchTrendingPosts(limit: number = 10): Promise<PaginatedResponse<Post>> {
  const response = await apiClient.get<PaginatedResponse<Post>>(`/posts?sortBy=engagement&limit=${limit}`);
  return response.data;
}

/**
 * Fetch posts by crop
 * 
 * @param cropName - Crop name to filter by
 * @param options - Pagination options
 * @returns Paginated posts for the crop
 */
export async function fetchPostsByCrop(
  cropName: string,
  options: { page?: number; limit?: number; cursor?: string } = {}
): Promise<PaginatedResponse<Post>> {
  const { page = 1, limit = 10, cursor } = options;
  
  const params = new URLSearchParams();
  params.append('crop', cropName.toLowerCase());
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (cursor) params.append('cursor', cursor);

  const response = await apiClient.get<PaginatedResponse<Post>>(`/posts?${params.toString()}`);
  return response.data;
}

// ============================================
// COMMENTS API FUNCTIONS
// ============================================

/**
 * Fetch comments for a post
 * 
 * @param postId - Post ID
 * @param options - Pagination and sort options
 * @returns Paginated comments response
 */
export async function fetchComments(
  postId: string,
  options: {
    page?: number;
    limit?: number;
    cursor?: string;
    sortBy?: 'newest' | 'oldest' | 'helpful';
    includeReplies?: boolean;
  } = {}
): Promise<PaginatedResponse<Comment>> {
  const { page = 1, limit = 10, cursor, sortBy = 'newest', includeReplies = true } = options;

  // Use mock data if enabled
  if (isMockDataEnabled()) {
    const mockResponse = await mockCommentsResponse(postId, limit);
    return {
      success: true,
      data: mockResponse.data as unknown as Comment[],
      hasMore: mockResponse.hasMore,
      nextCursor: mockResponse.nextCursor,
    };
  }
  
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  params.append('sortBy', sortBy);
  params.append('includeReplies', String(includeReplies));
  if (cursor) params.append('cursor', cursor);

  const response = await apiClient.get<PaginatedResponse<Comment>>(
    `/posts/${postId}/comments?${params.toString()}`
  );
  return response.data;
}

/**
 * Create a comment on a post
 * 
 * @param postId - Post ID
 * @param input - Comment content and optional parent
 * @returns Created comment
 */
export async function createComment(
  postId: string,
  input: CreateCommentInput
): Promise<SingleResponse<Comment>> {
  // Use mock data if enabled
  if (isMockDataEnabled()) {
    await simulateDelay(400);
    const newComment = mockComment(postId, { content: input.content });
    return {
      success: true,
      data: newComment as unknown as Comment,
      message: 'Comment added successfully',
    };
  }

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    throw { success: false, error: 'Comment content is required' } as ApiError;
  }
  if (input.content.length > 1000) {
    throw { success: false, error: 'Comment exceeds maximum length of 1000 characters' } as ApiError;
  }

  const response = await apiClient.post<SingleResponse<Comment>>(
    `/posts/${postId}/comments`,
    input
  );
  return response.data;
}

/**
 * Update an existing comment
 * 
 * @param postId - Post ID that the comment belongs to
 * @param commentId - Comment ID
 * @param input - Updated content
 * @returns Updated comment
 */
export async function updateComment(
  postId: string,
  commentId: string,
  input: UpdateCommentInput
): Promise<SingleResponse<Comment>> {
  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    throw { success: false, error: 'Comment content cannot be empty' } as ApiError;
  }
  if (input.content.length > 1000) {
    throw { success: false, error: 'Comment exceeds maximum length of 1000 characters' } as ApiError;
  }

  const response = await apiClient.put<SingleResponse<Comment>>(
    `/posts/${postId}/comments/${commentId}`,
    input
  );
  return response.data;
}

/**
 * Delete a comment
 * 
 * @param postId - Post ID that the comment belongs to
 * @param commentId - Comment ID
 * @returns Success response
 */
export async function deleteComment(postId: string, commentId: string): Promise<SingleResponse<null>> {
  const response = await apiClient.delete<SingleResponse<null>>(`/posts/${postId}/comments/${commentId}`);
  return response.data;
}

/**
 * Toggle like on a comment
 * 
 * @param postId - Post ID that the comment belongs to
 * @param commentId - Comment ID
 * @returns Like status and count
 */
export async function toggleCommentLike(postId: string, commentId: string): Promise<LikeResponse> {
  const response = await apiClient.post<LikeResponse>(`/posts/${postId}/comments/${commentId}/like`);
  return response.data;
}

/**
 * Mark a comment as helpful (post author only)
 * 
 * @param postId - Post ID that the comment belongs to
 * @param commentId - Comment ID
 * @returns Updated comment
 */
export async function markCommentHelpful(postId: string, commentId: string): Promise<SingleResponse<Comment>> {
  const response = await apiClient.post<SingleResponse<Comment>>(
    `/posts/${postId}/comments/${commentId}/helpful`
  );
  return response.data;
}

// ============================================
// SHARE API FUNCTIONS
// ============================================

/**
 * Share a post
 * 
 * @param postId - Post ID
 * @param input - Share details
 * @returns Share record
 */
export async function sharePost(
  postId: string,
  input: SharePostInput
): Promise<SingleResponse<Share>> {
  const response = await apiClient.post<SingleResponse<Share>>(
    `/posts/${postId}/share`,
    input
  );
  return response.data;
}

/**
 * Generate a shareable link for a post
 * 
 * @param postId - Post ID
 * @returns Shareable URL
 */
export function generateShareLink(postId: string): string {
  if (typeof window === 'undefined') {
    return `/posts/${postId}`;
  }
  return `${window.location.origin}/posts/${postId}`;
}

/**
 * Get share count for a post
 * 
 * @param postId - Post ID
 * @returns Share analytics
 */
export async function getShareAnalytics(postId: string): Promise<SingleResponse<{
  totalShares: number;
  byType: Record<string, number>;
  byPlatform: Record<string, number>;
}>> {
  const response = await apiClient.get<SingleResponse<{
    totalShares: number;
    byType: Record<string, number>;
    byPlatform: Record<string, number>;
  }>>(`/posts/${postId}/shares`);
  return response.data;
}

// ============================================
// FEED PREFERENCES API FUNCTIONS
// ============================================

/**
 * Update user's feed preferences
 * 
 * @param preferences - Updated preferences
 * @returns Updated preferences
 */
export async function updateFeedPreferences(
  preferences: FeedPreferences
): Promise<SingleResponse<FeedPreferences>> {
  const response = await apiClient.put<SingleResponse<FeedPreferences>>(
    '/user/feed-preferences',
    preferences
  );
  return response.data;
}

/**
 * Get user's feed preferences
 * 
 * @returns Current feed preferences
 */
export async function getFeedPreferences(): Promise<SingleResponse<FeedPreferences>> {
  const response = await apiClient.get<SingleResponse<FeedPreferences>>('/user/feed-preferences');
  return response.data;
}

/**
 * Hide a post from feed
 * 
 * @param postId - Post ID to hide
 * @returns Success response
 */
export async function hidePost(postId: string): Promise<SingleResponse<null>> {
  const response = await apiClient.post<SingleResponse<null>>(
    `/user/feed-preferences/hide-post`,
    { postId }
  );
  return response.data;
}

/**
 * Unhide a post from feed
 * 
 * @param postId - Post ID to unhide
 * @returns Success response
 */
export async function unhidePost(postId: string): Promise<SingleResponse<null>> {
  const response = await apiClient.delete<SingleResponse<null>>(
    `/user/feed-preferences/hide-post/${postId}`
  );
  return response.data;
}

/**
 * Mute a user (hide their posts from feed)
 * 
 * @param userId - User ID to mute
 * @returns Success response
 */
export async function muteUser(userId: string): Promise<SingleResponse<null>> {
  const response = await apiClient.post<SingleResponse<null>>(
    `/user/feed-preferences/mute-user`,
    { userId }
  );
  return response.data;
}

/**
 * Unmute a user
 * 
 * @param userId - User ID to unmute
 * @returns Success response
 */
export async function unmuteUser(userId: string): Promise<SingleResponse<null>> {
  const response = await apiClient.delete<SingleResponse<null>>(
    `/user/feed-preferences/mute-user/${userId}`
  );
  return response.data;
}

// ============================================
// SAVE/BOOKMARK API FUNCTIONS
// ============================================

/**
 * Toggle save/bookmark on a post
 * 
 * @param postId - Post ID
 * @returns Save status
 */
export async function toggleSavePost(postId: string): Promise<SingleResponse<{ saved: boolean }>> {
  const response = await apiClient.post<SingleResponse<{ saved: boolean }>>(
    `/posts/${postId}/save`
  );
  return response.data;
}

/**
 * Fetch user's saved posts
 * 
 * @param options - Pagination options
 * @returns Paginated saved posts
 */
export async function fetchSavedPosts(
  options: { page?: number; limit?: number; cursor?: string } = {}
): Promise<PaginatedResponse<Post>> {
  const { page = 1, limit = 10, cursor } = options;
  
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (cursor) params.append('cursor', cursor);

  const response = await apiClient.get<PaginatedResponse<Post>>(
    `/user/saved-posts?${params.toString()}`
  );
  return response.data;
}

// ============================================
// VIEW TRACKING API FUNCTIONS
// ============================================

/**
 * Record a post view with engagement data
 * 
 * @param postId - Post ID
 * @param data - View engagement data
 * @returns Success response
 */
export async function recordPostView(
  postId: string,
  data: {
    viewDuration?: number;
    scrollPercentage?: number;
  } = {}
): Promise<SingleResponse<null>> {
  const response = await apiClient.post<SingleResponse<null>>(
    `/posts/${postId}/view`,
    data
  );
  return response.data;
}

// ============================================
// EXPORT DEFAULT CLIENT
// ============================================

export default apiClient;
