import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Notification type enum for different notification categories
 */
export type NotificationType = 
  | 'like'           // Someone liked your post
  | 'comment'        // Someone commented on your post
  | 'reply'          // Someone replied to your comment
  | 'mention'        // Someone mentioned you in a post or comment
  | 'follow'         // Someone followed you
  | 'share'          // Someone shared your post
  | 'repost'         // Someone reposted your post
  | 'helpful'        // Your comment was marked as helpful
  | 'post_milestone' // Your post reached a milestone (e.g., 100 likes)
  | 'system'         // System notification
  // Group-related notification types
  | 'group_invite'           // You've been invited to a group
  | 'group_join_request'     // Someone requested to join your group
  | 'group_join_approved'    // Your join request was approved
  | 'group_post_approved'    // Your post in a group was approved
  | 'group_post_mention'     // Someone mentioned you in a group post
  | 'group_comment_mention'  // Someone mentioned you in a group comment
  | 'group_post_comment'     // Someone commented on your group post
  | 'group_comment_reply'    // Someone replied to your group comment
  | 'group_post_like'        // Someone liked your group post
  | 'group_announcement'     // New announcement in a group
  | 'group_role_change';     // Your role in a group changed

/**
 * Notification metadata interface for group-related notifications
 */
export interface NotificationMetadata {
  // Group related
  groupId?: string;
  groupName?: string;
  groupSlug?: string;
  // Post/Comment related
  groupPostId?: string;
  groupCommentId?: string;
  // Role related
  previousRole?: string;
  newRole?: string;
  // Other optional fields
  [key: string]: unknown;
}

/**
 * Notification interface for user notifications
 */
export interface INotification extends Document {
  // User receiving the notification
  userId: mongoose.Types.ObjectId;
  
  // Type of notification
  type: NotificationType;
  
  // User who triggered the notification (optional for system notifications)
  fromUser?: mongoose.Types.ObjectId;
  
  // Related post (if applicable)
  postId?: mongoose.Types.ObjectId;
  
  // Related comment (if applicable)
  commentId?: mongoose.Types.ObjectId;
  
  // Related group (if applicable)
  groupId?: mongoose.Types.ObjectId;
  
  // Related group post (if applicable)
  groupPostId?: mongoose.Types.ObjectId;
  
  // Notification message (pre-rendered or template)
  message: string;
  
  // Additional data for notification (flexible JSON)
  metadata?: NotificationMetadata;
  
  // Read status
  isRead: boolean;
  
  // Clicked/opened status
  isClicked: boolean;
  
  // Expiration date (for auto-cleanup)
  expiresAt?: Date;
  
  // Timestamps
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    // User receiving the notification
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Type of notification
    type: {
      type: String,
      enum: [
        'like',
        'comment',
        'reply',
        'mention',
        'follow',
        'share',
        'repost',
        'helpful',
        'post_milestone',
        'system',
        // Group-related types
        'group_invite',
        'group_join_request',
        'group_join_approved',
        'group_post_approved',
        'group_post_mention',
        'group_comment_mention',
        'group_post_comment',
        'group_comment_reply',
        'group_post_like',
        'group_announcement',
        'group_role_change',
      ],
      required: true,
      index: true,
    },
    
    // User who triggered the notification
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // Related post
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    
    // Related comment
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    
    // Related group (for group notifications)
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      index: true,
    },
    
    // Related group post (for group notifications)
    groupPostId: {
      type: Schema.Types.ObjectId,
      ref: 'GroupPost',
    },
    
    // Notification message
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    
    // Additional metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
    
    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Clicked status
    isClicked: {
      type: Boolean,
      default: false,
    },
    
    // Expiration date (TTL index defined separately in schema.index())
    expiresAt: {
      type: Date,
      // Note: Don't add index: true here - TTL index is defined below
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ============================================
// INDEXES FOR EFFICIENT QUERIES
// ============================================

// Primary query index - user's unread notifications sorted by date
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// User's notifications by type
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// For cleanup jobs - expired notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent duplicate notifications
NotificationSchema.index(
  { userId: 1, type: 1, fromUser: 1, postId: 1, commentId: 1 },
  { sparse: true }
);

// ============================================
// VIRTUAL FIELDS
// ============================================

/**
 * Age of notification in hours
 */
NotificationSchema.virtual('ageInHours').get(function() {
  return Math.floor(
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60)
  );
});

/**
 * Human-readable time ago
 */
