/**
 * Search API Route
 *
 * Searches users and posts by a text query.
 * Returns up to 5 users and 5 posts matching the query.
 *
 * GET /api/search?q=<query>
 * Headers: x-user-phone (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';

export async function GET(request: NextRequest) {
  try {
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        posts: [],
      });
    }

    await dbConnect();

    // Escape special regex characters
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    // Search users by name
    const users = await User.find({
      fullName: regex,
    })
      .select('fullName phone role profileImage bio')
      .limit(5)
      .lean();

    // Search posts by content or tags
    const posts = await Post.find({
      $or: [
        { content: regex },
        { tags: regex },
      ],
      isDeleted: { $ne: true },
    })
      .select('content author tags postType createdAt')
      .populate('author', 'fullName phone profileImage role')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        _id: String(u._id),
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        profileImage: u.profileImage || null,
        bio: u.bio || '',
      })),
      posts: posts.map((p) => {
        const author = p.author as unknown as Record<string, unknown> | null;
        return {
          _id: String(p._id),
          content: typeof p.content === 'string' ? p.content.substring(0, 120) : '',
          postType: p.postType,
          tags: p.tags || [],
          createdAt: p.createdAt,
          author: author
            ? {
                fullName: author.fullName,
                profileImage: author.profileImage || null,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search' },
      { status: 500 }
    );
  }
}
