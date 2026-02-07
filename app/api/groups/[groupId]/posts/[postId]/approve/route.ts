import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import User from '@/models/User';
import Notification from '@/models/Notification';

/**
 * POST /api/groups/[groupId]/posts/[postId]/approve
 * Approve a pending post in a group
 * - Require moderator/admin role
 * - Set isApproved=true, approvedBy=currentUserId, approvedAt=now
 * - Send notification to post author that their post was approved
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

    // Check if user has moderator or higher role
    const membership = await GroupMembership.findOne({
      groupId: group._id,
      userId: user._id,
      status: 'active'
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    const roleHierarchy: Record<string, number> = {
      member: 1,
      moderator: 2,
      admin: 3,
      owner: 4
    };
    const userRoleLevel = roleHierarchy[membership.role] || 0;

    if (userRoleLevel < 2) {
      return NextResponse.json(
        { success: false, error: 'Only moderators, admins, and owners can approve posts' },
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

    // Check if post is already approved
    if (post.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Post is already approved' },
        { status: 400 }
      );
    }

    // Approve the post
    const now = new Date();
    await GroupPost.updateOne(
      { _id: post._id },
      {
        $set: {
          isApproved: true,
          approvedBy: user._id,
          approvedAt: now
        }
      }
    );

    // Increment group postCount since post is now approved
    await Group.updateOne(
      { _id: group._id },
      { $inc: { postCount: 1 } }
    );

    // Create notification for post author
    if (post.author.toString() !== user._id.toString()) {
      try {
        await Notification.create({
          userId: post.author,
          type: 'group_post_approved',
          fromUser: user._id,
          groupId: group._id,
          groupPostId: post._id,
          message: `Your post in "${group.name}" has been approved`,
          metadata: {
            groupId: group._id.toString(),
            groupName: group.name,
            groupSlug: group.slug,
            groupPostId: post._id.toString(),
            postContent: post.content.substring(0, 100), // First 100 chars
            approvedByName: user.fullName || 'A moderator'
          },
          isRead: false
        });
      } catch (notificationError) {
        // Log but don't fail the request if notification creation fails
        console.error('Failed to create approval notification:', notificationError);
      }
    }

    // Fetch the updated post with author populated
    const updatedPost = await GroupPost.findById(post._id)
      .populate('author', 'fullName profileImage role')
      .populate('approvedBy', 'fullName profileImage')
      .lean();

    // Transform author field for response
    const authorData = updatedPost?.author as { _id?: Types.ObjectId; fullName?: string; profileImage?: string; role?: string } | undefined;
    const approvedByData = updatedPost?.approvedBy as { _id?: Types.ObjectId; fullName?: string; profileImage?: string } | undefined;

    const responsePost = {
      ...updatedPost,
      author: authorData?._id?.toString() || '',
      authorInfo: authorData ? {
        _id: authorData._id?.toString() || '',
        fullName: authorData.fullName || '',
        profileImage: authorData.profileImage,
        role: authorData.role,
      } : undefined,
      approvedBy: approvedByData
    };

    return NextResponse.json({
      success: true,
      message: 'Post approved successfully',
      data: responsePost
    });
  } catch (error) {
    console.error('Error approving post:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve post',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