NotificationSchema.virtual('timeAgo').get(function() {
  const seconds = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark notification as read
 */
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

/**
 * Mark notification as clicked
 */
NotificationSchema.methods.markAsClicked = function() {
  this.isRead = true;
  this.isClicked = true;
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get unread count for a user
 */
NotificationSchema.statics.getUnreadCount = function(
  userId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({ userId, isRead: false });
};

/**
 * Get notifications for a user with pagination
 */
NotificationSchema.statics.getForUser = function(
  userId: mongoose.Types.ObjectId,
  options: {
    type?: NotificationType;
    isRead?: boolean;
    cursor?: string;
    limit?: number;
  } = {}
) {
  const { type, isRead, cursor, limit = 20 } = options;
  
  const query: Record<string, unknown> = { userId };
  
  if (type) query.type = type;
  if (typeof isRead === 'boolean') query.isRead = isRead;
  if (cursor) query.createdAt = { $lt: new Date(cursor) };
  
  return this.find(query)
    .populate('fromUser', 'name phone profileImage badges')
    .populate('postId', 'content images postType')
    .sort({ createdAt: -1 })
    .limit(limit + 1);
};

/**
 * Mark all notifications as read for a user
 */
NotificationSchema.statics.markAllAsRead = function(
  userId: mongoose.Types.ObjectId
) {
  return this.updateMany({ userId, isRead: false }, { isRead: true });
};

/**
 * Mark notifications of a specific type as read
 */
NotificationSchema.statics.markTypeAsRead = function(
  userId: mongoose.Types.ObjectId,
  type: NotificationType
) {
  return this.updateMany({ userId, type, isRead: false }, { isRead: true });
};

/**
 * Create a like notification
 */
NotificationSchema.statics.createLikeNotification = async function(
  postOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId,
  fromUserName: string
) {
  // Don't notify if user likes their own post
  if (postOwnerId.toString() === fromUserId.toString()) return null;
  
  // Check for existing notification to prevent duplicates
  const existing = await this.findOne({
    userId: postOwnerId,
    type: 'like',
    fromUser: fromUserId,
    postId,
  });
  
  if (existing) return existing;
  
  return this.create({
    userId: postOwnerId,
    type: 'like',
    fromUser: fromUserId,
    postId,
    message: `${fromUserName} liked your post`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a comment notification
 */
NotificationSchema.statics.createCommentNotification = async function(
  postOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId,
  commentId: mongoose.Types.ObjectId,
  fromUserName: string
) {
  // Don't notify if user comments on their own post
  if (postOwnerId.toString() === fromUserId.toString()) return null;
  
  return this.create({
    userId: postOwnerId,
    type: 'comment',
    fromUser: fromUserId,
    postId,
    commentId,
    message: `${fromUserName} commented on your post`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a reply notification
 */
NotificationSchema.statics.createReplyNotification = async function(
  commentOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId,
  commentId: mongoose.Types.ObjectId,
  fromUserName: string
) {
  // Don't notify if user replies to their own comment
  if (commentOwnerId.toString() === fromUserId.toString()) return null;
  
  return this.create({
    userId: commentOwnerId,
    type: 'reply',
    fromUser: fromUserId,
    postId,
    commentId,
    message: `${fromUserName} replied to your comment`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a mention notification
 */
NotificationSchema.statics.createMentionNotification = async function(
  mentionedUserId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId,
  commentId: mongoose.Types.ObjectId | null,
  fromUserName: string
) {
  // Don't notify if user mentions themselves
  if (mentionedUserId.toString() === fromUserId.toString()) return null;
  
  const message = commentId
    ? `${fromUserName} mentioned you in a comment`
    : `${fromUserName} mentioned you in a post`;
  
  const notificationData: Record<string, unknown> = {
    userId: mentionedUserId,
    type: 'mention',
    fromUser: fromUserId,
    postId,
    message,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
  
  // Only add commentId if it's not null
  if (commentId) {
    notificationData.commentId = commentId;
  }
  
  return this.create(notificationData);
};

/**
 * Create a share notification
 */
NotificationSchema.statics.createShareNotification = async function(
  postOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId,
  fromUserName: string,
  shareType: string
) {
  // Don't notify if user shares their own post
  if (postOwnerId.toString() === fromUserId.toString()) return null;
  
  const message = shareType === 'repost'
    ? `${fromUserName} reposted your post`
    : `${fromUserName} shared your post`;
  
  return this.create({
    userId: postOwnerId,
    type: shareType === 'repost' ? 'repost' : 'share',
    fromUser: fromUserId,
    postId,
    message,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a helpful notification
 */
NotificationSchema.statics.createHelpfulNotification = async function(
  commentOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId,
  commentId: mongoose.Types.ObjectId,
  fromUserName: string
) {
  // Don't notify if user marks their own comment as helpful
  if (commentOwnerId.toString() === fromUserId.toString()) return null;
  
  return this.create({
    userId: commentOwnerId,
    type: 'helpful',
    fromUser: fromUserId,
    postId,
    commentId,
    message: `${fromUserName} marked your comment as helpful`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a milestone notification
 */
NotificationSchema.statics.createMilestoneNotification = async function(
  userId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId,
  milestone: number,
  milestoneType: 'likes' | 'views' | 'comments'
) {
  const messages: Record<string, Record<number, string>> = {
    likes: {
      10: 'Your post reached 10 likes! 🎉',
      50: 'Your post reached 50 likes! 🔥',
      100: 'Your post reached 100 likes! 🌟',
      500: 'Your post reached 500 likes! 🏆',
    },
    views: {
      100: 'Your post reached 100 views!',
      500: 'Your post reached 500 views!',
      1000: 'Your post reached 1,000 views! 🎯',
    },
    comments: {
      10: 'Your post has 10 comments!',
      50: 'Your post has 50 comments! Great discussion!',
    },
  };
  
  const message = messages[milestoneType]?.[milestone];
  if (!message) return null;
  
  return this.create({
    userId,
    type: 'post_milestone',
    postId,
    message,
    metadata: { milestone, milestoneType },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
};

// ============================================
// GROUP NOTIFICATION STATIC METHODS
// ============================================

/**
 * Create a group invite notification
 */
NotificationSchema.statics.createGroupInviteNotification = async function(
  invitedUserId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  _fromUserName: string
) {
  return this.create({
    userId: invitedUserId,
    type: 'group_invite',
    fromUser: fromUserId,
    groupId,
    message: `invited you to join ${groupName}`,
    metadata: { groupId: groupId.toString(), groupName, groupSlug },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
};

/**
 * Create a group join request notification (for group admins)
 */
NotificationSchema.statics.createGroupJoinRequestNotification = async function(
  adminUserId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  _fromUserName: string
) {
  return this.create({
    userId: adminUserId,
    type: 'group_join_request',
    fromUser: fromUserId,
    groupId,
    message: `requested to join ${groupName}`,
    metadata: { groupId: groupId.toString(), groupName, groupSlug },
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  });
};

/**
 * Create a group join approved notification
 */
NotificationSchema.statics.createGroupJoinApprovedNotification = async function(
  userId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string
) {
  return this.create({
    userId,
    type: 'group_join_approved',
    groupId,
    message: `Your request to join ${groupName} has been approved!`,
    metadata: { groupId: groupId.toString(), groupName, groupSlug },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
};

/**
 * Create a group post approved notification
 */
NotificationSchema.statics.createGroupPostApprovedNotification = async function(
  userId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupPostId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string
) {
  return this.create({
    userId,
    type: 'group_post_approved',
    groupId,
    groupPostId,
    message: `Your post in ${groupName} has been approved`,
    metadata: { groupId: groupId.toString(), groupName, groupSlug, groupPostId: groupPostId.toString() },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
};

/**
 * Create a group post mention notification
 */
NotificationSchema.statics.createGroupPostMentionNotification = async function(
  mentionedUserId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupPostId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  _fromUserName: string
) {
  // Don't notify if user mentions themselves
  if (mentionedUserId.toString() === fromUserId.toString()) return null;
  
  return this.create({
    userId: mentionedUserId,
    type: 'group_post_mention',
    fromUser: fromUserId,
    groupId,
    groupPostId,
    message: `mentioned you in a post in ${groupName}`,
    metadata: { groupId: groupId.toString(), groupName, groupSlug, groupPostId: groupPostId.toString() },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a group comment mention notification
 */
NotificationSchema.statics.createGroupCommentMentionNotification = async function(
  mentionedUserId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupPostId: mongoose.Types.ObjectId,
  commentId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  _fromUserName: string
) {
  // Don't notify if user mentions themselves
  if (mentionedUserId.toString() === fromUserId.toString()) return null;
  
  return this.create({
    userId: mentionedUserId,
    type: 'group_comment_mention',
    fromUser: fromUserId,
    groupId,
    groupPostId,
    commentId,
    message: `mentioned you in a comment in ${groupName}`,
    metadata: { 
      groupId: groupId.toString(), 
      groupName, 
      groupSlug, 
      groupPostId: groupPostId.toString(),
      groupCommentId: commentId.toString()
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a group post comment notification
 */
NotificationSchema.statics.createGroupPostCommentNotification = async function(
  postOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupPostId: mongoose.Types.ObjectId,
  commentId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  _fromUserName: string
) {
  // Don't notify if user comments on their own post
  if (postOwnerId.toString() === fromUserId.toString()) return null;
  
  return this.create({
    userId: postOwnerId,
    type: 'group_post_comment',
    fromUser: fromUserId,
    groupId,
    groupPostId,
    commentId,
    message: `commented on your post in ${groupName}`,
    metadata: { 
      groupId: groupId.toString(), 
      groupName, 
      groupSlug, 
      groupPostId: groupPostId.toString(),
      groupCommentId: commentId.toString()
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a group comment reply notification
 */
NotificationSchema.statics.createGroupCommentReplyNotification = async function(
  commentOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupPostId: mongoose.Types.ObjectId,
  commentId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  _fromUserName: string
) {
  // Don't notify if user replies to their own comment
  if (commentOwnerId.toString() === fromUserId.toString()) return null;
  
  return this.create({
    userId: commentOwnerId,
    type: 'group_comment_reply',
    fromUser: fromUserId,
    groupId,
    groupPostId,
    commentId,
    message: `replied to your comment in ${groupName}`,
    metadata: { 
      groupId: groupId.toString(), 
      groupName, 
      groupSlug, 
      groupPostId: groupPostId.toString(),
      groupCommentId: commentId.toString()
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a group post like notification
 */
NotificationSchema.statics.createGroupPostLikeNotification = async function(
  postOwnerId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  groupPostId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  _fromUserName: string
) {
  // Don't notify if user likes their own post
  if (postOwnerId.toString() === fromUserId.toString()) return null;
  
  // Check for existing notification to prevent duplicates
  const existing = await this.findOne({
    userId: postOwnerId,
    type: 'group_post_like',
    fromUser: fromUserId,
    groupPostId,
  });
  
  if (existing) return existing;
  
  return this.create({
    userId: postOwnerId,
    type: 'group_post_like',
    fromUser: fromUserId,
    groupId,
    groupPostId,
    message: `liked your post in ${groupName}`,
    metadata: { groupId: groupId.toString(), groupName, groupSlug, groupPostId: groupPostId.toString() },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Create a group announcement notification
 */
NotificationSchema.statics.createGroupAnnouncementNotification = async function(
  userId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId | null,
  groupId: mongoose.Types.ObjectId,
  groupPostId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string
) {
  const notificationData: Record<string, unknown> = {
    userId,
    type: 'group_announcement',
    groupId,
    groupPostId,
    message: `New announcement in ${groupName}`,
    metadata: { groupId: groupId.toString(), groupName, groupSlug, groupPostId: groupPostId.toString() },
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  };
  
  if (fromUserId) {
    notificationData.fromUser = fromUserId;
  }
  
  return this.create(notificationData);
};

/**
 * Create a group role change notification
 */
NotificationSchema.statics.createGroupRoleChangeNotification = async function(
  userId: mongoose.Types.ObjectId,
  fromUserId: mongoose.Types.ObjectId | null,
  groupId: mongoose.Types.ObjectId,
  groupName: string,
  groupSlug: string,
  previousRole: string,
  newRole: string
) {
  const roleLabels: Record<string, string> = {
    member: 'Member',
    moderator: 'Moderator',
    admin: 'Admin',
    owner: 'Owner',
  };
  
  const message = newRole === 'member'
    ? `Your moderator/admin privileges in ${groupName} have been removed`
    : `You've been promoted to ${roleLabels[newRole] || newRole} in ${groupName}`;
  
  const notificationData: Record<string, unknown> = {
    userId,
    type: 'group_role_change',
    groupId,
    message,
    metadata: { 
      groupId: groupId.toString(), 
      groupName, 
      groupSlug, 
      previousRole, 
      newRole 
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
  
  if (fromUserId) {
    notificationData.fromUser = fromUserId;
  }
  
  return this.create(notificationData);
};

/**
 * Cleanup old notifications
 */
NotificationSchema.statics.cleanupOld = function(olderThan: Date) {
  return this.deleteMany({
    createdAt: { $lt: olderThan },
    isRead: true,
  });
};

// Enable virtuals in JSON output
NotificationSchema.set('toJSON', { virtuals: true });
NotificationSchema.set('toObject', { virtuals: true });

// Prevent model compilation error in development with hot reload
const Notification: Model<INotification> = 
  mongoose.models.Notification || 
  mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
