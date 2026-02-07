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
 * GET /api/user/[id]/following
 * Returns paginated list of users that the specified user follows
 * Request: 
 *   - Path param `id` (phone number)
 *   - Query params: `page`, `limit`, `search`
 *   - Header `x-user-phone` (optional, for checking follow status)
 * Response: Paginated list of following users with follow status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';
    
    // Get requesting user for follow status
    const requestingUserPhone = request.headers.get('x-user-phone');
    const cleanRequestingPhone = requestingUserPhone?.replace(/\D/g, '') || '';
    
    // Clean target user phone
    const cleanTargetPhone = userId.replace(/\D/g, '');

    await dbConnect();

    // Verify target user exists
    const targetUser = await User.findOne({ phone: cleanTargetPhone });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Build the aggregation pipeline
    const skip = (page - 1) * limit;

    // Get total count of following
    const totalCountPipeline = [
      {
        $match: {
          followerId: cleanTargetPhone,
          status: 'active',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'followingId',
          foreignField: 'phone',
          as: 'followingUser',
        },
      },
      { $unwind: '$followingUser' },
      ...(search
        ? [
            {
              $match: {
                'followingUser.fullName': {
                  $regex: search,
                  $options: 'i',
                },
              },
            },
          ]
        : []),
      { $count: 'total' },
    ];

    // Main query pipeline
    const followingPipeline = [
      {
        $match: {
          followerId: cleanTargetPhone,
          status: 'active',
        },
      },
      { $sort: { createdAt: -1 as const } },
      {
        $lookup: {
          from: 'users',
          localField: 'followingId',
          foreignField: 'phone',
          as: 'followingUser',
        },
      },
      { $unwind: '$followingUser' },
      ...(search
        ? [
            {
              $match: {
                'followingUser.fullName': {
                  $regex: search,
                  $options: 'i',
                },
              },
            },
          ]
        : []),
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          phone: '$followingUser.phone',
          fullName: '$followingUser.fullName',
          profileImage: '$followingUser.profileImage',
          bio: '$followingUser.bio',
          role: '$followingUser.role',
          state: '$followingUser.state',
          district: '$followingUser.district',
          isPrivateAccount: '$followingUser.isPrivateAccount',
          followedAt: '$createdAt',
        },
      },
    ];

    // Execute both queries in parallel
    const [countResult, following] = await Promise.all([
      Follow.aggregate(totalCountPipeline),
      Follow.aggregate(followingPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // If there's a requesting user, check follow status for each user in the list
    let usersWithFollowStatus = following;
    
    if (cleanRequestingPhone && following.length > 0) {
      const followingPhones = following.map((f: { phone: string }) => f.phone);
      
      // Get all follow relationships between requesting user and these users
      const [requestingUserFollows, usersFollowBack] = await Promise.all([
        // Who the requesting user follows among these users
        Follow.find({
          followerId: cleanRequestingPhone,
          followingId: { $in: followingPhones },
          status: { $in: ['active', 'pending'] },
        }).lean(),
        // Which of these users follow the requesting user
        Follow.find({
          followerId: { $in: followingPhones },
          followingId: cleanRequestingPhone,
          status: 'active',
        }).lean(),
      ]);

      // Create maps for quick lookup
      const followingMap = new Map(
        requestingUserFollows.map((f) => [f.followingId, f.status])
      );
      const followedByMap = new Set(
        usersFollowBack.map((f) => f.followerId)
      );

      usersWithFollowStatus = following.map((user: {
        phone: string;
        fullName: string;
        profileImage?: string;
        bio?: string;
        role?: string;
        state?: string;
        district?: string;
        isPrivateAccount?: boolean;
        followedAt: Date;
      }) => ({
        ...user,
        isFollowing: followingMap.get(user.phone) === 'active',
        isPending: followingMap.get(user.phone) === 'pending',
        isFollowedBy: followedByMap.has(user.phone),
      }));
    } else {
      usersWithFollowStatus = following.map((user: {
        phone: string;
        fullName: string;
        profileImage?: string;
        bio?: string;
        role?: string;
        state?: string;
        district?: string;
        isPrivateAccount?: boolean;
        followedAt: Date;
      }) => ({
        ...user,
        isFollowing: false,
        isPending: false,
        isFollowedBy: false,
      }));
    }

    return NextResponse.json({
      success: true,
      users: usersWithFollowStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Get following error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch following list' },
      { status: 500 }
    );
  }
}
