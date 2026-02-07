import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import GroupComment from '@/models/GroupComment';
import User from '@/models/User';
import Notification from '@/models/Notification';

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
// GET /api/groups/[groupId]/posts/[postId]/comments
// Fetch comments for a post with pagination
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; postId: string }> }
) {
  try {
    await connectDB();

    const { groupId, postId } = await params;
    const { searchParams } = new URL(request.url);
    const userPhone = request.headers.get('x-user-phone');

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const sort = searchParams.get('sort') || 'oldest'; // 'oldest' or 'newest'

    // Validate pagination
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Validate postId
    if (!Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
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

    // Get current user if authenticated (for isLiked status)
    let currentUser = null;
    if (userPhone) {
      currentUser = await User.findOne({ phone: userPhone });
    }

    // Build sort order
    const sortOrder = sort === 'newest' ? -1 : 1;

    // Get top-level comments (parentId = null, depth = 0)
    const skip = (page - 1) * limit;
    const topLevelComments = await GroupComment.find({
      postId: post._id,
      groupId: group._id,
      parentId: null,
      depth: 0,
      isDeleted: false,
    })
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName profileImage role region')
      .lean();

    // Get total count of top-level comments
    const totalTopLevelComments = await GroupComment.countDocuments({
      postId: post._id,
      groupId: group._id,
      parentId: null,
      depth: 0,
      isDeleted: false,
    });

    // Fetch replies for each top-level comment (depth 1 and 2)
    const commentIds = topLevelComments.map((c) => c._id);
    const replies = await GroupComment.find({
      postId: post._id,
      groupId: group._id,
      $or: [
        { parentId: { $in: commentIds }, depth: 1 },
        {
          parentId: {
            $in: await GroupComment.find({
              parentId: { $in: commentIds },
              depth: 1,
            }).distinct('_id'),
          },
          depth: 2,
        },
      ],
      isDeleted: false,
    })
      .sort({ createdAt: 1 }) // Always show replies oldest first
      .populate('author', 'fullName profileImage role region')
      .lean();

    // Build nested comment structure
    const commentsWithReplies = topLevelComments.map((comment) => {
      const directReplies = replies
        .filter(
          (r) => r.parentId?.toString() === comment._id.toString() && r.depth === 1
        )
        .map((reply) => {
          const nestedReplies = replies.filter(
            (r) => r.parentId?.toString() === reply._id.toString() && r.depth === 2
          );

          return {
            ...reply,
            isLiked: currentUser
              ? reply.likes?.some(
                  (likeId: Types.ObjectId) =>
                    likeId.toString() === currentUser._id.toString()
                )
              : false,
            replies: nestedReplies.map((nested) => ({
              ...nested,
              isLiked: currentUser
                ? nested.likes?.some(
                    (likeId: Types.ObjectId) =>
                      likeId.toString() === currentUser._id.toString()
                  )
                : false,
            })),
          };
        });

      return {
        ...comment,
        isLiked: currentUser
          ? comment.likes?.some(
              (likeId: Types.ObjectId) =>
                likeId.toString() === currentUser._id.toString()
            )
          : false,
        replies: directReplies,
      };
    });

    const totalPages = Math.ceil(totalTopLevelComments / limit);

    return NextResponse.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        pagination: {
          currentPage: page,
          totalPages,
          totalComments: totalTopLevelComments,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comments',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/groups/[groupId]/posts/[postId]/comments
// Create a new comment on a post
// ============================================
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

    const { content, parentId } = body;

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

    // Validate postId
    if (!Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
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

    // Check if post is approved (unless user is author or mod/admin)
    const roleHierarchy: Record<string, number> = {
      member: 1,
      moderator: 2,
      admin: 3,
      owner: 4,
    };
    const userRoleLevel = roleHierarchy[membership.role] || 0;
    const isAuthor = post.author?.toString() === user._id.toString();
    const isModerator = userRoleLevel >= 2;

    if (!post.isApproved && !isAuthor && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Handle replies
    let parentComment = null;
    let depth = 0;

    if (parentId) {
      if (!Types.ObjectId.isValid(parentId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent comment ID' },
          { status: 400 }
        );
      }

      parentComment = await GroupComment.findOne({
        _id: parentId,
        postId: post._id,
        groupId: group._id,
        isDeleted: false,
      });

      if (!parentComment) {
        return NextResponse.json(
          { success: false, error: 'Parent comment not found' },
          { status: 404 }
        );
      }

      // Enforce max depth of 2
      if (parentComment.depth >= 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot reply to this comment (maximum nesting depth reached)',
          },
          { status: 400 }
        );
      }

      depth = parentComment.depth + 1;
    }

    // Parse mentions from content
    const mentionedNames = parseMentions(content.trim());
    const mentionedUserIds = await findUsersByNames(mentionedNames);

    // Create the comment
    const comment = await GroupComment.create({
      postId: post._id,
      groupId: group._id,
      author: user._id,
      content: content.trim(),
      parentId: parentComment?._id || null,
      depth,
      replyCount: 0,
      likesCount: 0,
      likes: [],
      isHelpful: false,
      mentions: mentionedUserIds,
      isEdited: false,
      isDeleted: false,
    });

    // Increment post commentsCount
    await GroupPost.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });

    // Increment parent replyCount if this is a reply
    if (parentComment) {
      await GroupComment.updateOne(
        { _id: parentComment._id },
        { $inc: { replyCount: 1 } }
      );
    }

    // Create notifications
    const notifications: Array<{
      userId: Types.ObjectId;
      type: string;
      fromUser: Types.ObjectId;
      postId?: Types.ObjectId;
      commentId?: Types.ObjectId;
      message: string;
      metadata: Record<string, unknown>;
      isRead: boolean;
    }> = [];

    // Notification for post author (if not commenting on own post)
    const postAuthorId = post.author;
    if (postAuthorId && postAuthorId.toString() !== user._id.toString() && !parentComment) {
      notifications.push({
        userId: postAuthorId,
        type: 'comment',
        fromUser: user._id,
        postId: post._id,
        commentId: comment._id,
        message: `${user.fullName || 'Someone'} commented on your post in "${group.name}"`,
        metadata: {
          groupId: group._id,
          groupName: group.name,
          groupSlug: group.slug,
          commentContent: content.trim().substring(0, 100),
          commenterName: user.fullName || 'Unknown User',
          commenterImage: user.profileImage,
        },
        isRead: false,
      });
    }

    // Notification for parent comment author (if replying to someone else's comment)
    if (parentComment && parentComment.author.toString() !== user._id.toString()) {
      notifications.push({
        userId: parentComment.author,
        type: 'reply',
        fromUser: user._id,
        postId: post._id,
        commentId: comment._id,
        message: `${user.fullName || 'Someone'} replied to your comment in "${group.name}"`,
        metadata: {
          groupId: group._id,
          groupName: group.name,
          groupSlug: group.slug,
          parentCommentId: parentComment._id,
          replyContent: content.trim().substring(0, 100),
          replierName: user.fullName || 'Unknown User',
          replierImage: user.profileImage,
        },
        isRead: false,
      });
    }

    // Notifications for mentioned users
    for (const mentionedUserId of mentionedUserIds) {
      // Don't notify if mentioning self, post author (already notified), or parent comment author (already notified)
      if (
        mentionedUserId.toString() === user._id.toString() ||
        (postAuthorId && mentionedUserId.toString() === postAuthorId.toString() && !parentComment) ||
        (parentComment && mentionedUserId.toString() === parentComment.author.toString())
      ) {
        continue;
      }

      notifications.push({
        userId: mentionedUserId,
        type: 'mention',
        fromUser: user._id,
        postId: post._id,
        commentId: comment._id,
        message: `${user.fullName || 'Someone'} mentioned you in a comment in "${group.name}"`,
        metadata: {
          groupId: group._id,
          groupName: group.name,
          groupSlug: group.slug,
          commentContent: content.trim().substring(0, 100),
          mentionerName: user.fullName || 'Unknown User',
          mentionerImage: user.profileImage,
        },
        isRead: false,
      });
    }

    // Create all notifications
    if (notifications.length > 0) {
      try {
        await Notification.insertMany(notifications);
      } catch (notificationError) {
        console.error('Failed to create notifications:', notificationError);
      }
    }

    // Fetch the created comment with author populated
    const populatedComment = await GroupComment.findById(comment._id)
      .populate('author', 'fullName profileImage role region')
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: 'Comment created successfully',
        data: {
          ...populatedComment,
          isLiked: false,
          replies: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create comment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
