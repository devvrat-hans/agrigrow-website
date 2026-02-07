import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import User from '@/models/User';

/**
 * POST /api/groups/[groupId]/posts/[postId]/pin
 * Toggle pin status on a group post
 * - Require moderator/admin role
 * - Toggle isPinned boolean
 * - If pinning, check max 3 pinned posts per group - if exceeded, unpin oldest pinned post
 * - Returns updated post
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
        { success: false, error: 'Only moderators, admins, and owners can pin posts' },
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

    // Toggle pin status
    const newPinnedStatus = !post.isPinned;

    if (newPinnedStatus) {
      // Check if we already have 3 pinned posts
      const pinnedPosts = await GroupPost.find({
        groupId: group._id,
        isPinned: true,
        isDeleted: false
      }).sort({ pinnedAt: 1 }); // Sort by oldest pinned first

      if (pinnedPosts.length >= 3) {
        // Unpin the oldest pinned post
        const oldestPinned = pinnedPosts[0];
        await GroupPost.updateOne(
          { _id: oldestPinned._id },
          {
            $set: {
              isPinned: false,
              pinnedAt: null,
              pinnedBy: null
            }
          }
        );
      }

      // Pin the current post
      await GroupPost.updateOne(
        { _id: post._id },
        {
          $set: {
            isPinned: true,
            pinnedAt: new Date(),
            pinnedBy: user._id
          }
        }
      );
    } else {
      // Unpin the post
      await GroupPost.updateOne(
        { _id: post._id },
        {
          $set: {
            isPinned: false,
            pinnedAt: null,
            pinnedBy: null
          }
        }
      );
    }

    // Fetch the updated post with author populated
    const updatedPost = await GroupPost.findById(post._id)
      .populate('author', 'fullName profileImage role')
      .lean();

    // Transform author field for response
    const authorData = updatedPost?.author as { _id?: Types.ObjectId; fullName?: string; profileImage?: string; role?: string } | undefined;
    const responsePost = {
      ...updatedPost,
      authorInfo: authorData ? {
        _id: authorData._id?.toString() || '',
        fullName: authorData.fullName || '',
        profileImage: authorData.profileImage,
        role: authorData.role,
      } : undefined,
      author: authorData?._id?.toString() || '',
      isPinned: newPinnedStatus
    };

    return NextResponse.json({
      success: true,
      message: newPinnedStatus ? 'Post pinned successfully' : 'Post unpinned successfully',
      data: responsePost
    });
  } catch (error) {
    console.error('Error toggling post pin:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to toggle pin',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
