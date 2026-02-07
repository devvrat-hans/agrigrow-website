import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Notification from '@/models/Notification';
import UserFeedPreference from '@/models/UserFeedPreference';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * POST /api/posts/[id]/like
 * Toggles like on a post with full functionality
 * 
 * Authentication: Required via x-user-phone header or phone in body (legacy)
 * 
 * Body:
 *   - phone: Legacy - User's phone number (prefer x-user-phone header)
 * 
 * Actions:
 *   - Toggle like on the post
 *   - Update likesCount
 *   - Recalculate engagementScore
 *   - Create Notification for post author (on like only)
 *   - Update UserFeedPreference to track interaction
 * 
 * Returns: { isLiked, likesCount, engagementScore }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    
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

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const postObjectId = new mongoose.Types.ObjectId(id);

    // Atomically toggle like to prevent duplicate likes from the same user
    let updatedPost = await Post.findOneAndUpdate(
      { _id: id, isDeleted: false, likes: user._id },
      { $pull: { likes: user._id }, $inc: { likesCount: -1 } },
      { new: true }
    );

    let isLiked = false;
    if (!updatedPost) {
      updatedPost = await Post.findOneAndUpdate(
        { _id: id, isDeleted: false, likes: { $ne: user._id } },
        { $addToSet: { likes: user._id }, $inc: { likesCount: 1 } },
        { new: true }
      );
      isLiked = true;
    }

    if (!updatedPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const newLikesCount = Math.max(0, updatedPost.likesCount || 0);

    // Create notification for post author (only on like, not unlike)
    // Don't notify if user is liking their own post
    if (isLiked && updatedPost.author.toString() !== user._id.toString()) {
      // Check if a similar notification already exists within the last hour
      const existingNotification = await Notification.findOne({
        userId: updatedPost.author,
        type: 'like',
        fromUser: user._id,
        postId: postObjectId,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      });

      if (!existingNotification) {
        const notification = new Notification({
          userId: updatedPost.author,
          type: 'like',
          fromUser: user._id,
          postId: postObjectId,
          message: `${user.fullName} liked your post`,
          metadata: {
            postExcerpt: updatedPost.content.substring(0, 100),
            postType: updatedPost.postType,
          },
          isRead: false,
          isClicked: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
        await notification.save();
      }
    }

    // Calculate and update engagement score
    const newEngagementScore = calculateEngagementScore(
      newLikesCount,
      updatedPost.commentsCount || 0,
      updatedPost.sharesCount || 0,
      updatedPost.helpfulMarksCount || 0,
      updatedPost.createdAt
    );

    await Post.findByIdAndUpdate(id, {
      $set: { engagementScore: newEngagementScore },
    });

    // Update UserFeedPreference to track this interaction
    // This helps personalize future feed recommendations
    const updateOps: Record<string, unknown> = {
      $set: { lastFeedRefresh: new Date() },
    };

    if (isLiked) {
      // User liked the post - increase interest in crops/topics
      const incrementValues: Record<string, number> = {};
      
      // Increase interest in post's crops
      if (updatedPost.crops && updatedPost.crops.length > 0) {
        updatedPost.crops.forEach((crop: string) => {
          incrementValues[`likedCrops.${crop.toLowerCase()}`] = 2; // Higher weight for likes
        });
      }
      
      // Increase interest in post type/topic
      if (updatedPost.postType) {
        incrementValues[`likedTopics.${updatedPost.postType}`] = 2;
      }
      
      if (Object.keys(incrementValues).length > 0) {
        updateOps.$inc = incrementValues;
      }
      
      // Track as viewed with interaction
      updateOps.$push = {
        viewedPosts: {
          $each: [{
            postId: postObjectId,
            viewDuration: 0,
            timestamp: new Date(),
            scrollPercentage: 100,
            interacted: true,
          }],
          $position: 0,
          $slice: 500,
        },
      };
      
      // Increase preference for this author
      updateOps.$inc = {
        ...((updateOps.$inc as Record<string, number>) || {}),
        [`preferredAuthors.${updatedPost.author.toString()}`]: 1,
      };
    }

    await UserFeedPreference.findOneAndUpdate(
      { userId: user._id },
      updateOps,
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        isLiked,
        likesCount: newLikesCount,
        engagementScore: newEngagementScore,
      },
      message: isLiked ? 'Post liked' : 'Post unliked',
    });

  } catch (error) {
    console.error('Like post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to like/unlike post. Please try again.' },
      { status: 500 }
    );
  }
}
