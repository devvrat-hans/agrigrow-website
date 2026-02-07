/**
 * GroupPost Model
 * 
 * Posts within groups for the Agrigrow platform communities.
 * Supports various post types including discussions, questions, announcements, polls, and resources.
 * 
 * Features:
 * - Multiple post types with type-specific features
 * - Poll support with voting
 * - Pinned posts for important content
 * - Post approval workflow for moderated groups
 * - Soft deletion with audit trail
 * - Mentions support
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Types of posts that can be created in a group
 */
export type GroupPostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'resource';

/**
 * Poll option with text and vote tracking
 */
export interface IPollOption {
  /** Option text */
  text: string;
  /** Number of votes */
  votes: number;
}

/**
 * Poll data for poll-type posts
 */
export interface IPollData {
  /** Poll question */
  question: string;
  /** Array of poll options */
  options: IPollOption[];
  /** When the poll ends */
  endDate?: Date;
  /** Array of user IDs who have voted */
  voterIds: mongoose.Types.ObjectId[];
}

/**
 * GroupPost document interface
 */
export interface IGroupPost extends Document {
  /** Reference to the group */
  groupId: mongoose.Types.ObjectId;
  /** Author of the post */
  author: mongoose.Types.ObjectId;
  /** Post content text */
  content: string;
  /** Array of image URLs (max 4) */
  images: string[];
  /** Type of post */
  postType: GroupPostType;
  /** Poll data (for poll-type posts) */
  poll?: IPollData;
  /** Whether the post is pinned */
  isPinned: boolean;
  /** User who pinned the post */
  pinnedBy?: mongoose.Types.ObjectId;
  /** When the post was pinned */
  pinnedAt?: Date;
  /** Whether the post has been approved (for moderated groups) */
  isApproved: boolean;
  /** User who approved the post */
  approvedBy?: mongoose.Types.ObjectId;
  /** When the post was approved */
  approvedAt?: Date;
  /** Number of likes */
  likesCount: number;
  /** Number of comments */
  commentsCount: number;
  /** Array of user IDs who liked */
  likes: mongoose.Types.ObjectId[];
  /** Array of mentioned user IDs */
  mentions: mongoose.Types.ObjectId[];
  /** Array of tags */
  tags: string[];
  /** Whether the post has been edited */
  isEdited: boolean;
  /** When the post was last edited */
  editedAt?: Date;
  /** Soft delete flag */
  isDeleted: boolean;
  /** User who deleted the post */
  deletedBy?: mongoose.Types.ObjectId;
  /** Reason for deletion */
  deletedReason?: string;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GroupPost model static methods
 */
export interface IGroupPostModel extends Model<IGroupPost> {
  /** Get paginated posts for a group feed */
  getGroupFeed(
    groupId: mongoose.Types.ObjectId | string,
    options?: {
      page?: number;
      limit?: number;
      postType?: GroupPostType;
      includeUnapproved?: boolean;
    }
  ): Promise<{ posts: IGroupPost[]; totalCount: number; hasNextPage: boolean }>;
  /** Get posts by author in a group */
  getPostsByAuthor(
    groupId: mongoose.Types.ObjectId | string,
    authorId: mongoose.Types.ObjectId | string,
    limit?: number
  ): Promise<IGroupPost[]>;
  /** Get pending approval posts for a group */
  getPendingPosts(groupId: mongoose.Types.ObjectId | string): Promise<IGroupPost[]>;
}

// ============================================
// CONSTANTS
// ============================================

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
 * Post type icons for UI (Tabler icon names)
 */
export const POST_TYPE_ICONS: Record<GroupPostType, string> = {
  discussion: 'message-circle',
  question: 'help-circle',
  announcement: 'speakerphone',
  poll: 'chart-bar',
  resource: 'file-text',
};

/**
 * Maximum images allowed per post
 */
export const MAX_POST_IMAGES = 4;

/**
 * Maximum content length
 */
export const MAX_POST_CONTENT_LENGTH = 5000;

/**
 * Maximum poll options
 */
export const MAX_POLL_OPTIONS = 10;

// ============================================
// SCHEMA DEFINITIONS
// ============================================

/**
 * Poll option sub-schema
 */
const PollOptionSchema = new Schema<IPollOption>(
  {
    text: {
      type: String,
      required: [true, 'Poll option text is required'],
      trim: true,
      maxlength: [200, 'Poll option cannot exceed 200 characters'],
    },
    votes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * Poll data sub-schema
 */
const PollDataSchema = new Schema<IPollData>(
  {
    question: {
      type: String,
      required: [true, 'Poll question is required'],
      trim: true,
      maxlength: [500, 'Poll question cannot exceed 500 characters'],
    },
    options: {
      type: [PollOptionSchema],
      validate: {
        validator: function(options: IPollOption[]) {
          return options.length >= 2 && options.length <= MAX_POLL_OPTIONS;
        },
        message: `Poll must have between 2 and ${MAX_POLL_OPTIONS} options`,
      },
    },
    endDate: {
      type: Date,
    },
    voterIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  { _id: false }
);

/**
 * Main GroupPost Schema
 */
const GroupPostSchema = new Schema<IGroupPost, IGroupPostModel>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [MAX_POST_CONTENT_LENGTH, `Post content cannot exceed ${MAX_POST_CONTENT_LENGTH} characters`],
    },
    images: {
      type: [String],
      validate: {
        validator: function(images: string[]) {
          return images.length <= MAX_POST_IMAGES;
        },
        message: `Maximum ${MAX_POST_IMAGES} images allowed per post`,
      },
      default: [],
    },
    postType: {
      type: String,
      enum: {
        values: ['discussion', 'question', 'announcement', 'poll', 'resource'] as GroupPostType[],
        message: 'Invalid post type',
      },
      default: 'discussion',
    },
    poll: {
      type: PollDataSchema,
      default: undefined,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pinnedAt: {
      type: Date,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Deletion reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Main feed index: group's posts sorted by recent, excluding deleted
GroupPostSchema.index(
  { groupId: 1, isDeleted: 1, createdAt: -1 },
  { name: 'group_feed_main' }
);

// Pinned posts first, then by date
GroupPostSchema.index(
  { groupId: 1, isPinned: -1, createdAt: -1 },
  { name: 'group_feed_pinned_first' }
);

// Filter by post type
GroupPostSchema.index(
  { groupId: 1, postType: 1, createdAt: -1 },
  { name: 'group_feed_by_type' }
);

// User's posts in a group
GroupPostSchema.index(
  { author: 1, groupId: 1, createdAt: -1 },
  { name: 'user_group_posts' }
);

// Pending approval queue
GroupPostSchema.index(
  { groupId: 1, isApproved: 1 },
  { name: 'group_pending_approval' }
);

// For finding posts with mentions
GroupPostSchema.index(
  { mentions: 1, createdAt: -1 },
  { name: 'posts_by_mentions' }
);

// For trending/popular posts
GroupPostSchema.index(
  { groupId: 1, likesCount: -1, commentsCount: -1, createdAt: -1 },
  { name: 'group_popular_posts' }
);

// Text search on content and tags
GroupPostSchema.index(
  { content: 'text', tags: 'text' },
  { 
    name: 'post_text_search',
    weights: { content: 1, tags: 2 },
  }
);

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual populate for author details
 */
GroupPostSchema.virtual('authorInfo', {
  ref: 'User',
  localField: 'author',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for group details
 */
GroupPostSchema.virtual('group', {
  ref: 'Group',
  localField: 'groupId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for approver details
 */
GroupPostSchema.virtual('approver', {
  ref: 'User',
  localField: 'approvedBy',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for mentioned users
 */
GroupPostSchema.virtual('mentionedUsers', {
  ref: 'User',
  localField: 'mentions',
  foreignField: '_id',
});

/**
 * Virtual for checking if poll has ended
 */
GroupPostSchema.virtual('isPollEnded').get(function() {
  if (this.postType !== 'poll' || !this.poll?.endDate) {
    return false;
  }
  return new Date() > this.poll.endDate;
});

/**
 * Virtual for total poll votes
 */
GroupPostSchema.virtual('totalPollVotes').get(function() {
  if (this.postType !== 'poll' || !this.poll) {
    return 0;
  }
  return this.poll.options.reduce((sum, opt) => sum + opt.votes, 0);
});

// Enable virtuals in JSON and object output
GroupPostSchema.set('toJSON', { virtuals: true });
GroupPostSchema.set('toObject', { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get paginated posts for a group feed
 */
GroupPostSchema.statics.getGroupFeed = async function(
  groupId: mongoose.Types.ObjectId | string,
  options: {
    page?: number;
    limit?: number;
    postType?: GroupPostType;
    includeUnapproved?: boolean;
  } = {}
): Promise<{ posts: IGroupPost[]; totalCount: number; hasNextPage: boolean }> {
  const {
    page = 1,
    limit = 20,
    postType,
    includeUnapproved = false,
  } = options;

  const query: Record<string, unknown> = {
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    isDeleted: false,
  };

  if (!includeUnapproved) {
    query.isApproved = true;
  }

  if (postType) {
    query.postType = postType;
  }

  const skip = (page - 1) * limit;

  const [posts, totalCount] = await Promise.all([
    this.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName profileImage role region')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    posts,
    totalCount,
    hasNextPage: skip + posts.length < totalCount,
  };
};

/**
 * Get posts by author in a group
 */
GroupPostSchema.statics.getPostsByAuthor = async function(
  groupId: mongoose.Types.ObjectId | string,
  authorId: mongoose.Types.ObjectId | string,
  limit = 10
): Promise<IGroupPost[]> {
  return this.find({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    author: new mongoose.Types.ObjectId(authorId.toString()),
    isDeleted: false,
    isApproved: true,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'fullName profileImage role region')
    .lean();
};

/**
 * Get pending approval posts for a group
 */
GroupPostSchema.statics.getPendingPosts = async function(
  groupId: mongoose.Types.ObjectId | string
): Promise<IGroupPost[]> {
  return this.find({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    isApproved: false,
    isDeleted: false,
  })
    .sort({ createdAt: 1 }) // Oldest first
    .populate('author', 'fullName profileImage role region')
    .lean();
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if a user has liked this post
 */
GroupPostSchema.methods.hasUserLiked = function(userId: mongoose.Types.ObjectId | string): boolean {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  return this.likes.some((likeId: mongoose.Types.ObjectId) => likeId.equals(userObjectId));
};

/**
 * Check if a user has voted in this poll
 */
GroupPostSchema.methods.hasUserVoted = function(userId: mongoose.Types.ObjectId | string): boolean {
  if (this.postType !== 'poll' || !this.poll) {
    return false;
  }
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  return this.poll.voterIds.some((voterId: mongoose.Types.ObjectId) => voterId.equals(userObjectId));
};

/**
 * Cast a vote in a poll
 */
GroupPostSchema.methods.castVote = async function(
  userId: mongoose.Types.ObjectId | string,
  optionIndex: number
): Promise<IGroupPost> {
  if (this.postType !== 'poll' || !this.poll) {
    throw new Error('This post is not a poll');
  }

  const userObjectId = new mongoose.Types.ObjectId(userId.toString());

  // Check if user already voted
  if (this.poll.voterIds.some((voterId: mongoose.Types.ObjectId) => voterId.equals(userObjectId))) {
    throw new Error('User has already voted');
  }

  // Check if poll has ended
  if (this.poll.endDate && new Date() > this.poll.endDate) {
    throw new Error('Poll has ended');
  }

  // Validate option index
  if (optionIndex < 0 || optionIndex >= this.poll.options.length) {
    throw new Error('Invalid option index');
  }

  // Increment vote count and add voter
  this.poll.options[optionIndex].votes += 1;
  this.poll.voterIds.push(userObjectId);

  return this.save();
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Validate poll data and set timestamps
 */
GroupPostSchema.pre('save', function() {
  // Require poll data for poll-type posts
  if (this.postType === 'poll' && !this.poll) {
    throw new Error('Poll data is required for poll-type posts');
  }

  // Clear poll data for non-poll posts
  if (this.postType !== 'poll') {
    this.poll = undefined;
  }

  // Set editedAt if content is modified (not on first save)
  if (!this.isNew && this.isModified('content')) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
});

// ============================================
// MODEL EXPORT
// ============================================

// Delete existing model in development to prevent OverwriteModelError
const GroupPost = (mongoose.models.GroupPost as IGroupPostModel) || 
  mongoose.model<IGroupPost, IGroupPostModel>('GroupPost', GroupPostSchema);

export default GroupPost;
