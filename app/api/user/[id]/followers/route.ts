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
 * GET /api/user/[id]/followers
 * Returns paginated list of users who follow the specified user
 * Request: 
 *   - Path param `id` (phone number)
 *   - Query params: `page`, `limit`, `search`
 *   - Header `x-user-phone` (optional, for checking follow-back status)
 * Response: Paginated list of followers with follow status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';
    
    // Get requesting user for follow-back status
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

    // Get total count of followers
    const totalCountPipeline = [
      {
        $match: {
          followingId: cleanTargetPhone,
          status: 'active',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'followerId',
          foreignField: 'phone',
          as: 'followerUser',
        },
      },
      { $unwind: '$followerUser' },
      ...(search
        ? [
            {
              $match: {
                'followerUser.fullName': {
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
    const followersPipeline = [
      {
        $match: {
          followingId: cleanTargetPhone,
          status: 'active',
        },
      },
      { $sort: { createdAt: -1 as const } },
      {
        $lookup: {
          from: 'users',
          localField: 'followerId',
          foreignField: 'phone',
          as: 'followerUser',
        },
      },
      { $unwind: '$followerUser' },
      ...(search
        ? [
            {
              $match: {
                'followerUser.fullName': {
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
          phone: '$followerUser.phone',
          fullName: '$followerUser.fullName',
          profileImage: '$followerUser.profileImage',
          bio: '$followerUser.bio',
          role: '$followerUser.role',
          state: '$followerUser.state',
          district: '$followerUser.district',
          isPrivateAccount: '$followerUser.isPrivateAccount',
          followedAt: '$createdAt',
        },
      },
    ];

    // Execute both queries in parallel
    const [countResult, followers] = await Promise.all([
      Follow.aggregate(totalCountPipeline),
      Follow.aggregate(followersPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // If there's a requesting user, check follow status for each follower
    let usersWithFollowStatus = followers;
    
    if (cleanRequestingPhone && followers.length > 0) {
      const followerPhones = followers.map((f: { phone: string }) => f.phone);
      
      // Get all follow relationships between requesting user and these followers
      const [requestingUserFollows, followersFollowBack] = await Promise.all([
        // Who the requesting user follows among these followers
        Follow.find({
          followerId: cleanRequestingPhone,
          followingId: { $in: followerPhones },
          status: { $in: ['active', 'pending'] },
        }).lean(),
        // Which of these followers follow the requesting user
        Follow.find({
          followerId: { $in: followerPhones },
          followingId: cleanRequestingPhone,
          status: 'active',
        }).lean(),
      ]);

      // Create maps for quick lookup
      const followingMap = new Map(
        requestingUserFollows.map((f) => [f.followingId, f.status])
      );
      const followedByMap = new Set(
        followersFollowBack.map((f) => f.followerId)
      );

      usersWithFollowStatus = followers.map((follower: {
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
        ...follower,
        isFollowing: followingMap.get(follower.phone) === 'active',
        isPending: followingMap.get(follower.phone) === 'pending',
        isFollowedBy: followedByMap.has(follower.phone),
      }));
    } else {
      usersWithFollowStatus = followers.map((follower: {
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
        ...follower,
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
    console.error('Get followers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch followers' },
      { status: 500 }
    );
  }
}
