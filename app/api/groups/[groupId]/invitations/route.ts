/**
 * Group Invitations API Route
 * 
 * API endpoint for managing group invitations.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/invitations - List pending invitations (admin only)
 * - POST /api/groups/[groupId]/invitations - Create invitation (direct or code)
 * 
 * Authentication:
 * - Required via x-user-phone header
 * - GET requires admin role
 * - POST requires admin role
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

const DEFAULT_EXPIRY_DAYS = 7;
const DEFAULT_MAX_USES = 1;
const CODE_LENGTH = 8;
const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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

/**
 * Generate random alphanumeric code
 */
function generateInviteCode(length: number = CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARACTERS.charAt(Math.floor(Math.random() * CODE_CHARACTERS.length));
  }
  return code;
}

/**
 * Generate unique invite code
 */
async function generateUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let exists = await GroupInvitation.findOne({ code });
  let attempts = 0;
  
  while (exists && attempts < 10) {
    code = generateInviteCode();
    exists = await GroupInvitation.findOne({ code });
    attempts++;
  }
  
  if (exists) {
    throw new Error('Failed to generate unique invite code');
  }
  
  return code;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

// ============================================
// GET /api/groups/[groupId]/invitations
// ============================================

/**
 * GET /api/groups/[groupId]/invitations
 * 
 * List pending invitations for a group.
 * Requires admin role.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Query Parameters:
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 50)
 * @query {string} type - Filter by type: direct, code
 * @query {string} status - Filter by status: pending, accepted, rejected, expired, cancelled
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupInvitationData[], pagination: {...} }
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
        { success: false, error: 'Only admins and owners can view invitations' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const inviteType = searchParams.get('type'); // 'direct' means has invitedUser, 'code' means no invitedUser
    const status = searchParams.get('status') as InvitationStatus | null;

    // Build query
    const query: Record<string, unknown> = { groupId: group._id };
    
    if (inviteType === 'direct') {
      query.invitedUser = { $ne: null };
    } else if (inviteType === 'code') {
      query.invitedUser = null;
    }
    
    if (status && ['pending', 'accepted', 'declined', 'expired'].includes(status)) {
      query.status = status;
    } else {
      // Default to showing pending invitations
      query.status = 'pending';
    }

    // Count total
    const total = await GroupInvitation.countDocuments(query);

    // Fetch invitations
    const invitations = await GroupInvitation.find(query)
      .populate('invitedBy', 'fullName profileImage')
      .populate('invitedUser', 'fullName profileImage phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Format response
    const formattedInvitations: GroupInvitationData[] = invitations.map((inv) => {
      const inviter = inv.invitedBy as unknown as Record<string, unknown> | null;
      const invitee = inv.invitedUser as unknown as Record<string, unknown> | null;

      return {
        _id: inv._id.toString(),
        groupId: inv.groupId.toString(),
        inviteCode: inv.inviteCode,
        invitedBy: inv.invitedBy?.toString() || '',
        inviter: inviter ? {
          _id: inviter._id?.toString() || '',
          fullName: (inviter.fullName as string) || '',
          profileImage: inviter.profileImage as string | undefined,
        } : undefined,
        invitedUser: inv.invitedUser?.toString(),
        invitee: invitee ? {
          _id: invitee._id?.toString() || '',
          fullName: (invitee.fullName as string) || '',
          profileImage: invitee.profileImage as string | undefined,
        } : undefined,
        status: inv.status as InvitationStatus,
        maxUses: inv.maxUses,
        usedCount: inv.usedCount,
        expiresAt: inv.expiresAt?.toISOString(),
        createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: formattedInvitations,
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
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invitations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/groups/[groupId]/invitations
// ============================================

/**
 * POST /api/groups/[groupId]/invitations
 * 
 * Create a new invitation.
 * - Direct invite: specify invitedUser (user ID)
 * - Invite code: specify maxUses and optionally expiresAt
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * For direct invite:
 * @body {string} invitedUser - User ID to invite
 * 
 * For invite code:
 * @body {number} maxUses - Maximum number of uses (default: 1)
 * @body {string} expiresAt - Expiration date (default: 7 days from now)
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupInvitationData }
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
        { success: false, error: 'Only admins and owners can create invitations' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { invitedUser, maxUses, expiresAt } = body;

    // Determine invitation type
    const isDirectInvite = !!invitedUser;

    if (isDirectInvite) {
      // Validate invited user ID
      if (!isValidObjectId(invitedUser)) {
        return NextResponse.json(
          { success: false, error: 'Invalid user ID' },
          { status: 400 }
        );
      }

      // Check if user exists
      const targetUser = await User.findById(invitedUser);
      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User to invite not found' },
          { status: 404 }
        );
      }

      // Cannot invite yourself
      if (currentUser._id.toString() === invitedUser) {
        return NextResponse.json(
          { success: false, error: 'You cannot invite yourself' },
          { status: 400 }
        );
      }

      // Check if user is already a member
      const existingMembership = await GroupMembership.findOne({
        groupId: group._id,
        userId: new mongoose.Types.ObjectId(invitedUser),
      });

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          return NextResponse.json(
            { success: false, error: 'User is already a member of this group' },
            { status: 400 }
          );
        }
        if (existingMembership.status === 'pending') {
          return NextResponse.json(
            { success: false, error: 'User has a pending membership request' },
            { status: 400 }
          );
        }
        if (existingMembership.status === 'banned') {
          return NextResponse.json(
            { success: false, error: 'User is banned from this group' },
            { status: 400 }
          );
        }
      }

      // Check if there's already a pending invitation for this user
      const existingInvitation = await GroupInvitation.findOne({
        groupId: group._id,
        invitedUser: new mongoose.Types.ObjectId(invitedUser),
        status: 'pending',
      });

      if (existingInvitation) {
        return NextResponse.json(
          { success: false, error: 'User already has a pending invitation' },
          { status: 400 }
        );
      }

      // Create direct invitation
      const code = await generateUniqueInviteCode();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + DEFAULT_EXPIRY_DAYS);

      const invitation = new GroupInvitation({
        groupId: group._id,
        type: 'direct',
        code,
        invitedBy: currentUser._id,
        invitedUser: new mongoose.Types.ObjectId(invitedUser),
        status: 'pending',
        maxUses: 1,
        usedCount: 0,
        expiresAt: expirationDate,
      });

      await invitation.save();

      // Populate for response
      await invitation.populate('invitedBy', 'fullName profileImage');
      await invitation.populate('invitedUser', 'fullName profileImage');

      const inviter = invitation.invitedBy as unknown as Record<string, unknown>;
      const invitee = invitation.invitedUser as unknown as Record<string, unknown>;

      const responseData: GroupInvitationData = {
        _id: invitation._id.toString(),
        groupId: invitation.groupId.toString(),
        inviteCode: invitation.inviteCode,
        invitedBy: invitation.invitedBy?.toString() || '',
        inviter: {
          _id: inviter._id?.toString() || '',
          fullName: (inviter.fullName as string) || '',
          profileImage: inviter.profileImage as string | undefined,
        },
        invitedUser: invitation.invitedUser?.toString(),
        invitee: {
          _id: invitee._id?.toString() || '',
          fullName: (invitee.fullName as string) || '',
          profileImage: invitee.profileImage as string | undefined,
        },
        status: 'pending',
        maxUses: 1,
        usedCount: 0,
        expiresAt: invitation.expiresAt?.toISOString(),
        createdAt: invitation.createdAt?.toISOString() || new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        data: responseData,
      }, { status: 201 });

    } else {
      // Create invite code
      const code = await generateUniqueInviteCode();
      
      // Calculate expiration
      let expirationDate: Date;
      if (expiresAt) {
        expirationDate = new Date(expiresAt);
        if (isNaN(expirationDate.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Invalid expiration date' },
            { status: 400 }
          );
        }
        // Ensure it's in the future
        if (expirationDate <= new Date()) {
          return NextResponse.json(
            { success: false, error: 'Expiration date must be in the future' },
            { status: 400 }
          );
        }
      } else {
        expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + DEFAULT_EXPIRY_DAYS);
      }

      // Parse maxUses
      const parsedMaxUses = maxUses ? Math.max(1, parseInt(maxUses, 10)) : DEFAULT_MAX_USES;
      if (isNaN(parsedMaxUses)) {
        return NextResponse.json(
          { success: false, error: 'Invalid maxUses value' },
          { status: 400 }
        );
      }

      const invitation = new GroupInvitation({
        groupId: group._id,
        inviteCode: code,
        invitedBy: currentUser._id,
        status: 'pending',
        maxUses: parsedMaxUses,
        usedCount: 0,
        expiresAt: expirationDate,
      });

      await invitation.save();

      // Populate for response
      await invitation.populate('invitedBy', 'fullName profileImage');

      const inviter = invitation.invitedBy as unknown as Record<string, unknown>;

      // Generate invite link
      const inviteLink = `/invite/${code}`;

      const responseData: GroupInvitationData = {
        _id: invitation._id.toString(),
        groupId: invitation.groupId.toString(),
        inviteCode: invitation.inviteCode,
        invitedBy: invitation.invitedBy?.toString() || '',
        inviter: {
          _id: inviter._id?.toString() || '',
          fullName: (inviter.fullName as string) || '',
          profileImage: inviter.profileImage as string | undefined,
        },
        status: 'pending',
        maxUses: parsedMaxUses,
        usedCount: 0,
        expiresAt: invitation.expiresAt?.toISOString(),
        createdAt: invitation.createdAt?.toISOString() || new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'Invite code generated successfully',
        data: {
          ...responseData,
          inviteLink,
        },
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create invitation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
