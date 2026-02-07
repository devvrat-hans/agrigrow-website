/**
 * GroupInvitation Model
 * 
 * Manages group invitations for the Agrigrow platform communities.
 * Supports both direct user invites and shareable invite codes/links.
 * 
 * Features:
 * - Direct user invitations
 * - Shareable invite codes with optional max uses
 * - Automatic expiration via TTL index
 * - Status tracking (pending, accepted, declined, expired)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Invitation status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * GroupInvitation document interface
 */
export interface IGroupInvitation extends Document {
  /** Reference to the group */
  groupId: mongoose.Types.ObjectId;
  /** User who created the invitation */
  invitedBy: mongoose.Types.ObjectId;
  /** User being invited (for direct invites) */
  invitedUser?: mongoose.Types.ObjectId;
  /** Unique invite code (for link-based invites) */
  inviteCode?: string;
  /** When the invitation expires */
  expiresAt: Date;
  /** Maximum number of times the code can be used */
  maxUses?: number;
  /** Number of times the code has been used */
  usedCount: number;
  /** Current status of the invitation */
  status: InvitationStatus;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  /** Instance methods */
  isValid(): boolean;
  markAsAccepted(): Promise<IGroupInvitation>;
  markAsDeclined(): Promise<IGroupInvitation>;
  incrementUsage(): Promise<IGroupInvitation>;
}

/**
 * GroupInvitation model static methods
 */
export interface IGroupInvitationModel extends Model<IGroupInvitation> {
  /** Generate a random invite code */
  generateInviteCode(): string;
  /** Find a valid invitation by code */
  findValidByCode(code: string): Promise<IGroupInvitation | null>;
  /** Find pending invitation for a user */
  findPendingForUser(groupId: mongoose.Types.ObjectId | string, userId: mongoose.Types.ObjectId | string): Promise<IGroupInvitation | null>;
  /** Create a direct user invitation */
  createDirectInvite(
    groupId: mongoose.Types.ObjectId | string,
    invitedBy: mongoose.Types.ObjectId | string,
    invitedUser: mongoose.Types.ObjectId | string,
    expiresInDays?: number
  ): Promise<IGroupInvitation>;
  /** Create an invite code/link */
  createInviteCode(
    groupId: mongoose.Types.ObjectId | string,
    invitedBy: mongoose.Types.ObjectId | string,
    options?: { maxUses?: number; expiresInDays?: number }
  ): Promise<IGroupInvitation>;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default expiration time in days
 */
export const DEFAULT_EXPIRATION_DAYS = 7;

/**
 * Invite code length
 */
export const INVITE_CODE_LENGTH = 8;

/**
 * Status labels for UI
 */
export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

// ============================================
// SCHEMA DEFINITIONS
// ============================================

/**
 * Main GroupInvitation Schema
 */
const GroupInvitationSchema = new Schema<IGroupInvitation, IGroupInvitationModel>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter is required'],
    },
    invitedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      trim: true,
      uppercase: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      default: function() {
        const date = new Date();
        date.setDate(date.getDate() + DEFAULT_EXPIRATION_DAYS);
        return date;
      },
    },
    maxUses: {
      type: Number,
      min: [1, 'Max uses must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'declined', 'expired'] as InvitationStatus[],
        message: 'Invalid invitation status',
      },
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Find pending invitations for a user in a group
GroupInvitationSchema.index(
  { groupId: 1, invitedUser: 1, status: 1 },
  { name: 'group_user_invitations' }
);

// Unique invite code lookup (sparse for null values)
GroupInvitationSchema.index(
  { inviteCode: 1 },
  { 
    unique: true, 
    sparse: true,
    name: 'unique_invite_code',
  }
);

// TTL index for automatic cleanup of expired invitations
GroupInvitationSchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    name: 'invitation_ttl',
  }
);

// Find invitations by inviter
GroupInvitationSchema.index(
  { invitedBy: 1, createdAt: -1 },
  { name: 'invitations_by_inviter' }
);

// Find all pending invitations for a group
GroupInvitationSchema.index(
  { groupId: 1, status: 1, createdAt: -1 },
  { name: 'group_pending_invitations' }
);

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual populate for group details
 */
