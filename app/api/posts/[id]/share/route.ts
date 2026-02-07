import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Share, { ShareType, SharePlatform } from '@/models/Share';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid share types
 */
const VALID_SHARE_TYPES: ShareType[] = ['repost', 'external', 'message'];

/**
 * Valid share platforms
 */
const VALID_PLATFORMS: SharePlatform[] = ['whatsapp', 'facebook', 'twitter', 'link', 'other'];

/**
 * Helper function to calculate engagement score
 * Formula: (likes × 1) + (comments × 3) + (shares × 5) + (helpful × 10) / time_decay
 */
function calculateEngagementScore(
  likesCount: number,
  commentsCount: number,
  sharesCount: number,
  helpfulMarksCount: number,
  createdAt: Date
): number {
  const now = new Date();
  const postAge = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // Age in hours
  
  // Time decay factor: reduces score for older posts
  const timeDecay = Math.max(1, Math.log10(postAge + 1) + 1);
  
  const rawScore = 
    (likesCount * 1) + 
    (commentsCount * 3) + 
    (sharesCount * 5) + 
    (helpfulMarksCount * 10);
  
  return Math.round((rawScore / timeDecay) * 100) / 100;
}

/**
 * Generate a shareable URL for a post
 */
function generateShareableLink(postId: string, baseUrl: string): string {
  return `${baseUrl}/post/${postId}`;
}

