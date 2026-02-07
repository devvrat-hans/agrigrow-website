import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import UserFeedPreference from '@/models/UserFeedPreference';

/**
 * GET /api/feed/mute
 * Check if a user is muted
 * 
 * Query params:
 *   - targetUserId: The ID of the user to check mute status for
 * 
 * Headers:
 *   - x-user-phone: Authenticated user's phone number
 * 
 * Response:
 *   - success: boolean
 *   - isMuted: boolean
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

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('targetUserId');

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'targetUserId query parameter is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid targetUserId' },
        { status: 400 }
      );
    }

    await dbConnect();

    const cleanPhone = authPhone.replace(/\D/g, '');
    const currentUser = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find feed preferences for the authenticated user
    const preferences = await UserFeedPreference.findOne({
      userId: currentUser._id,
    }).lean();

    const isMuted = preferences?.mutedUsers?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === targetUserId
    ) || false;

    return NextResponse.json({
      success: true,
      isMuted,
    });
  } catch (error) {
    console.error('Check mute status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check mute status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feed/mute
 * Mute a user — hides their posts from your feed
 * 
 * Headers:
 *   - x-user-phone: Authenticated user's phone number
 * 
 * Body:
 *   - targetUserId: The ID of the user to mute
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 */
export async function POST(request: NextRequest) {
  try {
    const authPhone = request.headers.get('x-user-phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'targetUserId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid targetUserId' },
        { status: 400 }
      );
    }

    await dbConnect();

    const cleanPhone = authPhone.replace(/\D/g, '');
    const currentUser = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent muting yourself
    if (currentUser._id.toString() === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'You cannot mute yourself' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await User.findById(targetUserId).select('_id fullName').lean();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Find or create feed preferences
    let preferences = await UserFeedPreference.findOne({ userId: currentUser._id });

    if (!preferences) {
      preferences = new UserFeedPreference({
        userId: currentUser._id,
        mutedUsers: [],
        hiddenPosts: [],
        viewedPosts: [],
      });
    }

    // Mute the user (the method handles deduplication and saves)
    const targetObjectId = new mongoose.Types.ObjectId(targetUserId);
    if (!preferences.mutedUsers.some((id: mongoose.Types.ObjectId) => id.toString() === targetUserId)) {
      preferences.mutedUsers.push(targetObjectId);
    }
    await preferences.save();

    return NextResponse.json({
      success: true,
      message: `User muted successfully. Their posts will be hidden from your feed.`,
    });
  } catch (error) {
    console.error('Mute user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mute user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feed/mute
 * Unmute a user — their posts will appear in your feed again
 * 
 * Headers:
 *   - x-user-phone: Authenticated user's phone number
 * 
 * Body:
 *   - targetUserId: The ID of the user to unmute
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 */
export async function DELETE(request: NextRequest) {
  try {
    const authPhone = request.headers.get('x-user-phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'targetUserId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid targetUserId' },
        { status: 400 }
      );
    }

    await dbConnect();

    const cleanPhone = authPhone.replace(/\D/g, '');
    const currentUser = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find feed preferences
    const preferences = await UserFeedPreference.findOne({ userId: currentUser._id });

    if (!preferences) {
      return NextResponse.json({
        success: true,
        message: 'User was not muted',
      });
    }

    // Unmute the user (filter out and save)
    preferences.mutedUsers = preferences.mutedUsers.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== targetUserId
    );
    await preferences.save();

    return NextResponse.json({
      success: true,
      message: 'User unmuted successfully. Their posts will appear in your feed again.',
    });
  } catch (error) {
    console.error('Unmute user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unmute user' },
      { status: 500 }
    );
  }
}
