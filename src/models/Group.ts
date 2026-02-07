/**
 * Group Model
 * 
 * Represents a community group in the Agrigrow platform.
 * Groups can be crop-based, region-based, topic-based, or practice-based.
 * 
 * Features:
 * - Multiple group types for different community needs
 * - Privacy settings (public, private, invite-only)
 * - Moderation with admins and moderators
 * - Customizable rules and settings
 * - Linked crops for crop-specific communities
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Types of groups available
 */
export type GroupType = 'crop' | 'region' | 'topic' | 'practice';

/**
 * Privacy levels for groups
 */
export type GroupPrivacy = 'public' | 'private' | 'invite-only';

/**
 * Group rule structure
 */
export interface IGroupRule {
  title: string;
  description: string;
}

/**
 * Group image metadata interface
 * Supports both legacy URL-based images and new base64 images
 */
export interface IGroupImageMeta {
  size: number;       // Size in bytes
  type: string;       // MIME type (e.g., 'image/jpeg')
  isBase64: boolean;  // Whether the image is base64 or URL
  updatedAt: Date;    // When the image was last updated
}

/**
 * Group settings structure
 */
export interface IGroupSettings {
  /** Whether regular members can create posts */
  allowMemberPosts: boolean;
  /** Whether posts require admin/moderator approval */
  requirePostApproval: boolean;
  /** Whether polls are allowed in the group */
  allowPolls: boolean;
  /** Whether image uploads are allowed */
  allowImages: boolean;
}

/**
 * Group document interface
 */
export interface IGroup extends Document {
  /** Group name (3-100 characters) */
  name: string;
  /** URL-friendly unique identifier */
  slug: string;
  /** Group description (max 500 characters) */
  description?: string;
  /** Cover image - can be URL (legacy) or base64 data URL */
  coverImage?: string;
  /** Metadata for cover image */
  coverImageMeta?: IGroupImageMeta;
  /** Group icon - can be URL (legacy), emoji, or base64 data URL */
  icon?: string;
  /** Metadata for icon */
  iconMeta?: IGroupImageMeta;
  /** Type of group */
  groupType: GroupType;
  /** Privacy level */
  privacy: GroupPrivacy;
  /** Linked crops (for crop-based groups) */
  crops: string[];
  /** Region (for region-based groups) */
  region?: string;
  /** Searchable tags */
  tags: string[];
  /** User who created the group */
  createdBy: mongoose.Types.ObjectId;
  /** Users with admin privileges */
  admins: mongoose.Types.ObjectId[];
  /** Users with moderator privileges */
  moderators: mongoose.Types.ObjectId[];
  /** Number of active members (denormalized for performance) */
  memberCount: number;
  /** Number of posts (denormalized for performance) */
  postCount: number;
  /** Group rules */
  rules: IGroupRule[];
  /** Group settings */
  settings: IGroupSettings;
  /** Whether the group is verified/official */
  isVerified: boolean;
  /** Whether the group is active (soft delete flag) */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;

  // Methods
  isCoverImageBase64(): boolean;
  isIconBase64(): boolean;
}

/**
 * Group model static methods
 */
export interface IGroupModel extends Model<IGroup> {
  findBySlug(slug: string): Promise<IGroup | null>;
  generateUniqueSlug(name: string): Promise<string>;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Group type labels for UI
 */
export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  crop: 'Crop-based',
  region: 'Regional',
  topic: 'Topic',
  practice: 'Practice',
};

/**
 * Group type descriptions for UI
 */
export const GROUP_TYPE_DESCRIPTIONS: Record<GroupType, string> = {
  crop: 'Communities centered around specific crops and farming practices',
  region: 'Connect with farmers in your local area or region',
  topic: 'Discuss specific agricultural topics and interests',
  practice: 'Share and learn about specific farming techniques and methods',
};

/**
 * Group privacy labels for UI
 */
export const GROUP_PRIVACY_LABELS: Record<GroupPrivacy, string> = {
  public: 'Public',
  private: 'Private',
  'invite-only': 'Invite Only',
};

