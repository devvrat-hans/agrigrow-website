/**
 * Follow Feature Type Definitions
 * 
 * Shared TypeScript type definitions for the Agrigrow Follow/Followers feature.
 * These types can be safely imported by both client and server components.
 * 
 * This file contains:
 * - Union types for follow status and actions
 * - Interfaces for follow data structures
 * - API request/response types
 */

// ============================================
// UNION TYPES (ENUMS)
// ============================================

/**
 * Follow relationship status between two users
 */
export type FollowStatus = 'not_following' | 'following' | 'pending' | 'blocked';

/**
 * Actions that can be taken on a follow request
 */
export type FollowRequestAction = 'accept' | 'reject';

/**
 * Database status for follow records
 */
export type FollowRecordStatus = 'active' | 'pending' | 'blocked';

// ============================================
// INTERFACES - USER DATA
// ============================================

/**
 * Minimal user info for followers/following lists
 */
export interface FollowUser {
  phone: string;
  fullName: string;
  profileImage?: string;
  bio?: string;
  role?: 'farmer' | 'student' | 'business';
  state?: string;
  district?: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isPrivateAccount?: boolean;
}

/**
 * Follow statistics for a user profile
 */
export interface FollowStats {
  followersCount: number;
  followingCount: number;
}

/**
 * Follow relationship between two users
 */
export interface FollowRelationship {
  id: string;
  follower: FollowUser;
  following: FollowUser;
  status: FollowRecordStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Current user's relationship status with another user
 */
export interface FollowRelationshipStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isPending: boolean;
  isBlocked: boolean;
}

// ============================================
// INTERFACES - FOLLOW REQUESTS
// ============================================

/**
 * A pending follow request
 */
export interface FollowRequest {
  id: string;
  user: FollowUser;
  createdAt: string;
}

/**
 * Follow request with additional metadata
 */
export interface FollowRequestWithMeta extends FollowRequest {
  isProcessing?: boolean;
}

// ============================================
// API REQUEST TYPES
// ============================================

/**
 * Request body for following a user
 */
export interface FollowUserRequest {
  followingPhone: string;
}

/**
 * Request body for unfollowing a user
 */
export interface UnfollowUserRequest {
  followingPhone: string;
}

/**
 * Request body for handling follow requests
 */
export interface HandleFollowRequestBody {
  requestId: string;
  action: FollowRequestAction;
}

/**
 * Query params for fetching followers/following lists
 */
export interface FollowListParams {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Response for follow/unfollow action
 */
export interface FollowActionResponse {
  success: boolean;
  message: string;
  follow?: {
    id: string;
    status: FollowRecordStatus;
    createdAt: string;
  };
}

/**
 * Response for follow status check
 */
export interface FollowStatusResponse {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isPending: boolean;
  isBlocked: boolean;
}

/**
 * Response for followers/following list
 */
export interface FollowListResponse {
  users: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Response for follow requests list
 */
export interface FollowRequestsResponse {
  requests: FollowRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Response for handling a follow request
 */
export interface HandleFollowRequestResponse {
  success: boolean;
  message: string;
  action: FollowRequestAction;
}

// ============================================
// HOOK STATE TYPES
// ============================================

/**
 * State for useFollow hook
 */
export interface UseFollowState {
  isLoading: boolean;
  error: string | null;
}

/**
 * State for useFollowStatus hook
 */
export interface UseFollowStatusState extends FollowRelationshipStatus {
  isLoading: boolean;
  error: string | null;
}

/**
 * State for useFollowers/useFollowing hooks
 */
export interface UseFollowListState {
  users: FollowUser[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

/**
 * State for useFollowRequests hook
 */
export interface UseFollowRequestsState {
  requests: FollowRequest[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

/**
 * Size variants for follow components
 */
export type FollowButtonSize = 'sm' | 'md' | 'lg';

/**
 * Variant styles for follow button
 */
export type FollowButtonVariant = 'filled' | 'outlined';

/**
 * Props for FollowButton component
 */
export interface FollowButtonProps {
  userPhone: string;
  size?: FollowButtonSize;
  variant?: FollowButtonVariant;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

/**
 * Props for FollowStats component
 */
export interface FollowStatsProps {
  followersCount: number;
  followingCount: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Props for UserListItem component
 */
export interface UserListItemProps {
  user: FollowUser;
  showFollowButton?: boolean;
  onUserClick?: (user: FollowUser) => void;
  className?: string;
}

/**
 * Props for UserList component
 */
export interface UserListProps {
  users: FollowUser[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  showFollowButtons?: boolean;
  onUserClick?: (user: FollowUser) => void;
  className?: string;
}

/**
 * Props for FollowersModal component
 */
export interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone: string;
}

/**
 * Props for FollowingModal component
 */
export interface FollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone: string;
}

/**
 * Props for FollowRequestItem component
 */
export interface FollowRequestItemProps {
  request: FollowRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isProcessing?: boolean;
  className?: string;
}

/**
 * Props for FollowRequestsList component
 */
export interface FollowRequestsListProps {
  requests: FollowRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isLoading?: boolean;
  className?: string;
}
