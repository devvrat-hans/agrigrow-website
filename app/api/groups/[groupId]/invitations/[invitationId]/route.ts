/**
 * Single Invitation API Route
 * 
 * API endpoint for operations on a specific invitation.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/invitations/[invitationId] - Get invitation details
 * - DELETE /api/groups/[groupId]/invitations/[invitationId] - Cancel invitation
 * 
 * Authentication:
 * - Required via x-user-phone header
 * - Must be admin or owner
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupInvitation from '@/models/GroupInvitation';
import User from '@/models/User';
import { GroupInvitationData, MemberRole, InvitationStatus } from '@/types/group';

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
  params: Promise<{ groupId: string; invitationId: string }>;
}

// ============================================
// GET /api/groups/[groupId]/invitations/[invitationId]
// ============================================

/**
 * GET /api/groups/[groupId]/invitations/[invitationId]
 * 
 * Get details of a specific invitation.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} invitationId - Invitation ID (ObjectId)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupInvitationData }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId, invitationId } = await params;

    // Validate invitationId
    if (!isValidObjectId(invitationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation ID' },
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

    // Check if current user has admin role
    if (!hasRequiredRole(currentUserRole, 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Only admins and owners can view invitation details' },
        { status: 403 }
      );
    }

    // Find invitation
    const invitation = await GroupInvitation.findOne({
      _id: new mongoose.Types.ObjectId(invitationId),
      groupId: group._id,
    })
      .populate('invitedBy', 'fullName profileImage')
      .populate('invitedUser', 'fullName profileImage')
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const inviter = invitation.invitedBy as unknown as Record<string, unknown> | null;
    const invitee = invitation.invitedUser as unknown as Record<string, unknown> | null;

    const responseData: GroupInvitationData = {
      _id: invitation._id.toString(),
      groupId: invitation.groupId.toString(),
      inviteCode: invitation.inviteCode,
      invitedBy: invitation.invitedBy?.toString() || '',
      inviter: inviter ? {
        _id: inviter._id?.toString() || '',
        fullName: (inviter.fullName as string) || '',
        profileImage: inviter.profileImage as string | undefined,
      } : undefined,
      invitedUser: invitation.invitedUser?.toString(),
      invitee: invitee ? {
        _id: invitee._id?.toString() || '',
        fullName: (invitee.fullName as string) || '',
        profileImage: invitee.profileImage as string | undefined,
      } : undefined,
      status: invitation.status as InvitationStatus,
      maxUses: invitation.maxUses,
      usedCount: invitation.usedCount,
      expiresAt: invitation.expiresAt?.toISOString(),
      createdAt: invitation.createdAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invitation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/groups/[groupId]/invitations/[invitationId]
// ============================================

/**
 * DELETE /api/groups/[groupId]/invitations/[invitationId]
 * 
 * Cancel a pending invitation.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} invitationId - Invitation ID (ObjectId)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId, invitationId } = await params;

    // Validate invitationId
    if (!isValidObjectId(invitationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation ID' },
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

    // Check if current user has admin role
    if (!hasRequiredRole(currentUserRole, 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Only admins and owners can cancel invitations' },
        { status: 403 }
      );
    }

    // Find invitation
    const invitation = await GroupInvitation.findOne({
      _id: new mongoose.Types.ObjectId(invitationId),
      groupId: group._id,
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot cancel invitation with status '${invitation.status}'` },
        { status: 400 }
      );
    }

    // Update invitation status to expired (cancelled is not a valid status)
    invitation.status = 'expired';
    await invitation.save();

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel invitation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
