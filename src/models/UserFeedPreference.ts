import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface for tracking viewed posts with engagement metrics
 */
export interface IViewedPost {
  postId: mongoose.Types.ObjectId;
  viewDuration: number; // Duration in seconds
  timestamp: Date;
  scrollPercentage?: number; // How far user scrolled through post
  interacted?: boolean; // Whether user liked/commented/shared
}

/**
 * User Feed Preference interface for personalized feed algorithm
 */
export interface IUserFeedPreference extends Document {
  // Reference to user
  userId: mongoose.Types.ObjectId;
  
  // Posts the user has viewed (for deduplication and engagement tracking)
  viewedPosts: IViewedPost[];
  
  // Topics/categories the user has shown interest in (topic -> engagement score)
  likedTopics: Map<string, number>;
  
  // Crops the user has shown interest in (crop -> engagement score)
  likedCrops: Map<string, number>;
  
  // Posts the user has explicitly hidden
  hiddenPosts: mongoose.Types.ObjectId[];
  
  // Users the user has muted
  mutedUsers: mongoose.Types.ObjectId[];
  
  // Authors the user engages with most (userId -> engagement score)
  preferredAuthors: Map<string, number>;
  
  // Last time the feed was refreshed
  lastFeedRefresh: Date;
  
  // Feed settings
  settings: {
    showReposts: boolean;
    prioritizeFollowing: boolean;
    contentTypes: string[]; // Preferred post types
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ViewedPostSchema = new Schema<IViewedPost>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    viewDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    scrollPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    interacted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const UserFeedPreferenceSchema = new Schema<IUserFeedPreference>(
  {
    // Reference to user (unique constraint)
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    
    // Viewed posts array (limited to recent entries for performance)
    viewedPosts: {
      type: [ViewedPostSchema],
      default: [],
    },
    
    // Topic preferences as Map
    likedTopics: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    
    // Crop preferences as Map
    likedCrops: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    
    // Hidden posts
    hiddenPosts: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
      default: [],
      index: true,
    },
    
    // Muted users
    mutedUsers: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      index: true,
    },
    
    // Preferred authors
    preferredAuthors: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    
    // Last feed refresh
    lastFeedRefresh: {
      type: Date,
      default: Date.now,
    },
    
    // Feed settings
    settings: {
      type: {
        showReposts: { type: Boolean, default: true },
        prioritizeFollowing: { type: Boolean, default: true },
        contentTypes: { type: [String], default: ['question', 'update', 'tip', 'problem', 'success_story'] },
      },
      default: {
        showReposts: true,
        prioritizeFollowing: true,
        contentTypes: ['question', 'update', 'tip', 'problem', 'success_story'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES FOR EFFICIENT QUERIES
// ============================================

// Index for last refresh time (for cleanup jobs)
UserFeedPreferenceSchema.index({ lastFeedRefresh: 1 });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Record a post view with engagement metrics
 */
UserFeedPreferenceSchema.methods.recordView = function(
  postId: mongoose.Types.ObjectId,
  viewDuration: number,
  scrollPercentage?: number,
  interacted?: boolean
) {
  // Check if post was already viewed
  const existingIndex = this.viewedPosts.findIndex(
    (vp: IViewedPost) => vp.postId.toString() === postId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing view
    this.viewedPosts[existingIndex].viewDuration += viewDuration;
    this.viewedPosts[existingIndex].timestamp = new Date();
    if (scrollPercentage !== undefined) {
      this.viewedPosts[existingIndex].scrollPercentage = Math.max(
        this.viewedPosts[existingIndex].scrollPercentage || 0,
        scrollPercentage
      );
    }
    if (interacted) {
      this.viewedPosts[existingIndex].interacted = true;
    }
  } else {
    // Add new view
    this.viewedPosts.push({
      postId,
      viewDuration,
      timestamp: new Date(),
      scrollPercentage,
      interacted: interacted || false,
    });
  }
  
  // Keep only the last 1000 viewed posts for performance
  if (this.viewedPosts.length > 1000) {
    this.viewedPosts = this.viewedPosts.slice(-1000);
  }
  
  return this.save();
};

/**
 * Update topic preference score
 */
UserFeedPreferenceSchema.methods.updateTopicScore = function(
  topic: string,
  delta: number
) {
  const currentScore = this.likedTopics.get(topic) || 0;
  this.likedTopics.set(topic, Math.max(0, currentScore + delta));
  return this.save();
};

/**
 * Update crop preference score
 */
UserFeedPreferenceSchema.methods.updateCropScore = function(
  crop: string,
  delta: number
) {
  const currentScore = this.likedCrops.get(crop) || 0;
  this.likedCrops.set(crop, Math.max(0, currentScore + delta));
  return this.save();
};

/**
 * Update author preference score
 */
UserFeedPreferenceSchema.methods.updateAuthorScore = function(
  authorId: string,
  delta: number
) {
  const currentScore = this.preferredAuthors.get(authorId) || 0;
  this.preferredAuthors.set(authorId, Math.max(0, currentScore + delta));
  return this.save();
};

/**
 * Hide a post
 */
UserFeedPreferenceSchema.methods.hidePost = function(postId: mongoose.Types.ObjectId) {
  if (!this.hiddenPosts.some((id: mongoose.Types.ObjectId) => id.toString() === postId.toString())) {
    this.hiddenPosts.push(postId);
  }
  return this.save();
};

/**
 * Unhide a post
 */
UserFeedPreferenceSchema.methods.unhidePost = function(postId: mongoose.Types.ObjectId) {
  this.hiddenPosts = this.hiddenPosts.filter(
    (id: mongoose.Types.ObjectId) => id.toString() !== postId.toString()
  );
  return this.save();
};

/**
 * Mute a user
 */
UserFeedPreferenceSchema.methods.muteUser = function(userId: mongoose.Types.ObjectId) {
  if (!this.mutedUsers.some((id: mongoose.Types.ObjectId) => id.toString() === userId.toString())) {
    this.mutedUsers.push(userId);
  }
  return this.save();
};

/**
 * Unmute a user
 */
UserFeedPreferenceSchema.methods.unmuteUser = function(userId: mongoose.Types.ObjectId) {
  this.mutedUsers = this.mutedUsers.filter(
    (id: mongoose.Types.ObjectId) => id.toString() !== userId.toString()
  );
  return this.save();
};

/**
 * Check if a post has been viewed
 */
UserFeedPreferenceSchema.methods.hasViewed = function(postId: mongoose.Types.ObjectId): boolean {
  return this.viewedPosts.some(
    (vp: IViewedPost) => vp.postId.toString() === postId.toString()
  );
};

/**
 * Get top topics by preference
 */
UserFeedPreferenceSchema.methods.getTopTopics = function(limit: number = 5): string[] {
  const entries = Array.from(this.likedTopics.entries()) as [string, number][];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic]) => topic);
};

/**
 * Get top crops by preference
 */
UserFeedPreferenceSchema.methods.getTopCrops = function(limit: number = 5): string[] {
  const entries = Array.from(this.likedCrops.entries()) as [string, number][];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([crop]) => crop);
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find or create user feed preferences
 */
UserFeedPreferenceSchema.statics.findOrCreate = async function(
  userId: mongoose.Types.ObjectId
): Promise<IUserFeedPreference> {
  let prefs = await this.findOne({ userId });
  if (!prefs) {
    prefs = await this.create({ userId });
  }
  return prefs;
};

/**
 * Get viewed post IDs for a user (for feed deduplication)
 */
UserFeedPreferenceSchema.statics.getViewedPostIds = async function(
  userId: mongoose.Types.ObjectId,
  since?: Date
): Promise<mongoose.Types.ObjectId[]> {
  const prefs = await this.findOne({ userId });
  if (!prefs) return [];
  
  let viewedPosts = prefs.viewedPosts;
  if (since) {
    viewedPosts = viewedPosts.filter((vp: IViewedPost) => vp.timestamp >= since);
  }
  
  return viewedPosts.map((vp: IViewedPost) => vp.postId);
};

/**
 * Cleanup old viewed posts (for maintenance)
 */
UserFeedPreferenceSchema.statics.cleanupOldViews = async function(
  olderThan: Date
) {
  return this.updateMany(
    {},
    {
      $pull: {
        viewedPosts: { timestamp: { $lt: olderThan } },
      },
    }
  );
};

// Prevent model compilation error in development with hot reload
const UserFeedPreference: Model<IUserFeedPreference> = 
  mongoose.models.UserFeedPreference || 
  mongoose.model<IUserFeedPreference>('UserFeedPreference', UserFeedPreferenceSchema);

export default UserFeedPreference;
