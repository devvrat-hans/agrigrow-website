import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

/**
 * Populated author type
 */
interface PopulatedAuthor {
  _id: string;
  fullName: string;
  role: string;
  profileImage?: string;
}

/**
 * Populated post type
 */
interface PopulatedPost {
  _id: string;
  content: string;
  postType: string;
  author: PopulatedAuthor;
  images: string[];
  cropTags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  visibility: string;
  location?: string;
}

/**
 * GET /api/user/saved-posts
 * Get user's saved/bookmarked posts with full details and pagination
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * 
 * Response:
 * {
 *   success: boolean,
 *   posts: Post[],
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get user phone from header (authentication)
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Phone number required' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user by phone with savedPosts
    const user = await User.findOne({ phone: userPhone }).select('savedPosts');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Get total count of saved posts
    const savedPostIds = user.savedPosts || [];
    const total = savedPostIds.length;

    // Get paginated saved posts (reverse order - most recently saved first)
    const paginatedPostIds = savedPostIds.slice().reverse().slice(skip, skip + limit);

    // Fetch posts with author details
    const posts = await Post.find({ _id: { $in: paginatedPostIds } })
      .populate('author', '_id fullName role profileImage')
      .lean<PopulatedPost[]>();

    // Sort posts to match the order of paginatedPostIds (most recently saved first)
    const postsMap = new Map(posts.map((post) => [post._id.toString(), post]));
    const sortedPosts = paginatedPostIds
      .map((id) => postsMap.get(id.toString()))
      .filter((post): post is PopulatedPost => post !== undefined);

    // Format posts for response
    const formattedPosts = sortedPosts.map((post) => ({
      _id: post._id.toString(),
      content: post.content,
      postType: post.postType,
      author: {
        _id: post.author._id.toString(),
        name: post.author.fullName,
        role: post.author.role,
        avatar: post.author.profileImage,
      },
      images: post.images,
      cropTags: post.cropTags,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      createdAt: post.createdAt,
      visibility: post.visibility,
      location: post.location,
      isSaved: true, // All posts in this response are saved
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved posts' },
      { status: 500 }
    );
  }
}
