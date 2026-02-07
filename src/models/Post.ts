import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Post type enum for categorizing posts
 */
export type PostType = 'question' | 'update' | 'tip' | 'problem' | 'success_story';

/**
 * Visibility enum for controlling post access
 */
export type PostVisibility = 'public' | 'followers' | 'group';

/**
 * Location interface for post location data
 */
export interface IPostLocation {
  state?: string;
  district?: string;
}

/**
 * Post category type - matching farmer interests from onboarding
 */
export type PostCategory = 
  | 'organic_farming'
  | 'equipment_machinery'
  | 'fertilizer_pesticides'
  | 'animal_husbandry'
  | 'agri_business_news'
  | 'agriculture_practices'
  | 'market_prices'
  | 'food_processing'
  | 'general';

/**
 * Image metadata interface for tracking image information
 * Supports both legacy URL-based images and new base64 images
 */
export interface IImageMeta {
  size: number;      // Size in bytes
  type: string;      // MIME type (e.g., 'image/jpeg')
  isBase64: boolean; // Whether the image is base64 or URL
  width?: number;    // Width in pixels (optional)
  height?: number;   // Height in pixels (optional)
}

/**
 * Post interface with all enhanced fields for home feed feature
 */
export interface IPost extends Document {
  // Core fields
  author: mongoose.Types.ObjectId;
  authorPhone: string;
  content: string;
  
  // Media fields
  // Images can be either URLs (legacy Cloudinary) or base64 data URLs
  images: string[]; // Array of image URLs/base64 strings, max 5
  imagesMeta: IImageMeta[]; // Metadata for each image
  voiceNote?: string;
  
  // Categorization fields
  postType: PostType;
  category: PostCategory; // Post category for feed filtering
  crops: string[]; // Crop tags relevant to the post (legacy support)
  tags: string[]; // General tags (legacy support)
  
  // Location data for regional relevance
  location: IPostLocation;
  
  // Engagement tracking
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  
  // Save/bookmark feature
  savedBy: mongoose.Types.ObjectId[];
  
  // Visibility and verification
  visibility: PostVisibility;
  isVerified: boolean;
  
  // Recommendation algorithm fields
  engagementScore: number;
  viewsCount: number;
  uniqueViewers: mongoose.Types.ObjectId[];
  helpfulMarksCount: number; // Count of helpful comments on this post
  profileVisits: number; // Count of profile visits from this post
  
  // Repost support
  originalPost?: mongoose.Types.ObjectId; // Reference to original post if this is a repost
  isRepost: boolean;
  
  // Soft delete support
  isDeleted: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isImageBase64(index: number): boolean;
  getImagesMeta(): IImageMeta[];
}

