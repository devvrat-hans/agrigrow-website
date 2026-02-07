/**
 * Single Post API Route
 * 
 * API endpoint for operations on a specific group post.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/posts/[postId] - Get post details
 * - PUT /api/groups/[groupId]/posts/[postId] - Update post
 * - DELETE /api/groups/[groupId]/posts/[postId] - Delete post (soft delete)
 * 
 * Authentication:
 * - GET: Optional (but needed for isLiked status)
 * - PUT: Required via x-user-phone header
 * - DELETE: Required via x-user-phone header
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import User from '@/models/User';
import { GroupPostData, MemberRole, GroupPostType, PollData } from '@/types/group';

// ============================================
// CONSTANTS
// ============================================

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

const EDIT_WINDOW_HOURS = 24;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(str: string): boolean {
  return mongoose.Types.ObjectId.isValid(str) && 
    new mongoose.Types.ObjectId(str).toString() === str;
}

/**
 * Get user from phone number
 */
async function getUserFromPhone(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return User.findOne({ phone: cleanPhone });
}

/**
 * Check if user has at least the required role
 */
function hasRequiredRole(userRole: MemberRole | null, requiredRole: MemberRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Parse mentions from content
 */
function parseMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = content.match(mentionRegex);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.substring(1)))];
}

/**
 * Check if post is within edit window
 */
function isWithinEditWindow(createdAt: Date): boolean {
  const now = new Date();
  const postAge = now.getTime() - new Date(createdAt).getTime();
  const editWindowMs = EDIT_WINDOW_HOURS * 60 * 60 * 1000;
  return postAge <= editWindowMs;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string; postId: string }>;
}

// ============================================
// GET /api/groups/[groupId]/posts/[postId]
// ============================================

