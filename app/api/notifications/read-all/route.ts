import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 * 
 * Response:
 * {
 *   success: boolean,
 *   modifiedCount: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get user phone from header (authentication)
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Phone number required' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user by phone
    const user = await User.findOne({ phone: userPhone }).select('_id');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update all unread notifications for the user
    const result = await Notification.updateMany(
      { userId: user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
