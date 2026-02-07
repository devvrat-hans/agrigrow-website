import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post, { PostType, PostVisibility } from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import Share from '@/models/Share';
import UserFeedPreference from '@/models/UserFeedPreference';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid post types for validation
 */
const VALID_POST_TYPES: PostType[] = ['question', 'update', 'tip', 'problem', 'success_story'];

/**
 * Valid visibility options
 */
const VALID_VISIBILITY: PostVisibility[] = ['public', 'followers', 'group'];

/**
 * GET /api/posts/[id]
 * Fetches a single post by ID with full details
 * 
 * Authentication: Optional via x-user-phone header or phone query param
 * 
 * Query params:
 *   - includeComments: Whether to include recent comments (default: true)
 *   - commentsLimit: Number of comments to include (default: 3)
 *   - phone: Legacy - Viewer's phone for tracking views (prefer x-user-phone header)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeComments = searchParams.get('includeComments') !== 'false';
    const commentsLimit = Math.min(parseInt(searchParams.get('commentsLimit') || '3'), 10);
    
    // Get authenticated user from headers or query param (legacy)
    const viewerPhone = request.headers.get('x-user-phone') || searchParams.get('phone');

    const post = await Post.findOne({ _id: id, isDeleted: false }).lean();

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Track view if viewer is authenticated
    let viewer = null;
    let isLiked = false;
    let isSaved = false;

    if (viewerPhone) {
      const cleanPhone = viewerPhone.replace(/\D/g, '');
      viewer = await User.findOne({ phone: cleanPhone }).select('_id').lean();
      
      if (viewer) {
        const viewerId = viewer._id;
        
        // Increment view count and add to unique viewers if not already viewed
        await Post.findByIdAndUpdate(id, {
          $inc: { viewsCount: 1 },
          $addToSet: { uniqueViewers: viewerId },
        });

        // Track view in UserFeedPreference for personalization
        await UserFeedPreference.findOneAndUpdate(
          { userId: viewerId },
          {
            $push: {
              viewedPosts: {
                $each: [{
                  postId: new mongoose.Types.ObjectId(id),
                  viewDuration: 0,
                  timestamp: new Date(),
                  scrollPercentage: 0,
                  interacted: false,
                }],
                $position: 0,
                $slice: 500, // Keep only last 500 viewed posts
              },
            },
            $set: { lastFeedRefresh: new Date() },
          },
          { upsert: true }
        );

        // Check if user has liked/saved this post
        isLiked = post.likes?.some((likeId: mongoose.Types.ObjectId) => 
          likeId.toString() === viewerId.toString()
        ) || false;
        
        isSaved = post.savedBy?.some((savedId: mongoose.Types.ObjectId) => 
          savedId.toString() === viewerId.toString()
        ) || false;
      }
    }

    // Get author details with badges
    const author = await User.findById(post.author)
      .select('fullName role profileImage badges experienceLevel')
      .lean();

    // Get recent comments if requested
    let recentComments: unknown[] = [];
    if (includeComments) {
      const comments = await Comment.find({
        post: id,
        parentComment: null, // Only top-level comments
        isDeleted: false,
      })
        .sort({ isHelpful: -1, likesCount: -1, createdAt: -1 })
        .limit(commentsLimit)
        .lean();

      // Fetch author details for comments
      recentComments = await Promise.all(
        comments.map(async (comment) => {
          const commentAuthor = await User.findById(comment.author)
            .select('fullName role profileImage')
            .lean();
          
          // Get reply count for this comment
          const repliesCount = await Comment.countDocuments({
            parentComment: comment._id,
            isDeleted: false,
          });

          // Check if current user liked this comment
          let commentIsLiked = false;
          if (viewer) {
            commentIsLiked = comment.likes?.some((likeId: mongoose.Types.ObjectId) =>
              likeId.toString() === viewer._id.toString()
            ) || false;
          }
          
          return {
            _id: comment._id.toString(),
            content: comment.content,
            likesCount: comment.likesCount || 0,
            repliesCount,
            isHelpful: comment.isHelpful || false,
            isEdited: comment.isEdited || false,
            isLiked: commentIsLiked,
            createdAt: comment.createdAt,
            author: commentAuthor ? {
              _id: commentAuthor._id.toString(),
              fullName: commentAuthor.fullName,
              role: commentAuthor.role,
              profileImage: commentAuthor.profileImage,
            } : {
              _id: '',
              fullName: 'Unknown User',
              role: 'farmer',
              profileImage: null,
            },
          };
        })
      );
    }

    // Check if original post exists for reposts
    let originalPostData = null;
    if (post.isRepost && post.originalPost) {
      const originalPost = await Post.findById(post.originalPost)
        .select('content author createdAt')
        .lean();
      
      if (originalPost) {
        const originalAuthor = await User.findById(originalPost.author)
          .select('fullName role profileImage')
          .lean();
        
        originalPostData = {
          _id: originalPost._id.toString(),
          content: originalPost.content,
          createdAt: originalPost.createdAt,
          author: originalAuthor ? {
            _id: originalAuthor._id.toString(),
            fullName: originalAuthor.fullName,
            role: originalAuthor.role,
            profileImage: originalAuthor.profileImage,
          } : null,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: post._id.toString(),
        content: post.content,
        postType: post.postType,
        type: post.postType, // Legacy support
        crops: post.crops || [],
        tags: post.crops || [], // Legacy support
        images: post.images || [],
        visibility: post.visibility || 'public',
        location: post.location || {},
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        viewsCount: (post.viewsCount || 0) + 1, // Include the current view
        helpfulMarksCount: post.helpfulMarksCount || 0,
        isVerified: post.isVerified || false,
        engagementScore: post.engagementScore || 0,
        isRepost: post.isRepost || false,
        isLiked,
        isSaved,
        originalPost: originalPostData,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: author ? {
          _id: author._id.toString(),
          fullName: author.fullName,
          role: author.role,
          profileImage: author.profileImage,
          badges: (author as unknown as Record<string, unknown>).badges || [],
          experienceLevel: author.experienceLevel,
        } : {
          _id: '',
          fullName: 'Unknown User',
          role: 'farmer',
          profileImage: null,
          badges: [],
          experienceLevel: 'beginner',
        },
        recentComments,
        totalComments: post.commentsCount || 0,
      },
    });

  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/posts/[id]
 * Updates a post (only by author)
 * 
 * Authentication: Required via x-user-phone header or phone in body (legacy)
 * 
 * Body:
 *   - phone: Legacy - Author's phone number (prefer x-user-phone header)
 *   - content: Updated content (optional)
 *   - postType: Updated post type (optional)
 *   - crops: Updated crop tags (optional)
 *   - images: Updated images (optional)
 *   - visibility: Updated visibility (optional)
 * 
 * Returns: Updated post with author populated
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, postType, crops, images, visibility } = body;

    // Get authenticated user from headers or body (legacy)
    const authPhone = request.headers.get('x-user-phone') || body.phone;

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Cannot update a deleted post' },
        { status: 400 }
      );
    }

    // Check if user is the author
    if (post.authorPhone !== cleanPhone) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to update this post' },
        { status: 403 }
      );
    }

    // Build update object with only allowed fields
    const updateData: Record<string, unknown> = {};

    // Update content if provided
    if (content !== undefined) {
      const trimmedContent = content.trim();
      if (trimmedContent.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Content cannot be empty' },
          { status: 400 }
        );
      }
      if (trimmedContent.length > 2000) {
        return NextResponse.json(
          { success: false, error: 'Content exceeds maximum length of 2000 characters' },
          { status: 400 }
        );
      }
      updateData.content = trimmedContent;
    }

    // Update postType if provided
    if (postType !== undefined) {
      if (!VALID_POST_TYPES.includes(postType as PostType)) {
        return NextResponse.json(
          { success: false, error: `Invalid post type. Must be one of: ${VALID_POST_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.postType = postType;
    }

    // Update crops if provided
    if (crops !== undefined) {
      if (!Array.isArray(crops)) {
        return NextResponse.json(
          { success: false, error: 'Crops must be an array' },
          { status: 400 }
        );
      }
      const processedCrops = crops
        .filter((crop: unknown): crop is string => typeof crop === 'string')
        .map((crop: string) => crop.toLowerCase().trim())
        .filter((crop: string) => crop.length > 0);
      updateData.crops = processedCrops;
      updateData.tags = processedCrops; // Keep tags in sync
    }

    // Update images if provided
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          { success: false, error: 'Images must be an array' },
          { status: 400 }
        );
      }
      if (images.length > 5) {
        return NextResponse.json(
          { success: false, error: 'Maximum 5 images allowed per post' },
          { status: 400 }
        );
      }
      // Validate each image is a string
      for (let i = 0; i < images.length; i++) {
        if (typeof images[i] !== 'string') {
          return NextResponse.json(
            { success: false, error: `Image at index ${i} is not a valid string` },
            { status: 400 }
          );
        }
      }
      updateData.images = images;
    }

    // Update visibility if provided
    if (visibility !== undefined) {
      if (!VALID_VISIBILITY.includes(visibility as PostVisibility)) {
        return NextResponse.json(
          { success: false, error: `Invalid visibility. Must be one of: ${VALID_VISIBILITY.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.visibility = visibility;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updatedPost) {
      return NextResponse.json(
        { success: false, error: 'Failed to update post' },
        { status: 500 }
      );
    }

    // Get author details
    const author = await User.findById(updatedPost.author)
      .select('fullName role profileImage badges experienceLevel')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully',
      data: {
        _id: updatedPost._id.toString(),
        content: updatedPost.content,
        postType: updatedPost.postType,
        type: updatedPost.postType, // Legacy support
        crops: updatedPost.crops || [],
        tags: updatedPost.crops || [], // Legacy support
        images: updatedPost.images || [],
        visibility: updatedPost.visibility,
        location: updatedPost.location || {},
        likesCount: updatedPost.likesCount || 0,
        commentsCount: updatedPost.commentsCount || 0,
        sharesCount: updatedPost.sharesCount || 0,
        viewsCount: updatedPost.viewsCount || 0,
        helpfulMarksCount: updatedPost.helpfulMarksCount || 0,
        isVerified: updatedPost.isVerified || false,
        engagementScore: updatedPost.engagementScore || 0,
        isRepost: updatedPost.isRepost || false,
        createdAt: updatedPost.createdAt,
        updatedAt: updatedPost.updatedAt,
        author: author ? {
          _id: author._id.toString(),
          fullName: author.fullName,
          role: author.role,
          profileImage: author.profileImage,
          badges: (author as unknown as Record<string, unknown>).badges || [],
          experienceLevel: author.experienceLevel,
        } : null,
      },
    });

  } catch (error) {
    console.error('Update post error:', error);
    
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
      { success: false, error: 'Failed to update post. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]
 * Deletes a post and all associated comments and shares (only by author)
 * 
 * Authentication: Required via x-user-phone header or phone query param (legacy)
 * 
 * Query params:
 *   - phone: Legacy - Author's phone number (prefer x-user-phone header)
 * 
 * Returns: Success message with counts of deleted related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
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
    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Post is already deleted' },
        { status: 400 }
      );
    }

    // Check if user is the author
    if (post.authorPhone !== cleanPhone) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this post' },
        { status: 403 }
      );
    }

    // Start deletion process
    const postObjectId = new mongoose.Types.ObjectId(id);

    // Delete all comments associated with the post (hard delete)
    const commentsDeleteResult = await Comment.deleteMany({ post: postObjectId });
    const deletedCommentsCount = commentsDeleteResult.deletedCount;

    // Delete all shares referencing the post (hard delete)
    const sharesDeleteResult = await Share.deleteMany({ postId: postObjectId });
    const deletedSharesCount = sharesDeleteResult.deletedCount;

    // Delete the post itself (hard delete)
    await Post.findByIdAndDelete(id);

    // Decrement user's postsCount if field exists
    const user = await User.findOne({ phone: cleanPhone });
    if (user) {
      await User.updateOne(
        { _id: user._id },
        { $inc: { postsCount: -1 } }
      ).catch(() => {
        // Field may not exist on schema, ignore error
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Post and all associated data deleted successfully',
      data: {
        deletedPostId: id,
        deletedCommentsCount,
        deletedSharesCount,
      },
    });

  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete post. Please try again.' },
      { status: 500 }
    );
  }
}