GroupInvitationSchema.virtual('group', {
  ref: 'Group',
  localField: 'groupId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for inviter details
 */
GroupInvitationSchema.virtual('inviter', {
  ref: 'User',
  localField: 'invitedBy',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate for invited user details
 */
GroupInvitationSchema.virtual('invitee', {
  ref: 'User',
  localField: 'invitedUser',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual to check if invitation is a code-based invite
 */
GroupInvitationSchema.virtual('isCodeInvite').get(function() {
  return !!this.inviteCode && !this.invitedUser;
});

/**
 * Virtual to check if invitation is a direct invite
 */
GroupInvitationSchema.virtual('isDirectInvite').get(function() {
  return !!this.invitedUser;
});

/**
 * Virtual to check remaining uses (for code invites)
 */
GroupInvitationSchema.virtual('remainingUses').get(function() {
  if (!this.maxUses) return null; // Unlimited
  return Math.max(0, this.maxUses - this.usedCount);
});

// Enable virtuals in JSON and object output
GroupInvitationSchema.set('toJSON', { virtuals: true });
GroupInvitationSchema.set('toObject', { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Generate a random invite code
 */
GroupInvitationSchema.statics.generateInviteCode = function(): string {
  // Generate a random string of specified length
  // Using uppercase alphanumeric characters for readability
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0,O,I,1,L
  let code = '';
  
  const randomBytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  
  return code;
};

/**
 * Find a valid invitation by code
 */
GroupInvitationSchema.statics.findValidByCode = async function(
  code: string
): Promise<IGroupInvitation | null> {
  const invitation = await this.findOne({
    inviteCode: code.toUpperCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).populate('group', 'name slug coverImage icon');

  if (!invitation) return null;

  // Check if max uses exceeded
  if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
    return null;
  }

  return invitation;
};

/**
 * Find pending invitation for a user
 */
GroupInvitationSchema.statics.findPendingForUser = async function(
  groupId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string
): Promise<IGroupInvitation | null> {
  return this.findOne({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    invitedUser: new mongoose.Types.ObjectId(userId.toString()),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Create a direct user invitation
 */
GroupInvitationSchema.statics.createDirectInvite = async function(
  groupId: mongoose.Types.ObjectId | string,
  invitedBy: mongoose.Types.ObjectId | string,
  invitedUser: mongoose.Types.ObjectId | string,
  expiresInDays = DEFAULT_EXPIRATION_DAYS
): Promise<IGroupInvitation> {
  // Check if there's already a pending invitation
  const existingInvite = await this.findPendingForUser(groupId, invitedUser);
  if (existingInvite) {
    throw new Error('User already has a pending invitation');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  return this.create({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    invitedBy: new mongoose.Types.ObjectId(invitedBy.toString()),
    invitedUser: new mongoose.Types.ObjectId(invitedUser.toString()),
    expiresAt,
    status: 'pending',
  });
};

/**
 * Create an invite code/link
 */
GroupInvitationSchema.statics.createInviteCode = async function(
  groupId: mongoose.Types.ObjectId | string,
  invitedBy: mongoose.Types.ObjectId | string,
  options: { maxUses?: number; expiresInDays?: number } = {}
): Promise<IGroupInvitation> {
  const { maxUses, expiresInDays = DEFAULT_EXPIRATION_DAYS } = options;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Generate unique code with retry logic
  let inviteCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    inviteCode = this.generateInviteCode();
    const existing = await this.findOne({ inviteCode });
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique invite code');
  }

  return this.create({
    groupId: new mongoose.Types.ObjectId(groupId.toString()),
    invitedBy: new mongoose.Types.ObjectId(invitedBy.toString()),
    inviteCode,
    expiresAt,
    maxUses,
    status: 'pending',
  });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if invitation is valid (not expired, not exceeded max uses)
 */
GroupInvitationSchema.methods.isValid = function(): boolean {
  // Check if expired
  if (new Date() > this.expiresAt) {
    return false;
  }

  // Check status
  if (this.status !== 'pending') {
    return false;
  }

  // Check max uses for code invites
  if (this.inviteCode && this.maxUses && this.usedCount >= this.maxUses) {
    return false;
  }

  return true;
};

/**
 * Mark invitation as accepted
 */
GroupInvitationSchema.methods.markAsAccepted = async function(): Promise<IGroupInvitation> {
  this.status = 'accepted';
  return this.save();
};

/**
 * Mark invitation as declined
 */
GroupInvitationSchema.methods.markAsDeclined = async function(): Promise<IGroupInvitation> {
  this.status = 'declined';
  return this.save();
};

/**
 * Increment usage count (for code invites)
 */
GroupInvitationSchema.methods.incrementUsage = async function(): Promise<IGroupInvitation> {
  this.usedCount += 1;
  
  // If max uses reached, mark as expired
  if (this.maxUses && this.usedCount >= this.maxUses) {
    this.status = 'expired';
  }
  
  return this.save();
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Validate invitation data before save
 */
GroupInvitationSchema.pre('save', function() {
  // Must have either invitedUser (direct invite) or inviteCode (link invite)
  if (!this.invitedUser && !this.inviteCode) {
    throw new Error('Invitation must have either an invited user or an invite code');
  }

  // Cannot have both invitedUser and inviteCode on the same invitation
  if (this.invitedUser && this.inviteCode) {
    throw new Error('Invitation cannot have both an invited user and an invite code');
  }

  // Check if expired and update status
  if (this.expiresAt && new Date() > this.expiresAt && this.status === 'pending') {
    this.status = 'expired';
  }
});

// ============================================
// MODEL EXPORT
// ============================================

// Delete existing model in development to prevent OverwriteModelError
const GroupInvitation = (mongoose.models.GroupInvitation as IGroupInvitationModel) || 
  mongoose.model<IGroupInvitation, IGroupInvitationModel>('GroupInvitation', GroupInvitationSchema);

export default GroupInvitation;
