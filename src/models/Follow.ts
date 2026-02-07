import mongoose, { Schema, Document, Model } from 'mongoose';

// Follow status enum
export type FollowStatusType = 'active' | 'pending' | 'blocked';

// Interface for Follow document
export interface IFollow extends Document {
  followerId: string;
  followingId: string;
  status: FollowStatusType;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Follow model with static methods
export interface IFollowModel extends Model<IFollow> {
  findByFollower(followerId: string): Promise<IFollow[]>;
  findByFollowing(followingId: string): Promise<IFollow[]>;
  findRelationship(followerId: string, followingId: string): Promise<IFollow | null>;
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
}

const FollowSchema = new Schema<IFollow>(
  {
    followerId: {
      type: String,
      required: [true, 'Follower ID is required'],
      index: true,
      trim: true,
    },
    followingId: {
      type: String,
      required: [true, 'Following ID is required'],
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'pending', 'blocked'],
        message: 'Status must be active, pending, or blocked',
      },
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: Record<string, unknown>) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Compound unique index to prevent duplicate follow relationships
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Index for efficient queries on status
FollowSchema.index({ followingId: 1, status: 1 });
FollowSchema.index({ followerId: 1, status: 1 });

// Static method to find all users a person is following
FollowSchema.statics.findByFollower = function (followerId: string): Promise<IFollow[]> {
  return this.find({ followerId, status: 'active' }).sort({ createdAt: -1 }).exec();
};

// Static method to find all followers of a user
FollowSchema.statics.findByFollowing = function (followingId: string): Promise<IFollow[]> {
  return this.find({ followingId, status: 'active' }).sort({ createdAt: -1 }).exec();
};

// Static method to find a specific follow relationship
FollowSchema.statics.findRelationship = function (
  followerId: string,
  followingId: string
): Promise<IFollow | null> {
  return this.findOne({ followerId, followingId }).exec();
};

// Static method to get followers count for a user
FollowSchema.statics.getFollowersCount = function (userId: string): Promise<number> {
  return this.countDocuments({ followingId: userId, status: 'active' }).exec();
};

// Static method to get following count for a user
FollowSchema.statics.getFollowingCount = function (userId: string): Promise<number> {
  return this.countDocuments({ followerId: userId, status: 'active' }).exec();
};

// Pre-save validation to prevent self-follow
FollowSchema.pre('save', function () {
  if (this.followerId === this.followingId) {
    throw new Error('Users cannot follow themselves');
  }
});

// Create and export the model
const Follow: IFollowModel =
  (mongoose.models.Follow as IFollowModel) ||
  mongoose.model<IFollow, IFollowModel>('Follow', FollowSchema);

export default Follow;
