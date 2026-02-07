/**
 * Group Members API Route
 * 
 * API endpoint for listing group members and joining groups.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/members - List group members with pagination
 * - POST /api/groups/[groupId]/members - Join a group
 * 
 * Authentication:
 * - GET: Optional (but may hide some info for non-members in private groups)
 * - POST: Required via x-user-phone header
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupMemberData, MemberRole, MemberStatus, GroupPrivacy } from '@/types/group';

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

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

/**
 * Valid roles for filtering
 */
const VALID_ROLES: MemberRole[] = ['member', 'moderator', 'admin', 'owner'];

/**
 * Valid statuses for filtering
 */
const VALID_STATUSES: MemberStatus[] = ['active', 'pending', 'banned', 'left'];

// ============================================
// GET /api/groups/[groupId]/members
// ============================================

/**
 * GET /api/groups/[groupId]/members
 * 
 * List group members with pagination and filtering.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Query Parameters:
 * @param {string} [page=1] - Page number for pagination
 * @param {string} [limit=20] - Number of items per page (max 50)
 * @param {string} [role] - Filter by role (member, moderator, admin, owner)
 * @param {string} [status=active] - Filter by status (active, pending, banned, left)
 * 
 * Headers:
 * @header {string} [x-user-phone] - Optional for additional info
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupMemberData[], pagination: {...} }
 * 
 * Error Codes:
 * - 404: Group not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 50);
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status') || 'active';

    // Build group query - support both ID and slug
    const groupQuery: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(groupQuery).select('_id isActive privacy').lean();

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Build membership query
    const membershipQuery: Record<string, unknown> = {
      groupId: group._id,
    };

    // Filter by status
    if (statusFilter && VALID_STATUSES.includes(statusFilter as MemberStatus)) {
      membershipQuery.status = statusFilter;
    }

    // Filter by role
    if (roleFilter && VALID_ROLES.includes(roleFilter as MemberRole)) {
      membershipQuery.role = roleFilter;
    }

    const skip = (page - 1) * limit;

    // Fetch members with user details
    const [memberships, totalCount] = await Promise.all([
      GroupMembership.find(membershipQuery)
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName profileImage role region phone')
        .populate('invitedBy', 'fullName profileImage')
        .lean(),
      GroupMembership.countDocuments(membershipQuery),
    ]);

    // Format response data
    const membersData: GroupMemberData[] = memberships.map(membership => {
      const user = membership.userId as unknown as Record<string, unknown> | null;
      const inviter = membership.invitedBy as unknown as Record<string, unknown> | null;

      return {
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
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return NextResponse.json({
      success: true,
      data: membersData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch group members',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/groups/[groupId]/members
// ============================================

/**
 * POST /api/groups/[groupId]/members
 * 
 * Join a group. Status depends on group privacy:
 * - Public: Immediately 'active'
 * - Private: 'pending' (requires admin approval)
 * - Invite-only: Must have an invitation
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, data: { membership, status, message } }
 * 
 * Error Codes:
 * - 400: Already a member, banned, or group not accepting members
 * - 401: Authentication required
 * - 403: Invite-only group requires invitation
 * - 404: Group not found
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

    // Check if user already has a membership
    const existingMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: currentUser._id,
    });

    if (existingMembership) {
      // Handle different existing statuses
      switch (existingMembership.status) {
        case 'active':
          return NextResponse.json(
            { success: false, error: 'You are already a member of this group' },
            { status: 400 }
          );
        case 'pending':
          return NextResponse.json(
            { success: false, error: 'Your membership request is pending approval' },
            { status: 400 }
          );
        case 'banned':
          return NextResponse.json(
            { success: false, error: 'You have been banned from this group' },
            { status: 400 }
          );
        case 'left':
          // User who left can rejoin - we'll update the existing record
          break;
      }
    }

    // Check group privacy and determine membership status
    const groupPrivacy = group.privacy as GroupPrivacy;
    let membershipStatus: MemberStatus;
    let message: string;

    switch (groupPrivacy) {
      case 'public':
        membershipStatus = 'active';
        message = 'You have joined the group successfully';
        break;
      case 'private':
        membershipStatus = 'pending';
        message = 'Your membership request has been submitted and is pending approval';
        break;
      case 'invite-only':
        // For invite-only groups, check for valid invitation
        // This would require GroupInvitation check
        // For now, return error - invitations will be handled separately
        return NextResponse.json(
          { success: false, error: 'This group is invite-only. You need an invitation to join.' },
          { status: 403 }
        );
      default:
        membershipStatus = 'pending';
        message = 'Your membership request has been submitted';
    }

    // Create or update membership
    let membership;
    
    if (existingMembership && existingMembership.status === 'left') {
      // Rejoin - update existing record
      existingMembership.status = membershipStatus;
      existingMembership.role = 'member';
      existingMembership.joinedAt = new Date();
      existingMembership.lastActivityAt = new Date();
      existingMembership.notificationPreferences = {
        newPosts: true,
        mentions: true,
        announcements: true,
      };
      // Clear any ban-related fields
      existingMembership.banReason = undefined;
      existingMembership.bannedBy = undefined;
      existingMembership.bannedAt = undefined;
      
      membership = await existingMembership.save();
    } else {
      // Create new membership
      membership = new GroupMembership({
        groupId: group._id,
        userId: currentUser._id,
        role: 'member',
        status: membershipStatus,
        joinedAt: new Date(),
        lastActivityAt: new Date(),
        notificationPreferences: {
          newPosts: true,
          mentions: true,
          announcements: true,
        },
      });

      await membership.save();
    }

    // Increment memberCount only for active joins
    if (membershipStatus === 'active') {
      await Group.findByIdAndUpdate(group._id, {
        $inc: { memberCount: 1 },
      });

      // Also increment user's groupsJoined count
      await User.findByIdAndUpdate(currentUser._id, {
        $inc: { groupsJoined: 1 },
      });
    }

    // Format response
    const responseData: GroupMemberData = {
      _id: membership._id.toString(),
      groupId: membership.groupId.toString(),
      userId: currentUser._id.toString(),
      user: {
        _id: currentUser._id.toString(),
        fullName: currentUser.fullName || '',
        profileImage: currentUser.profileImage,
        role: currentUser.role,
        region: currentUser.state || currentUser.district,
      },
      role: membership.role as MemberRole,
      status: membership.status as MemberStatus,
      joinedAt: membership.joinedAt.toISOString(),
      lastActivityAt: membership.lastActivityAt?.toISOString(),
      notificationPreferences: membership.notificationPreferences,
    };

    return NextResponse.json({
      success: true,
      message,
      data: responseData,
    }, { status: 201 });

  } catch (error) {
    console.error('Error joining group:', error);

    // Handle duplicate key error (race condition)
    if ((error as Record<string, unknown>).code === 11000) {
      return NextResponse.json(
        { success: false, error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to join group',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
