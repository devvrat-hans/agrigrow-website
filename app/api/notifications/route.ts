import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';

/**
 * Populated fromUser type
 */
interface PopulatedFromUser {
  _id: string;
  name: string;
  avatar?: string;
}

/**
 * Notification document type after population
 */
interface PopulatedNotification {
  _id: string;
  type: string;
  fromUser?: PopulatedFromUser;
  postId?: string;
  commentId?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * GET /api/notifications
 * Fetch notifications for authenticated user with pagination
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * 
 * Response:
 * {
 *   success: boolean,
 *   notifications: NotificationData[],
 *   pagination: { page, limit, total, totalPages },
 *   unreadCount: number
 * }
 */
export async function GET(request: NextRequest) {
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

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Fetch notifications for user
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUser', '_id name avatar')
        .lean<PopulatedNotification[]>(),
      Notification.countDocuments({ userId: user._id }),
      Notification.countDocuments({ userId: user._id, isRead: false }),
    ]);

    // Format notifications for response
    const formattedNotifications = notifications.map((notification) => ({
      _id: notification._id.toString(),
      type: notification.type,
      fromUser: notification.fromUser ? {
        _id: notification.fromUser._id.toString(),
        name: notification.fromUser.name,
        avatar: notification.fromUser.avatar,
      } : undefined,
      postId: notification.postId?.toString(),
      commentId: notification.commentId?.toString(),
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
