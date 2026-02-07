import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Post, { PostType, PostVisibility, PostCategory, IImageMeta } from '@/models/Post';
import User from '@/models/User';
import UserFeedPreference from '@/models/UserFeedPreference';
import { buildFeedAggregationPipeline } from '@/lib/feed-algorithm';
import {
  validateBase64Image,
  isBase64DataUrl,
  isImageUrl,
  estimateBase64Size,
  extractMimeTypeFromDataUrl,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/base64-image';

/**
 * Valid post types for filtering
 */
const VALID_POST_TYPES: PostType[] = ['question', 'update', 'tip', 'problem', 'success_story'];

/**
 * Valid visibility options
 */
const VALID_VISIBILITY: PostVisibility[] = ['public', 'followers', 'group'];

/**
 * Valid post categories
 */
const VALID_CATEGORIES: PostCategory[] = [
  'organic_farming',
  'equipment_machinery',
  'fertilizer_pesticides',
  'animal_husbandry',
  'agri_business_news',
  'agriculture_practices',
  'market_prices',
  'food_processing',
  'general',
];

/**
 * GET /api/posts
 * Fetches personalized feed with the recommendation algorithm
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10)
 *   - postType/category: Filter by post type (question, update, tip, problem, success_story)
 *   - type: Legacy support - maps to postType
 *   - phone: Get posts by specific user phone
 *   - crop: Filter by crop tag
 *   - state: Filter by location state
 *   - cursor: Last post ID for cursor-based pagination
 *   - sortBy: Sort option (newest, engagement, personalized)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 per request
    const postType = searchParams.get('postType') || searchParams.get('category') || searchParams.get('type');
    const phone = searchParams.get('phone');
    const crop = searchParams.get('crop');
    const state = searchParams.get('state');
    const cursor = searchParams.get('cursor');
    const sortBy = searchParams.get('sortBy') || 'personalized';

    // Get authenticated user from headers
    const authPhone = request.headers.get('x-user-phone');
    let currentUser = null;
    let feedPreferences = null;

    if (authPhone) {
      const cleanAuthPhone = authPhone.replace(/\D/g, '');
      currentUser = await User.findOne({ phone: cleanAuthPhone }).lean();
      
      if (currentUser) {
        // Get or create feed preferences
        feedPreferences = await UserFeedPreference.findOne({ 
          userId: currentUser._id 
        }).lean();
      }
    }

    const skip = (page - 1) * limit;

    // If requesting personalized feed with authenticated user, use the feed algorithm
    if (currentUser && sortBy === 'personalized' && !phone) {
      return await getPersonalizedFeed(
        currentUser as unknown as Record<string, unknown>,
        feedPreferences as unknown as Record<string, unknown> | null,
        {
          cursor,
          limit,
          category: postType as PostType || undefined,
          crop: crop || undefined,
        }
      );
    }

    // Otherwise, fall back to simple query-based feed
    // Build query
    const query: Record<string, unknown> = { 
      isDeleted: { $ne: true },
      visibility: 'public',
    };

    // Apply hidden posts and muted users if user is authenticated
    if (feedPreferences) {
      if (feedPreferences.hiddenPosts && feedPreferences.hiddenPosts.length > 0) {
        query._id = { $nin: feedPreferences.hiddenPosts };
      }
      if (feedPreferences.mutedUsers && feedPreferences.mutedUsers.length > 0) {
        query.author = { $nin: feedPreferences.mutedUsers };
      }
    }
    
    // Filter by post type
    if (postType && postType !== 'all') {
      // Map legacy types to new types
      const typeMapping: Record<string, PostType> = {
        'post': 'update',
        'news': 'update',
        'technique': 'tip',
        'technology': 'tip',
      };
      const mappedType = typeMapping[postType] || postType;
      
      if (VALID_POST_TYPES.includes(mappedType as PostType)) {
        query.postType = mappedType;
      }
    }
    
    // Filter by author phone
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      query.authorPhone = cleanPhone;
      // Allow seeing own posts regardless of visibility when filtering by phone
      delete query.visibility;
    }

    // Filter by crop
    if (crop) {
      query.crops = { $in: [crop.toLowerCase()] };
    }

    // Filter by location state
    if (state) {
      query['location.state'] = state;
    }

    // Cursor-based pagination
    if (cursor) {
      query._id = { 
        ...((query._id as Record<string, unknown>) || {}),
        $lt: new mongoose.Types.ObjectId(cursor),
      };
    }

    // Determine sort order
    const sortQuery: Record<string, 1 | -1> = 
      sortBy === 'engagement' 
        ? { engagementScore: -1, createdAt: -1 }
        : { createdAt: -1 };

    // Fetch posts with author details
    const posts = await Post.find(query)
      .sort(sortQuery)
      .skip(cursor ? 0 : skip) // Don't skip if using cursor
      .limit(limit + 1) // Fetch one extra to check hasMore
      .lean();

    // Check if there are more posts
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

    // Get total count for offset pagination (skip if cursor pagination)
    const total = cursor ? null : await Post.countDocuments(query);

    // Fetch author details for each post
    const postsWithAuthors = await Promise.all(
      postsToReturn.map(async (post) => {
        const author = await User.findById(post.author)
          .select('fullName role profileImage badges experienceLevel')
          .lean();
        
        // Check if current user has liked the post
        const isLiked = currentUser 
          ? post.likes?.some((likeId: mongoose.Types.ObjectId) => 
              likeId.toString() === currentUser._id.toString()
            )
          : false;

        // Check if current user has saved the post
        const isSaved = currentUser
          ? post.savedBy?.some((saveId: mongoose.Types.ObjectId) =>
              saveId.toString() === currentUser._id.toString()
            )
          : false;
        
        return {
          _id: post._id.toString(),
          content: post.content,
          images: post.images || [],
          postType: post.postType,
          type: post.postType, // Legacy support
          crops: post.crops || [],
          tags: post.crops || [], // Legacy support
          location: post.location,
          visibility: post.visibility,
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          sharesCount: post.sharesCount || 0,
          isVerified: post.isVerified || false,
          engagementScore: post.engagementScore || 0,
          viewsCount: post.viewsCount || 0,
          helpfulMarksCount: post.helpfulMarksCount || 0,
          isRepost: post.isRepost || false,
          isLiked,
          isSaved,
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
            badges: [],
          },
        };
      })
    );

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      data: postsWithAuthors,
      hasMore,
    };

    // Include pagination info
    if (cursor) {
      // Cursor-based pagination response
      response.nextCursor = hasMore && postsToReturn.length > 0 
        ? postsToReturn[postsToReturn.length - 1]._id?.toString()
        : null;
    } else {
      // Offset-based pagination response
      response.pagination = {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
        hasMore,
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

/**
 * Get personalized feed using the recommendation algorithm
 */
async function getPersonalizedFeed(
  user: Record<string, unknown>,
  feedPreferences: Record<string, unknown> | null,
  options: {
    cursor?: string | null;
    limit: number;
    category?: PostType;
    crop?: string;
  }
): Promise<NextResponse> {
  const { cursor, limit, category, crop } = options;

  try {
    // Build the aggregation pipeline using the feed algorithm
    const pipeline = buildFeedAggregationPipeline(
      user as unknown as Parameters<typeof buildFeedAggregationPipeline>[0],
      {
        cursor: cursor || undefined,
        limit,
        category,
        crop,
        hiddenPosts: (feedPreferences?.hiddenPosts as mongoose.Types.ObjectId[]) || [],
        mutedUsers: (feedPreferences?.mutedUsers as mongoose.Types.ObjectId[]) || [],
      }
    );

    // Execute aggregation
    const posts = await Post.aggregate(pipeline);

    // Check if there are more posts
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

    // Check liked/saved status for each post
    const postsWithStatus = postsToReturn.map(post => {
      const isLiked = post.likes?.some((likeId: mongoose.Types.ObjectId) =>
        likeId.toString() === (user._id as mongoose.Types.ObjectId).toString()
      );
      const isSaved = post.savedBy?.some((saveId: mongoose.Types.ObjectId) =>
        saveId.toString() === (user._id as mongoose.Types.ObjectId).toString()
      );

      return {
        ...post,
        _id: post._id.toString(),
        isLiked,
        isSaved,
        // Ensure author is properly formatted
        author: post.author ? {
          _id: post.author._id?.toString() || '',
          fullName: post.author.fullName || 'Unknown User',
          profileImage: post.author.profileImage,
          role: post.author.role || 'farmer',
          badges: post.author.badges || [],
          experienceLevel: post.author.experienceLevel,
        } : {
          _id: '',
          fullName: 'Unknown User',
          role: 'farmer',
          badges: [],
        },
      };
    });

    // Build response
    const response = {
      success: true,
      data: postsWithStatus,
      hasMore,
      nextCursor: hasMore && postsToReturn.length > 0
        ? postsToReturn[postsToReturn.length - 1]._id?.toString()
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Personalized feed error:', error);
    throw error;
  }
}

/**
 * POST /api/posts
 * Creates a new post with enhanced fields
 * 
 * Authentication: Either via x-user-phone header or phone in body
 * 
 * Body:
 *   - phone: Author's phone number (optional if x-user-phone header is set)
 *   - content: Post content, 1-2000 chars (required)
 *   - postType: Post type (question, update, tip, problem, success_story) - default: 'update'
 *   - type: Legacy support - maps to postType
 *   - crops: Array of crop tags (optional)
 *   - tags: Legacy support - maps to crops
 *   - images: Array of image URLs/base64, max 5 (optional)
 *   - visibility: Visibility level (public, followers, group) - default: 'public'
 *   - location: { state, district } - auto-filled from user profile if not provided
 * 
 * Returns: Created post with author populated (201 status)
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { 
      content, 
      postType,
      type, // Legacy support
      category = 'general',
      crops,
      tags, // Legacy support
      images = [],
      visibility = 'public',
      location,
    } = body;

    // Get authenticated user - prefer header over body for security
    const authPhone = request.headers.get('x-user-phone') || body.phone;
    
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // Validate required fields
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

    // Validate images array
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

    // Validate each image and generate metadata
    const imagesMeta: IImageMeta[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      if (typeof image !== 'string') {
        return NextResponse.json(
          { success: false, error: `Image at index ${i} is not a valid string` },
          { status: 400 }
        );
      }

      // Determine if image is base64 or URL
      if (isBase64DataUrl(image)) {
        // Validate base64 image
        const validation = validateBase64Image(image);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: `Image at index ${i}: ${validation.error}` },
            { status: 400 }
          );
        }

        // Generate metadata for base64 image
        const size = estimateBase64Size(image);
        const type = extractMimeTypeFromDataUrl(image) || 'image/unknown';
        
        // Additional size check (5MB limit)
        if (size > MAX_IMAGE_SIZE_BYTES) {
          const sizeMB = (size / (1024 * 1024)).toFixed(2);
          return NextResponse.json(
            { success: false, error: `Image at index ${i} is too large (${sizeMB}MB). Maximum size is 5MB.` },
            { status: 400 }
          );
        }

        imagesMeta.push({
          size,
          type,
          isBase64: true,
        });
      } else if (isImageUrl(image)) {
        // URL-based image (backward compatibility with Cloudinary)
        // Determine type from URL extension if possible
        const extension = image.split('.').pop()?.toLowerCase()?.split('?')[0] || '';
        const typeMap: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
        };
        
        imagesMeta.push({
          size: 0, // Unknown for URL-based images
          type: typeMap[extension] || 'image/unknown',
          isBase64: false,
        });
      } else {
        return NextResponse.json(
          { success: false, error: `Image at index ${i} is not a valid base64 data URL or HTTP(S) URL` },
          { status: 400 }
        );
      }
    }

    // Determine post type (support legacy 'type' field)
    let finalPostType = postType || type || 'update';
    
    // Map legacy types to new types
    const typeMapping: Record<string, PostType> = {
      'post': 'update',
      'news': 'update',
      'technique': 'tip',
      'technology': 'tip',
    };
    finalPostType = typeMapping[finalPostType] || finalPostType;

    // Validate post type
    if (!VALID_POST_TYPES.includes(finalPostType as PostType)) {
      return NextResponse.json(
        { success: false, error: `Invalid post type. Must be one of: ${VALID_POST_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate visibility
    if (!VALID_VISIBILITY.includes(visibility as PostVisibility)) {
      return NextResponse.json(
        { success: false, error: `Invalid visibility. Must be one of: ${VALID_VISIBILITY.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate category
    const finalCategory = category || 'general';
    if (!VALID_CATEGORIES.includes(finalCategory as PostCategory)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Clean phone number and find user
    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    // Validate crops array
    const finalCrops = crops || tags || [];
    if (!Array.isArray(finalCrops)) {
      return NextResponse.json(
        { success: false, error: 'Crops must be an array' },
        { status: 400 }
      );
    }

    const processedCrops = finalCrops
      .filter((crop: unknown): crop is string => typeof crop === 'string')
      .map((crop: string) => crop.toLowerCase().trim())
      .filter((crop: string) => crop.length > 0);

    // Determine location (use provided or fall back to user profile)
    const finalLocation = location || {
      state: user.state,
      district: user.district,
    };

    // Create new post with all enhanced fields
    const newPost = new Post({
      author: user._id,
      authorPhone: cleanPhone,
      content: trimmedContent,
      postType: finalPostType,
      category: finalCategory,
      crops: processedCrops,
      tags: processedCrops, // Keep tags for backward compatibility
      images,
      imagesMeta, // Include generated image metadata
      visibility,
      location: finalLocation,
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
      isRepost: false,
      isDeleted: false,
    });

    await newPost.save();

    // Update user's postsCount if field exists
    // Using $inc with upsert:false to only update if user exists
    await User.updateOne(
      { _id: user._id },
      { $inc: { postsCount: 1 } }
    ).catch(() => {
      // Field may not exist on schema, ignore error
    });

    // Return created post with author populated
    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      data: {
        _id: newPost._id.toString(),
        content: newPost.content,
        postType: newPost.postType,
        category: newPost.category,
        type: newPost.postType, // Legacy support
        crops: newPost.crops,
        tags: newPost.crops, // Legacy support
        images: newPost.images,
        imagesMeta: newPost.imagesMeta,
        visibility: newPost.visibility,
        location: newPost.location,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isVerified: false,
        engagementScore: 0,
        viewsCount: 0,
        helpfulMarksCount: 0,
        isLiked: false,
        isSaved: false,
        isRepost: false,
        createdAt: newPost.createdAt,
        updatedAt: newPost.updatedAt,
        author: {
          _id: user._id.toString(),
          fullName: user.fullName,
          role: user.role,
          profileImage: user.profileImage,
          badges: (user as unknown as Record<string, unknown>).badges || [],
          experienceLevel: user.experienceLevel,
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create post error:', error);
    
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
      { success: false, error: 'Failed to create post. Please try again.' },
      { status: 500 }
    );
  }
}
