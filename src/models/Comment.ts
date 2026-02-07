import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Comment interface with enhanced fields for nested replies and engagement tracking
 */
export interface IComment extends Document {
  // Core relationships
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorPhone: string;
  
  // Content
  content: string;
  
  // Nested reply support
  parentComment?: mongoose.Types.ObjectId; // Reference to parent comment for replies
  
  // Engagement tracking
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  repliesCount: number;
  
  // Helpful marking (can be marked by post author)
  isHelpful: boolean;
  helpfulMarkedBy?: mongoose.Types.ObjectId; // User who marked it as helpful
  helpfulMarkedAt?: Date;
  
  // Mentions support
  mentions: mongoose.Types.ObjectId[]; // Users mentioned in the comment
  
  // Edit tracking
  isEdited: boolean;
  editedAt?: Date;
  
  // Soft delete support
  isDeleted: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    // Core relationships
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorPhone: {
      type: String,
      required: true,
    },
    
    // Content
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
      trim: true,
    },
    
    // Nested reply support
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      index: true, // Index for efficient reply queries
    },
    
    // Engagement tracking
    likes: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      default: [],
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Helpful marking
    isHelpful: {
      type: Boolean,
      default: false,
      index: true, // Index for sorting by helpful
    },
    helpfulMarkedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    helpfulMarkedAt: {
      type: Date,
    },
    
    // Mentions support
    mentions: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      default: [],
    },
    
    // Edit tracking
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    
    // Soft delete support
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
// INDEXES FOR EFFICIENT QUERIES
// ============================================

// Primary comment query - comments for a post sorted by time
CommentSchema.index({ post: 1, createdAt: -1 });

// Top-level comments only (no parent)
CommentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });

// Replies to a specific comment
CommentSchema.index({ parentComment: 1, createdAt: -1 });

// Comments sorted by helpful status first
CommentSchema.index({ post: 1, isHelpful: -1, likesCount: -1, createdAt: -1 });

// User's comments
CommentSchema.index({ author: 1, createdAt: -1 });

// Active comments (not deleted)
CommentSchema.index({ post: 1, isDeleted: 1, createdAt: -1 });

// Compound index for fetching top-level comments with helpful sorting
CommentSchema.index({
  post: 1,
  parentComment: 1,
  isDeleted: 1,
  isHelpful: -1,
  likesCount: -1,
});

// ============================================
// VIRTUAL FIELDS
// ============================================

// Virtual to check if comment is a reply
CommentSchema.virtual('isReply').get(function() {
  return !!this.parentComment;
});

// Virtual to check if comment is editable (within 15 minutes)
CommentSchema.virtual('isEditable').get(function() {
  const fifteenMinutes = 15 * 60 * 1000;
  const now = new Date().getTime();
  const createdTime = this.createdAt.getTime();
  return (now - createdTime) <= fifteenMinutes;
});

// Virtual for edit window remaining time in seconds
CommentSchema.virtual('editWindowRemaining').get(function() {
  const fifteenMinutes = 15 * 60 * 1000;
  const now = new Date().getTime();
  const createdTime = this.createdAt.getTime();
  const remaining = fifteenMinutes - (now - createdTime);
  return Math.max(0, Math.floor(remaining / 1000));
});

// ============================================
// METHODS
// ============================================

/**
 * Mark comment as helpful by post author
 */
CommentSchema.methods.markAsHelpful = async function(
  userId: mongoose.Types.ObjectId
): Promise<void> {
  this.isHelpful = true;
  this.helpfulMarkedBy = userId;
  this.helpfulMarkedAt = new Date();
  await this.save();
};

/**
 * Unmark comment as helpful
 */
CommentSchema.methods.unmarkAsHelpful = async function(): Promise<void> {
  this.isHelpful = false;
  this.helpfulMarkedBy = undefined;
  this.helpfulMarkedAt = undefined;
  await this.save();
};

/**
 * Toggle helpful status
 */
CommentSchema.methods.toggleHelpful = async function(
  userId: mongoose.Types.ObjectId
): Promise<boolean> {
  if (this.isHelpful) {
    await this.unmarkAsHelpful();
    return false;
  } else {
    await this.markAsHelpful(userId);
    return true;
  }
};

/**
 * Update content with edit tracking
 */
CommentSchema.methods.updateContent = async function(
  newContent: string
): Promise<void> {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  await this.save();
};

/**
 * Check if user has liked this comment
 */
CommentSchema.methods.isLikedBy = function(
  userId: mongoose.Types.ObjectId
): boolean {
  return this.likes.some(
    (likeId: mongoose.Types.ObjectId) => likeId.toString() === userId.toString()
  );
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find active comments (not deleted)
 */
CommentSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isDeleted: false });
};

/**
 * Find top-level comments for a post
 */
CommentSchema.statics.findTopLevelComments = function(
  postId: mongoose.Types.ObjectId,
  options: { limit?: number; skip?: number; sortBy?: 'newest' | 'oldest' | 'helpful' } = {}
) {
  const { limit = 10, skip = 0, sortBy = 'newest' } = options;
  
  let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
  
  if (sortBy === 'oldest') {
    sortQuery = { createdAt: 1 };
  } else if (sortBy === 'helpful') {
    sortQuery = { isHelpful: -1, likesCount: -1, createdAt: -1 };
  }
  
  return this.find({
    post: postId,
    parentComment: null,
    isDeleted: false,
  })
    .sort(sortQuery)
    .skip(skip)
    .limit(limit)
    .populate('author', 'fullName profileImage role');
};

/**
 * Find replies to a comment
 */
CommentSchema.statics.findReplies = function(
  commentId: mongoose.Types.ObjectId,
  options: { limit?: number; skip?: number } = {}
) {
  const { limit = 5, skip = 0 } = options;
  
  return this.find({
    parentComment: commentId,
    isDeleted: false,
  })
    .sort({ createdAt: 1 }) // Replies shown oldest first
    .skip(skip)
    .limit(limit)
    .populate('author', 'fullName profileImage role');
};

/**
 * Count replies to a comment
 */
CommentSchema.statics.countReplies = function(commentId: mongoose.Types.ObjectId) {
  return this.countDocuments({
    parentComment: commentId,
    isDeleted: false,
  });
};

// Ensure virtuals are included in JSON output
CommentSchema.set('toJSON', { virtuals: true });
CommentSchema.set('toObject', { virtuals: true });

// Prevent model compilation error in development with hot reload
const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;
