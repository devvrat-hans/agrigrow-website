/**
 * Group Settings API Route
 * 
 * API endpoint for managing group settings.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/settings - Get current settings
 * - PUT /api/groups/[groupId]/settings - Update settings (requires admin/owner)
 * 
 * Authentication:
 * - GET: Optional (for viewing settings)
 * - PUT: Required via x-user-phone header (must be admin or owner)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupSettings, MemberRole } from '@/types/group';

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
 * Check user's role in a group
 */
async function getUserGroupRole(
  groupId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
): Promise<{ role: MemberRole | null; status: string | null }> {
  const membership = await GroupMembership.findOne({
    groupId,
    userId,
  }).lean();

  if (!membership) {
    return { role: null, status: null };
  }

  return {
    role: membership.role as MemberRole,
    status: membership.status,
  };
}

/**
 * Check if user has at least the required role
 */
function hasRequiredRole(userRole: MemberRole | null, requiredRole: MemberRole): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<MemberRole, number> = {
    member: 1,
    moderator: 2,
    admin: 3,
    owner: 4,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

// ============================================
// GET /api/groups/[groupId]/settings
// ============================================

/**
 * GET /api/groups/[groupId]/settings
 * 
 * Get current group settings.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupSettings }
 * 
 * Error Codes:
 * - 404: Group not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;

    // Build query - support both ID and slug
    const query: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(query).select('settings isActive').lean();

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Return settings with defaults
    const settings: GroupSettings = {
      allowMemberPosts: group.settings?.allowMemberPosts ?? true,
      requirePostApproval: group.settings?.requirePostApproval ?? false,
      allowPolls: group.settings?.allowPolls ?? true,
      allowImages: group.settings?.allowImages ?? true,
    };

    return NextResponse.json({
      success: true,
      data: settings,
    });

  } catch (error) {
    console.error('Error fetching group settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch group settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/groups/[groupId]/settings
// ============================================

/**
 * PUT /api/groups/[groupId]/settings
 * 
 * Update group settings. Requires admin or owner role.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {boolean} [allowMemberPosts] - Whether members can create posts
 * @body {boolean} [requirePostApproval] - Whether posts require approval
 * @body {boolean} [allowPolls] - Whether polls are allowed
 * @body {boolean} [allowImages] - Whether images are allowed
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupSettings }
 * 
 * Error Codes:
 * - 400: Validation error
 * - 401: Authentication required
 * - 403: Not authorized (not admin/owner)
 * - 404: Group not found
 * - 500: Server error
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Build query - support both ID and slug
    const query: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(query);

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check user's role - must be admin or owner
    const { role: userRole, status: memberStatus } = await getUserGroupRole(
      group._id as mongoose.Types.ObjectId,
      currentUser._id as mongoose.Types.ObjectId
    );

    if (!hasRequiredRole(userRole, 'admin') || memberStatus !== 'active') {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update group settings' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      allowMemberPosts,
      requirePostApproval,
      allowPolls,
      allowImages,
    } = body;

    // Build settings update
    const currentSettings = group.settings || {};
    const updatedSettings: GroupSettings = {
      allowMemberPosts: typeof allowMemberPosts === 'boolean' 
        ? allowMemberPosts 
        : (currentSettings.allowMemberPosts ?? true),
      requirePostApproval: typeof requirePostApproval === 'boolean' 
        ? requirePostApproval 
        : (currentSettings.requirePostApproval ?? false),
      allowPolls: typeof allowPolls === 'boolean' 
        ? allowPolls 
        : (currentSettings.allowPolls ?? true),
      allowImages: typeof allowImages === 'boolean' 
        ? allowImages 
        : (currentSettings.allowImages ?? true),
    };

    // Update the group settings
    await Group.findByIdAndUpdate(
      group._id,
      { $set: { settings: updatedSettings } },
      { runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Group settings updated successfully',
      data: updatedSettings,
    });

  } catch (error) {
    console.error('Error updating group settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update group settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
