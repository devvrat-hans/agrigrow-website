import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import UserFeedPreference from '@/models/UserFeedPreference';

/**
 * GET /api/feed/mute/list
 * Returns the list of all muted users with their profile info
 *
 * Headers:
 *   - x-user-phone: Authenticated user's phone number
 *
 * Response:
 *   - success: boolean
 *   - mutedUsers: Array<{ _id, fullName, profileImage, role }>
 */
export async function GET(request: NextRequest) {
  try {
    const authPhone = request.headers.get('x-user-phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    await dbConnect();

    const cleanPhone = authPhone.replace(/\D/g, '');
    const currentUser = await User.findOne({ phone: cleanPhone })
      .select('_id')
      .lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the user's feed preferences
    const preferences = await UserFeedPreference.findOne({
      userId: currentUser._id,
    }).lean();

    if (!preferences || !preferences.mutedUsers || preferences.mutedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        mutedUsers: [],
      });
    }

    // Fetch profile info for all muted users
    const mutedUsers = await User.find({
      _id: { $in: preferences.mutedUsers },
    })
      .select('_id fullName profileImage role')
      .lean();

    // Map to a clean response format
    const formattedUsers = mutedUsers.map((user) => ({
      _id: user._id.toString(),
      fullName: user.fullName || 'Unknown User',
      profileImage: user.profileImage || '',
      role: user.role || 'farmer',
    }));

    return NextResponse.json({
      success: true,
      mutedUsers: formattedUsers,
    });
  } catch (error) {
    console.error('Get muted users list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch muted users' },
      { status: 500 }
    );
  }
}
