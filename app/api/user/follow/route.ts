import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';
import Notification from '@/models/Notification';

/**
 * POST /api/user/follow
 * Creates a follow relationship between two users
 * Request: Header `x-user-phone` (follower), Body `{ followingPhone: string }`
 * Response: Created follow relationship
 * 
 * If target user has private account:
 * - Creates follow with status 'pending'
 * - Sends notification to target user
 * 
 * If target user has public account:
 * - Creates follow with status 'active'
 * - Increments follow counts
 * - Sends notification to target user
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

    // Prevent self-follow
    if (cleanFollowerPhone === cleanFollowingPhone) {
      return NextResponse.json(
        { success: false, error: 'You cannot follow yourself' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find both users
    const [follower, following] = await Promise.all([
      User.findOne({ phone: cleanFollowerPhone }),
      User.findOne({ phone: cleanFollowingPhone }),
    ]);

    if (!follower) {
      return NextResponse.json(
        { success: false, error: 'Follower user not found' },
        { status: 404 }
      );
    }

    if (!following) {
      return NextResponse.json(
        { success: false, error: 'User to follow not found' },
        { status: 404 }
      );
    }

    // Check if already following or has pending request
    const existingFollow = await Follow.findOne({
      followerId: cleanFollowerPhone,
      followingId: cleanFollowingPhone,
    });

    if (existingFollow) {
      if (existingFollow.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'You are already following this user' },
          { status: 409 }
        );
      } else if (existingFollow.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'You already have a pending follow request' },
          { status: 409 }
        );
      } else if (existingFollow.status === 'blocked') {
        return NextResponse.json(
          { success: false, error: 'You cannot follow this user' },
          { status: 403 }
        );
      }
    }

    // Determine follow status based on target user's privacy setting
    const followStatus = following.isPrivateAccount ? 'pending' : 'active';

    // Create the follow relationship
    const follow = new Follow({
      followerId: cleanFollowerPhone,
      followingId: cleanFollowingPhone,
      status: followStatus,
    });

    await follow.save();

    // If active follow, update counts for both users
    if (followStatus === 'active') {
      await Promise.all([
        User.updateOne(
          { phone: cleanFollowerPhone },
          { $inc: { followingCount: 1 } }
        ),
        User.updateOne(
          { phone: cleanFollowingPhone },
          { $inc: { followersCount: 1 } }
        ),
      ]);
    }

    // Create notification for the target user
    const notificationType = followStatus === 'active' ? 'new_follower' : 'follow_request';
    const notificationMessage =
      followStatus === 'active'
        ? `${follower.fullName} started following you`
        : `${follower.fullName} requested to follow you`;

    const notification = new Notification({
      recipientPhone: cleanFollowingPhone,
      senderPhone: cleanFollowerPhone,
      type: notificationType,
      title: followStatus === 'active' ? 'New Follower' : 'Follow Request',
      message: notificationMessage,
      data: {
        followId: follow._id.toString(),
        followerPhone: cleanFollowerPhone,
        followerName: follower.fullName,
        followerImage: follower.profileImage,
      },
    });

    await notification.save();

    return NextResponse.json({
      success: true,
      message:
        followStatus === 'active'
          ? 'Successfully followed user'
          : 'Follow request sent',
      follow: {
        id: follow._id.toString(),
        followerId: follow.followerId,
        followingId: follow.followingId,
        status: follow.status,
        createdAt: follow.createdAt,
      },
    });
  } catch (error) {
    console.error('Follow user error:', error);

    // Handle duplicate key error (race condition)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'You are already following or have a pending request' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to follow user' },
      { status: 500 }
    );
  }
}
