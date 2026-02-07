import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import User from '@/models/User';
import Notification from '@/models/Notification';

/**
 * POST /api/groups/[groupId]/posts/[postId]/like
 * Toggle like on a group post
 * - Check user is active group member
 * - If liked: remove from likes array, decrement likesCount
 * - If not liked: add to likes array, increment likesCount, create notification for post author (unless liking own post)
 * - Returns { isLiked: boolean, likesCount: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; postId: string }> }
) {
  try {
    await connectDB();

    const { groupId, postId } = await params;
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

    // Find the group by ID or slug
    let group;
    if (Types.ObjectId.isValid(groupId)) {
      group = await Group.findOne({
        _id: groupId,
        isActive: true
      });
    }

    // If not found by ID, try finding by slug
    if (!group) {
      group = await Group.findOne({
        slug: groupId,
        isActive: true
      });
    }

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Validate postId
    if (!Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Check if user is an active member of the group
    const membership = await GroupMembership.findOne({
      groupId: group._id,
      userId: user._id,
      status: 'active'
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
      isDeleted: false
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if post is approved (unless user is the author or mod/admin)
    const roleHierarchy: Record<string, number> = {
      member: 1,
      moderator: 2,
      admin: 3,
      owner: 4
    };
    const userRoleLevel = roleHierarchy[membership.role] || 0;
    const isAuthor = post.author.toString() === user._id.toString();
    const isModerator = userRoleLevel >= 2;

    if (!post.isApproved && !isAuthor && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user already liked the post
    const userObjectId = new Types.ObjectId(user._id);
    const alreadyLiked = post.likes.some(
      (likeId: Types.ObjectId) => likeId.toString() === user._id.toString()
    );

    let isLiked: boolean;
    let likesCount: number;

    if (alreadyLiked) {
      // Unlike the post
      await GroupPost.updateOne(
        { _id: post._id },
        {
          $pull: { likes: userObjectId },
          $inc: { likesCount: -1 }
        }
      );

      isLiked = false;
      likesCount = Math.max(0, post.likesCount - 1);
    } else {
      // Like the post
      await GroupPost.updateOne(
        { _id: post._id },
        {
          $addToSet: { likes: userObjectId },
          $inc: { likesCount: 1 }
        }
      );

      isLiked = true;
      likesCount = post.likesCount + 1;

      // Create notification for post author (unless liking own post)
      if (post.author.toString() !== user._id.toString()) {
        try {
          // Check if a similar notification already exists (to avoid duplicate notifications)
          // We'll create a new notification each time for like actions
          await Notification.create({
            userId: post.author,
            type: 'group_post_like',
            fromUser: user._id,
            groupId: group._id,
            groupPostId: post._id,
            message: `${user.fullName || 'Someone'} liked your post in "${group.name}"`,
            metadata: {
              groupId: group._id.toString(),
              groupName: group.name,
              groupSlug: group.slug,
              groupPostId: post._id.toString(),
              postContent: post.content.substring(0, 100), // First 100 chars
              likerName: user.fullName || 'Unknown User',
              likerImage: user.profileImage
            },
            isRead: false
          });
        } catch (notificationError) {
          // Log but don't fail the request if notification creation fails
          console.error('Failed to create like notification:', notificationError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isLiked,
        likesCount
      }
    });
  } catch (error) {
    console.error('Error toggling post like:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to toggle like',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
