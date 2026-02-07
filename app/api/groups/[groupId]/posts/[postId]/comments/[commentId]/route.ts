import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import GroupComment from '@/models/GroupComment';
import User from '@/models/User';

// ============================================
// CONSTANTS
// ============================================

/**
 * Edit window for authors (1 hour in milliseconds)
 */
const EDIT_WINDOW_MS = 60 * 60 * 1000;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse mentions from content (format @username)
 * Returns array of usernames mentioned
 */
function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);
  if (!matches) return [];
  return matches.map((m) => m.slice(1)); // Remove @ prefix
}

/**
 * Find users by their fullName (case-insensitive partial match)
 */
async function findUsersByNames(names: string[]): Promise<Types.ObjectId[]> {
  if (names.length === 0) return [];

  const users = await User.find({
    fullName: {
      $in: names.map((name) => new RegExp(`^${name}$`, 'i')),
    },
  }).select('_id');

  return users.map((u) => u._id);
}

// ============================================
// PUT /api/groups/[groupId]/posts/[postId]/comments/[commentId]
// Edit a comment
// ============================================
export async function PUT(
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { content } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Comment content cannot exceed 2000 characters' },
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

    // Check if user is a member
    const membership = await GroupMembership.findOne({
      groupId: group._id,
      userId: user._id,
      status: 'active',
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
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

    // Check permissions
    const roleHierarchy: Record<string, number> = {
      member: 1,
      moderator: 2,
      admin: 3,
      owner: 4,
    };
    const userRoleLevel = roleHierarchy[membership.role] || 0;
    const isAuthor = comment.author.toString() === user._id.toString();
    const isModerator = userRoleLevel >= 2;

    if (!isAuthor && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this comment' },
        { status: 403 }
      );
    }

    // Check edit window for authors (1 hour)
    if (isAuthor && !isModerator) {
      const timeSinceCreation = Date.now() - new Date(comment.createdAt).getTime();
      if (timeSinceCreation > EDIT_WINDOW_MS) {
        return NextResponse.json(
          { success: false, error: 'Comment can only be edited within 1 hour of creation' },
          { status: 403 }
        );
      }
    }

    // Parse mentions from updated content
    const mentionedNames = parseMentions(content.trim());
    const mentionedUserIds = await findUsersByNames(mentionedNames);

    // Update the comment
    const now = new Date();
    await GroupComment.updateOne(
      { _id: comment._id },
      {
        $set: {
          content: content.trim(),
          mentions: mentionedUserIds,
          isEdited: true,
          editedAt: now,
        },
      }
    );

    // Fetch the updated comment with author populated
    const updatedComment = await GroupComment.findById(comment._id)
      .populate('author', 'fullName profileImage role region')
      .lean();

    // Check if user liked this comment
    const isLiked = updatedComment?.likes?.some(
      (likeId: Types.ObjectId) => likeId.toString() === user._id.toString()
    );

    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        ...updatedComment,
        isLiked,
      },
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update comment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/groups/[groupId]/posts/[postId]/comments/[commentId]
// Delete a comment (soft delete)
// ============================================
export async function DELETE(
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

    // Check if user is a member
    const membership = await GroupMembership.findOne({
      groupId: group._id,
      userId: user._id,
      status: 'active',
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
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

    // Check permissions
    const roleHierarchy: Record<string, number> = {
      member: 1,
      moderator: 2,
      admin: 3,
      owner: 4,
    };
    const userRoleLevel = roleHierarchy[membership.role] || 0;
    const isAuthor = comment.author.toString() === user._id.toString();
    const isModerator = userRoleLevel >= 2;

    if (!isAuthor && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this comment' },
        { status: 403 }
      );
    }

    // Soft delete the comment
    await GroupComment.updateOne(
      { _id: comment._id },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user._id,
        },
      }
    );

    // Decrement post commentsCount
    await GroupPost.updateOne(
      { _id: post._id },
      { $inc: { commentsCount: -1 } }
    );

    // If this is a reply, decrement parent's replyCount
    if (comment.parentId) {
      await GroupComment.updateOne(
        { _id: comment.parentId },
        { $inc: { replyCount: -1 } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete comment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
