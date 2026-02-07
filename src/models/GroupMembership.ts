/**
 * GroupMembership Model
 * 
 * Tracks user membership in groups for the Agrigrow platform.
 * Manages roles, status, and notification preferences for group members.
 * 
 * Features:
 * - Role-based access control (owner, admin, moderator, member)
 * - Membership status tracking (active, pending, banned, left)
 * - Ban management with reasons
 * - Per-member notification preferences
 * - Activity tracking
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Member roles within a group
 */
export type MemberRole = 'member' | 'moderator' | 'admin' | 'owner';

/**
 * Membership status
 */
export type MemberStatus = 'active' | 'pending' | 'banned' | 'left';

/**
 * Notification preferences for a member
 */
export interface INotificationPreferences {
  /** Receive notifications for new posts */
  newPosts: boolean;
  /** Receive notifications when mentioned */
  mentions: boolean;
  /** Receive notifications for announcements */
  announcements: boolean;
}

/**
 * GroupMembership document interface
 */
export interface IGroupMembership extends Document {
  /** Reference to the group */
  groupId: mongoose.Types.ObjectId;
  /** Reference to the user */
  userId: mongoose.Types.ObjectId;
  /** User's role in the group */
  role: MemberRole;
  /** Current membership status */
  status: MemberStatus;
  /** When the user joined the group */
  joinedAt: Date;
  /** User who invited this member (optional) */
  invitedBy?: mongoose.Types.ObjectId;
  /** Reason for ban (if banned) */
  banReason?: string;
  /** User who banned this member (if banned) */
  bannedBy?: mongoose.Types.ObjectId;
  /** When the user was banned (if banned) */
  bannedAt?: Date;
  /** Last activity timestamp in the group */
  lastActivityAt?: Date;
  /** Notification preferences */
  notificationPreferences: INotificationPreferences;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GroupMembership model static methods
 */
export interface IGroupMembershipModel extends Model<IGroupMembership> {
  /** Find membership for a specific user in a group */
  findMembership(groupId: mongoose.Types.ObjectId | string, userId: mongoose.Types.ObjectId | string): Promise<IGroupMembership | null>;
  /** Check if user is a member of a group */
  isMember(groupId: mongoose.Types.ObjectId | string, userId: mongoose.Types.ObjectId | string): Promise<boolean>;
  /** Check if user has specific role or higher */
  hasRole(groupId: mongoose.Types.ObjectId | string, userId: mongoose.Types.ObjectId | string, requiredRole: MemberRole): Promise<boolean>;
  /** Get all admins/moderators for a group */
  getGroupStaff(groupId: mongoose.Types.ObjectId | string): Promise<IGroupMembership[]>;
  /** Get active member count for a group */
  getActiveMemberCount(groupId: mongoose.Types.ObjectId | string): Promise<number>;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

/**
 * Role labels for UI
 */
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  member: 'Member',
  moderator: 'Moderator',
  admin: 'Admin',
  owner: 'Owner',
};

/**
 * Role descriptions for UI
 */
export const MEMBER_ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  member: 'Can view content and participate in discussions',
  moderator: 'Can moderate content and manage members',
  admin: 'Can manage group settings and moderators',
  owner: 'Full control over the group',
};

/**
 * Status labels for UI
 */
export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  pending: 'Pending Approval',
  banned: 'Banned',
  left: 'Left',
};

// ============================================
// SCHEMA DEFINITIONS
// ============================================

/**
 * Notification Preferences sub-schema
 */
const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    newPosts: {
      type: Boolean,
      default: true,
    },
    mentions: {
      type: Boolean,
      default: true,
    },
    announcements: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

/**
 * Main GroupMembership Schema
 */
