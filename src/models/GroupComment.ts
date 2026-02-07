/**
 * GroupComment Model
 * 
 * Comments on group posts for the Agrigrow platform communities.
 * Supports nested replies up to 2 levels deep.
 * 
 * Features:
 * - Threaded comments with parent/child relationships
 * - Maximum nesting depth of 2
 * - Likes and helpful marking
 * - Mentions support
 * - Soft deletion
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * GroupComment document interface
 */
export interface IGroupComment extends Document {
  /** Reference to the post this comment belongs to */
  postId: mongoose.Types.ObjectId;
  /** Reference to the group (denormalized for efficient queries) */
  groupId: mongoose.Types.ObjectId;
  /** Author of the comment */
  author: mongoose.Types.ObjectId;
  /** Comment content text */
  content: string;
  /** Parent comment ID (null for top-level comments) */
  parentId: mongoose.Types.ObjectId | null;
  /** Nesting depth (0 for top-level, max 2) */
  depth: number;
  /** Number of replies (only for top-level comments) */
  replyCount: number;
  /** Number of likes */
  likesCount: number;
  /** Array of user IDs who liked */
  likes: mongoose.Types.ObjectId[];
  /** Whether the post author marked this as helpful */
  isHelpful: boolean;
  /** Array of mentioned user IDs */
  mentions: mongoose.Types.ObjectId[];
  /** Whether the comment has been edited */
  isEdited: boolean;
  /** When the comment was last edited */
  editedAt?: Date;
  /** Soft delete flag */
  isDeleted: boolean;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GroupComment model static methods
 */
export interface IGroupCommentModel extends Model<IGroupComment> {
  /** Get paginated comments for a post */
  getPostComments(
    postId: mongoose.Types.ObjectId | string,
    options?: { page?: number; limit?: number }
  ): Promise<{ comments: IGroupComment[]; totalCount: number; hasNextPage: boolean }>;
  /** Get replies for a comment */
  getReplies(
    commentId: mongoose.Types.ObjectId | string,
    options?: { page?: number; limit?: number }
  ): Promise<IGroupComment[]>;
  /** Get user's comments in a group */
  getUserGroupComments(
    groupId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    limit?: number
  ): Promise<IGroupComment[]>;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum comment nesting depth
 */
export const MAX_COMMENT_DEPTH = 2;

/**
 * Maximum comment content length
 */
export const MAX_COMMENT_CONTENT_LENGTH = 2000;

// ============================================
// SCHEMA DEFINITIONS
// ============================================

/**
 * Main GroupComment Schema
 */
const GroupCommentSchema = new Schema<IGroupComment, IGroupCommentModel>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'GroupPost',
      required: [true, 'Post ID is required'],
    },
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
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [MAX_COMMENT_CONTENT_LENGTH, `Comment cannot exceed ${MAX_COMMENT_CONTENT_LENGTH} characters`],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'GroupComment',
      default: null,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: MAX_COMMENT_DEPTH,
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    isHelpful: {
      type: Boolean,
      default: false,
    },
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
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
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Main comment thread: post's top-level comments sorted by creation date
GroupCommentSchema.index(
  { postId: 1, isDeleted: 1, createdAt: 1 },
  { name: 'post_comments_thread' }
);

// Nested replies: get replies for a parent comment
GroupCommentSchema.index(
  { postId: 1, parentId: 1, createdAt: 1 },
  { name: 'comment_replies' }
);

// User's comments in a group
GroupCommentSchema.index(
  { author: 1, groupId: 1, createdAt: -1 },
  { name: 'user_group_comments' }
);

// For finding helpful comments
GroupCommentSchema.index(
  { postId: 1, isHelpful: 1 },
  { name: 'post_helpful_comments' }
);

// For finding top-level comments with most replies
GroupCommentSchema.index(
  { postId: 1, parentId: 1, replyCount: -1, createdAt: -1 },
  { name: 'post_popular_comments' }
);

// For mentions notifications
GroupCommentSchema.index(
  { mentions: 1, createdAt: -1 },
  { name: 'comments_by_mentions' }
);

// For efficient group-level queries
GroupCommentSchema.index(
  { groupId: 1, createdAt: -1 },
  { name: 'group_recent_comments' }
);

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual populate for author details
 */
GroupCommentSchema.virtual('authorInfo', {
  ref: 'User',
  localField: 'author',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for parent comment
 */
GroupCommentSchema.virtual('parent', {
  ref: 'GroupComment',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for replies
 */
GroupCommentSchema.virtual('replies', {
  ref: 'GroupComment',
  localField: '_id',
  foreignField: 'parentId',
});

/**
 * Virtual populate for mentioned users
 */
GroupCommentSchema.virtual('mentionedUsers', {
  ref: 'User',
  localField: 'mentions',
  foreignField: '_id',
});

/**
 * Virtual populate for post details
 */
GroupCommentSchema.virtual('post', {
  ref: 'GroupPost',
  localField: 'postId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual to check if comment is a reply
 */
GroupCommentSchema.virtual('isReply').get(function() {
  return this.parentId !== null;
});

/**
 * Virtual to check if comment can have replies
 */
GroupCommentSchema.virtual('canHaveReplies').get(function() {
  return this.depth < MAX_COMMENT_DEPTH;
});

// Enable virtuals in JSON and object output
GroupCommentSchema.set('toJSON', { virtuals: true });
GroupCommentSchema.set('toObject', { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get paginated comments for a post (top-level only)
 */
GroupCommentSchema.statics.getPostComments = async function(
  postId: mongoose.Types.ObjectId | string,
  options: { page?: number; limit?: number } = {}
): Promise<{ comments: IGroupComment[]; totalCount: number; hasNextPage: boolean }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = {
    postId: new mongoose.Types.ObjectId(postId.toString()),
    parentId: null, // Top-level comments only
    isDeleted: false,
  };

  const [comments, totalCount] = await Promise.all([
    this.find(query)
      .sort({ createdAt: 1 }) // Oldest first for thread continuity
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName profileImage role region')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    comments,
    totalCount,
    hasNextPage: skip + comments.length < totalCount,
  };
};

/**
 * Get replies for a comment
 */
GroupCommentSchema.statics.getReplies = async function(
  commentId: mongoose.Types.ObjectId | string,
  options: { page?: number; limit?: number } = {}
): Promise<IGroupComment[]> {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({
    parentId: new mongoose.Types.ObjectId(commentId.toString()),
    isDeleted: false,
  })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'fullName profileImage role region')
    .lean();
};

/**
 * Get user's comments in a group
 */
GroupCommentSchema.statics.getUserGroupComments = async function(
  groupId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  limit = 10
): Promise<IGroupComment[]> {
  return this.find({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    author: new mongoose.Types.ObjectId(userId.toString()),
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'fullName profileImage role region')
    .populate('post', 'content postType')
    .lean();
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if a user has liked this comment
 */
GroupCommentSchema.methods.hasUserLiked = function(userId: mongoose.Types.ObjectId | string): boolean {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  return this.likes.some((likeId: mongoose.Types.ObjectId) => likeId.equals(userObjectId));
};

/**
 * Toggle like on this comment
 */
GroupCommentSchema.methods.toggleLike = async function(
  userId: mongoose.Types.ObjectId | string
): Promise<IGroupComment> {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  const hasLiked = this.likes.some((likeId: mongoose.Types.ObjectId) => likeId.equals(userObjectId));

  if (hasLiked) {
    // Remove like
    this.likes = this.likes.filter((likeId: mongoose.Types.ObjectId) => !likeId.equals(userObjectId));
    this.likesCount = Math.max(0, this.likesCount - 1);
  } else {
    // Add like
    this.likes.push(userObjectId);
    this.likesCount += 1;
  }

  return this.save();
};

/**
 * Mark/unmark as helpful (only by post author)
 */
GroupCommentSchema.methods.toggleHelpful = async function(): Promise<IGroupComment> {
  this.isHelpful = !this.isHelpful;
  return this.save();
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Enforce max depth and set timestamps
 */
GroupCommentSchema.pre('save', async function() {
  // If this is a reply, validate and set depth
  if (this.parentId && this.isNew) {
    const parentComment = await mongoose.model('GroupComment').findById(this.parentId);
    
    if (!parentComment) {
      throw new Error('Parent comment not found');
    }

    if (parentComment.depth >= MAX_COMMENT_DEPTH) {
      throw new Error(`Maximum comment depth of ${MAX_COMMENT_DEPTH} exceeded`);
    }

    // Set depth based on parent
    this.depth = parentComment.depth + 1;

    // Ensure groupId matches parent's groupId
    if (!this.groupId) {
      this.groupId = parentComment.groupId;
    }

    // Ensure postId matches parent's postId
    if (!this.postId) {
      this.postId = parentComment.postId;
    }
  }

  // Set editedAt if content is modified (not on first save)
  if (!this.isNew && this.isModified('content')) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
});

/**
 * Update parent's reply count when a reply is created
 */
GroupCommentSchema.post('save', async function(doc) {
  if (doc.parentId && doc.depth > 0) {
    // Increment parent's reply count
    await mongoose.model('GroupComment').findByIdAndUpdate(
      doc.parentId,
      { $inc: { replyCount: 1 } }
    );
  }

  // Increment post's comment count
  await mongoose.model('GroupPost').findByIdAndUpdate(
    doc.postId,
    { $inc: { commentsCount: 1 } }
  );
});

/**
 * Update counts when a comment is deleted
 */
GroupCommentSchema.pre('save', async function() {
  // If being soft-deleted, decrement counts
  if (this.isModified('isDeleted') && this.isDeleted) {
    // Decrement parent's reply count if this is a reply
    if (this.parentId) {
      await mongoose.model('GroupComment').findByIdAndUpdate(
        this.parentId,
        { $inc: { replyCount: -1 } }
      );
    }

    // Decrement post's comment count
    await mongoose.model('GroupPost').findByIdAndUpdate(
      this.postId,
      { $inc: { commentsCount: -1 } }
    );
  }
});

// ============================================
// MODEL EXPORT
// ============================================

// Delete existing model in development to prevent OverwriteModelError
const GroupComment = (mongoose.models.GroupComment as IGroupCommentModel) || 
  mongoose.model<IGroupComment, IGroupCommentModel>('GroupComment', GroupCommentSchema);

export default GroupComment;
