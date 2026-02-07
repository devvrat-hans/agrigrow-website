import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';

/**
 * POST /api/notifications/[id]/read
 * Mark a single notification as read
 * 
 * Response:
 * {
 *   success: boolean,
 *   notification?: { _id, isRead }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;

    // Get user phone from header (authentication)
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Phone number required' },
        { status: 401 }
      );
    }

    // Validate notification ID
    if (!notificationId || notificationId.length !== 24) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification ID' },
        { status: 400 }
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

    // Find and update the notification
    // Only update if it belongs to the authenticated user
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: user._id },
      { 
        $set: { 
          isRead: true,
          isClicked: true,
        } 
      },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: {
        _id: notification._id.toString(),
        isRead: notification.isRead,
      },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