/**
 * GET /api/groups/[groupId]/posts/[postId]
 * 
 * Get details of a specific post.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} postId - Post ID (ObjectId)
 * 
 * Headers:
 * @header {string} x-user-phone - Optional, for isLiked status
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupPostData }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId, postId } = await params;

    // Validate postId
    if (!isValidObjectId(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Build group query - support both ID and slug
    const groupQuery: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(groupQuery)
      .select('_id settings isActive')
      .lean();

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check authentication (optional)
    const authPhone = request.headers.get('x-user-phone');
    let currentUser = null;
    let currentUserMembership = null;

    if (authPhone) {
      currentUser = await getUserFromPhone(authPhone);
      if (currentUser) {
        currentUserMembership = await GroupMembership.findOne({
          groupId: group._id,
          userId: currentUser._id,
          status: 'active',
        }).lean();
      }
    }

    const currentUserRole = currentUserMembership?.role as MemberRole | undefined;
    const isModOrAdmin = hasRequiredRole(currentUserRole || null, 'moderator');

    // Find post
    const post = await GroupPost.findOne({
      _id: new mongoose.Types.ObjectId(postId),
      groupId: group._id,
      isDeleted: false,
    })
      .populate('author', 'fullName profileImage role')
      .lean();

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if post needs approval and user can see it
    if (!post.isApproved && !isModOrAdmin) {
      // Only author can see their unapproved post
      const authorId = post.author as unknown as { _id?: mongoose.Types.ObjectId };
      if (!currentUser || authorId?._id?.toString() !== currentUser._id.toString()) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }
    }

    const author = post.author as unknown as Record<string, unknown> | null;

    // Check if current user liked this post
    const isLiked = currentUser 
      ? (post.likes || []).some((likeId: mongoose.Types.ObjectId) => 
          likeId.toString() === currentUser._id.toString()
        )
      : false;

    // Format poll if exists
    let pollData: PollData | undefined = undefined;
    if (post.postType === 'poll' && post.poll) {
      const hasVoted = currentUser
        ? post.poll.voterIds?.some((voterId) =>
            voterId.toString() === currentUser._id.toString()
          ) ?? false
        : false;

      // Calculate total votes
      const _totalVotes = (post.poll.options || []).reduce((sum, opt) => sum + (opt.votes || 0), 0);

      pollData = {
        question: post.poll.question,
        options: (post.poll.options || []).map((opt) => ({
          text: opt.text,
          votes: opt.votes || 0,
        })),
        endDate: post.poll.endDate?.toISOString(),
        voterCount: post.poll.voterIds?.length || 0,
        hasVoted,
      };
    }

    const responseData: GroupPostData = {
      _id: post._id.toString(),
      groupId: post.groupId.toString(),
      author: author?._id?.toString() || '',
      authorInfo: author ? {
        _id: author._id?.toString() || '',
        fullName: (author.fullName as string) || 'Unknown User',
        profileImage: author.profileImage as string | undefined,
        role: author.role as string | undefined,
      } : undefined,
      postType: post.postType as GroupPostType,
      content: post.content,
      images: post.images || [],
      poll: pollData,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      isLiked,
      isPinned: post.isPinned || false,
      isApproved: post.isApproved ?? true,
      isEdited: post.isEdited || false,
      editedAt: post.editedAt?.toISOString(),
      mentions: (post.mentions || []).map((m) => m.toString()),
      tags: post.tags || [],
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch post',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/groups/[groupId]/posts/[postId]
// ============================================

/**
 * PUT /api/groups/[groupId]/posts/[postId]
 * 
 * Update a post.
 * - Author can edit within 24 hours
 * - Mods/admins can edit anytime
 * - Cannot change postType
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} postId - Post ID (ObjectId)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {string} content - New content (optional)
 * @body {string[]} images - New images (optional)
 * @body {Object[]} attachments - New attachments (optional)
 * @body {string[]} tags - New tags (optional)
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupPostData }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId, postId } = await params;

    // Validate postId
    if (!isValidObjectId(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Check authentication
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await getUserFromPhone(authPhone);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Build group query - support both ID and slug
    const groupQuery: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(groupQuery)
      .select('_id settings isActive')
      .lean();

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get current user's membership
    const currentUserMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: currentUser._id,
      status: 'active',
    }).lean();

    if (!currentUserMembership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    const currentUserRole = currentUserMembership.role as MemberRole;
    const isModOrAdmin = hasRequiredRole(currentUserRole, 'moderator');

    // Find post
    const post = await GroupPost.findOne({
      _id: new mongoose.Types.ObjectId(postId),
      groupId: group._id,
      isDeleted: false,
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const isAuthor = post.author.toString() === currentUser._id.toString();

    // Check permissions
    if (!isAuthor && !isModOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this post' },
        { status: 403 }
      );
    }

    // Authors can only edit within 24 hours
    if (isAuthor && !isModOrAdmin && !isWithinEditWindow(post.createdAt)) {
      return NextResponse.json(
        { success: false, error: 'Post can only be edited within 24 hours of creation' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, images, tags, postType } = body;

    // Cannot change post type
    if (postType && postType !== post.postType) {
      return NextResponse.json(
        { success: false, error: 'Cannot change post type after creation' },
        { status: 400 }
      );
    }

    // Update fields
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Post content cannot be empty' },
          { status: 400 }
        );
      }
      if (content.length > 10000) {
        return NextResponse.json(
          { success: false, error: 'Post content cannot exceed 10000 characters' },
          { status: 400 }
        );
      }
      post.content = content.trim();
      
      // Re-parse mentions - convert string[] to ObjectId[]
      const mentionUsernames = parseMentions(content);
      if (mentionUsernames.length > 0) {
        const mentionedUsers = await User.find({ fullName: { $in: mentionUsernames } }).select('_id');
        post.mentions = mentionedUsers.map(u => u._id);
      } else {
        post.mentions = [];
      }
    }

    if (images !== undefined) {
      if (!group.settings?.allowImages && !isModOrAdmin && images.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Images are not allowed in this group' },
          { status: 403 }
        );
      }
      post.images = images;
    }

    if (tags !== undefined) {
      post.tags = tags;
    }

    // Mark as edited
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();

    // Populate author for response
    await post.populate('author', 'fullName profileImage role');

    const author = post.author as unknown as Record<string, unknown>;

    // Check if current user liked
    const isLiked = (post.likes || []).some((likeId: mongoose.Types.ObjectId) => 
      likeId.toString() === currentUser._id.toString()
    );

    const responseData: GroupPostData = {
      _id: post._id.toString(),
      groupId: post.groupId.toString(),
      author: author?._id?.toString() || '',
      authorInfo: author ? {
        _id: author._id?.toString() || '',
        fullName: (author.fullName as string) || '',
        profileImage: author.profileImage as string | undefined,
        role: author.role as string | undefined,
      } : undefined,
      postType: post.postType as GroupPostType,
      content: post.content,
      images: post.images || [],
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      isLiked,
      isPinned: post.isPinned || false,
      isApproved: post.isApproved ?? true,
      isEdited: true,
      editedAt: post.editedAt?.toISOString(),
      mentions: (post.mentions || []).map((m) => m.toString()),
      tags: post.tags || [],
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully',
      data: responseData,
    });

  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update post',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/groups/[groupId]/posts/[postId]
// ============================================

/**
 * DELETE /api/groups/[groupId]/posts/[postId]
 * 
 * Soft delete a post.
 * - Author can delete own post anytime
 * - Mods/admins can delete any post
 * - Sets isDeleted=true and tracks deletedBy
 * - Decrements group postCount
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * @param {string} postId - Post ID (ObjectId)
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Response:
 * @returns {Object} { success: boolean, message: string }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId, postId } = await params;

    // Validate postId
    if (!isValidObjectId(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Check authentication
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await getUserFromPhone(authPhone);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Build group query - support both ID and slug
    const groupQuery: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(groupQuery);

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get current user's membership
    const currentUserMembership = await GroupMembership.findOne({
      groupId: group._id,
      userId: currentUser._id,
      status: 'active',
    }).lean();

    if (!currentUserMembership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    const currentUserRole = currentUserMembership.role as MemberRole;
    const isModOrAdmin = hasRequiredRole(currentUserRole, 'moderator');

    // Find post
    const post = await GroupPost.findOne({
      _id: new mongoose.Types.ObjectId(postId),
      groupId: group._id,
      isDeleted: false,
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const isAuthor = post.author.toString() === currentUser._id.toString();

    // Check permissions
    if (!isAuthor && !isModOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this post' },
        { status: 403 }
      );
    }

    // Soft delete
    post.isDeleted = true;
    post.deletedBy = currentUser._id;

    await post.save();

    // Decrement group postCount (only if post was approved)
    if (post.isApproved) {
      await Group.findByIdAndUpdate(group._id, {
        $inc: { postCount: -1 },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete post',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
