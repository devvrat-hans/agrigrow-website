/**
 * Single Member API Route
 * 
 * API endpoint for operations on a specific group member.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/members/[userId] - Get member details
 * - PUT /api/groups/[groupId]/members/[userId] - Update member role (admin only)
 * - DELETE /api/groups/[groupId]/members/[userId] - Leave group or remove member
 * 
 * Authentication:
 * - GET: Optional (but may hide info for non-members)
 * - PUT: Required via x-user-phone header (must be admin or owner)
 * - DELETE: Required via x-user-phone header
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

const VALID_ROLES: MemberRole[] = ['member', 'moderator', 'admin'];

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
  params: Promise<{ groupId: string; userId: string }>;
}

// ============================================
// GET /api/groups/[groupId]/members/[userId]
// ============================================

/**
 * GET /api/groups/[groupId]/members/[userId]
 * 
 * Get member details including membership info and user profile.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} userId - User ID (ObjectId)
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupMemberData }
 * 
 * Error Codes:
 * - 400: Invalid user ID
 * - 404: Group or member not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Build group query - support both ID and slug
    const groupQuery: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(groupQuery).select('_id isActive').lean();

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Find membership
    const membership = await GroupMembership.findOne({
      groupId: group._id,
      userId: new mongoose.Types.ObjectId(userId),
    })
      .populate('userId', 'fullName profileImage role region phone experienceLevel')
      .populate('invitedBy', 'fullName profileImage')
      .populate('bannedBy', 'fullName profileImage')
      .lean();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this group' },
        { status: 404 }
      );
    }

    // Format response
    const user = membership.userId as unknown as Record<string, unknown> | null;
    const inviter = membership.invitedBy as unknown as Record<string, unknown> | null;

    const responseData: GroupMemberData = {
      _id: membership._id.toString(),
      groupId: membership.groupId.toString(),
      userId: user?._id?.toString() || '',
      user: user ? {
        _id: user._id?.toString() || '',
        fullName: (user.fullName as string) || 'Unknown User',
        profileImage: user.profileImage as string | undefined,
        role: user.role as string | undefined,
        region: user.region as string | undefined,
      } : undefined,
      role: membership.role as MemberRole,
      status: membership.status as MemberStatus,
      joinedAt: membership.joinedAt?.toISOString() || new Date().toISOString(),
      invitedBy: inviter?._id?.toString(),
      inviter: inviter ? {
        _id: inviter._id?.toString() || '',
        fullName: (inviter.fullName as string) || '',
        profileImage: inviter.profileImage as string | undefined,
      } : undefined,
      lastActivityAt: membership.lastActivityAt?.toISOString(),
      notificationPreferences: membership.notificationPreferences || {
        newPosts: true,
        mentions: true,
        announcements: true,
      },
      banReason: membership.banReason,
      bannedBy: membership.bannedBy?.toString(),
      bannedAt: membership.bannedAt?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch member',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/groups/[groupId]/members/[userId]
// ============================================

/**
 * PUT /api/groups/[groupId]/members/[userId]
 * 
 * Update member role. Requires admin or owner role.
 * Cannot change owner role or own role.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} userId - User ID (ObjectId)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {string} role - New role (member, moderator, admin)
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupMemberData }
 * 
 * Error Codes:
 * - 400: Invalid role or self-role change
 * - 401: Authentication required
 * - 403: Not authorized or cannot change role
 * - 404: Group or member not found
 * - 500: Server error
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    const currentUserRole = currentUserMembership.role as MemberRole;

    // Check if current user has admin or owner role
    if (!hasRequiredRole(currentUserRole, 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Only admins and owners can change member roles' },
        { status: 403 }
      );
    }

    // Get target membership
    const targetMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!targetMembership) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this group' },
        { status: 404 }
      );
    }

    // Prevent self-role change
    if (targetMembership.userId.toString() === currentUser._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Cannot change owner role
    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { success: false, error: 'Cannot change the owner\'s role' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { role: newRole } = body;

    // Validate new role
    if (!newRole || !VALID_ROLES.includes(newRole as MemberRole)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Cannot set role to owner
    if (newRole === 'owner') {
      return NextResponse.json(
        { success: false, error: 'Cannot assign owner role. Use ownership transfer instead.' },
        { status: 400 }
      );
    }

    // Admins can only manage moderators and members (not other admins)
    const targetRole = targetMembership.role as MemberRole;
    if (currentUserRole === 'admin') {
      // Admin cannot change another admin's role
      if (targetRole === 'admin') {
        return NextResponse.json(
          { success: false, error: 'Admins cannot change other admins\' roles' },
          { status: 403 }
        );
      }
      // Admin cannot promote to admin
      if (newRole === 'admin') {
        return NextResponse.json(
          { success: false, error: 'Only the owner can promote members to admin' },
          { status: 403 }
        );
      }
    }

    // Update the membership role
    targetMembership.role = newRole;
    await targetMembership.save();

    // Update group admins/moderators arrays if needed
    const targetUserId = targetMembership.userId;
    
    if (newRole === 'admin') {
      // Add to admins, remove from moderators
      await Group.findByIdAndUpdate(group._id, {
        $addToSet: { admins: targetUserId },
        $pull: { moderators: targetUserId },
      });
    } else if (newRole === 'moderator') {
      // Add to moderators, remove from admins
      await Group.findByIdAndUpdate(group._id, {
        $addToSet: { moderators: targetUserId },
        $pull: { admins: targetUserId },
      });
    } else {
      // Remove from both admins and moderators
      await Group.findByIdAndUpdate(group._id, {
        $pull: { admins: targetUserId, moderators: targetUserId },
      });
    }

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
      } : undefined,
      role: targetMembership.role as MemberRole,
      status: targetMembership.status as MemberStatus,
      joinedAt: targetMembership.joinedAt?.toISOString() || new Date().toISOString(),
      lastActivityAt: targetMembership.lastActivityAt?.toISOString(),
      notificationPreferences: targetMembership.notificationPreferences,
    };

    return NextResponse.json({
      success: true,
      message: `Member role updated to ${newRole}`,
      data: responseData,
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update member role',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/groups/[groupId]/members/[userId]
// ============================================

/**
 * DELETE /api/groups/[groupId]/members/[userId]
 * 
 * Leave group (if userId is current user) or remove member (if admin/moderator).
 * - Self: Update status to 'left', decrement memberCount
 * - Admin removing member: Same as above
 * - Cannot remove owner or equal/higher role
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} userId - User ID (ObjectId)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string }
 * 
 * Error Codes:
 * - 400: Owner cannot leave, invalid user ID
 * - 401: Authentication required
 * - 403: Not authorized to remove member
 * - 404: Group or member not found
 * - 500: Server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const targetUserId = new mongoose.Types.ObjectId(userId);
    const isSelfLeaving = currentUser._id.toString() === userId;

    // Get target membership
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

    // Check if already left
    if (targetMembership.status === 'left') {
      return NextResponse.json(
        { success: false, error: 'Member has already left the group' },
        { status: 400 }
      );
    }

    const targetRole = targetMembership.role as MemberRole;
    const wasActive = targetMembership.status === 'active';

    if (isSelfLeaving) {
      // User is leaving the group themselves
      
      // Owner cannot leave - must transfer ownership first
      if (targetRole === 'owner') {
        return NextResponse.json(
          { success: false, error: 'Group owner cannot leave. Transfer ownership first.' },
          { status: 400 }
        );
      }

      // Update membership status
      targetMembership.status = 'left';
      await targetMembership.save();

    } else {
      // Someone is removing another member - need to check permissions
      
      // Get current user's membership
      const currentUserMembership = await GroupMembership.findOne({
        groupId: group._id,
        userId: currentUser._id,
        status: 'active',
      }).lean();

      if (!currentUserMembership) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this group' },
          { status: 403 }
        );
      }

      const currentUserRole = currentUserMembership.role as MemberRole;

      // Need at least moderator role to remove others
      if (!hasRequiredRole(currentUserRole, 'moderator')) {
        return NextResponse.json(
          { success: false, error: 'Only moderators, admins, and owners can remove members' },
          { status: 403 }
        );
      }

      // Cannot remove owner
      if (targetRole === 'owner') {
        return NextResponse.json(
          { success: false, error: 'Cannot remove the group owner' },
          { status: 403 }
        );
      }

      // Cannot remove someone with equal or higher role
      if (!hasHigherRole(currentUserRole, targetRole)) {
        return NextResponse.json(
          { success: false, error: 'You cannot remove a member with equal or higher role' },
          { status: 403 }
        );
      }

      // Update membership status
      targetMembership.status = 'left';
      await targetMembership.save();
    }

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

    const message = isSelfLeaving
      ? 'You have left the group'
      : 'Member has been removed from the group';

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove member',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
