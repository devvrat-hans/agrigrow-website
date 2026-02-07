/**
 * Group Posts API Route
 * 
 * API endpoint for managing group posts.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/posts - List group posts
 * - POST /api/groups/[groupId]/posts - Create a new post
 * 
 * Authentication:
 * - GET: Optional (but needed for isLiked status)
 * - POST: Required via x-user-phone header
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import User from '@/models/User';
import { GroupPostData, MemberRole, GroupPostType } from '@/types/group';

// ============================================
// CONSTANTS
// ============================================

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

const VALID_POST_TYPES: GroupPostType[] = ['discussion', 'question', 'announcement', 'poll', 'resource'];

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
 * Format: @username or @fullname (words separated by space until next @, punctuation, or newline)
 * Returns array of mentioned usernames
 */
function parseMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = content.match(mentionRegex);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.substring(1)))]; // Remove @ and deduplicate
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

interface PollOption {
  text: string;
  votes: number;
}

// ============================================
// GET /api/groups/[groupId]/posts
// ============================================

/**
 * GET /api/groups/[groupId]/posts
 * 
 * List posts in a group with pagination and filtering.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Query Parameters:
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 50)
 * @query {string} postType - Filter by post type
 * @query {boolean} pinnedOnly - Only show pinned posts
 * 
 * Headers:
 * @header {string} x-user-phone - Optional, for isLiked status
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupPostData[], pagination: {...} }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;

    // Build group query - support both ID and slug
    const groupQuery: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(groupQuery)
      .select('_id name slug privacy settings isActive')
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const postType = searchParams.get('postType') as GroupPostType | null;
    const pinnedOnly = searchParams.get('pinnedOnly') === 'true';

    // Build query
    const query: Record<string, unknown> = {
      groupId: group._id,
      isDeleted: false,
    };

    // Filter by post type
    if (postType && VALID_POST_TYPES.includes(postType)) {
      query.postType = postType;
    }

    // Only show pinned posts if requested
    if (pinnedOnly) {
      query.isPinned = true;
    }

    // If group requires approval and user is not mod/admin, only show approved posts
    if (group.settings?.requirePostApproval && !isModOrAdmin) {
      query.isApproved = true;
    }

    // Count total
    const total = await GroupPost.countDocuments(query);

    // Fetch posts - sort by isPinned descending, then createdAt descending
    const posts = await GroupPost.find(query)
      .populate('author', 'fullName profileImage role region')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Format response
    const formattedPosts: GroupPostData[] = posts.map((post) => {
      const authorData = post.author as unknown as Record<string, unknown> | null;
      
      // Check if current user liked this post
      const isLiked = currentUser 
        ? (post.likes || []).some((likeId: mongoose.Types.ObjectId) => 
            likeId.toString() === currentUser._id.toString()
          )
        : false;

      // Format poll if exists
      let pollData = undefined;
      if (post.postType === 'poll' && post.poll) {
        const pollVoterIds = post.poll.voterIds || [];
        const hasVoted = currentUser
          ? pollVoterIds.some((voterId: mongoose.Types.ObjectId) =>
              voterId.toString() === currentUser._id.toString()
            )
          : false;

        const _totalVotes = (post.poll.options || []).reduce(
          (sum: number, opt: PollOption) => sum + (opt.votes || 0), 0
        );

        pollData = {
          question: post.poll.question,
          options: (post.poll.options || []).map((opt: PollOption) => ({
            text: opt.text,
            votes: opt.votes || 0,
          })),
          endDate: post.poll.endDate ? new Date(post.poll.endDate).toISOString() : undefined,
          voterCount: pollVoterIds.length,
          hasVoted,
        };
      }

      return {
        _id: post._id.toString(),
        groupId: post.groupId.toString(),
        author: authorData?._id?.toString() || '',
        authorInfo: authorData ? {
          _id: authorData._id?.toString() || '',
          fullName: (authorData.fullName as string) || 'Unknown User',
          profileImage: authorData.profileImage as string | undefined,
          role: authorData.role as string | undefined,
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
        editedAt: post.editedAt ? new Date(post.editedAt).toISOString() : undefined,
        mentions: (post.mentions || []).map((m: mongoose.Types.ObjectId) => m.toString()),
        tags: post.tags || [],
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching group posts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/groups/[groupId]/posts
// ============================================

/**
 * POST /api/groups/[groupId]/posts
 * 
 * Create a new post in the group.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {string} content - Post content (required)
 * @body {string} postType - Post type (default: discussion)
 * @body {string[]} images - Array of image URLs (optional)
 * @body {Object[]} attachments - Array of attachments (optional)
 * @body {Object} poll - Poll data if postType is 'poll' (optional)
 * @body {string[]} tags - Array of tags (optional)
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupPostData }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;

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
        { success: false, error: 'You must be a member to create posts' },
        { status: 403 }
      );
    }

    const currentUserRole = currentUserMembership.role as MemberRole;
    const isModOrAdmin = hasRequiredRole(currentUserRole, 'moderator');

    // Check if member posts are allowed
    if (!group.settings?.allowMemberPosts && !isModOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only moderators and admins can create posts in this group' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, postType = 'discussion', images, poll, tags } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post content is required' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Post content cannot exceed 10000 characters' },
        { status: 400 }
      );
    }

    // Validate post type
    if (!VALID_POST_TYPES.includes(postType)) {
      return NextResponse.json(
        { success: false, error: `Invalid post type. Must be one of: ${VALID_POST_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate announcement post type (only mod/admin)
    if (postType === 'announcement' && !isModOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only moderators and admins can create announcements' },
        { status: 403 }
      );
    }

    // Validate poll
    let pollData = undefined;
    if (postType === 'poll') {
      // Check if polls are allowed
      if (!group.settings?.allowPolls) {
        return NextResponse.json(
          { success: false, error: 'Polls are not allowed in this group' },
          { status: 403 }
        );
      }

      if (!poll || !poll.question || !Array.isArray(poll.options) || poll.options.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Poll must have a question and at least 2 options' },
          { status: 400 }
        );
      }

      if (poll.options.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Poll cannot have more than 10 options' },
          { status: 400 }
        );
      }

      // Format poll options - match the IPollData schema
      pollData = {
        question: poll.question,
        options: poll.options.map((opt: string | { text: string }) => ({
          text: typeof opt === 'string' ? opt : opt.text,
          votes: 0,
        })),
        endDate: poll.endDate ? new Date(poll.endDate) : undefined,
        voterIds: [],
      };
    }

    // Validate images
    if (images && !group.settings?.allowImages && !isModOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'Images are not allowed in this group' },
        { status: 403 }
      );
    }

    // Parse mentions from content
    const mentions = parseMentions(content);

    // Determine if post needs approval
    const needsApproval = group.settings?.requirePostApproval && !isModOrAdmin;

    // Create the post
    const newPost = new GroupPost({
      groupId: group._id,
      author: currentUser._id,
      postType,
      content: content.trim(),
      images: images || [],
      poll: pollData,
      mentions,
      tags: tags || [],
      likesCount: 0,
      commentsCount: 0,
      likes: [],
      isPinned: false,
      isApproved: !needsApproval,
      isEdited: false,
      isDeleted: false,
    });

    await newPost.save();

    // Increment group post count (only for approved posts or if no approval needed)
    if (!needsApproval) {
      await Group.findByIdAndUpdate(group._id, {
        $inc: { postCount: 1 },
      });
    }

    // Update user's last activity in membership
    await GroupMembership.findOneAndUpdate(
      { groupId: group._id, userId: currentUser._id },
      { lastActivityAt: new Date() }
    );

    // Populate author for response
    await newPost.populate('author', 'fullName profileImage role region');

    const authorData = newPost.author as unknown as Record<string, unknown>;

    const responseData: GroupPostData = {
      _id: newPost._id.toString(),
      groupId: newPost.groupId.toString(),
      author: authorData?._id?.toString() || '',
      authorInfo: {
        _id: authorData._id?.toString() || '',
        fullName: (authorData.fullName as string) || '',
        profileImage: authorData.profileImage as string | undefined,
        role: authorData.role as string | undefined,
      },
      postType: newPost.postType as GroupPostType,
      content: newPost.content,
      images: newPost.images || [],
      poll: pollData ? {
        question: pollData.question,
        options: pollData.options.map((opt: { text: string }) => ({
          text: opt.text,
          votes: 0,
        })),
        endDate: pollData.endDate?.toISOString(),
        voterCount: 0,
        hasVoted: false,
      } : undefined,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isPinned: false,
      isApproved: newPost.isApproved,
      isEdited: false,
      mentions: (newPost.mentions || []).map((m: mongoose.Types.ObjectId) => m.toString()),
      tags: newPost.tags || [],
      createdAt: newPost.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: newPost.updatedAt?.toISOString() || new Date().toISOString(),
    };

    const message = needsApproval
      ? 'Post created and is pending approval'
      : 'Post created successfully';

    return NextResponse.json({
      success: true,
      message,
      data: responseData,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create post',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
