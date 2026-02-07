import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Share type enum for different sharing methods
 */
export type ShareType = 'repost' | 'external' | 'message';

/**
 * External share platform options
 */
export type SharePlatform = 'whatsapp' | 'facebook' | 'twitter' | 'link' | 'other';

/**
 * Share interface for tracking post shares
 */
export interface IShare extends Document {
  // Reference to the shared post
  postId: mongoose.Types.ObjectId;
  
  // User who shared the post
  sharedBy: mongoose.Types.ObjectId;
  
  // Type of share
  shareType: ShareType;
  
  // Platform for external shares
  platform?: SharePlatform;
  
  // Additional share metadata
  repostId?: mongoose.Types.ObjectId; // Reference to the repost if shareType is 'repost'
  recipientId?: mongoose.Types.ObjectId; // For message shares - who received it
  
  // Timestamps
  createdAt: Date;
}

const ShareSchema = new Schema<IShare>(
  {
    // Reference to the shared post
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    
    // User who shared the post
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Type of share
    shareType: {
      type: String,
      enum: ['repost', 'external', 'message'],
      required: true,
      index: true,
    },
    
    // Platform for external shares
    platform: {
      type: String,
      enum: ['whatsapp', 'facebook', 'twitter', 'link', 'other'],
    },
    
    // Additional share metadata
    repostId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
  }
);

// ============================================
// INDEXES FOR EFFICIENT QUERIES
// ============================================

// Compound index for finding shares of a post
ShareSchema.index({ postId: 1, createdAt: -1 });

// Compound index for finding shares by user
ShareSchema.index({ sharedBy: 1, createdAt: -1 });

// Index for analytics - shares by platform
ShareSchema.index({ platform: 1, createdAt: -1 });

// Compound index for checking duplicate reposts
ShareSchema.index({ postId: 1, sharedBy: 1, shareType: 1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Count shares for a post
 */
ShareSchema.statics.countByPost = function(postId: mongoose.Types.ObjectId) {
  return this.countDocuments({ postId });
};

/**
 * Count shares by type for a post
 */
ShareSchema.statics.countByPostAndType = function(
  postId: mongoose.Types.ObjectId,
  shareType: ShareType
) {
  return this.countDocuments({ postId, shareType });
};

/**
 * Check if user already reposted a post
 */
ShareSchema.statics.hasUserReposted = async function(
  postId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
): Promise<boolean> {
  const count = await this.countDocuments({
    postId,
    sharedBy: userId,
    shareType: 'repost',
  });
  return count > 0;
};

/**
 * Get share analytics for a post
 */
ShareSchema.statics.getShareAnalytics = async function(
  postId: mongoose.Types.ObjectId
) {
  const [totalShares, byType, byPlatform] = await Promise.all([
    // Total shares
    this.countDocuments({ postId }),
    // Shares by type
    this.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      { $group: { _id: '$shareType', count: { $sum: 1 } } },
    ]),
    // External shares by platform
    this.aggregate([
      {
        $match: {
          postId: new mongoose.Types.ObjectId(postId),
          shareType: 'external',
        },
      },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalShares,
    byType: byType.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    ),
    byPlatform: byPlatform.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      },
      {}
    ),
  };
};

// Prevent model compilation error in development with hot reload
const Share: Model<IShare> = mongoose.models.Share || mongoose.model<IShare>('Share', ShareSchema);

export default Share;