/**
 * GET /api/posts/[id]/share
 * Returns shareable link and preview metadata for social sharing
 * 
 * Returns: Shareable link and preview metadata (title, excerpt, author, image)
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

    // Fetch the post
    const post = await Post.findOne({ _id: id, isDeleted: false }).lean();

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get author details
    const author = await User.findById(post.author)
      .select('fullName role profileImage')
      .lean();

    // Generate base URL from request
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'agrigrow.com';
    const baseUrl = `${protocol}://${host}`;

    // Generate shareable link
    const shareableLink = generateShareableLink(id, baseUrl);

    // Create excerpt from content (first 150 chars)
    const excerpt = post.content.length > 150 
      ? post.content.substring(0, 150) + '...'
      : post.content;

    // Create title based on post type
    let title = '';
    switch (post.postType) {
      case 'question':
        title = `Question: ${excerpt.substring(0, 60)}...`;
        break;
      case 'tip':
        title = `Farming Tip: ${excerpt.substring(0, 60)}...`;
        break;
      case 'problem':
        title = `Help Needed: ${excerpt.substring(0, 60)}...`;
        break;
      case 'success_story':
        title = `Success Story: ${excerpt.substring(0, 60)}...`;
        break;
      case 'update':
      default:
        title = excerpt.substring(0, 80);
    }

    // Get first image if available
    const image = post.images && post.images.length > 0 ? post.images[0] : null;

    return NextResponse.json({
      success: true,
      data: {
        postId: id,
        shareableLink,
        preview: {
          title,
          excerpt,
          authorName: author?.fullName || 'Agrigrow Farmer',
          authorRole: author?.role || 'farmer',
          authorImage: author?.profileImage || null,
          image,
          postType: post.postType,
          crops: post.crops || [],
          engagementStats: {
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            sharesCount: post.sharesCount || 0,
          },
          createdAt: post.createdAt,
        },
        shareUrls: {
          whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} - ${shareableLink}`)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareableLink)}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareableLink)}`,
        },
      },
    });

  } catch (error) {
    console.error('Get share info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get share information' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/[id]/share
 * Shares a post (repost, external, or message)
 * 
 * Authentication: Required via x-user-phone header or phone in body (legacy)
 * 
 * Body:
 *   - phone: Legacy - User's phone number (prefer x-user-phone header)
 *   - shareType: Type of share - 'repost', 'external', 'message' (required)
 *   - platform: For external shares - 'whatsapp', 'facebook', 'twitter', 'link', 'other' (optional)
 *   - content: Custom content for repost (optional)
 *   - recipientId: For message shares - who to send to (optional)
 * 
 * Actions:
 *   - For repost: Create new Post referencing original
 *   - For all: Create Share tracking document
 *   - Increment original post's sharesCount
 *   - Recalculate engagementScore
 *   - Create Notification for original post author
 * 
 * Returns: Share tracking info and repost details (if applicable)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    await dbConnect();

    const body = await request.json();
    const { shareType, platform, content, recipientId } = body;

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

    // Validate shareType
    if (!shareType) {
      return NextResponse.json(
        { success: false, error: 'Share type is required' },
        { status: 400 }
      );
    }

    if (!VALID_SHARE_TYPES.includes(shareType as ShareType)) {
      return NextResponse.json(
        { success: false, error: `Invalid share type. Must be one of: ${VALID_SHARE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate platform if provided
    if (platform && !VALID_PLATFORMS.includes(platform as SharePlatform)) {
      return NextResponse.json(
        { success: false, error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate recipientId for message shares
    if (shareType === 'message' && recipientId) {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid recipient ID' },
          { status: 400 }
        );
      }
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    // Get the original post
    const originalPost = await Post.findOne({ _id: id, isDeleted: false });

    if (!originalPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const postObjectId = new mongoose.Types.ObjectId(id);
    let repostData = null;

    // Handle repost type
    if (shareType === 'repost') {
      // Check if user already reposted this
      const existingRepost = await Post.findOne({
        author: user._id,
        originalPost: postObjectId,
        isRepost: true,
        isDeleted: false,
      });

      if (existingRepost) {
        return NextResponse.json(
          { success: false, error: 'You have already reposted this post' },
          { status: 400 }
        );
      }

      // Create repost
      const repostContent = content || `Reposted from ${(await User.findById(originalPost.author).select('fullName').lean())?.fullName || 'a farmer'}`;

      const repost = new Post({
        author: user._id,
        authorPhone: cleanPhone,
        content: repostContent,
        postType: originalPost.postType,
        crops: originalPost.crops,
        tags: originalPost.crops,
        images: [], // Reposts don't copy images, they reference original
        visibility: 'public',
        location: {
          state: user.state,
          district: user.district,
        },
        // Initialize engagement fields
        likes: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        savedBy: [],
        isVerified: false,
        engagementScore: 0,
        viewsCount: 0,
        uniqueViewers: [],
        helpfulMarksCount: 0,
        // Repost specific fields
        isRepost: true,
        originalPost: postObjectId,
        isDeleted: false,
      });

      await repost.save();

      // Get original author details
      const originalAuthor = await User.findById(originalPost.author)
        .select('fullName role profileImage')
        .lean();

      repostData = {
        _id: repost._id.toString(),
        content: repost.content,
        postType: repost.postType,
        crops: repost.crops,
        isRepost: true,
        originalPost: {
          _id: originalPost._id.toString(),
          content: originalPost.content,
          author: originalAuthor ? {
            _id: originalAuthor._id.toString(),
            fullName: originalAuthor.fullName,
            role: originalAuthor.role,
            profileImage: originalAuthor.profileImage,
          } : null,
          createdAt: originalPost.createdAt,
        },
        author: {
          _id: user._id.toString(),
          fullName: user.fullName,
          role: user.role,
          profileImage: user.profileImage,
        },
        createdAt: repost.createdAt,
      };
    }

    // Create Share tracking document
    const share = new Share({
      postId: postObjectId,
      sharedBy: user._id,
      shareType,
      platform: platform || (shareType === 'external' ? 'other' : undefined),
      repostId: repostData ? new mongoose.Types.ObjectId(repostData._id) : undefined,
      recipientId: recipientId ? new mongoose.Types.ObjectId(recipientId) : undefined,
    });

    await share.save();

    // Increment original post's sharesCount
    const newSharesCount = (originalPost.sharesCount || 0) + 1;
    
    // Recalculate engagement score
    const newEngagementScore = calculateEngagementScore(
      originalPost.likesCount || 0,
      originalPost.commentsCount || 0,
      newSharesCount,
      originalPost.helpfulMarksCount || 0,
      originalPost.createdAt
    );

    await Post.findByIdAndUpdate(id, {
      $inc: { sharesCount: 1 },
      $set: { engagementScore: newEngagementScore },
    });

    // Create notification for original post author (if not sharing own post)
    if (originalPost.author.toString() !== user._id.toString()) {
      const notificationType = shareType === 'repost' ? 'repost' : 'share';
      const message = shareType === 'repost'
        ? `${user.fullName} reposted your post`
        : `${user.fullName} shared your post`;

      const notification = new Notification({
        userId: originalPost.author,
        type: notificationType,
        fromUser: user._id,
        postId: postObjectId,
        message,
        metadata: {
          postExcerpt: originalPost.content.substring(0, 100),
          postType: originalPost.postType,
          shareType,
          platform: platform || null,
        },
        isRead: false,
        isClicked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      await notification.save();
    }

    // Generate shareable link
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'agrigrow.com';
    const baseUrl = `${protocol}://${host}`;
    const shareableLink = generateShareableLink(id, baseUrl);

    return NextResponse.json({
      success: true,
      message: shareType === 'repost' ? 'Post reposted successfully' : 'Post shared successfully',
      data: {
        share: {
          _id: share._id.toString(),
          shareType,
          platform: share.platform || null,
          shareableLink,
          createdAt: share.createdAt,
        },
        repost: repostData,
        originalPost: {
          _id: originalPost._id.toString(),
          sharesCount: newSharesCount,
          engagementScore: newEngagementScore,
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Share post error:', error);
    
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
      { success: false, error: 'Failed to share post. Please try again.' },
      { status: 500 }
    );
  }
}
