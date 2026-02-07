/**
 * Custom Hooks Index
 * 
 * Export all custom hooks for the Agrigrow feed feature
 */

// Feed Hook
export { useFeed } from './useFeed';
export type { UseFeedOptions, UseFeedReturn, FeedError } from './useFeed';

// Post Creation Hook
export { useCreatePost } from './useCreatePost';
export type { CreatePostInput, UseCreatePostReturn } from './useCreatePost';

// Like Hook
export { useLike, useSingleLike } from './useLike';
export type { UseLikeOptions, UseLikeReturn, LikeState } from './useLike';

// Comments Hook
export { useComments } from './useComments';
export type { UseCommentsOptions, UseCommentsReturn, CommentsError } from './useComments';

// Share Hook
export { useShare, useQuickShare } from './useShare';
export type { UseShareOptions, UseShareReturn, ShareAnalytics } from './useShare';

// Notifications Hook
export { useNotifications } from './useNotifications';

// Saved Posts Hook
export { useSavedPosts } from './useSavedPosts';

// New Posts Polling Hook
export { useNewPostsPolling } from './useNewPostsPolling';

// Mobile Detection Hook
export { useMobile, useTouchFriendlySize, useReducedAnimations } from './useMobile';
export type { UseMobileReturn, DeviceType } from './useMobile';

// Groups Hooks
export { useGroups } from './useGroups';
export type { UseGroupsOptions, UseGroupsReturn, GroupsError, GroupsFilters, GroupsPagination } from './useGroups';

export { useGroup } from './useGroup';
export type { UseGroupOptions, UseGroupReturn, GroupError, UserMembership } from './useGroup';

export { useGroupMembership } from './useGroupMembership';
export type { UseGroupMembershipOptions, UseGroupMembershipReturn, MembershipState, MembershipError } from './useGroupMembership';

export { useGroupMembers } from './useGroupMembers';
export type { UseGroupMembersOptions, UseGroupMembersReturn, MembersError, MembersFilters, MembersPagination } from './useGroupMembers';

export { useGroupPosts } from './useGroupPosts';
export type { UseGroupPostsOptions, UseGroupPostsReturn, PostsError, PostsFilters, PostsPagination } from './useGroupPosts';
export type { CreatePostInput as GroupPostInput } from './useGroupPosts';

export { useGroupComments } from './useGroupComments';
export type { UseGroupCommentsOptions, UseGroupCommentsReturn, CommentsError as GroupCommentsError, CommentsPagination, AddCommentInput } from './useGroupComments';

export { useGroupModeration } from './useGroupModeration';
export type { UseGroupModerationOptions, UseGroupModerationReturn, ModerationError, PendingPost, JoinRequest } from './useGroupModeration';

export { useGroupInvitations } from './useGroupInvitations';
export type { UseGroupInvitationsOptions, UseGroupInvitationsReturn, InvitationError, CreateInvitationInput, InviteLinkResult, InvitePreview } from './useGroupInvitations';

export { useGroupDiscovery } from './useGroupDiscovery';
export type { UseGroupDiscoveryOptions, UseGroupDiscoveryReturn, DiscoveryError } from './useGroupDiscovery';

// Crop AI Hooks
export { useCropAnalysis } from './useCropAnalysis';
export type { 
  AnalyzeOptions, 
  UseCropAnalysisState, 
  UseCropAnalysisReturn 
} from './useCropAnalysis';

export { useAnalysisHistory } from './useAnalysisHistory';
export type { 
  UseAnalysisHistoryOptions, 
  UseAnalysisHistoryState, 
  UseAnalysisHistoryReturn,
  PaginationState as AnalysisHistoryPagination,
} from './useAnalysisHistory';

export { useChat } from './useChat';
export type { 
  ChatMessage,
  Conversation,
  UseChatOptions,
  UseChatState,
  UseChatReturn 
} from './useChat';

export { useChatHistory } from './useChatHistory';
export type { 
  ConversationListItem,
  FullConversation,
  ChatHistoryPagination,
  UseChatHistoryState,
  UseChatHistoryReturn,
  UseChatHistoryOptions
} from './useChatHistory';

export { useWeather } from './useWeather';
export type { 
  WeatherLocationInput, 
  UseWeatherState, 
  UseWeatherReturn 
} from './useWeather';

// View Tracking Hook
export { useViewTracking } from './useViewTracking';
export type { default as UseViewTrackingDefault } from './useViewTracking';

// Diagnosis Hook
export { useDiagnosis } from './useDiagnosis';
export type { UseDiagnosisReturn } from './useDiagnosis';

// Planning Hook
export { usePlanning } from './usePlanning';
export type { UsePlanningReturn } from './usePlanning';

// Follow Hooks
export { useFollow } from './useFollow';
export type { UseFollowReturn } from './useFollow';

export { useFollowStatus } from './useFollowStatus';
export type { UseFollowStatusReturn } from './useFollowStatus';

export { useFollowers } from './useFollowers';
export type { UseFollowersOptions, UseFollowersReturn } from './useFollowers';

export { useFollowing } from './useFollowing';
export type { UseFollowingOptions, UseFollowingReturn } from './useFollowing';

export { useFollowRequests } from './useFollowRequests';
export type { UseFollowRequestsReturn } from './useFollowRequests';

// Image Upload Hook
export { useImageUpload, default as useImageUploadDefault } from './useImageUpload';
export type { 
  UseImageUploadOptions, 
  SelectedImage, 
  ImageUploadError, 
  UseImageUploadReturn 
} from './useImageUpload';

// Home Weather Hook
export { useHomeWeather } from './useHomeWeather';
export type { UseHomeWeatherState, UseHomeWeatherReturn } from './useHomeWeather';

// Mute User Hook
export { useMuteUser } from './useMuteUser';
export type { UseMuteUserReturn } from './useMuteUser';