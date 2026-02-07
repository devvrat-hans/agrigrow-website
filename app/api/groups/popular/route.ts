/**
 * Popular Groups API Route
 * 
 * Returns top groups sorted by member count.
 * Optional filtering by group type.
 * 
 * GET /api/groups/popular
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
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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
// GET /api/groups/popular
// ============================================

/**
 * GET /api/groups/popular
 * 
 * Returns popular groups sorted by member count.
 * 
 * Query Parameters:
 * @param {string} groupType - Filter by group type (crop, region, topic, practice)
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Results per page (default: 10, max: 50)
 * @param {string} timeframe - Filter by when groups were created (all, month, week)
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
    const groupType = searchParams.get('groupType') as GroupType | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10))
    );
    const timeframe = searchParams.get('timeframe') || 'all';

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

    // Build query conditions
    const matchConditions: Record<string, unknown> = {
      isActive: true,
      privacy: { $in: ['public', 'private'] }, // Exclude invite-only
      memberCount: { $gte: 1 }, // At least 1 member
    };

    // Apply group type filter
    if (groupType && ['crop', 'region', 'topic', 'practice'].includes(groupType)) {
      matchConditions.groupType = groupType;
    }

    // Apply timeframe filter
    if (timeframe === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      matchConditions.createdAt = { $gte: oneWeekAgo };
    } else if (timeframe === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      matchConditions.createdAt = { $gte: oneMonthAgo };
    }

    // Count total matches
    const total = await Group.countDocuments(matchConditions);

    // Fetch popular groups with pagination
    const groups = await Group.find(matchConditions)
      .populate('createdBy', 'fullName profileImage')
      .sort({ memberCount: -1, postCount: -1, createdAt: -1 })
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
        filters: {
          groupType: groupType || null,
          timeframe,
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
    console.error('Error fetching popular groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch popular groups',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
