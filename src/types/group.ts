/**
 * Group Type Definitions
 * 
 * Shared TypeScript type definitions for the Agrigrow Groups/Communities feature.
 * These types can be safely imported by both client and server components.
 * 
 * This file contains:
 * - Union types for enums
 * - Interfaces for data structures
 * - Labels and descriptions for UI
 */

// ============================================
// UNION TYPES (ENUMS)
// ============================================

/**
 * Types of groups that can be created
 */
export type GroupType = 'crop' | 'region' | 'topic' | 'practice';

/**
 * Group privacy settings
 */
export type GroupPrivacy = 'public' | 'private' | 'invite-only';

/**
 * Member roles within a group
 */
export type MemberRole = 'member' | 'moderator' | 'admin' | 'owner';

/**
 * Membership status
 */
export type MemberStatus = 'active' | 'pending' | 'banned' | 'left';

/**
 * Types of posts that can be created in a group
 */
export type GroupPostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'resource';

/**
 * Invitation status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

// ============================================
// INTERFACES
// ============================================

/**
 * Group settings configuration
 */
export interface GroupSettings {
  /** Whether members can create posts */
  allowMemberPosts: boolean;
  /** Whether posts require approval before being visible */
  requirePostApproval: boolean;
  /** Whether polls are allowed */
  allowPolls: boolean;
  /** Whether image uploads are allowed */
  allowImages: boolean;
}

/**
 * Group rule definition
 */
export interface GroupRule {
  /** Rule title */
  title: string;
  /** Rule description/details */
  description: string;
}

/**
 * Author information for display
 */
export interface GroupAuthor {
  /** User ID */
  _id: string;
  /** User's full name */
  fullName: string;
  /** User's profile image URL */
  profileImage?: string;
  /** User's role in the platform */
  role?: string;
  /** User's region */
  region?: string;
}

/**
 * Complete group data structure
 */
export interface GroupData {
  /** Group ID */
  _id: string;
  /** Group name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Group description */
  description?: string;
  /** Cover image URL */
  coverImage?: string;
  /** Group icon (emoji or icon name) */
  icon?: string;
  /** Type of group */
  groupType: GroupType;
  /** Privacy setting */
  privacy: GroupPrivacy;
  /** Linked crops (for crop-based groups) */
  crops: string[];
  /** Region (for region-based groups) */
  region?: string;
  /** Tags for discovery */
  tags: string[];
  /** User who created the group */
  createdBy: GroupAuthor | string;
  /** Admin user IDs */
  admins: string[];
  /** Moderator user IDs */
  moderators: string[];
  /** Total member count */
  memberCount: number;
  /** Total post count */
  postCount: number;
  /** Group rules */
  rules: GroupRule[];
  /** Group settings */
  settings: GroupSettings;
  /** Whether group is verified */
  isVerified: boolean;
  /** Whether group is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Current user's membership status (if authenticated) */
  isJoined?: boolean;
  /** Current user's role (if member) */
  userRole?: MemberRole;
  /** Current user's membership status */
  userMembershipStatus?: MemberStatus;
}

/**
 * Group member data structure
 */
export interface GroupMemberData {
  /** Membership ID */
  _id: string;
  /** Group ID */
  groupId: string;
  /** User ID */
  userId: string;
  /** User details (populated) */
  user?: GroupAuthor;
  /** Member's role in the group */
  role: MemberRole;
  /** Membership status */
  status: MemberStatus;
  /** When the user joined */
  joinedAt: string;
  /** User who invited this member */
  invitedBy?: string;
  /** Inviter details (populated) */
  inviter?: GroupAuthor;
  /** Last activity timestamp */
  lastActivityAt?: string;
  /** Notification preferences */
  notificationPreferences: {
    newPosts: boolean;
    mentions: boolean;
    announcements: boolean;
  };
  /** Ban information (if banned) */
  banReason?: string;
  bannedBy?: string;
  bannedAt?: string;
}

/**
 * Poll option in a group post
 */
export interface PollOption {
  /** Option text */
  text: string;
  /** Number of votes */
  votes: number;
}

/**
 * Poll data in a group post
 */
export interface PollData {
  /** Poll question */
  question: string;
  /** Poll options */
  options: PollOption[];
  /** When the poll ends */
  endDate?: string;
  /** Number of voters */
  voterCount: number;
  /** Whether current user has voted */
  hasVoted?: boolean;
  /** Current user's vote index (if voted) */
  userVoteIndex?: number;
}

/**
 * Group post data structure
 */
