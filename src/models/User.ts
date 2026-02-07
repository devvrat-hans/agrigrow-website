import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Profile image metadata interface
 * Supports both legacy URL-based images and new base64 images
 */
export interface IProfileImageMeta {
  size: number;       // Size in bytes
  type: string;       // MIME type (e.g., 'image/jpeg')
  isBase64: boolean;  // Whether the image is base64 or URL
  updatedAt: Date;    // When the profile image was last updated
}

export interface IUser extends Document {
  phone: string;
  fullName: string;
  bio?: string;
  role: 'farmer' | 'student' | 'business';
  language: string;
  state?: string;
  district?: string;
  crops: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'experienced' | 'expert';
  interests: string[];
  // Student-specific fields
  studentDegree?: string;
  collegeName?: string;
  yearOfStudy?: string;
  studentBackground?: string;
  studentInterests?: string[];
  studentPurposes?: string[];
  // Business-specific fields
  organizationType?: string;
  businessFocusAreas?: string[];
  // Profile image - can be URL (legacy Cloudinary) or base64 data URL
  profileImage?: string;
  profileImageMeta?: IProfileImageMeta;
  isOnboarded: boolean;
  // Saved/Bookmarked posts
  savedPosts: mongoose.Types.ObjectId[];
  // Follow-related fields
  followersCount: number;
  followingCount: number;
  isPrivateAccount: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isProfileImageBase64(): boolean;
}

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    role: {
      type: String,
      enum: ['farmer', 'student', 'business'],
      required: true,
    },
    language: {
      type: String,
      required: true,
      default: 'en',
    },
    state: {
      type: String,
    },
    district: {
      type: String,
    },
    crops: [{
      type: String,
    }],
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'experienced', 'expert'],
      required: true,
    },
    interests: [{
      type: String,
    }],
    // Student-specific fields
    studentDegree: {
      type: String,
    },
    collegeName: {
      type: String,
    },
    yearOfStudy: {
      type: String,
    },
    studentBackground: {
      type: String,
    },
    studentInterests: [{
      type: String,
    }],
    studentPurposes: [{
      type: String,
    }],
    // Business-specific fields
    organizationType: {
      type: String,
    },
    businessFocusAreas: [{
      type: String,
    }],
    // Profile image - can be URL (legacy Cloudinary) or base64 data URL
    profileImage: {
      type: String,
    },
    // Metadata for profile image (size, type, isBase64)
    profileImageMeta: {
      size: { type: Number },
      type: { type: String },
      isBase64: { type: Boolean },
      updatedAt: { type: Date },
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    // Saved/Bookmarked posts
    savedPosts: [{
      type: Schema.Types.ObjectId,
      ref: 'Post',
    }],
    // Follow-related fields
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPrivateAccount: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// METHODS
// ============================================

/**
 * Check if the profile image is base64 encoded
 * @returns true if the profile image is a base64 data URL, false otherwise
 */
UserSchema.methods.isProfileImageBase64 = function(): boolean {
  // Return false if no profile image
  if (!this.profileImage) {
    return false;
  }
  
  // Check if the image starts with data:image (base64 data URL format)
  if (this.profileImage.startsWith('data:image/')) {
    return true;
  }
  
  // Check profileImageMeta if available
  if (this.profileImageMeta && typeof this.profileImageMeta.isBase64 === 'boolean') {
    return this.profileImageMeta.isBase64;
  }
  
  // Default to false (assume URL for backward compatibility with Cloudinary)
  return false;
};

// ============================================
// VIRTUAL FIELDS
// ============================================

// Virtual to check if user has a profile image
UserSchema.virtual('hasProfileImage').get(function() {
  return !!this.profileImage;
});

// Prevent model compilation error in development with hot reload
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