/**
 * Group privacy descriptions for UI
 */
export const GROUP_PRIVACY_DESCRIPTIONS: Record<GroupPrivacy, string> = {
  public: 'Anyone can view and join this group',
  private: 'Anyone can view, but must request to join',
  'invite-only': 'Only invited members can view and join',
};

// ============================================
// SCHEMA DEFINITIONS
// ============================================

/**
 * Group Rule sub-schema
 */
const GroupRuleSchema = new Schema<IGroupRule>(
  {
    title: {
      type: String,
      required: [true, 'Rule title is required'],
      trim: true,
      maxlength: [100, 'Rule title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Rule description is required'],
      trim: true,
      maxlength: [500, 'Rule description cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

/**
 * Group Settings sub-schema
 */
const GroupSettingsSchema = new Schema<IGroupSettings>(
  {
    allowMemberPosts: {
      type: Boolean,
      default: true,
    },
    requirePostApproval: {
      type: Boolean,
      default: false,
    },
    allowPolls: {
      type: Boolean,
      default: true,
    },
    allowImages: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

/**
 * Main Group Schema
 */
const GroupSchema = new Schema<IGroup, IGroupModel>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [3, 'Group name must be at least 3 characters'],
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Cover image - can be URL (legacy) or base64 data URL
    coverImage: {
      type: String,
      trim: true,
    },
    // Metadata for cover image
    coverImageMeta: {
      size: { type: Number },
      type: { type: String },
      isBase64: { type: Boolean },
      updatedAt: { type: Date },
    },
    // Icon - can be URL (legacy), emoji, or base64 data URL
    icon: {
      type: String,
      trim: true,
    },
    // Metadata for icon
    iconMeta: {
      size: { type: Number },
      type: { type: String },
      isBase64: { type: Boolean },
      updatedAt: { type: Date },
    },
    groupType: {
      type: String,
      enum: {
        values: ['crop', 'region', 'topic', 'practice'] as GroupType[],
        message: 'Invalid group type',
      },
      required: [true, 'Group type is required'],
    },
    privacy: {
      type: String,
      enum: {
        values: ['public', 'private', 'invite-only'] as GroupPrivacy[],
        message: 'Invalid privacy setting',
      },
      default: 'public',
    },
    crops: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    region: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Group creator is required'],
    },
    admins: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    moderators: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    memberCount: {
      type: Number,
      default: 0,
      min: [0, 'Member count cannot be negative'],
    },
    postCount: {
      type: Number,
      default: 0,
      min: [0, 'Post count cannot be negative'],
    },
    rules: {
      type: [GroupRuleSchema],
      default: [],
      validate: {
        validator: function(rules: IGroupRule[]) {
          return rules.length <= 10;
        },
        message: 'Cannot have more than 10 rules',
      },
    },
    settings: {
      type: GroupSettingsSchema,
      default: () => ({
        allowMemberPosts: true,
        requirePostApproval: false,
        allowPolls: true,
        allowImages: true,
      }),
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Unique compound index on name + crops (prevents duplicate names within same crop category)
GroupSchema.index(
  { name: 1, crops: 1 },
  { 
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'unique_name_crops_active',
  }
);

// Unique index on slug
GroupSchema.index({ slug: 1 }, { unique: true, name: 'unique_slug' });

// Index for discovery - groupType + memberCount descending
GroupSchema.index(
  { groupType: 1, memberCount: -1 },
  { name: 'discovery_by_type_popularity' }
);

// Index for crop-based filtering
GroupSchema.index(
  { crops: 1, isActive: 1 },
  { name: 'filter_by_crops' }
);

// Index for region-based filtering
GroupSchema.index(
  { region: 1, isActive: 1 },
  { name: 'filter_by_region' }
);

// Index for tag search
GroupSchema.index(
  { tags: 1 },
  { name: 'search_by_tags' }
);

// Index for recent groups
GroupSchema.index(
  { createdAt: -1 },
  { name: 'recent_groups' }
);

// Index for finding active groups by popularity
GroupSchema.index(
  { isActive: 1, memberCount: -1 },
  { name: 'active_popular_groups' }
);

// Text index for search
GroupSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  { 
    name: 'text_search',
    weights: { name: 10, tags: 5, description: 1 },
  }
);

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Generate slug from name before saving
 */
GroupSchema.pre('save', async function() {
  // Only generate slug if name is modified or slug is empty
  if (!this.isModified('name') && this.slug) {
    return;
  }

  // Generate base slug from name
  const baseSlug = this.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Check if slug already exists and make it unique if necessary
  const GroupModel = this.constructor as IGroupModel;
  let slug = baseSlug;
  let counter = 1;
  let existingGroup = await GroupModel.findOne({ slug, _id: { $ne: this._id } });

  while (existingGroup) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    existingGroup = await GroupModel.findOne({ slug, _id: { $ne: this._id } });
  }

  this.slug = slug;
});

/**
 * Ensure createdBy is in admins array
 */
GroupSchema.pre('save', function() {
  if (this.isNew && this.createdBy) {
    // Add creator to admins if not already present
    const creatorIdString = this.createdBy.toString();
    const adminExists = this.admins.some(
      (adminId) => adminId.toString() === creatorIdString
    );
    
    if (!adminExists) {
      this.admins.push(this.createdBy);
    }
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if the cover image is base64 encoded
 * @returns true if the cover image is a base64 data URL, false otherwise
 */
GroupSchema.methods.isCoverImageBase64 = function(): boolean {
  // Return false if no cover image
  if (!this.coverImage) {
    return false;
  }
  
  // Check if the image starts with data:image (base64 data URL format)
  if (this.coverImage.startsWith('data:image/')) {
    return true;
  }
  
  // Check coverImageMeta if available
  if (this.coverImageMeta && typeof this.coverImageMeta.isBase64 === 'boolean') {
    return this.coverImageMeta.isBase64;
  }
  
  // Default to false (assume URL for backward compatibility)
  return false;
};

/**
 * Check if the icon is base64 encoded
 * @returns true if the icon is a base64 data URL, false otherwise
 */
GroupSchema.methods.isIconBase64 = function(): boolean {
  // Return false if no icon
  if (!this.icon) {
    return false;
  }
  
  // Check if the icon starts with data:image (base64 data URL format)
  if (this.icon.startsWith('data:image/')) {
    return true;
  }
  
  // Check iconMeta if available
  if (this.iconMeta && typeof this.iconMeta.isBase64 === 'boolean') {
    return this.iconMeta.isBase64;
  }
  
  // Default to false (could be emoji, icon name, or URL)
  return false;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find group by slug
 */
GroupSchema.statics.findBySlug = async function(slug: string): Promise<IGroup | null> {
  return this.findOne({ slug, isActive: true });
};

/**
 * Generate a unique slug for a given name
 */
GroupSchema.statics.generateUniqueSlug = async function(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;
  let existingGroup = await this.findOne({ slug });

  while (existingGroup) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    existingGroup = await this.findOne({ slug });
  }

  return slug;
};

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual for checking if group has any admins
 */
GroupSchema.virtual('hasAdmins').get(function() {
  return this.admins && this.admins.length > 0;
});

/**
 * Virtual for checking if group has any moderators
 */
GroupSchema.virtual('hasModerators').get(function() {
  return this.moderators && this.moderators.length > 0;
});

/**
 * Virtual for getting formatted member count
 */
GroupSchema.virtual('formattedMemberCount').get(function() {
  const count = this.memberCount;
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
});

// ============================================
// MODEL EXPORT
// ============================================

// Delete existing model in development to prevent OverwriteModelError
const Group = (mongoose.models.Group as IGroupModel) || 
  mongoose.model<IGroup, IGroupModel>('Group', GroupSchema);

export default Group;