const GroupMembershipSchema = new Schema<IGroupMembership, IGroupMembershipModel>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    role: {
      type: String,
      enum: {
        values: ['member', 'moderator', 'admin', 'owner'] as MemberRole[],
        message: 'Invalid member role',
      },
      default: 'member',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'pending', 'banned', 'left'] as MemberStatus[],
        message: 'Invalid membership status',
      },
      default: 'active',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    banReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Ban reason cannot exceed 500 characters'],
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    bannedAt: {
      type: Date,
    },
    lastActivityAt: {
      type: Date,
    },
    notificationPreferences: {
      type: NotificationPreferencesSchema,
      default: () => ({
        newPosts: true,
        mentions: true,
        announcements: true,
      }),
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Unique compound index on groupId + userId (one membership per user per group)
GroupMembershipSchema.index(
  { groupId: 1, userId: 1 },
  { 
    unique: true,
    name: 'unique_group_user_membership',
  }
);

// Index for finding user's groups
GroupMembershipSchema.index(
  { userId: 1, status: 1 },
  { name: 'user_groups_by_status' }
);

// Index for finding admins/moderators of a group
GroupMembershipSchema.index(
  { groupId: 1, role: 1 },
  { name: 'group_members_by_role' }
);

// Index for member lists (sorted by join date)
GroupMembershipSchema.index(
  { groupId: 1, status: 1, joinedAt: -1 },
  { name: 'group_members_sorted' }
);

// Index for finding active members of a group
GroupMembershipSchema.index(
  { groupId: 1, status: 1, lastActivityAt: -1 },
  { name: 'group_active_members' }
);

// Index for user's membership lookups
GroupMembershipSchema.index(
  { userId: 1, groupId: 1, status: 1 },
  { name: 'user_membership_lookup' }
);

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual populate for group details
 */
GroupMembershipSchema.virtual('group', {
  ref: 'Group',
  localField: 'groupId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for user details
 */
GroupMembershipSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for inviter details
 */
GroupMembershipSchema.virtual('inviter', {
  ref: 'User',
  localField: 'invitedBy',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for banner details
 */
GroupMembershipSchema.virtual('banner', {
  ref: 'User',
  localField: 'bannedBy',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual to check if member is staff (moderator, admin, or owner)
 */
GroupMembershipSchema.virtual('isStaff').get(function() {
  return ['moderator', 'admin', 'owner'].includes(this.role);
});

/**
 * Virtual to check if member can moderate
 */
GroupMembershipSchema.virtual('canModerate').get(function() {
  return ['moderator', 'admin', 'owner'].includes(this.role) && this.status === 'active';
});

/**
 * Virtual to check if member can manage group settings
 */
GroupMembershipSchema.virtual('canManageSettings').get(function() {
  return ['admin', 'owner'].includes(this.role) && this.status === 'active';
});

// Enable virtuals in JSON and object output
GroupMembershipSchema.set('toJSON', { virtuals: true });
GroupMembershipSchema.set('toObject', { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find membership for a specific user in a group
 */
GroupMembershipSchema.statics.findMembership = async function(
  groupId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string
): Promise<IGroupMembership | null> {
  return this.findOne({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    userId: new mongoose.Types.ObjectId(userId.toString()),
  });
};

/**
 * Check if user is an active member of a group
 */
GroupMembershipSchema.statics.isMember = async function(
  groupId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string
): Promise<boolean> {
  const membership = await this.findOne({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    userId: new mongoose.Types.ObjectId(userId.toString()),
    status: 'active',
  });
  return !!membership;
};

/**
 * Check if user has a specific role or higher
 */
GroupMembershipSchema.statics.hasRole = async function(
  groupId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  requiredRole: MemberRole
): Promise<boolean> {
  const membership = await this.findOne({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    userId: new mongoose.Types.ObjectId(userId.toString()),
    status: 'active',
  });

  if (!membership) return false;

  const userRoleLevel = ROLE_HIERARCHY[membership.role];
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

  return userRoleLevel >= requiredRoleLevel;
};

/**
 * Get all staff members (moderators, admins, owner) for a group
 */
GroupMembershipSchema.statics.getGroupStaff = async function(
  groupId: mongoose.Types.ObjectId | string
): Promise<IGroupMembership[]> {
  return this.find({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    status: 'active',
    role: { $in: ['moderator', 'admin', 'owner'] },
  })
    .populate('user', 'fullName profileImage')
    .sort({ role: -1 }); // Owner first, then admin, then moderator
};

/**
 * Get active member count for a group
 */
GroupMembershipSchema.statics.getActiveMemberCount = async function(
  groupId: mongoose.Types.ObjectId | string
): Promise<number> {
  return this.countDocuments({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    status: 'active',
  });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if this member has higher or equal role than another role
 */
GroupMembershipSchema.methods.hasRoleOrHigher = function(role: MemberRole): boolean {
  const memberRole = this.role as MemberRole;
  const thisRoleLevel = ROLE_HIERARCHY[memberRole];
  const compareRoleLevel = ROLE_HIERARCHY[role];
  return thisRoleLevel >= compareRoleLevel;
};

/**
 * Update last activity timestamp
 */
GroupMembershipSchema.methods.updateActivity = async function(): Promise<IGroupMembership> {
  this.lastActivityAt = new Date();
  return this.save();
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Set joinedAt to now when status becomes active
 */
GroupMembershipSchema.pre('save', function() {
  // If status is changing to active and joinedAt wasn't explicitly set
  if (this.isModified('status') && this.status === 'active' && !this.joinedAt) {
    this.joinedAt = new Date();
  }

  // Update lastActivityAt when status becomes active
  if (this.isModified('status') && this.status === 'active') {
    this.lastActivityAt = new Date();
  }

  // Clear ban fields if status is no longer banned
  if (this.isModified('status') && this.status !== 'banned') {
    this.banReason = undefined;
    this.bannedBy = undefined;
    this.bannedAt = undefined;
  }
});

// ============================================
// MODEL EXPORT
// ============================================

// Delete existing model in development to prevent OverwriteModelError
const GroupMembership = (mongoose.models.GroupMembership as IGroupMembershipModel) || 
  mongoose.model<IGroupMembership, IGroupMembershipModel>('GroupMembership', GroupMembershipSchema);

export default GroupMembership;
