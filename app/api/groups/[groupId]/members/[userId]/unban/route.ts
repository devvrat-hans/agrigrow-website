/**
 * Unban Member API Route
 * 
 * API endpoint for unbanning a member from a group.
 * 
 * Endpoints:
 * - POST /api/groups/[groupId]/members/[userId]/unban - Unban a member
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

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string; userId: string }>;
}

// ============================================
// POST /api/groups/[groupId]/members/[userId]/unban
// ============================================

/**
 * POST /api/groups/[groupId]/members/[userId]/unban
 * 
 * Unban a member and restore them to 'active' status.
 * - Requires moderator, admin, or owner role
 * - User must currently be banned
 * - Increments memberCount back
 * - Clears ban info (banReason, bannedBy, bannedAt)
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} userId - User ID (ObjectId) to unban
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string, data: GroupMemberData }
 * 
 * Error Codes:
 * - 400: Invalid user ID, user not banned
 * - 401: Authentication required
 * - 403: Insufficient permissions
 * - 404: Group or member not found
 * - 500: Server error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId, userId } = await params;

    // Validate userId
    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

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
        { success: false, error: 'Only moderators, admins, and owners can unban members' },
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

    // Check if user is currently banned
    if (targetMembership.status !== 'banned') {
      return NextResponse.json(
        { success: false, error: 'This member is not currently banned' },
        { status: 400 }
      );
    }

    // Update membership to active
    targetMembership.status = 'active';
    targetMembership.banReason = undefined;
    targetMembership.bannedBy = undefined;
    targetMembership.bannedAt = undefined;
    targetMembership.lastActivityAt = new Date();
    await targetMembership.save();

    // Increment memberCount
    await Group.findByIdAndUpdate(group._id, {
      $inc: { memberCount: 1 },
    });

    // Increment user's groupsJoined count
    await User.findByIdAndUpdate(targetUserId, {
      $inc: { groupsJoined: 1 },
    });

    // Populate for response
    await targetMembership.populate('userId', 'fullName profileImage role region');

    const user = targetMembership.userId as unknown as Record<string, unknown>;

    const responseData: GroupMemberData = {
      _id: targetMembership._id.toString(),
      groupId: targetMembership.groupId.toString(),
      userId: user?._id?.toString() || '',
      user: user ? {
        _id: user._id?.toString() || '',
        fullName: (user.fullName as string) || '',
        profileImage: user.profileImage as string | undefined,
        role: user.role as string | undefined,
        region: user.region as string | undefined,
      } : undefined,
      role: targetMembership.role as MemberRole,
      status: targetMembership.status as MemberStatus,
      joinedAt: targetMembership.joinedAt?.toISOString() || new Date().toISOString(),
      lastActivityAt: targetMembership.lastActivityAt?.toISOString(),
      notificationPreferences: targetMembership.notificationPreferences,
    };

    return NextResponse.json({
      success: true,
      message: 'Member has been unbanned and restored to active status',
      data: responseData,
    });

  } catch (error) {
    console.error('Error unbanning member:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to unban member',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
