/**
 * New Posts Count API Route
 * 
 * GET /api/feed/new-posts-count - Get count of new posts since timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import UserFeedPreference from '@/models/UserFeedPreference';

/**
 * GET /api/feed/new-posts-count
 * Returns count of new posts since a given timestamp
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user from headers
    const userPhone = request.headers.get('x-user-phone');
    
    // Get timestamp from query params
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const category = searchParams.get('category');

    // Validate timestamp
    if (!since) {
      return NextResponse.json(
        { success: false, error: 'since timestamp is required' },
        { status: 400 }
      );
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid timestamp format' },
        { status: 400 }
      );
    }

    // Build query
    const query: Record<string, unknown> = {
      createdAt: { $gt: sinceDate },
      visibility: 'public',
    };

    // Add category filter if provided
    if (category && category !== 'all') {
      // Map category names to postType values
      const categoryToTypeMap: Record<string, string | string[]> = {
        questions: 'question',
        tips: 'tip',
        updates: ['update', 'news'],
        problems: 'problem',
        'success-stories': 'success_story',
        trending: '', // handled separately
      };

      if (category !== 'trending' && category !== 'following') {
        const postTypes = categoryToTypeMap[category];
        if (postTypes) {
          if (Array.isArray(postTypes)) {
            query.postType = { $in: postTypes };
          } else {
            query.postType = postTypes;
          }
        }
      }
    }

    // If user is authenticated, exclude hidden posts and muted users
    if (userPhone) {
      const user = await User.findOne({ phone: userPhone }).select('_id');
      if (user) {
        // Exclude user's own posts (they shouldn't trigger "new posts" banner)
        query.author = { $ne: user._id };

        // Get user feed preferences for hidden posts and muted users
        const preferences = await UserFeedPreference.findOne({ userId: user._id });
        if (preferences) {
          if (preferences.hiddenPosts && preferences.hiddenPosts.length > 0) {
            query._id = { $nin: preferences.hiddenPosts };
          }
          if (preferences.mutedUsers && preferences.mutedUsers.length > 0) {
            query.author = { 
              $nin: preferences.mutedUsers,
              $ne: user._id,
            };
          }
        }
      }
    }

    // Count new posts
    const count = await Post.countDocuments(query);

    // Get the latest post preview if there are new posts
    let latestPost = null;
    if (count > 0) {
      const latest = await Post.findOne(query)
        .sort({ createdAt: -1 })
        .select('content author postType createdAt')
        .populate('author', 'fullName profileImage role')
        .lean();

      if (latest) {
        // Type assertion for populated author
        const populatedAuthor = latest.author as { fullName?: string; profileImage?: string } | null;
        
        latestPost = {
          _id: latest._id,
          content: latest.content.substring(0, 100) + (latest.content.length > 100 ? '...' : ''),
          author: {
            name: populatedAuthor?.fullName || 'Unknown',
            avatar: populatedAuthor?.profileImage,
          },
          postType: latest.postType,
          createdAt: latest.createdAt,
        };
      }
    }

    return NextResponse.json({
      success: true,
      count,
      latestPost,
      since: sinceDate.toISOString(),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking new posts count:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check for new posts' },
      { status: 500 }
    );
  }
}
