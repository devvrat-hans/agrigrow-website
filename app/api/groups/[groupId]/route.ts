/**
 * Single Group API Route
 * 
 * API endpoint for operations on a specific group.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId] - Get group details by ID or slug
 * - PUT /api/groups/[groupId] - Update group (requires admin/owner role)
 * - DELETE /api/groups/[groupId] - Soft delete group (requires owner role)
 * 
 * Authentication:
 * - GET: Optional (returns user's membership status if authenticated)
 * - PUT: Required via x-user-phone header (must be admin or owner)
 * - DELETE: Required via x-user-phone header (must be owner)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupType, GroupPrivacy, GroupData, MemberRole } from '@/types/group';
import {
  validateBase64Image,
  isBase64DataUrl,
  estimateBase64Size,
  extractMimeTypeFromDataUrl,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/base64-image';

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
// GET /api/groups/[groupId]
// ============================================

/**
 * GET /api/groups/[groupId]
 * 
 * Fetch a single group by ID or slug.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} [x-user-phone] - Optional phone for membership status
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupData }
 * 
 * Error Codes:
 * - 404: Group not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;

    // Get authenticated user from headers (optional)
    const authPhone = request.headers.get('x-user-phone');
    let currentUser = null;

    if (authPhone) {
      currentUser = await getUserFromPhone(authPhone);
    }

    // Build query - support both ID and slug
    const query: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(query)
      .populate('createdBy', 'fullName profileImage role region')
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if group is active
    if (!group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get user's membership status if authenticated
    let membership = null;
    if (currentUser) {
      const membershipDoc = await GroupMembership.findOne({
        groupId: group._id,
        userId: currentUser._id,
      }).lean();

      if (membershipDoc) {
        membership = {
          role: membershipDoc.role,
          status: membershipDoc.status,
        };
      }
    }

    // Format response
    const responseData: GroupData = {
      _id: group._id.toString(),
      name: group.name,
      slug: group.slug,
      description: group.description,
      coverImage: group.coverImage,
      icon: group.icon,
      groupType: group.groupType as GroupType,
      privacy: group.privacy as GroupPrivacy,
      crops: group.crops || [],
      region: group.region,
      tags: group.tags || [],
      createdBy: group.createdBy && typeof group.createdBy === 'object' && '_id' in group.createdBy ? {
        _id: (group.createdBy as unknown as { _id?: { toString(): string }; fullName?: string; profileImage?: string; role?: string })._id?.toString() || '',
        fullName: (group.createdBy as unknown as { fullName?: string }).fullName || 'Unknown',
        profileImage: (group.createdBy as unknown as { profileImage?: string }).profileImage,
        role: (group.createdBy as unknown as { role?: string }).role,
      } : typeof group.createdBy === 'object' ? (group.createdBy as unknown as { toString(): string }).toString() : '',
      admins: (group.admins || []).map((id: mongoose.Types.ObjectId) => id.toString()),
      moderators: (group.moderators || []).map((id: mongoose.Types.ObjectId) => id.toString()),
      memberCount: group.memberCount || 0,
      postCount: group.postCount || 0,
      rules: group.rules || [],
      settings: group.settings || {
        allowMemberPosts: true,
        requirePostApproval: false,
        allowPolls: true,
        allowImages: true,
      },
      isVerified: group.isVerified || false,
      isActive: group.isActive,
      createdAt: group.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: group.updatedAt?.toISOString() || new Date().toISOString(),
      isJoined: membership?.status === 'active',
      userRole: membership?.role as GroupData['userRole'],
      userMembershipStatus: membership?.status as GroupData['userMembershipStatus'],
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch group',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/groups/[groupId]
// ============================================

/**
 * PUT /api/groups/[groupId]
 * 
 * Update group details. Requires admin or owner role.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {string} [name] - Group name (3-100 chars)
 * @body {string} [description] - Group description (max 500 chars)
 * @body {string} [coverImage] - Cover image URL
 * @body {string} [icon] - Group icon
 * @body {string[]} [tags] - Discovery tags
 * @body {Object[]} [rules] - Group rules
 * @body {Object} [settings] - Group settings
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupData }
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

    // Check user's role
    const { role: userRole, status: memberStatus } = await getUserGroupRole(
      group._id as mongoose.Types.ObjectId,
      currentUser._id as mongoose.Types.ObjectId
    );

    // Verify admin or owner role and active status
    if (!hasRequiredRole(userRole, 'admin') || memberStatus !== 'active') {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this group' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      coverImage,
      icon,
      tags,
      rules,
      settings,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    // Validate and add name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: 'Group name must be at least 3 characters' },
          { status: 400 }
        );
      }
      if (name.trim().length > 100) {
        return NextResponse.json(
          { success: false, error: 'Group name cannot exceed 100 characters' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Validate and add description
    if (description !== undefined) {
      if (description && description.length > 500) {
        return NextResponse.json(
          { success: false, error: 'Description cannot exceed 500 characters' },
          { status: 400 }
        );
      }
      updateData.description = description?.trim() || '';
    }

    // Add optional fields
    if (coverImage !== undefined) {
      if (coverImage === null || coverImage === '') {
        // Allow removing cover image
        updateData.coverImage = null;
        updateData.coverImageMeta = null;
      } else if (typeof coverImage === 'string') {
        if (isBase64DataUrl(coverImage)) {
          // Validate base64 image
          const validation = validateBase64Image(coverImage);
          if (!validation.valid) {
            return NextResponse.json(
              { success: false, error: `Invalid cover image: ${validation.error}` },
              { status: 400 }
            );
          }

          // Check size (5MB limit)
          const imageSize = estimateBase64Size(coverImage);
          if (imageSize > MAX_IMAGE_SIZE_BYTES) {
            const sizeMB = (imageSize / (1024 * 1024)).toFixed(2);
            return NextResponse.json(
              { success: false, error: `Cover image too large (${sizeMB}MB). Maximum size is 5MB.` },
              { status: 400 }
            );
          }

          updateData.coverImage = coverImage;
          updateData.coverImageMeta = {
            size: imageSize,
            type: extractMimeTypeFromDataUrl(coverImage) || 'image/unknown',
            isBase64: true,
            updatedAt: new Date(),
          };
        } else if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
          // Allow URL-based images (backward compatibility)
          updateData.coverImage = coverImage;
          updateData.coverImageMeta = {
            size: 0,
            type: 'image/unknown',
            isBase64: false,
            updatedAt: new Date(),
          };
        } else {
          return NextResponse.json(
            { success: false, error: 'Cover image must be a valid base64 data URL or HTTP(S) URL' },
            { status: 400 }
          );
        }
      }
    }

    if (icon !== undefined) {
      if (icon === null || icon === '') {
        // Allow removing icon
        updateData.icon = null;
        updateData.iconMeta = null;
      } else if (typeof icon === 'string') {
        if (isBase64DataUrl(icon)) {
          // Validate base64 image
          const validation = validateBase64Image(icon);
          if (!validation.valid) {
            return NextResponse.json(
              { success: false, error: `Invalid icon: ${validation.error}` },
              { status: 400 }
            );
          }

          // Check size (2MB limit for icons)
          const iconMaxSize = 2 * 1024 * 1024; // 2MB
          const imageSize = estimateBase64Size(icon);
          if (imageSize > iconMaxSize) {
            const sizeMB = (imageSize / (1024 * 1024)).toFixed(2);
            return NextResponse.json(
              { success: false, error: `Icon too large (${sizeMB}MB). Maximum size is 2MB.` },
              { status: 400 }
            );
          }

          updateData.icon = icon;
          updateData.iconMeta = {
            size: imageSize,
            type: extractMimeTypeFromDataUrl(icon) || 'image/unknown',
            isBase64: true,
            updatedAt: new Date(),
          };
        } else if (icon.startsWith('http://') || icon.startsWith('https://')) {
          // Allow URL-based icons (backward compatibility)
          updateData.icon = icon;
          updateData.iconMeta = {
            size: 0,
            type: 'image/unknown',
            isBase64: false,
            updatedAt: new Date(),
          };
        } else {
          // Allow emoji or icon name strings
          updateData.icon = icon;
          // No meta update for emoji/icon name
        }
      }
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          { success: false, error: 'Tags must be an array' },
          { status: 400 }
        );
      }
      updateData.tags = tags.map((t: string) => t.toLowerCase().trim()).filter(Boolean);
    }

    // Validate and add rules
    if (rules !== undefined) {
      if (!Array.isArray(rules)) {
        return NextResponse.json(
          { success: false, error: 'Rules must be an array' },
          { status: 400 }
        );
      }
      for (const rule of rules) {
        if (!rule.title || typeof rule.title !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Each rule must have a title' },
            { status: 400 }
          );
        }
        if (rule.title.length > 100) {
          return NextResponse.json(
            { success: false, error: 'Rule title cannot exceed 100 characters' },
            { status: 400 }
          );
        }
        if (rule.description && rule.description.length > 500) {
          return NextResponse.json(
            { success: false, error: 'Rule description cannot exceed 500 characters' },
            { status: 400 }
          );
        }
      }
      updateData.rules = rules.map((r: { title: string; description?: string }) => ({
        title: r.title.trim(),
        description: r.description?.trim() || '',
      }));
    }

    // Validate and add settings
    if (settings !== undefined) {
      const validSettings: Record<string, boolean> = {};
      
      if (typeof settings.allowMemberPosts === 'boolean') {
        validSettings.allowMemberPosts = settings.allowMemberPosts;
      }
      if (typeof settings.requirePostApproval === 'boolean') {
        validSettings.requirePostApproval = settings.requirePostApproval;
      }
      if (typeof settings.allowPolls === 'boolean') {
        validSettings.allowPolls = settings.allowPolls;
      }
      if (typeof settings.allowImages === 'boolean') {
        validSettings.allowImages = settings.allowImages;
      }

      if (Object.keys(validSettings).length > 0) {
        // Merge with existing settings
        updateData.settings = {
          ...group.settings,
          ...validSettings,
        };
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the group
    const updatedGroup = await Group.findByIdAndUpdate(
      group._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName profileImage role');

    if (!updatedGroup) {
      return NextResponse.json(
        { success: false, error: 'Failed to update group' },
        { status: 500 }
      );
    }

    // Format response
    const responseData: GroupData = {
      _id: updatedGroup._id.toString(),
      name: updatedGroup.name,
      slug: updatedGroup.slug,
      description: updatedGroup.description,
      coverImage: updatedGroup.coverImage,
      icon: updatedGroup.icon,
      groupType: updatedGroup.groupType as GroupType,
      privacy: updatedGroup.privacy as GroupPrivacy,
      crops: updatedGroup.crops || [],
      region: updatedGroup.region,
      tags: updatedGroup.tags || [],
      createdBy: updatedGroup.createdBy ? {
        _id: (updatedGroup.createdBy as unknown as Record<string, unknown>)._id?.toString() || '',
        fullName: (updatedGroup.createdBy as unknown as Record<string, unknown>).fullName as string || '',
        profileImage: (updatedGroup.createdBy as unknown as Record<string, unknown>).profileImage as string | undefined,
        role: (updatedGroup.createdBy as unknown as Record<string, unknown>).role as string | undefined,
      } : '',
      admins: (updatedGroup.admins || []).map((id: mongoose.Types.ObjectId) => id.toString()),
      moderators: (updatedGroup.moderators || []).map((id: mongoose.Types.ObjectId) => id.toString()),
      memberCount: updatedGroup.memberCount || 0,
      postCount: updatedGroup.postCount || 0,
      rules: updatedGroup.rules || [],
      settings: updatedGroup.settings || {
        allowMemberPosts: true,
        requirePostApproval: false,
        allowPolls: true,
        allowImages: true,
      },
      isVerified: updatedGroup.isVerified || false,
      isActive: updatedGroup.isActive,
      createdAt: updatedGroup.createdAt.toISOString(),
      updatedAt: updatedGroup.updatedAt.toISOString(),
      isJoined: true,
      userRole: userRole as GroupData['userRole'],
      userMembershipStatus: 'active',
    };

    return NextResponse.json({
      success: true,
      message: 'Group updated successfully',
      data: responseData,
    });

  } catch (error) {
    console.error('Error updating group:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(e => e.message);
      return NextResponse.json(
        { success: false, error: 'Validation error', details: messages },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update group',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/groups/[groupId]
// ============================================

/**
 * DELETE /api/groups/[groupId]
 * 
 * Soft delete a group. Requires owner role.
 * Sets isActive to false and updates all memberships to 'left' status.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string }
 * 
 * Error Codes:
 * - 401: Authentication required
 * - 403: Not authorized (not owner)
 * - 404: Group not found
 * - 500: Server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check user's role - must be owner
    const { role: userRole, status: memberStatus } = await getUserGroupRole(
      group._id as mongoose.Types.ObjectId,
      currentUser._id as mongoose.Types.ObjectId
    );

    if (userRole !== 'owner' || memberStatus !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Only the group owner can delete the group' },
        { status: 403 }
      );
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Soft delete the group
        await Group.findByIdAndUpdate(
          group._id,
          { 
            $set: { 
              isActive: false,
              updatedAt: new Date(),
            },
          },
          { session }
        );

        // Update all memberships to 'left' status
        await GroupMembership.updateMany(
          { 
            groupId: group._id,
            status: { $ne: 'left' },
          },
          { 
            $set: { 
              status: 'left',
              updatedAt: new Date(),
            },
          },
          { session }
        );

        // Decrement groupsJoined count for all affected users
        const memberships = await GroupMembership.find({
          groupId: group._id,
        }).session(session).lean();

        const userIds = memberships.map(m => m.userId);
        
        await User.updateMany(
          { _id: { $in: userIds } },
          { $inc: { groupsJoined: -1 } },
          { session }
        );
      });

      await session.endSession();

      return NextResponse.json({
        success: true,
        message: 'Group deleted successfully',
      });

    } catch (transactionError) {
      await session.endSession();
      throw transactionError;
    }

  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete group',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
