import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';

/**
 * POST /api/user/unfollow
 * Removes a follow relationship between two users
 * Request: Header `x-user-phone` (follower), Body `{ followingPhone: string }`
 * Response: Success message
 * 
 * This endpoint:
 * - Removes the follow document
 * - Decrements follow counts (only if the follow was active)
 * - Works for both active follows and pending requests
 */
export async function POST(request: NextRequest) {
  try {
    // Get follower phone from header
    const followerPhone = request.headers.get('x-user-phone');

    if (!followerPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get target user phone from body
    const body = await request.json();
    const { followingPhone } = body;

    if (!followingPhone) {
      return NextResponse.json(
        { success: false, error: 'Following phone number is required' },
        { status: 400 }
      );
    }

    // Clean phone numbers
    const cleanFollowerPhone = followerPhone.replace(/\D/g, '');
    const cleanFollowingPhone = followingPhone.replace(/\D/g, '');

    // Prevent self-unfollow attempt
    if (cleanFollowerPhone === cleanFollowingPhone) {
      return NextResponse.json(
        { success: false, error: 'Invalid operation' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the existing follow relationship
    const existingFollow = await Follow.findOne({
      followerId: cleanFollowerPhone,
      followingId: cleanFollowingPhone,
    });

    if (!existingFollow) {
      return NextResponse.json(
        { success: false, error: 'You are not following this user' },
        { status: 404 }
      );
    }

    // Store the status before deletion to determine if we need to update counts
    const wasActive = existingFollow.status === 'active';

    // Delete the follow relationship
    await Follow.deleteOne({
      _id: existingFollow._id,
    });

    // Only decrement counts if the follow was active
    if (wasActive) {
      await Promise.all([
        User.updateOne(
          { phone: cleanFollowerPhone },
          { $inc: { followingCount: -1 } }
        ),
        User.updateOne(
          { phone: cleanFollowingPhone },
          { $inc: { followersCount: -1 } }
        ),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: wasActive
        ? 'Successfully unfollowed user'
        : 'Follow request cancelled',
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unfollow user' },
      { status: 500 }
    );
  }
}
