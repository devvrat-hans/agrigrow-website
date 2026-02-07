/**
 * Group Discovery API Route
 * 
 * Returns personalized group recommendations based on user's:
 * - Crops they're interested in
 * - Region/location
 * - Existing group memberships (to exclude)
 * 
 * Prioritizes groups with:
 * - Similar crops
 * - Same region
 * - High member counts
 * 
 * GET /api/groups/discover
 * 
 * Authentication:
 * - Required via x-user-phone header for personalized recommendations
 * - Returns popular groups if not authenticated
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

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

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
// GET /api/groups/discover
// ============================================

/**
 * GET /api/groups/discover
 * 
 * Returns personalized group recommendations.
 * 
 * Query Parameters:
 * @param {string} limit - Maximum number of groups to return (default: 10, max: 20)
 * 
 * Headers:
 * @header {string} x-user-phone - Optional, for personalized recommendations
 * 
 * Response:
 * @returns {Object} {
 *   success: boolean,
 *   data: {
 *     groups: GroupData[],
 *     meta: {
 *       total: number,
 *       isPersonalized: boolean,
 *       userCrops: string[],
 *       userRegion: string | null
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10))
    );

    // Check for authentication
    const authPhone = request.headers.get('x-user-phone');
    let currentUser = null;
    let userGroupIds: mongoose.Types.ObjectId[] = [];
    let userCrops: string[] = [];
    let userRegion: string | null = null;

    if (authPhone) {
      currentUser = await getUserFromPhone(authPhone);
      
      if (currentUser) {
        // Get user's crops and region
        userCrops = currentUser.crops || [];
        userRegion = currentUser.state || currentUser.district || null;

        // Get groups user is already a member of
        const memberships = await GroupMembership.find({
          userId: currentUser._id,
          status: { $in: ['active', 'pending'] },
        }).select('groupId');

        userGroupIds = memberships.map(m => m.groupId);
      }
    }

    // Build aggregation pipeline for personalized recommendations
    const pipeline: mongoose.PipelineStage[] = [
      // Match active, public groups not already joined
      {
        $match: {
          isActive: true,
          privacy: { $in: ['public', 'private'] }, // Exclude invite-only
          ...(userGroupIds.length > 0 && { _id: { $nin: userGroupIds } }),
        },
      },
    ];

    // If user is authenticated, calculate relevance score
    if (currentUser && (userCrops.length > 0 || userRegion)) {
      pipeline.push({
        $addFields: {
          // Calculate crop match score (higher for more matching crops)
          cropMatchScore: userCrops.length > 0
            ? {
                $multiply: [
                  {
                    $size: {
                      $setIntersection: ['$crops', userCrops],
                    },
                  },
                  10, // Weight for crop matching
                ],
              }
            : 0,
          // Calculate region match score
          regionMatchScore: userRegion
            ? {
                $cond: [
                  { $eq: ['$region', userRegion] },
                  15, // Weight for exact region match
                  0,
                ],
              }
            : 0,
          // Member count score (logarithmic to not overpower relevance)
          popularityScore: {
            $multiply: [{ $ln: { $add: ['$memberCount', 1] } }, 2],
          },
        },
      });

      // Calculate total relevance score
      pipeline.push({
        $addFields: {
          relevanceScore: {
            $add: ['$cropMatchScore', '$regionMatchScore', '$popularityScore'],
          },
        },
      });

      // Sort by relevance score descending
      pipeline.push({ $sort: { relevanceScore: -1, memberCount: -1, createdAt: -1 } });
    } else {
      // For unauthenticated users, sort by popularity and recency
      pipeline.push({ $sort: { memberCount: -1, createdAt: -1 } });
    }

    // Limit results
    pipeline.push({ $limit: limit });

    // Populate createdBy user info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdByUser',
        pipeline: [
          { $project: { fullName: 1, profileImage: 1 } },
        ],
      },
    });

    pipeline.push({
      $addFields: {
        createdBy: { $arrayElemAt: ['$createdByUser', 0] },
      },
    });

    // Execute aggregation
    const groups = await Group.aggregate(pipeline);

    // Get total count of discoverable groups
    const totalCount = await Group.countDocuments({
      isActive: true,
      privacy: { $in: ['public', 'private'] },
      ...(userGroupIds.length > 0 && { _id: { $nin: userGroupIds } }),
    });

    // Format response data
    const formattedGroups = groups.map(group => formatGroupData(group, null));

    return NextResponse.json({
      success: true,
      data: {
        groups: formattedGroups,
        meta: {
          total: totalCount,
          returned: formattedGroups.length,
          isPersonalized: !!currentUser,
          userCrops: currentUser ? userCrops : [],
          userRegion: currentUser ? userRegion : null,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching group recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch group recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
