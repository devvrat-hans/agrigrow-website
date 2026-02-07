import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import GroupComment from '@/models/GroupComment';
import User from '@/models/User';
import Notification from '@/models/Notification';

/**
 * POST /api/groups/[groupId]/posts/[postId]/comments/[commentId]/helpful
 * Toggle helpful status on a comment
 * - Only post author can mark a comment as helpful
 * - Toggle isHelpful boolean
 * - Returns { isHelpful: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; postId: string; commentId: string }> }
) {
  try {
    await connectDB();

    const { groupId, postId, commentId } = await params;
    const userPhone = request.headers.get('x-user-phone');

    // Authentication required
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the user
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate IDs
    if (!Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    // Find the group by ID or slug
    let group;
    if (Types.ObjectId.isValid(groupId)) {
      group = await Group.findOne({
        _id: groupId,
        isActive: true,
      });
    }

    if (!group) {
      group = await Group.findOne({
        slug: groupId,
        isActive: true,
      });
    }

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if user is an active member
    const membership = await GroupMembership.findOne({
      groupId: group._id,
      userId: user._id,
      status: 'active',
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not an active member of this group' },
        { status: 403 }
      );
    }

    // Find the post
    const post = await GroupPost.findOne({
      _id: postId,
      groupId: group._id,
      isDeleted: false,
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user is the post author
    const postAuthorId = post.author;
    if (!postAuthorId || postAuthorId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Only the post author can mark comments as helpful' },
        { status: 403 }
      );
    }

    // Find the comment
    const comment = await GroupComment.findOne({
      _id: commentId,
      postId: post._id,
      groupId: group._id,
      isDeleted: false,
    });

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Toggle helpful status
    const newHelpfulStatus = !comment.isHelpful;

    await GroupComment.updateOne(
      { _id: comment._id },
      {
        $set: {
          isHelpful: newHelpfulStatus,
          helpfulMarkedBy: newHelpfulStatus ? user._id : null,
          helpfulMarkedAt: newHelpfulStatus ? new Date() : null,
        },
      }
    );

    // Create notification for comment author if marking as helpful (not unmarking)
    if (newHelpfulStatus && comment.author.toString() !== user._id.toString()) {
      try {
        await Notification.create({
          userId: comment.author,
          type: 'helpful',
          fromUser: user._id,
          postId: post._id,
          commentId: comment._id,
          message: `Your comment was marked as helpful by the post author in "${group.name}"`,
          metadata: {
            groupId: group._id.toString(),
            groupName: group.name,
            groupSlug: group.slug,
            groupPostId: post._id.toString(),
            groupCommentId: comment._id.toString(),
            commentContent: comment.content.substring(0, 100),
            markedByName: user.fullName || 'Post Author',
            markedByImage: user.profileImage,
          },
          isRead: false,
        });
      } catch (notificationError) {
        console.error('Failed to create helpful notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: newHelpfulStatus
        ? 'Comment marked as helpful'
        : 'Helpful mark removed',
      data: {
        isHelpful: newHelpfulStatus,
      },
    });
  } catch (error) {
    console.error('Error toggling helpful status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to toggle helpful status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