export interface GroupPostData {
  /** Post ID */
  _id: string;
  /** Group ID */
  groupId: string;
  /** Group details (populated) */
  group?: Pick<GroupData, '_id' | 'name' | 'slug' | 'icon'>;
  /** Author user ID */
  author: string;
  /** Author details (populated) */
  authorInfo?: GroupAuthor;
  /** Post content */
  content: string;
  /** Image URLs */
  images: string[];
  /** Type of post */
  postType: GroupPostType;
  /** Poll data (for poll posts) */
  poll?: PollData;
  /** Whether post is pinned */
  isPinned: boolean;
  /** Whether post is approved */
  isApproved: boolean;
  /** Number of likes */
  likesCount: number;
  /** Number of comments */
  commentsCount: number;
  /** Whether current user has liked */
  isLiked?: boolean;
  /** Mentioned user IDs */
  mentions: string[];
  /** Post tags */
  tags: string[];
  /** Whether post was edited */
  isEdited: boolean;
  /** When post was edited */
  editedAt?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Group comment data structure
 */
export interface GroupCommentData {
  /** Comment ID */
  _id: string;
  /** Post ID */
  postId: string;
  /** Group ID */
  groupId: string;
  /** Author user ID */
  author: string;
  /** Author details (populated) */
  authorInfo?: GroupAuthor;
  /** Comment content */
  content: string;
  /** Parent comment ID (for replies) */
  parentId: string | null;
  /** Nesting depth */
  depth: number;
  /** Number of replies */
  replyCount: number;
  /** Number of likes */
  likesCount: number;
  /** Whether current user has liked */
  isLiked?: boolean;
  /** Whether marked as helpful by post author */
  isHelpful: boolean;
  /** Mentioned user IDs */
  mentions: string[];
  /** Whether comment was edited */
  isEdited: boolean;
  /** When comment was edited */
  editedAt?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Nested replies (if loaded) */
  replies?: GroupCommentData[];
}

/**
 * Group invitation data structure
 */
export interface GroupInvitationData {
  /** Invitation ID */
  _id: string;
  /** Group ID */
  groupId: string;
  /** Group details (populated) */
  group?: Pick<GroupData, '_id' | 'name' | 'slug' | 'coverImage' | 'icon' | 'memberCount'>;
  /** Inviter user ID */
  invitedBy: string;
  /** Inviter details (populated) */
  inviter?: GroupAuthor;
  /** Invited user ID (for direct invites) */
  invitedUser?: string;
  /** Invitee details (populated) */
  invitee?: GroupAuthor;
  /** Invite code (for link invites) */
  inviteCode?: string;
  /** When invitation expires */
  expiresAt: string;
  /** Maximum uses (for code invites) */
  maxUses?: number;
  /** Times used */
  usedCount: number;
  /** Remaining uses */
  remainingUses?: number | null;
  /** Invitation status */
  status: InvitationStatus;
  /** Creation timestamp */
  createdAt: string;
}

// ============================================
// LABELS AND DESCRIPTIONS
// ============================================

/**
 * Group type labels for UI
 */
export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  crop: 'Crop',
  region: 'Region',
  topic: 'Topic',
  practice: 'Practice',
};

/**
 * Group type descriptions for UI
 */
export const GROUP_TYPE_DESCRIPTIONS: Record<GroupType, string> = {
  crop: 'A group focused on a specific crop like wheat, rice, or cotton',
  region: 'A group for farmers in a specific geographic region',
  topic: 'A group discussing a specific agricultural topic',
  practice: 'A group about specific farming practices or techniques',
};

/**
 * Group type icons (Tabler icon names)
 */
export const GROUP_TYPE_ICONS: Record<GroupType, string> = {
  crop: 'plant',
  region: 'map-pin',
  topic: 'messages',
  practice: 'tool',
};

/**
 * Privacy labels for UI
 */
export const GROUP_PRIVACY_LABELS: Record<GroupPrivacy, string> = {
  public: 'Public',
  private: 'Private',
  'invite-only': 'Invite Only',
};

/**
 * Privacy descriptions for UI
 */
export const GROUP_PRIVACY_DESCRIPTIONS: Record<GroupPrivacy, string> = {
  public: 'Anyone can find and join this group',
  private: 'Anyone can find this group, but must request to join',
  'invite-only': 'Only invited users can join this group',
};

/**
 * Privacy icons (Tabler icon names)
 */
export const GROUP_PRIVACY_ICONS: Record<GroupPrivacy, string> = {
  public: 'world',
  private: 'lock',
  'invite-only': 'mail',
};

/**
 * Member role labels for UI
 */
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  member: 'Member',
  moderator: 'Moderator',
  admin: 'Admin',
  owner: 'Owner',
};

/**
 * Member role descriptions for UI
 */
export const MEMBER_ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  member: 'Can view content and participate in discussions',
  moderator: 'Can moderate content and manage members',
  admin: 'Can manage group settings and moderators',
  owner: 'Full control over the group',
};

/**
 * Member status labels for UI
 */
export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  pending: 'Pending Approval',
  banned: 'Banned',
  left: 'Left',
};

/**
 * Post type labels for UI
 */
export const POST_TYPE_LABELS: Record<GroupPostType, string> = {
  discussion: 'Discussion',
  question: 'Question',
  announcement: 'Announcement',
  poll: 'Poll',
  resource: 'Resource',
};

/**
 * Post type descriptions for UI
 */
export const POST_TYPE_DESCRIPTIONS: Record<GroupPostType, string> = {
  discussion: 'Start a conversation with the community',
  question: 'Ask for help or advice from other farmers',
  announcement: 'Share important news or updates',
  poll: 'Get opinions from the community',
  resource: 'Share useful guides, links, or documents',
};

/**
 * Post type icons (Tabler icon names)
 */
export const POST_TYPE_ICONS: Record<GroupPostType, string> = {
  discussion: 'message-circle',
  question: 'help-circle',
  announcement: 'speakerphone',
  poll: 'chart-bar',
  resource: 'file-text',
};

/**
 * Invitation status labels for UI
 */
export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

// ============================================
// ROLE HIERARCHY
// ============================================

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

/**
 * Check if a role has at least the required permission level
 */
export function hasRolePermission(userRole: MemberRole, requiredRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ============================================
// DEFAULT VALUES
// ============================================

/**
 * Default group settings
 */
export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  allowMemberPosts: true,
  requirePostApproval: false,
  allowPolls: true,
  allowImages: true,
};

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  newPosts: true,
  mentions: true,
  announcements: true,
};
