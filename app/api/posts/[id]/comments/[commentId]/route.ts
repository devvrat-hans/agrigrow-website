import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

/**
 * Edit window in minutes - comments can only be edited within this time
 */
const EDIT_WINDOW_MINUTES = 15;

/**
 * GET /api/posts/[id]/comments/[commentId]
 * Fetches a single comment by ID
 * 
 * Authentication: Optional via x-user-phone header (for isLiked status)
 * 
 * Returns: Comment with author populated
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, commentId } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid comment ID' },
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

    // Fetch the comment
    const comment = await Comment.findOne({
      _id: commentId,
      post: id,
      isDeleted: false,
    }).lean();

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Get authenticated user for isLiked status
    const authPhone = request.headers.get('x-user-phone');
    let currentUser: { _id: mongoose.Types.ObjectId } | null = null;
    let isLiked = false;
    
    if (authPhone) {
      const cleanPhone = authPhone.replace(/\D/g, '');
      currentUser = await User.findOne({ phone: cleanPhone }).select('_id').lean();
      
      if (currentUser) {
        isLiked = comment.likes?.some((likeId: mongoose.Types.ObjectId) =>
          likeId.toString() === currentUser!._id.toString()
        ) || false;
      }
    }

    // Get author details
    const author = await User.findById(comment.author)
      .select('fullName role profileImage')
      .lean();

    // Get replies count
    const repliesCount = await Comment.countDocuments({
      parentComment: commentId,
      isDeleted: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: comment._id.toString(),
        content: comment.content,
        likesCount: comment.likesCount || 0,
        repliesCount,
        isHelpful: comment.isHelpful || false,
        isEdited: comment.isEdited || false,
        isLiked,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
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
      },
    });

  } catch (error) {
    console.error('Get comment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comment' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/posts/[id]/comments/[commentId]
 * Updates a comment (only by author, within edit window)
 * 
 * Authentication: Required via x-user-phone header or phone in body (legacy)
 * 
 * Body:
 *   - phone: Legacy - Author's phone number (prefer x-user-phone header)
 *   - content: Updated content, 1-1000 chars (required)
 * 
 * Constraints:
 *   - Only comment author can edit
 *   - Edit window: 15 minutes from creation
 * 
 * Returns: Updated comment with author populated
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, commentId } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    // Get authenticated user from headers or body (legacy)
    const authPhone = request.headers.get('x-user-phone') || body.phone;

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
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
    const postExists = await Post.exists({ _id: id, isDeleted: false });
    if (!postExists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Fetch the comment
    const comment = await Comment.findOne({
      _id: commentId,
      post: id,
      isDeleted: false,
    });

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Verify user is the comment author
    if (comment.author.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to edit this comment' },
        { status: 403 }
      );
    }

    // Check edit window (15 minutes from creation)
    const createdAt = new Date(comment.createdAt);
    const now = new Date();
    const timeDiffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (timeDiffMinutes > EDIT_WINDOW_MINUTES) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Comments can only be edited within ${EDIT_WINDOW_MINUTES} minutes of creation` 
        },
        { status: 400 }
      );
    }

    // Update the comment
    comment.content = trimmedContent;
    comment.isEdited = true;
    await comment.save();

    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        _id: comment._id.toString(),
        content: comment.content,
        likesCount: comment.likesCount || 0,
        repliesCount: comment.repliesCount || 0,
        isHelpful: comment.isHelpful || false,
        isEdited: true,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          _id: user._id.toString(),
          fullName: user.fullName,
          role: user.role,
          profileImage: user.profileImage,
        },
      },
    });

  } catch (error) {
    console.error('Update comment error:', error);
    
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
      { success: false, error: 'Failed to update comment. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/comments/[commentId]
 * Deletes a comment (by author or post author)
 * 
 * Authentication: Required via x-user-phone header or phone query param (legacy)
 * 
 * Constraints:
 *   - Only comment author or post author can delete
 *   - If comment has replies, all replies are deleted as well
 * 
 * Returns: Success message with deleted counts
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, commentId } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    // Get authenticated user from headers or query param (legacy)
    const { searchParams } = new URL(request.url);
    const authPhone = request.headers.get('x-user-phone') || searchParams.get('phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
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

    // Check if post exists and get post author
    const post = await Post.findOne({ _id: id, isDeleted: false });
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Fetch the comment
    const comment = await Comment.findOne({
      _id: commentId,
      post: id,
      isDeleted: false,
    });

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Verify user is the comment author OR the post author
    const isCommentAuthor = comment.author.toString() === user._id.toString();
    const isPostAuthor = post.author.toString() === user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this comment' },
        { status: 403 }
      );
    }

    // Count replies before deletion
    const repliesCount = await Comment.countDocuments({
      parentComment: commentId,
      isDeleted: false,
    });

    // Delete all replies if this is a top-level comment
    let deletedRepliesCount = 0;
    if (!comment.parentComment && repliesCount > 0) {
      const deleteResult = await Comment.deleteMany({
        parentComment: commentId,
      });
      deletedRepliesCount = deleteResult.deletedCount;
    }

    // Delete the comment itself
    await Comment.findByIdAndDelete(commentId);

    // Update post's commentsCount (decrement by 1 + replies count)
    const totalDeletedComments = 1 + deletedRepliesCount;
    await Post.findByIdAndUpdate(id, {
      $inc: { commentsCount: -totalDeletedComments }
    });

    // If this was a reply, decrement parent comment's repliesCount
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $inc: { repliesCount: -1 }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
      data: {
        deletedCommentId: commentId,
        deletedRepliesCount,
        totalDeleted: totalDeletedComments,
      },
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment. Please try again.' },
      { status: 500 }
    );
  }
}
