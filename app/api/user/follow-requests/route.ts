import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';
import Notification from '@/models/Notification';

/**
 * GET /api/user/follow-requests
 * Returns pending follow requests for the current user
 * Request: Header `x-user-phone`, Query params: `page`, `limit`
 * Response: Paginated list of pending follow requests
 */
export async function GET(request: NextRequest) {
  try {
    const userPhone = request.headers.get('x-user-phone');

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanUserPhone = userPhone.replace(/\D/g, '');
    const { searchParams } = new URL(request.url);
    
    // Get pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    await dbConnect();

    // Verify user exists and has private account
    const user = await User.findOne({ phone: cleanUserPhone });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const skip = (page - 1) * limit;

    // Count total pending requests
    const total = await Follow.countDocuments({
      followingId: cleanUserPhone,
      status: 'pending',
    });

    // Get pending requests with user info
    const pendingRequestsPipeline = [
      {
        $match: {
          followingId: cleanUserPhone,
          status: 'pending',
        },
      },
      { $sort: { createdAt: -1 as const } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'followerId',
          foreignField: 'phone',
          as: 'requesterUser',
        },
      },
      { $unwind: '$requesterUser' },
      {
        $project: {
          id: '$_id',
          user: {
            phone: '$requesterUser.phone',
            fullName: '$requesterUser.fullName',
            profileImage: '$requesterUser.profileImage',
            bio: '$requesterUser.bio',
            role: '$requesterUser.role',
            state: '$requesterUser.state',
            district: '$requesterUser.district',
          },
          createdAt: 1,
        },
      },
    ];

    const requests = await Follow.aggregate(pendingRequestsPipeline);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      requests: requests.map((r) => ({
        id: r.id.toString(),
        user: r.user,
        createdAt: r.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Get follow requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch follow requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/follow-requests
 * Accept or reject a follow request
 * Request: Header `x-user-phone`, Body `{ requestId: string, action: 'accept' | 'reject' }`
 * Response: Success message
 */
export async function POST(request: NextRequest) {
  try {
    const userPhone = request.headers.get('x-user-phone');

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanUserPhone = userPhone.replace(/\D/g, '');
    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid action (accept/reject) is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the follow request
    const followRequest = await Follow.findById(requestId);

    if (!followRequest) {
      return NextResponse.json(
        { success: false, error: 'Follow request not found' },
        { status: 404 }
      );
    }

    // Verify the request is for the current user
    if (followRequest.followingId !== cleanUserPhone) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to handle this request' },
        { status: 403 }
      );
    }

    // Verify the request is still pending
    if (followRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been handled' },
        { status: 400 }
      );
    }

    const followerPhone = followRequest.followerId;

    if (action === 'accept') {
      // Update the follow status to active
      followRequest.status = 'active';
      await followRequest.save();

      // Increment follow counts for both users
      await Promise.all([
        User.updateOne(
          { phone: followerPhone },
          { $inc: { followingCount: 1 } }
        ),
        User.updateOne(
          { phone: cleanUserPhone },
          { $inc: { followersCount: 1 } }
        ),
      ]);

      // Get current user info for notification
      const currentUser = await User.findOne({ phone: cleanUserPhone });

      // Create notification for the follower that their request was accepted
      const notification = new Notification({
        recipientPhone: followerPhone,
        senderPhone: cleanUserPhone,
        type: 'follow_request_accepted',
        title: 'Follow Request Accepted',
        message: `${currentUser?.fullName || 'User'} accepted your follow request`,
        data: {
          userId: cleanUserPhone,
          userName: currentUser?.fullName,
          userImage: currentUser?.profileImage,
        },
      });

      await notification.save();

      return NextResponse.json({
        success: true,
        message: 'Follow request accepted',
        action: 'accept',
      });
    } else {
      // Reject: delete the follow document
      await Follow.deleteOne({ _id: requestId });

      return NextResponse.json({
        success: true,
        message: 'Follow request rejected',
        action: 'reject',
      });
    }
  } catch (error) {
    console.error('Handle follow request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to handle follow request' },
      { status: 500 }
    );
  }
}
