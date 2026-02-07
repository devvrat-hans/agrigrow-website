/**
 * Groups API Route
 * 
 * Main API endpoint for group CRUD operations.
 * 
 * Endpoints:
 * - GET /api/groups - List/search groups with filtering and pagination
 * - POST /api/groups - Create a new group
 * 
 * Authentication:
 * - GET: Optional (returns user's membership status if authenticated)
 * - POST: Required via x-user-phone header
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupType, GroupPrivacy, GroupData } from '@/types/group';
import {
  validateBase64Image,
  isBase64DataUrl,
  estimateBase64Size,
  extractMimeTypeFromDataUrl,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/base64-image';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Valid group types for filtering
 */
const VALID_GROUP_TYPES: GroupType[] = ['crop', 'region', 'topic', 'practice'];

/**
 * Valid privacy options
 */
const VALID_PRIVACY: GroupPrivacy[] = ['public', 'private', 'invite-only'];

/**
 * Valid sort options
 */
type SortOption = 'popular' | 'recent' | 'alphabetical';

// ============================================
// GET /api/groups
// ============================================

/**
 * GET /api/groups
 * 
 * List and search groups with filtering, sorting, and pagination.
 * 
 * Query Parameters:
 * @param {string} [page=1] - Page number for pagination
 * @param {string} [limit=20] - Number of items per page (max 50)
 * @param {string} [search] - Text search on name and description
 * @param {string} [groupType] - Filter by group type (crop, region, topic, practice)
 * @param {string} [crop] - Filter by linked crop
 * @param {string} [region] - Filter by region
 * @param {string} [sortBy=popular] - Sort order (popular, recent, alphabetical)
 * 
 * Headers:
 * @header {string} [x-user-phone] - Optional phone for membership status
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupData[], pagination: {...} }
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 50);
    const search = searchParams.get('search')?.trim();
    const groupType = searchParams.get('groupType');
    const crop = searchParams.get('crop')?.trim().toLowerCase();
    const region = searchParams.get('region')?.trim();
    const sortBy = (searchParams.get('sortBy') || 'popular') as SortOption;

    // Get authenticated user from headers (optional)
    const authPhone = request.headers.get('x-user-phone');
    let currentUser = null;

    if (authPhone) {
      const cleanAuthPhone = authPhone.replace(/\D/g, '');
      currentUser = await User.findOne({ phone: cleanAuthPhone }).lean();
    }

    // Build query
    const query: Record<string, unknown> = {
      isActive: true,
    };

    // Text search on name and description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Filter by group type
    if (groupType && VALID_GROUP_TYPES.includes(groupType as GroupType)) {
      query.groupType = groupType;
    }

    // Filter by linked crop
    if (crop) {
      query.crops = { $in: [crop] };
    }

    // Filter by region
    if (region) {
      query.region = { $regex: region, $options: 'i' };
    }

    // Determine sort order
    let sortQuery: Record<string, 1 | -1>;
    switch (sortBy) {
      case 'recent':
        sortQuery = { createdAt: -1 };
        break;
      case 'alphabetical':
        sortQuery = { name: 1 };
        break;
      case 'popular':
      default:
        sortQuery = { memberCount: -1, createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    // Fetch groups with creator details
    const [groups, totalCount] = await Promise.all([
      Group.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'fullName profileImage role')
        .lean(),
      Group.countDocuments(query),
    ]);

    // If user is authenticated, get their membership status for each group
    const membershipMap: Map<string, { role: string; status: string }> = new Map();
    
    if (currentUser) {
      const groupIds = groups.map(g => g._id);
      const memberships = await GroupMembership.find({
        groupId: { $in: groupIds },
        userId: currentUser._id,
        status: { $in: ['active', 'pending'] },
      }).lean();

      memberships.forEach(m => {
        membershipMap.set(m.groupId.toString(), {
          role: m.role,
          status: m.status,
        });
      });
    }

    // Format response data
    const groupsData: GroupData[] = groups.map(group => {
      const membership = membershipMap.get(group._id.toString());
      
      return {
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
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return NextResponse.json({
      success: true,
      data: groupsData,
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
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch groups',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/groups
// ============================================

/**
 * POST /api/groups
 * 
 * Create a new group. Requires authentication.
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {string} name - Group name (required, 3-100 chars)
 * @body {string} groupType - Group type (required, one of: crop, region, topic, practice)
 * @body {string} [description] - Group description (max 500 chars)
 * @body {string} [coverImage] - Cover image URL
 * @body {string} [icon] - Group icon (emoji or icon name)
 * @body {string} [privacy=public] - Privacy setting (public, private, invite-only)
 * @body {string[]} [crops] - Linked crops (for crop-based groups)
 * @body {string} [region] - Region (for region-based groups)
 * @body {string[]} [tags] - Discovery tags
 * @body {Object[]} [rules] - Group rules array with title and description
 * @body {Object} [settings] - Group settings
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupData } with 201 status
 * 
 * Error Codes:
 * - 400: Missing required fields or validation error
 * - 401: Authentication required
 * - 409: Duplicate group name for same crop
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Check authentication
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanAuthPhone = authPhone.replace(/\D/g, '');
    const currentUser = await User.findOne({ phone: cleanAuthPhone });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      groupType,
      description,
      coverImage,
      icon,
      privacy = 'public',
      crops = [],
      region,
      tags = [],
      rules = [],
      settings = {},
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Group name is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Group name cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    if (!groupType || !VALID_GROUP_TYPES.includes(groupType as GroupType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid group type. Must be one of: ${VALID_GROUP_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate privacy
    if (privacy && !VALID_PRIVACY.includes(privacy as GroupPrivacy)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid privacy setting. Must be one of: ${VALID_PRIVACY.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate description length
    if (description && description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Validate rules
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        if (!rule.title || typeof rule.title !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Each rule must have a title' },
            { status: 400 }
          );
        }
      }
    }

    // Process and validate coverImage (if provided)
    let processedCoverImage: string | undefined = undefined;
    let coverImageMeta: { size: number; type: string; isBase64: boolean; updatedAt: Date } | undefined = undefined;

    if (coverImage) {
      if (typeof coverImage === 'string') {
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

          processedCoverImage = coverImage;
          coverImageMeta = {
            size: imageSize,
            type: extractMimeTypeFromDataUrl(coverImage) || 'image/unknown',
            isBase64: true,
            updatedAt: new Date(),
          };
        } else if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
          // Allow URL-based images (backward compatibility)
          processedCoverImage = coverImage;
          coverImageMeta = {
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

    // Process and validate icon (if provided)
    let processedIcon: string | undefined = undefined;
    let iconMeta: { size: number; type: string; isBase64: boolean; updatedAt: Date } | undefined = undefined;

    if (icon) {
      if (typeof icon === 'string') {
        if (isBase64DataUrl(icon)) {
          // Validate base64 image
          const validation = validateBase64Image(icon);
          if (!validation.valid) {
            return NextResponse.json(
              { success: false, error: `Invalid icon: ${validation.error}` },
              { status: 400 }
            );
          }

          // Check size (2MB limit for icons - smaller than cover images)
          const iconMaxSize = 2 * 1024 * 1024; // 2MB
          const imageSize = estimateBase64Size(icon);
          if (imageSize > iconMaxSize) {
            const sizeMB = (imageSize / (1024 * 1024)).toFixed(2);
            return NextResponse.json(
              { success: false, error: `Icon too large (${sizeMB}MB). Maximum size is 2MB.` },
              { status: 400 }
            );
          }

          processedIcon = icon;
          iconMeta = {
            size: imageSize,
            type: extractMimeTypeFromDataUrl(icon) || 'image/unknown',
            isBase64: true,
            updatedAt: new Date(),
          };
        } else if (icon.startsWith('http://') || icon.startsWith('https://')) {
          // Allow URL-based icons (backward compatibility)
          processedIcon = icon;
          iconMeta = {
            size: 0,
            type: 'image/unknown',
            isBase64: false,
            updatedAt: new Date(),
          };
        } else {
          // Allow emoji or icon name strings
          processedIcon = icon;
          // No meta for emoji/icon name
        }
      }
    }

    // Check for duplicate name within same crops (for crop-based groups)
    const normalizedCrops = (crops || []).map((c: string) => c.toLowerCase().trim()).filter(Boolean);
    
    if (normalizedCrops.length > 0) {
      const existingGroup = await Group.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        crops: { $in: normalizedCrops },
        isActive: true,
      });

      if (existingGroup) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'A group with this name already exists for the selected crop(s)',
          },
          { status: 409 }
        );
      }
    } else {
      // Check for duplicate name without crops
      const existingGroup = await Group.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        isActive: true,
      });

      if (existingGroup) {
        return NextResponse.json(
          { success: false, error: 'A group with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare settings with defaults
    const groupSettings = {
      allowMemberPosts: settings.allowMemberPosts !== false,
      requirePostApproval: settings.requirePostApproval === true,
      allowPolls: settings.allowPolls !== false,
      allowImages: settings.allowImages !== false,
    };

    // Create the group
    const group = new Group({
      name: name.trim(),
      groupType,
      description: description?.trim(),
      coverImage: processedCoverImage,
      coverImageMeta: coverImageMeta,
      icon: processedIcon,
      iconMeta: iconMeta,
      privacy,
      crops: normalizedCrops,
      region: region?.trim(),
      tags: (tags || []).map((t: string) => t.toLowerCase().trim()).filter(Boolean),
      createdBy: currentUser._id,
      admins: [currentUser._id], // Creator is automatically an admin
      moderators: [],
      memberCount: 1, // Creator is the first member
      postCount: 0,
      rules: rules || [],
      settings: groupSettings,
      isVerified: false,
      isActive: true,
    });

    await group.save();

    // Create membership for the creator as owner
    const membership = new GroupMembership({
      groupId: group._id,
      userId: currentUser._id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      lastActivityAt: new Date(),
      notificationPreferences: {
        newPosts: true,
        mentions: true,
        announcements: true,
      },
    });

    await membership.save();

    // Increment user's group count (if tracking this)
    await User.findByIdAndUpdate(currentUser._id, {
      $inc: { groupsJoined: 1 },
    });

    // Populate creator info for response
    await group.populate('createdBy', 'fullName profileImage role');

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
      crops: group.crops,
      region: group.region,
      tags: group.tags,
      createdBy: group.createdBy ? {
        _id: (group.createdBy as unknown as Record<string, unknown>)._id?.toString() || '',
        fullName: (group.createdBy as unknown as Record<string, unknown>).fullName as string || '',
        profileImage: (group.createdBy as unknown as Record<string, unknown>).profileImage as string | undefined,
        role: (group.createdBy as unknown as Record<string, unknown>).role as string | undefined,
      } : currentUser._id.toString(),
      admins: group.admins.map((id: mongoose.Types.ObjectId) => id.toString()),
      moderators: group.moderators.map((id: mongoose.Types.ObjectId) => id.toString()),
      memberCount: group.memberCount,
      postCount: group.postCount,
      rules: group.rules,
      settings: group.settings,
      isVerified: group.isVerified,
      isActive: group.isActive,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      isJoined: true,
      userRole: 'owner',
      userMembershipStatus: 'active',
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Group created successfully',
        data: responseData,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating group:', error);
    
    // Handle Mongoose validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(e => e.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation error',
          details: messages,
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if ((error as Record<string, unknown>).code === 11000) {
      return NextResponse.json(
        { success: false, error: 'A group with this name or slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create group',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
