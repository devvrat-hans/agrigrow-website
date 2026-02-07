/**
 * Ban Member API Route
 * 
 * API endpoint for banning members from a group.
 * 
 * Endpoints:
 * - POST /api/groups/[groupId]/members/ban - Ban a member
 * 
 * Authentication:
 * - Required via x-user-phone header
 * - Must be moderator, admin, or owner
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupMemberData, MemberRole, MemberStatus } from '@/types/group';

// ============================================
// CONSTANTS
// ============================================

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(str: string): boolean {
  return mongoose.Types.ObjectId.isValid(str) && 
    new mongoose.Types.ObjectId(str).toString() === str;
}

/**
 * Get user from phone number
 */
async function getUserFromPhone(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return User.findOne({ phone: cleanPhone });
}

/**
 * Check if user has at least the required role
 */
function hasRequiredRole(userRole: MemberRole | null, requiredRole: MemberRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user has higher role than target
 */
function hasHigherRole(userRole: MemberRole, targetRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

// ============================================
// POST /api/groups/[groupId]/members/ban
// ============================================

/**
 * POST /api/groups/[groupId]/members/ban
 * 
 * Ban a member from the group.
 * - Requires moderator, admin, or owner role
 * - Cannot ban admins (only owner can ban admins)
 * - Cannot ban owner
 * - Cannot ban self
 * - Updates status to 'banned', sets bannedBy, bannedAt, banReason
 * - Decrements memberCount
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {string} userId - User ID to ban (required)
 * @body {string} banReason - Reason for ban (optional)
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string, data: GroupMemberData }
 * 
 * Error Codes:
 * - 400: Invalid user ID, self-ban attempt, user not member
 * - 401: Authentication required
 * - 403: Insufficient permissions
 * - 404: Group or member not found
 * - 500: Server error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;

    // Check authentication
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await getUserFromPhone(authPhone);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, banReason } = body;

    // Validate userId
    if (!userId || !isValidObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    // Prevent self-ban
    if (currentUser._id.toString() === userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot ban yourself' },
        { status: 400 }
      );
    }

    // Build group query - support both ID and slug
    const groupQuery: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(groupQuery);

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get current user's membership
    const currentUserMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: currentUser._id,
      status: 'active',
    }).lean();

    if (!currentUserMembership) {
      return NextResponse.json(
        { success: false, error: 'You are not an active member of this group' },
        { status: 403 }
      );
    }

    const currentUserRole = currentUserMembership.role as MemberRole;

    // Check if current user has at least moderator role
    if (!hasRequiredRole(currentUserRole, 'moderator')) {
      return NextResponse.json(
        { success: false, error: 'Only moderators, admins, and owners can ban members' },
        { status: 403 }
      );
    }

    // Get target membership
    const targetUserId = new mongoose.Types.ObjectId(userId);
    const targetMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: targetUserId,
    });

    if (!targetMembership) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this group' },
        { status: 404 }
      );
    }

    const targetRole = targetMembership.role as MemberRole;

    // Cannot ban owner
    if (targetRole === 'owner') {
      return NextResponse.json(
        { success: false, error: 'Cannot ban the group owner' },
        { status: 403 }
      );
    }

    // Only owner can ban admins
    if (targetRole === 'admin' && currentUserRole !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Only the owner can ban admins' },
        { status: 403 }
      );
    }

    // Cannot ban someone with equal or higher role
    if (!hasHigherRole(currentUserRole, targetRole)) {
      return NextResponse.json(
        { success: false, error: 'You cannot ban a member with equal or higher role' },
        { status: 403 }
      );
    }

    // Check if already banned
    if (targetMembership.status === 'banned') {
      return NextResponse.json(
        { success: false, error: 'Member is already banned from this group' },
        { status: 400 }
      );
    }

    const wasActive = targetMembership.status === 'active';

    // Update membership to banned
    targetMembership.status = 'banned';
    targetMembership.bannedBy = currentUser._id;
    targetMembership.bannedAt = new Date();
    if (banReason) {
      targetMembership.banReason = banReason;
    }
    await targetMembership.save();

    // Decrement memberCount if member was active
    if (wasActive) {
      await Group.findByIdAndUpdate(group._id, {
        $inc: { memberCount: -1 },
      });

      // Also decrement user's groupsJoined count
      await User.findByIdAndUpdate(targetUserId, {
        $inc: { groupsJoined: -1 },
      });

      // Remove from admins/moderators arrays if applicable
      await Group.findByIdAndUpdate(group._id, {
        $pull: { admins: targetUserId, moderators: targetUserId },
      });
    }

    // Populate for response
    await targetMembership.populate('userId', 'fullName profileImage role region');
    await targetMembership.populate('bannedBy', 'fullName profileImage');

    const user = targetMembership.userId as unknown as Record<string, unknown>;
    const _bannedByUser = targetMembership.bannedBy as unknown as Record<string, unknown>;

    const responseData: GroupMemberData = {
      _id: targetMembership._id.toString(),
      groupId: targetMembership.groupId.toString(),
      userId: user?._id?.toString() || '',
      user: user ? {
        _id: user._id?.toString() || '',
        fullName: (user.fullName as string) || '',
        profileImage: user.profileImage as string | undefined,
        role: user.role as string | undefined,
      } : undefined,
      role: targetMembership.role as MemberRole,
      status: targetMembership.status as MemberStatus,
      joinedAt: targetMembership.joinedAt?.toISOString() || new Date().toISOString(),
      lastActivityAt: targetMembership.lastActivityAt?.toISOString(),
      notificationPreferences: targetMembership.notificationPreferences,
      banReason: targetMembership.banReason,
      bannedBy: targetMembership.bannedBy?.toString(),
      bannedAt: targetMembership.bannedAt?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Member has been banned from the group',
      data: responseData,
    });

  } catch (error) {
    console.error('Error banning member:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to ban member',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
