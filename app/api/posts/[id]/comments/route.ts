import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Sort options for comments
 */
type CommentSortBy = 'newest' | 'oldest' | 'helpful';

/**
 * GET /api/posts/[id]/comments
 * Fetches comments for a post with enhanced sorting and reply support
 * 
 * Authentication: Optional via x-user-phone header (for isLiked status)
 * 
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 50)
 *   - sortBy: Sort order - 'newest', 'oldest', 'helpful' (default: 'newest')
 *   - includeReplies: Whether to include nested replies (default: true)
 *   - repliesLimit: Number of replies per comment (default: 2, max: 5)
 *   - cursor: Last comment ID for cursor-based pagination
 * 
 * Returns: Comments with author populated, hasMore, nextCursor
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const sortBy = (searchParams.get('sortBy') || 'newest') as CommentSortBy;
    const includeReplies = searchParams.get('includeReplies') !== 'false';
    const repliesLimit = Math.min(parseInt(searchParams.get('repliesLimit') || '2'), 5);
    const cursor = searchParams.get('cursor');
    
    // Get authenticated user for isLiked status
    const authPhone = request.headers.get('x-user-phone');
    let currentUser: { _id: mongoose.Types.ObjectId } | null = null;
    
    if (authPhone) {
      const cleanPhone = authPhone.replace(/\D/g, '');
      currentUser = await User.findOne({ phone: cleanPhone }).select('_id').lean();
    }
    
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Check if post exists
    const postExists = await Post.exists({ _id: id, isDeleted: false });
    if (!postExists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Build query
    const query: Record<string, unknown> = { 
      post: id, 
      parentComment: null, // Only top-level comments
      isDeleted: false,
    };

    // Cursor-based pagination
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Determine sort order
    let sortQuery: Record<string, 1 | -1>;
    switch (sortBy) {
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'helpful':
        sortQuery = { isHelpful: -1, likesCount: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortQuery = { createdAt: -1 };
    }

    // Fetch top-level comments
    const comments = await Comment.find(query)
      .sort(sortQuery)
      .skip(cursor ? 0 : skip)
      .limit(limit + 1)
      .lean();

    // Check if there are more comments
    const hasMore = comments.length > limit;
    const commentsToReturn = hasMore ? comments.slice(0, limit) : comments;

    // Get total count for offset pagination
    const total = cursor ? null : await Comment.countDocuments({ 
      post: id, 
      parentComment: null,
      isDeleted: false 
    });

    // Fetch author details and replies for each comment
    const commentsWithDetails = await Promise.all(
      commentsToReturn.map(async (comment) => {
        // Get author details
        const author = await User.findById(comment.author)
          .select('fullName role profileImage')
          .lean();

        // Check if current user liked this comment
        let isLiked = false;
        if (currentUser) {
          isLiked = comment.likes?.some((likeId: mongoose.Types.ObjectId) =>
            likeId.toString() === currentUser._id.toString()
          ) || false;
        }

        // Get replies if requested
        let replies: unknown[] = [];
        let totalReplies = comment.repliesCount || 0;
        
        if (includeReplies && totalReplies > 0) {
          const replyDocs = await Comment.find({
            parentComment: comment._id,
            isDeleted: false,
          })
            .sort({ createdAt: 1 }) // Replies shown oldest first
            .limit(repliesLimit)
            .lean();

          replies = await Promise.all(
            replyDocs.map(async (reply) => {
              const replyAuthor = await User.findById(reply.author)
                .select('fullName role profileImage')
                .lean();
              
              // Check if current user liked this reply
              let replyIsLiked = false;
              if (currentUser) {
                replyIsLiked = reply.likes?.some((likeId: mongoose.Types.ObjectId) =>
                  likeId.toString() === currentUser._id.toString()
                ) || false;
              }
              
              return {
                _id: reply._id.toString(),
                content: reply.content,
                likesCount: reply.likesCount || 0,
                isHelpful: reply.isHelpful || false,
                isEdited: reply.isEdited || false,
                isLiked: replyIsLiked,
                createdAt: reply.createdAt,
                author: replyAuthor ? {
                  _id: replyAuthor._id.toString(),
                  fullName: replyAuthor.fullName,
                  role: replyAuthor.role,
                  profileImage: replyAuthor.profileImage,
                } : {
                  _id: '',
                  fullName: 'Unknown User',
                  role: 'farmer',
                  profileImage: null,
                },
              };
            })
          );

          // Recount to ensure accuracy
          totalReplies = await Comment.countDocuments({
            parentComment: comment._id,
            isDeleted: false,
          });
        }

        return {
          _id: comment._id.toString(),
          content: comment.content,
          likesCount: comment.likesCount || 0,
          repliesCount: totalReplies,
          isHelpful: comment.isHelpful || false,
          isEdited: comment.isEdited || false,
          isLiked,
          createdAt: comment.createdAt,
          author: author ? {
            _id: author._id.toString(),
            fullName: author.fullName,
            role: author.role,
            profileImage: author.profileImage,
          } : {
            _id: '',
            fullName: 'Unknown User',
            role: 'farmer',
            profileImage: null,
          },
          replies,
          hasMoreReplies: totalReplies > repliesLimit,
        };
      })
    );

    // Build next cursor for pagination
    const nextCursor = hasMore && commentsToReturn.length > 0
      ? commentsToReturn[commentsToReturn.length - 1]._id?.toString()
      : null;

    return NextResponse.json({
      success: true,
      data: commentsWithDetails,
      pagination: {
        page: cursor ? null : page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : null,
      },
      hasMore,
      nextCursor,
    });

  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/[id]/comments
 * Creates a new comment on a post with notifications
 * 
 * Authentication: Required via x-user-phone header or phone in body (legacy)
 * 
 * Body:
 *   - phone: Legacy - Author's phone number (prefer x-user-phone header)
 *   - content: Comment content, 1-1000 chars (required)
 *   - parentCommentId: Parent comment ID for replies (optional)
 * 
 * Actions:
 *   - Create Comment document
 *   - Increment post's commentsCount
 *   - Create Notification for post author
 *   - Create Notification for parent comment author (if reply)
 * 
 * Returns: Created comment with author populated (201 status)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    await dbConnect();

    const body = await request.json();
    const { content, parentCommentId } = body;

    // Get authenticated user from headers or body (legacy)
    const authPhone = request.headers.get('x-user-phone') || body.phone;

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Validate content is provided
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate content length
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1) {
      return NextResponse.json(
        { success: false, error: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Comment exceeds maximum length of 1000 characters' },
        { status: 400 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    // Check if post exists
    const post = await Post.findOne({ _id: id, isDeleted: false });
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    let parentComment = null;
    let isReply = false;
    const postObjectId = new mongoose.Types.ObjectId(id);

    // If it's a reply, validate parent comment
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent comment ID' },
          { status: 400 }
        );
      }

      parentComment = await Comment.findOne({ 
        _id: parentCommentId, 
        post: id, // Ensure parent comment belongs to same post
        isDeleted: false 
      });
      
      if (!parentComment) {
        return NextResponse.json(
          { success: false, error: 'Parent comment not found' },
          { status: 404 }
        );
      }

      // Prevent deep nesting - only allow replies to top-level comments
      if (parentComment.parentComment) {
        return NextResponse.json(
          { success: false, error: 'Cannot reply to a reply. Please reply to the original comment.' },
          { status: 400 }
        );
      }

      isReply = true;
    }

    // Create new comment with enhanced fields
    const newComment = new Comment({
      post: id,
      author: user._id,
      authorPhone: cleanPhone,
      content: trimmedContent,
      parentComment: parentCommentId || null,
      likes: [],
      likesCount: 0,
      repliesCount: 0,
      isHelpful: false,
      mentions: [], // TODO: Extract mentions from content
      isEdited: false,
      isDeleted: false,
    });

    await newComment.save();

    // Update parent comment's reply count if this is a reply
    if (isReply && parentComment) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $inc: { repliesCount: 1 }
      });
    }

    // Update post's comment count
    await Post.findByIdAndUpdate(id, {
      $inc: { commentsCount: 1 }
    });

    // Create notification for post author (if not commenting on own post)
    if (post.author.toString() !== user._id.toString()) {
      const postNotification = new Notification({
        userId: post.author,
        type: 'comment',
        fromUser: user._id,
        postId: postObjectId,
        commentId: newComment._id,
        message: `${user.fullName} commented on your post`,
        metadata: {
          postExcerpt: post.content.substring(0, 100),
          commentExcerpt: trimmedContent.substring(0, 100),
          postType: post.postType,
        },
        isRead: false,
        isClicked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      await postNotification.save();
    }

    // Create notification for parent comment author if this is a reply
    if (isReply && parentComment && parentComment.author.toString() !== user._id.toString()) {
      // Don't notify if the parent comment author is the same as post author (they already got a notification)
      // or if the user is replying to their own comment
      const parentCommentAuthorId = parentComment.author.toString();
      const postAuthorId = post.author.toString();
      
      // Only send reply notification if parent comment author is different from post author
      // (they didn't already get a comment notification)
      if (parentCommentAuthorId !== postAuthorId || parentCommentAuthorId === user._id.toString()) {
        const replyNotification = new Notification({
          userId: parentComment.author,
          type: 'reply',
          fromUser: user._id,
          postId: postObjectId,
          commentId: newComment._id,
          message: `${user.fullName} replied to your comment`,
          metadata: {
            parentCommentExcerpt: parentComment.content.substring(0, 100),
            replyExcerpt: trimmedContent.substring(0, 100),
            postType: post.postType,
          },
          isRead: false,
          isClicked: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
        await replyNotification.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        _id: newComment._id.toString(),
        content: newComment.content,
        likesCount: 0,
        repliesCount: 0,
        isHelpful: false,
        isEdited: false,
        isLiked: false,
        isReply,
        parentCommentId: parentCommentId || null,
        createdAt: newComment.createdAt,
        author: {
          _id: user._id.toString(),
          fullName: user.fullName,
          role: user.role,
          profileImage: user.profileImage,
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create comment error:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { success: false, error: 'Validation error: ' + error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create comment. Please try again.' },
      { status: 500 }
    );
  }
}
