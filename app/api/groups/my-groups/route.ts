/**
 * My Groups API Route
 * 
 * Returns all groups the authenticated user is a member of,
 * categorized by their role in each group.
 * 
 * GET /api/groups/my-groups
 * 
 * Authentication:
 * - Required via x-user-phone header
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupPrivacy, GroupType, MemberRole, MemberStatus } from '@/types/group';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface MyGroupItem {
  _id: string;
  groupId: string;
  group: {
    _id: string;
    name: string;
    slug: string;
    icon?: string;
    coverImage?: string;
    memberCount: number;
    postCount: number;
    groupType: GroupType;
    privacy: GroupPrivacy;
    isVerified: boolean;
    description?: string;
  };
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  lastActivityAt?: string;
}

interface CategorizedGroups {
  owned: MyGroupItem[];
  admin: MyGroupItem[];
  moderator: MyGroupItem[];
  member: MyGroupItem[];
}

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
 * Format membership data for response
 */
function formatMembershipData(
  membership: Record<string, unknown>,
  group: Record<string, unknown>
): MyGroupItem {
  return {
    _id: (membership._id as mongoose.Types.ObjectId).toString(),
    groupId: (membership.groupId as mongoose.Types.ObjectId).toString(),
    group: {
      _id: (group._id as mongoose.Types.ObjectId).toString(),
      name: group.name as string,
      slug: group.slug as string,
      icon: group.icon as string | undefined,
      coverImage: group.coverImage as string | undefined,
      memberCount: group.memberCount as number || 0,
      postCount: group.postCount as number || 0,
      groupType: group.groupType as GroupType,
      privacy: group.privacy as GroupPrivacy,
      isVerified: group.isVerified as boolean || false,
      description: group.description as string | undefined,
    },
    role: membership.role as MemberRole,
    status: membership.status as MemberStatus,
    joinedAt: (membership.joinedAt as Date)?.toISOString() || new Date().toISOString(),
    lastActivityAt: (membership.lastActivityAt as Date)?.toISOString() || undefined,
  };
}

// ============================================
// GET /api/groups/my-groups
// ============================================

/**
 * GET /api/groups/my-groups
 * 
 * Returns all groups the authenticated user is a member of,
 * categorized by role.
 * 
 * Query Parameters:
 * @param {string} sortBy - Sort by field (lastActivity, joinedAt, name)
 * @param {string} groupType - Filter by group type (crop, region, topic, practice)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} {
 *   success: boolean,
 *   data: {
 *     categorized: {
 *       owned: MyGroupItem[],
 *       admin: MyGroupItem[],
 *       moderator: MyGroupItem[],
 *       member: MyGroupItem[]
 *     },
 *     all: MyGroupItem[],
 *     counts: {
 *       total: number,
 *       owned: number,
 *       admin: number,
 *       moderator: number,
 *       member: number
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
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

    const currentUser = await getUserFromPhone(authPhone);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'lastActivity';
    const groupType = searchParams.get('groupType') as GroupType | null;

    // Build sort options
    let sortOptions: Record<string, 1 | -1> = {};
    switch (sortBy) {
      case 'name':
        // Will sort after fetching due to populated field
        sortOptions = { joinedAt: -1 };
        break;
      case 'joinedAt':
        sortOptions = { joinedAt: -1 };
        break;
      case 'lastActivity':
      default:
        sortOptions = { lastActivityAt: -1, joinedAt: -1 };
        break;
    }

    // Fetch all active memberships for the user
    const memberships = await GroupMembership.find({
      userId: currentUser._id,
      status: 'active',
    })
      .sort(sortOptions)
      .lean();

    // Get all group IDs
    const groupIds = memberships.map(m => m.groupId);

    // Build group filter
    const groupFilter: Record<string, unknown> = {
      _id: { $in: groupIds },
      isActive: true,
    };

    if (groupType && ['crop', 'region', 'topic', 'practice'].includes(groupType)) {
      groupFilter.groupType = groupType;
    }

    // Fetch all groups at once
    const groups = await Group.find(groupFilter)
      .select('name slug icon coverImage memberCount postCount groupType privacy isVerified description')
      .lean();

    // Create a map of groups by ID for quick lookup
    const groupMap = new Map<string, Record<string, unknown>>();
    groups.forEach(group => {
      groupMap.set(group._id.toString(), group as unknown as Record<string, unknown>);
    });

    // Format memberships and categorize by role
    const categorized: CategorizedGroups = {
      owned: [],
      admin: [],
      moderator: [],
      member: [],
    };

    const allGroups: MyGroupItem[] = [];

    memberships.forEach(membership => {
      const group = groupMap.get(membership.groupId.toString());
      
      // Skip if group not found or filtered out
      if (!group) return;

      const formattedItem = formatMembershipData(
        membership as unknown as Record<string, unknown>,
        group
      );

      allGroups.push(formattedItem);

      // Categorize by role
      switch (membership.role) {
        case 'owner':
          categorized.owned.push(formattedItem);
          break;
        case 'admin':
          categorized.admin.push(formattedItem);
          break;
        case 'moderator':
          categorized.moderator.push(formattedItem);
          break;
        case 'member':
        default:
          categorized.member.push(formattedItem);
          break;
      }
    });

    // Sort by name if requested (after fetching due to populated field)
    if (sortBy === 'name') {
      const sortByName = (a: MyGroupItem, b: MyGroupItem) => 
        a.group.name.localeCompare(b.group.name);
      
      categorized.owned.sort(sortByName);
      categorized.admin.sort(sortByName);
      categorized.moderator.sort(sortByName);
      categorized.member.sort(sortByName);
      allGroups.sort(sortByName);
    }

    return NextResponse.json({
      success: true,
      data: {
        categorized,
        all: allGroups,
        counts: {
          total: allGroups.length,
          owned: categorized.owned.length,
          admin: categorized.admin.length,
          moderator: categorized.moderator.length,
          member: categorized.member.length,
        },
        filters: {
          sortBy,
          groupType: groupType || null,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching user groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch your groups',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
