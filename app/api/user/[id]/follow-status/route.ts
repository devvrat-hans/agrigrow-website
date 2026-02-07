import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/user/[id]/follow-status
 * Returns the follow relationship status between current user and target user
 * Request: 
 *   - Path param `id` (target user phone number)
 *   - Header `x-user-phone` (current user)
 * Response: Follow relationship status object
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    const currentUserPhone = request.headers.get('x-user-phone');

    if (!currentUserPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Clean phone numbers
    const cleanCurrentPhone = currentUserPhone.replace(/\D/g, '');
    const cleanTargetPhone = userId.replace(/\D/g, '');

    // If checking status with self, return default values
    if (cleanCurrentPhone === cleanTargetPhone) {
      return NextResponse.json({
        success: true,
        isFollowing: false,
        isFollowedBy: false,
        isPending: false,
        isBlocked: false,
        isSelf: true,
      });
    }

    await dbConnect();

    // Verify both users exist
    const [currentUser, targetUser] = await Promise.all([
      User.findOne({ phone: cleanCurrentPhone }),
      User.findOne({ phone: cleanTargetPhone }),
    ]);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Current user not found' },
        { status: 404 }
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Get follow relationships in both directions
    const [currentToTarget, targetToCurrent] = await Promise.all([
      // Current user's relationship to target
      Follow.findOne({
        followerId: cleanCurrentPhone,
        followingId: cleanTargetPhone,
      }),
      // Target user's relationship to current
      Follow.findOne({
        followerId: cleanTargetPhone,
        followingId: cleanCurrentPhone,
      }),
    ]);

    // Determine relationship status
    const isFollowing = currentToTarget?.status === 'active';
    const isPending = currentToTarget?.status === 'pending';
    const isBlocked = currentToTarget?.status === 'blocked' || targetToCurrent?.status === 'blocked';
    const isFollowedBy = targetToCurrent?.status === 'active';

    return NextResponse.json({
      success: true,
      isFollowing,
      isFollowedBy,
      isPending,
      isBlocked,
      isSelf: false,
      targetUser: {
        phone: targetUser.phone,
        fullName: targetUser.fullName,
        isPrivateAccount: targetUser.isPrivateAccount,
      },
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch follow status' },
      { status: 500 }
    );
  }
}
