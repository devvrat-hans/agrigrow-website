/**
 * Group Search API Route
 * 
 * Text search on group name, description, and tags.
 * Supports filtering by groupType and privacy level.
 * 
 * GET /api/groups/search
 * 
 * Authentication:
 * - Optional via x-user-phone header (for isJoined status)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupData, GroupPrivacy, GroupType, MemberRole } from '@/types/group';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get user from phone number
 */
async function getUserFromPhone(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return User.findOne({ phone: cleanPhone });
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format group data for response
 */
function formatGroupData(
  group: Record<string, unknown>,
  userMembership?: { role: MemberRole; status: string } | null
): GroupData {
  const createdBy = group.createdBy as Record<string, unknown> | null;
  
  return {
    _id: (group._id as mongoose.Types.ObjectId).toString(),
    name: group.name as string,
    slug: group.slug as string,
    description: group.description as string | undefined,
    coverImage: group.coverImage as string | undefined,
    icon: group.icon as string | undefined,
    groupType: group.groupType as GroupType,
    privacy: group.privacy as GroupPrivacy,
    crops: group.crops as string[] || [],
    region: group.region as string | undefined,
    tags: group.tags as string[] || [],
    createdBy: createdBy ? {
      _id: createdBy._id?.toString() || '',
      fullName: (createdBy.fullName as string) || '',
      profileImage: createdBy.profileImage as string | undefined,
    } : (group.createdBy as mongoose.Types.ObjectId)?.toString() || '',
    admins: ((group.admins as mongoose.Types.ObjectId[]) || []).map(a => a.toString()),
    moderators: ((group.moderators as mongoose.Types.ObjectId[]) || []).map(m => m.toString()),
    memberCount: group.memberCount as number || 0,
    postCount: group.postCount as number || 0,
    rules: group.rules as { title: string; description: string }[] || [],
    settings: group.settings as {
      allowMemberPosts: boolean;
      requirePostApproval: boolean;
      allowPolls: boolean;
      allowImages: boolean;
    } || {
      allowMemberPosts: true,
      requirePostApproval: false,
      allowPolls: true,
      allowImages: true,
    },
    isVerified: group.isVerified as boolean || false,
    isActive: group.isActive as boolean ?? true,
    createdAt: (group.createdAt as Date)?.toISOString() || new Date().toISOString(),
    updatedAt: (group.updatedAt as Date)?.toISOString() || new Date().toISOString(),
    isJoined: !!userMembership,
    userRole: userMembership?.role,
    userMembershipStatus: userMembership?.status as 'active' | 'pending' | 'banned' | 'left' | undefined,
  };
}

// ============================================
// GET /api/groups/search
// ============================================

/**
 * GET /api/groups/search
 * 
 * Search groups by text query with optional filters.
 * 
 * Query Parameters:
 * @param {string} q - Search query (required, min 2 characters)
 * @param {string} groupType - Filter by group type (crop, region, topic, practice)
 * @param {string} privacy - Filter by privacy level (public, private, invite-only)
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Results per page (default: 20, max: 50)
 * @param {string} sortBy - Sort by field (relevance, memberCount, createdAt)
 * 
 * Headers:
 * @header {string} x-user-phone - Optional, for isJoined status
 * 
 * Response:
 * @returns {Object} {
 *   success: boolean,
 *   data: {
 *     groups: GroupData[],
 *     pagination: { page, limit, total, totalPages, hasMore }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() || '';
    const groupType = searchParams.get('groupType') as GroupType | null;
    const privacy = searchParams.get('privacy') as GroupPrivacy | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10))
    );
    const sortBy = searchParams.get('sortBy') || 'relevance';

    // Validate search query
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Search query must be at least ${MIN_QUERY_LENGTH} characters` 
        },
        { status: 400 }
      );
    }

    // Check for authentication
    const authPhone = request.headers.get('x-user-phone');
    let currentUser = null;
    const userMemberships: Map<string, { role: MemberRole; status: string }> = new Map();

    if (authPhone) {
      currentUser = await getUserFromPhone(authPhone);
      
      if (currentUser) {
        // Get user's group memberships for isJoined status
        const memberships = await GroupMembership.find({
          userId: currentUser._id,
          status: { $in: ['active', 'pending'] },
        }).select('groupId role status');

        memberships.forEach(m => {
          userMemberships.set(m.groupId.toString(), { 
            role: m.role as MemberRole, 
            status: m.status 
          });
        });
      }
    }

    // Build search query
    const searchRegex = new RegExp(escapeRegex(query), 'i');
    const matchConditions: Record<string, unknown> = {
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { crops: searchRegex },
        { region: searchRegex },
      ],
    };

    // Apply filters
    if (groupType && ['crop', 'region', 'topic', 'practice'].includes(groupType)) {
      matchConditions.groupType = groupType;
    }

    if (privacy && ['public', 'private', 'invite-only'].includes(privacy)) {
      matchConditions.privacy = privacy;
    } else {
      // By default, exclude invite-only groups from search for non-members
      if (!currentUser) {
        matchConditions.privacy = { $in: ['public', 'private'] };
      }
    }

    // Count total matches
    const total = await Group.countDocuments(matchConditions);

    // Build sort options
    let sortOptions: Record<string, 1 | -1> = {};
    switch (sortBy) {
      case 'memberCount':
        sortOptions = { memberCount: -1, createdAt: -1 };
        break;
      case 'createdAt':
        sortOptions = { createdAt: -1 };
        break;
      case 'relevance':
      default:
        // For relevance, we'll use a scoring approach
        sortOptions = { memberCount: -1, createdAt: -1 };
        break;
    }

    // Fetch groups with pagination
    const groups = await Group.find(matchConditions)
      .populate('createdBy', 'fullName profileImage')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Format response data with membership status
    const formattedGroups = groups.map(group => {
      const groupId = (group._id as mongoose.Types.ObjectId).toString();
      const membership = userMemberships.get(groupId);
      return formatGroupData(group as unknown as Record<string, unknown>, membership || null);
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      success: true,
      data: {
        groups: formattedGroups,
        query,
        filters: {
          groupType: groupType || null,
          privacy: privacy || null,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        },
      },
    });

  } catch (error) {
    console.error('Error searching groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search groups',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
