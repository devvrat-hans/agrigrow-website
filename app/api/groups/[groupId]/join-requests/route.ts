/**
 * Join Requests API Route
 * 
 * API endpoint for managing pending join requests for private groups.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/join-requests - List pending join requests
 * - POST /api/groups/[groupId]/join-requests - Approve or reject a join request
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
import Notification from '@/models/Notification';
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
  params: Promise<{ groupId: string }>;
}

// ============================================
// GET /api/groups/[groupId]/join-requests
// ============================================

/**
 * GET /api/groups/[groupId]/join-requests
 * 
 * List pending join requests for a group.
 * Requires moderator, admin, or owner role.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Query Parameters:
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 50)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupMemberData[], pagination: {...} }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const group = await Group.findOne(groupQuery)
      .select('_id name slug privacy isActive')
      .lean();

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

    // Check if current user has at least moderator role
    if (!hasRequiredRole(currentUserRole, 'moderator')) {
      return NextResponse.json(
        { success: false, error: 'Only moderators, admins, and owners can view join requests' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Query for pending memberships
    const query = {
      groupId: group._id,
      status: 'pending',
    };

    // Count total
    const total = await GroupMembership.countDocuments(query);

    // Fetch pending requests
    const requests = await GroupMembership.find(query)
      .populate('userId', 'fullName profileImage role region experienceLevel phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Format response
    const formattedRequests: GroupMemberData[] = requests.map((req) => {
      const user = req.userId as unknown as Record<string, unknown> | null;

      return {
        _id: req._id.toString(),
        groupId: req.groupId.toString(),
        userId: user?._id?.toString() || '',
        user: user ? {
          _id: user._id?.toString() || '',
          fullName: (user.fullName as string) || 'Unknown User',
          profileImage: user.profileImage as string | undefined,
          role: user.role as string | undefined,
          region: user.region as string | undefined,
        } : undefined,
        role: req.role as MemberRole,
        status: req.status as MemberStatus,
        joinedAt: req.joinedAt?.toISOString() || req.createdAt?.toISOString() || new Date().toISOString(),
        createdAt: req.createdAt?.toISOString() || new Date().toISOString(),
        notificationPreferences: req.notificationPreferences,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: formattedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch join requests',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/groups/[groupId]/join-requests
// ============================================

/**
 * POST /api/groups/[groupId]/join-requests
 * 
 * Approve or reject a join request.
 * Requires moderator, admin, or owner role.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {string} userId - User ID of the requester
 * @body {string} action - 'approve' or 'reject'
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string, data?: GroupMemberData }
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
    const { userId, action } = body;

    // Validate userId
    if (!userId || !isValidObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be either "approve" or "reject"' },
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
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    const currentUserRole = currentUserMembership.role as MemberRole;

    // Check if current user has at least moderator role
    if (!hasRequiredRole(currentUserRole, 'moderator')) {
      return NextResponse.json(
        { success: false, error: 'Only moderators, admins, and owners can manage join requests' },
        { status: 403 }
      );
    }

    // Find the pending membership
    const targetUserId = new mongoose.Types.ObjectId(userId);
    const pendingMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: targetUserId,
      status: 'pending',
    });

    if (!pendingMembership) {
      return NextResponse.json(
        { success: false, error: 'No pending join request found for this user' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Approve the join request
      pendingMembership.status = 'active';
      pendingMembership.joinedAt = new Date();
      await pendingMembership.save();

      // Increment group memberCount
      await Group.findByIdAndUpdate(group._id, {
        $inc: { memberCount: 1 },
      });

      // Increment user's groupsJoined count
      await User.findByIdAndUpdate(targetUserId, {
        $inc: { groupsJoined: 1 },
      });

      // Create notification for the user
      try {
        const notification = new Notification({
          userId: targetUserId,
          type: 'group_join_approved',
          title: 'Join Request Approved',
          message: `Your request to join "${group.name}" has been approved!`,
          metadata: {
            groupId: group._id.toString(),
            groupName: group.name,
            groupSlug: group.slug,
          },
          isRead: false,
        });
        await notification.save();
      } catch (notifError) {
        // Log but don't fail the request if notification fails
        console.error('Failed to create notification:', notifError);
      }

      // Populate for response
      await pendingMembership.populate('userId', 'fullName profileImage role region');

      const user = pendingMembership.userId as unknown as Record<string, unknown>;

      const responseData: GroupMemberData = {
        _id: pendingMembership._id.toString(),
        groupId: pendingMembership.groupId.toString(),
        userId: user?._id?.toString() || '',
        user: user ? {
          _id: user._id?.toString() || '',
          fullName: (user.fullName as string) || '',
          profileImage: user.profileImage as string | undefined,
          role: user.role as string | undefined,
          region: user.region as string | undefined,
        } : undefined,
        role: pendingMembership.role as MemberRole,
        status: pendingMembership.status as MemberStatus,
        joinedAt: pendingMembership.joinedAt?.toISOString() || new Date().toISOString(),
        notificationPreferences: pendingMembership.notificationPreferences,
      };

      return NextResponse.json({
        success: true,
        message: 'Join request approved',
        data: responseData,
      });

    } else {
      // Reject the join request
      // Option 1: Delete the membership record entirely
      // Option 2: Set status to 'left'
      // We'll use option 2 to maintain a record

      pendingMembership.status = 'left';
      await pendingMembership.save();

      // Create notification for the user
      try {
        const notification = new Notification({
          userId: targetUserId,
          type: 'group_join_rejected',
          title: 'Join Request Declined',
          message: `Your request to join "${group.name}" was not approved.`,
          metadata: {
            groupId: group._id.toString(),
            groupName: group.name,
            groupSlug: group.slug,
          },
          isRead: false,
        });
        await notification.save();
      } catch (notifError) {
        // Log but don't fail the request if notification fails
        console.error('Failed to create notification:', notifError);
      }

      return NextResponse.json({
        success: true,
        message: 'Join request rejected',
      });
    }

  } catch (error) {
    console.error('Error processing join request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process join request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