const PostSchema = new Schema<IPost>(
  {
    // Core fields
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorPhone: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2000,
      trim: true,
    },
    
    // Media fields
    // Images can be either URLs (legacy Cloudinary) or base64 data URLs
    images: {
      type: [{
        type: String,
      }],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 5;
        },
        message: 'A post can have a maximum of 5 images',
      },
    },
    // Metadata for each image (size, type, isBase64)
    imagesMeta: {
      type: [{
        size: { type: Number, required: true },
        type: { type: String, required: true },
        isBase64: { type: Boolean, required: true },
        width: { type: Number },
        height: { type: Number },
      }],
      default: [],
    },
    voiceNote: {
      type: String,
    },
    
    // Categorization fields
    postType: {
      type: String,
      enum: ['question', 'update', 'tip', 'problem', 'success_story'],
      default: 'update',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'organic_farming',
        'equipment_machinery',
        'fertilizer_pesticides',
        'animal_husbandry',
        'agri_business_news',
        'agriculture_practices',
        'market_prices',
        'food_processing',
        'general',
      ],
      default: 'general',
      index: true,
    },
    crops: {
      type: [{
        type: String,
        lowercase: true,
        trim: true,
      }],
      default: [],
      index: true,
    },
    tags: {
      type: [{
        type: String,
        lowercase: true,
        trim: true,
      }],
      default: [],
    },
    
    // Location data
    location: {
      state: {
        type: String,
        index: true,
      },
      district: {
        type: String,
      },
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
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Save/bookmark feature
    savedBy: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      default: [],
    },
    
    // Visibility and verification
    visibility: {
      type: String,
      enum: ['public', 'followers', 'group'],
      default: 'public',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    // Recommendation algorithm fields
    engagementScore: {
      type: Number,
      default: 0,
      index: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueViewers: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      default: [],
    },
    helpfulMarksCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    profileVisits: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Repost support
    originalPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    isRepost: {
      type: Boolean,
      default: false,
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

// Primary feed query index - sorted by creation time
PostSchema.index({ createdAt: -1 });

// Feed with engagement score sorting
PostSchema.index({ engagementScore: -1, createdAt: -1 });

// Filter by post type with time sorting
PostSchema.index({ postType: 1, createdAt: -1 });

// Filter by crops for recommendation
PostSchema.index({ crops: 1, createdAt: -1 });

// Location-based queries
PostSchema.index({ 'location.state': 1, createdAt: -1 });
PostSchema.index({ 'location.state': 1, 'location.district': 1, createdAt: -1 });

// Author's posts query
PostSchema.index({ author: 1, createdAt: -1 });

// Combined index for personalized feed algorithm
PostSchema.index({ 
  isDeleted: 1, 
  visibility: 1, 
  engagementScore: -1, 
  createdAt: -1 
});

// Compound index for feed with crop filtering
PostSchema.index({
  isDeleted: 1,
  crops: 1,
  'location.state': 1,
  engagementScore: -1,
});

// Tags index (legacy support)
PostSchema.index({ tags: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Virtual for unique viewers count
PostSchema.virtual('uniqueViewersCount').get(function() {
  return this.uniqueViewers?.length || 0;
});

// Virtual for engagement rate calculation
PostSchema.virtual('engagementRate').get(function() {
  const totalViews = this.viewsCount || 1; // Avoid division by zero
  const totalEngagements = this.likesCount + this.commentsCount + this.sharesCount;
  return (totalEngagements / totalViews) * 100;
});

// Virtual to check if post has any base64 images
PostSchema.virtual('hasBase64Images').get(function() {
  return this.images?.some((img: string) => img.startsWith('data:image/')) || false;
});

// Virtual to check if post has any URL images (legacy Cloudinary)
PostSchema.virtual('hasUrlImages').get(function() {
  return this.images?.some((img: string) => 
    img.startsWith('http://') || img.startsWith('https://')
  ) || false;
});

// ============================================
// METHODS
// ============================================

/**
 * Check if an image at a given index is base64 encoded
 * @param index - The index of the image in the images array
 * @returns true if the image is base64, false if URL or index out of bounds
 */
PostSchema.methods.isImageBase64 = function(index: number): boolean {
  if (index < 0 || index >= this.images.length) {
    return false;
  }
  
  const image = this.images[index];
  
  // Check if the image starts with data:image (base64 data URL format)
  if (image.startsWith('data:image/')) {
    return true;
  }
  
  // Check imagesMeta if available
  if (this.imagesMeta && this.imagesMeta[index]) {
    return this.imagesMeta[index].isBase64;
  }
  
  // Assume URL if starts with http
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return false;
  }
  
  // Default to false (assume URL for backward compatibility)
  return false;
};

/**
 * Get metadata for all images, generating for legacy images without meta
 * @returns Array of image metadata
 */
PostSchema.methods.getImagesMeta = function(): IImageMeta[] {
  const images = this.images || [];
  const existingMeta = this.imagesMeta || [];
  
  return images.map((image: string, index: number) => {
    // If metadata exists for this index, return it
    if (existingMeta[index]) {
      return existingMeta[index];
    }
    
    // Generate metadata for legacy images
    const isBase64 = image.startsWith('data:image/');
    let type = 'image/unknown';
    
    if (isBase64) {
      // Extract MIME type from data URL
      const match = image.match(/^data:(image\/[a-z+]+);base64,/i);
      if (match) {
        type = match[1].toLowerCase();
      }
    } else {
      // Try to guess type from URL extension
      const extension = image.split('.').pop()?.toLowerCase();
      const typeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      type = typeMap[extension || ''] || 'image/unknown';
    }
    
    return {
      size: 0, // Unknown for legacy images
      type,
      isBase64,
    };
  });
};

/**
 * Calculate engagement score based on various factors
 * Formula: (likes × 1) + (comments × 3) + (shares × 5) + (helpful × 10) / time_decay
 */
PostSchema.methods.calculateEngagementScore = function(): number {
  const now = new Date();
  const postAge = (now.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60); // Age in hours
  
  // Time decay factor: reduces score for older posts
  const timeDecay = Math.max(1, Math.log10(postAge + 1) + 1);
  
  const rawScore = 
    (this.likesCount * 1) + 
    (this.commentsCount * 3) + 
    (this.sharesCount * 5) + 
    (this.helpfulMarksCount * 10);
  
  return Math.round((rawScore / timeDecay) * 100) / 100;
};

/**
 * Update engagement score and save
 */
PostSchema.methods.updateEngagementScore = async function(): Promise<void> {
  this.engagementScore = this.calculateEngagementScore();
  await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find posts excluding deleted ones
 */
PostSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isDeleted: false });
};

// Ensure virtuals are included in JSON output
PostSchema.set('toJSON', { virtuals: true });
PostSchema.set('toObject', { virtuals: true });

// Prevent model compilation error in development with hot reload
const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;
