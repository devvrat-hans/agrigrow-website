/**
 * Accept Invite Code API Route
 * 
 * API endpoint for accepting invite codes.
 * 
 * Endpoints:
 * - GET /api/groups/invite/[code] - Get invite info without accepting
 * - POST /api/groups/invite/[code] - Accept invite code and join group
 * 
 * Authentication:
 * - GET: Optional (shows basic info)
 * - POST: Required via x-user-phone header
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupInvitation from '@/models/GroupInvitation';
import User from '@/models/User';
import { GroupData, GroupMemberData, MemberStatus } from '@/types/group';

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
 * Check if invitation is valid (not expired, not max uses)
 */
function isInvitationValid(invitation: {
  status: string;
  expiresAt?: Date;
  maxUses?: number;
  usedCount: number;
}): { valid: boolean; reason?: string } {
  // Check status
  if (invitation.status !== 'pending') {
    return { valid: false, reason: `Invitation is ${invitation.status}` };
  }

  // Check expiration
  if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
    return { valid: false, reason: 'Invitation has expired' };
  }

  // Check max uses
  if (invitation.maxUses !== undefined && invitation.usedCount >= invitation.maxUses) {
    return { valid: false, reason: 'Invitation has reached maximum uses' };
  }

  return { valid: true };
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ code: string }>;
}

// ============================================
// GET /api/groups/invite/[code]
// ============================================

/**
 * GET /api/groups/invite/[code]
 * 
 * Get information about an invite code without accepting it.
 * Shows basic group info for valid invites.
 * 
 * Path Parameters:
 * @param {string} code - Invite code
 * 
 * Response:
 * @returns {Object} { success: boolean, data: { invitation, group } }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { code } = await params;

    if (!code || code.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    // Find invitation by code
    const invitation = await GroupInvitation.findOne({ inviteCode: code.toUpperCase() })
      .populate('invitedBy', 'fullName profileImage')
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invite code not found' },
        { status: 404 }
      );
    }

    // Check if invitation is valid
    const validation = isInvitationValid(invitation);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.reason },
        { status: 400 }
      );
    }

    // Get group info
    const group = await Group.findById(invitation.groupId)
      .select('name slug description coverImage icon groupType privacy memberCount crops region')
      .lean();

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group no longer exists' },
        { status: 404 }
      );
    }

    const inviter = invitation.invitedBy as unknown as Record<string, unknown> | null;

    // Check if this is a direct invite (for specific user)
    const isDirectInvite = !!invitation.invitedUser;

    return NextResponse.json({
      success: true,
      data: {
        invitation: {
          _id: invitation._id.toString(),
          inviteCode: invitation.inviteCode,
          inviter: inviter ? {
            _id: inviter._id?.toString() || '',
            fullName: (inviter.fullName as string) || '',
            profileImage: inviter.profileImage as string | undefined,
          } : undefined,
          expiresAt: invitation.expiresAt?.toISOString(),
          isDirectInvite,
          remainingUses: invitation.maxUses !== undefined ? invitation.maxUses - invitation.usedCount : null,
        },
        group: {
          _id: group._id.toString(),
          name: group.name,
          slug: group.slug,
          description: group.description,
          coverImage: group.coverImage,
          icon: group.icon,
          groupType: group.groupType,
          privacy: group.privacy,
          memberCount: group.memberCount,
          crops: group.crops,
          region: group.region,
        } as Partial<GroupData>,
      },
    });

  } catch (error) {
    console.error('Error fetching invite info:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invite information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/groups/invite/[code]
// ============================================

/**
 * POST /api/groups/invite/[code]
 * 
 * Accept an invite code and join the group.
 * 
 * Path Parameters:
 * @param {string} code - Invite code
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string, data: { membership, group } }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { code } = await params;

    if (!code || code.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code' },
        { status: 400 }
      );
    }

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

    // Find invitation by code
    const invitation = await GroupInvitation.findOne({ inviteCode: code.toUpperCase() });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invite code not found' },
        { status: 404 }
      );
    }

    // Check if invitation is valid
    const validation = isInvitationValid(invitation);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.reason },
        { status: 400 }
      );
    }

    // If direct invite (has invitedUser), check if current user is the invited user
    if (invitation.invitedUser) {
      if (invitation.invitedUser.toString() !== currentUser._id.toString()) {
        return NextResponse.json(
          { success: false, error: 'This invitation is for a different user' },
          { status: 403 }
        );
      }
    }

    // Get group
    const group = await Group.findById(invitation.groupId);

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group no longer exists' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: currentUser._id,
    });

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'You are already a member of this group' },
          { status: 400 }
        );
      }
      if (existingMembership.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'You have a pending membership request' },
          { status: 400 }
        );
      }
      if (existingMembership.status === 'banned') {
        return NextResponse.json(
          { success: false, error: 'You have been banned from this group' },
          { status: 403 }
        );
      }
      // If 'left', allow rejoining via invite
    }

    // Start a session for transaction-like behavior
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();

      let membership;

      if (existingMembership && existingMembership.status === 'left') {
        // Reactivate membership
        existingMembership.status = 'active';
        existingMembership.joinedAt = new Date();
        existingMembership.invitedBy = invitation.invitedBy;
        existingMembership.banReason = undefined;
        existingMembership.bannedBy = undefined;
        existingMembership.bannedAt = undefined;
        await existingMembership.save({ session });
        membership = existingMembership;
      } else {
        // Create new membership
        membership = new GroupMembership({
          groupId: group._id,
          userId: currentUser._id,
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
          invitedBy: invitation.invitedBy,
          notificationPreferences: {
            newPosts: true,
            mentions: true,
            announcements: true,
          },
        });
        await membership.save({ session });
      }

      // Increment group member count
      await Group.findByIdAndUpdate(
        group._id,
        { $inc: { memberCount: 1 } },
        { session }
      );

      // Increment user's groupsJoined count
      await User.findByIdAndUpdate(
        currentUser._id,
        { $inc: { groupsJoined: 1 } },
        { session }
      );

      // Update invitation
      invitation.usedCount += 1;
      
      // If it's a direct invite (has invitedUser), mark as accepted
      if (invitation.invitedUser) {
        invitation.status = 'accepted';
      } else if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
        // If code has reached max uses, mark as accepted
        invitation.status = 'accepted';
      }
      
      await invitation.save({ session });

      await session.commitTransaction();

      // Populate membership for response
      await membership.populate('userId', 'fullName profileImage role region');

      const user = membership.userId as unknown as Record<string, unknown>;

      const membershipData: GroupMemberData = {
        _id: membership._id.toString(),
        groupId: membership.groupId.toString(),
        userId: user?._id?.toString() || '',
        user: user ? {
          _id: user._id?.toString() || '',
          fullName: (user.fullName as string) || '',
          profileImage: user.profileImage as string | undefined,
          role: user.role as string | undefined,
        } : undefined,
        role: membership.role,
        status: membership.status as MemberStatus,
        joinedAt: membership.joinedAt?.toISOString() || new Date().toISOString(),
        invitedBy: membership.invitedBy?.toString(),
        notificationPreferences: membership.notificationPreferences,
      };

      return NextResponse.json({
        success: true,
        message: 'You have joined the group successfully',
        data: {
          membership: membershipData,
          group: {
            _id: group._id.toString(),
            name: group.name,
            slug: group.slug,
          },
        },
      }, { status: 201 });

    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to accept invite',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
