import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import UserFeedPreference from '@/models/UserFeedPreference';
import mongoose from 'mongoose';

/**
 * Default feed preferences
 */
const DEFAULT_PREFERENCES = {
  viewedPosts: [],
  likedTopics: new Map(),
  likedCrops: new Map(),
  hiddenPosts: [],
  mutedUsers: [],
  preferredAuthors: new Map(),
  settings: {
    showReposts: true,
    prioritizeFollowing: true,
    contentTypes: ['question', 'update', 'tip', 'problem', 'success_story'],
  },
};

/**
 * Valid operations for array updates
 */
type ArrayOperation = 'add' | 'remove' | 'set';

/**
 * GET /api/feed/preferences
 * Fetches user's feed preferences
 * 
 * Authentication: Required via x-user-phone header
 * 
 * Returns: UserFeedPreference (creates with defaults if doesn't exist)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user from headers
    const authPhone = request.headers.get('x-user-phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    // Fetch or create user preferences
    let preferences = await UserFeedPreference.findOne({ userId: user._id }).lean();

    if (!preferences) {
      // Create default preferences
      const newPreferences = new UserFeedPreference({
        userId: user._id,
        ...DEFAULT_PREFERENCES,
        lastFeedRefresh: new Date(),
      });
      await newPreferences.save();
      preferences = newPreferences.toObject();
    }

    // Convert Maps to objects for JSON serialization
    const likedTopics: Record<string, number> = {};
    const likedCrops: Record<string, number> = {};
    const preferredAuthors: Record<string, number> = {};

    if (preferences.likedTopics instanceof Map) {
      preferences.likedTopics.forEach((value: number, key: string) => {
        likedTopics[key] = value;
      });
    } else if (preferences.likedTopics && typeof preferences.likedTopics === 'object') {
      Object.assign(likedTopics, preferences.likedTopics);
    }

    if (preferences.likedCrops instanceof Map) {
      preferences.likedCrops.forEach((value: number, key: string) => {
        likedCrops[key] = value;
      });
    } else if (preferences.likedCrops && typeof preferences.likedCrops === 'object') {
      Object.assign(likedCrops, preferences.likedCrops);
    }

    if (preferences.preferredAuthors instanceof Map) {
      preferences.preferredAuthors.forEach((value: number, key: string) => {
        preferredAuthors[key] = value;
      });
    } else if (preferences.preferredAuthors && typeof preferences.preferredAuthors === 'object') {
      Object.assign(preferredAuthors, preferences.preferredAuthors);
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: preferences._id?.toString(),
        userId: preferences.userId.toString(),
        hiddenPosts: (preferences.hiddenPosts || []).map((id: mongoose.Types.ObjectId) => id.toString()),
        mutedUsers: (preferences.mutedUsers || []).map((id: mongoose.Types.ObjectId) => id.toString()),
        likedTopics,
        likedCrops,
        preferredAuthors,
        settings: preferences.settings || DEFAULT_PREFERENCES.settings,
        lastFeedRefresh: preferences.lastFeedRefresh,
        viewedPostsCount: (preferences.viewedPosts || []).length,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt,
      },
    });

  } catch (error) {
    console.error('Get feed preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feed preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/feed/preferences
 * Updates user's feed preferences
 * 
 * Authentication: Required via x-user-phone header
 * 
 * Body:
 *   - hiddenPosts: { operation: 'add'|'remove'|'set', ids: string[] }
 *   - mutedUsers: { operation: 'add'|'remove'|'set', ids: string[] }
 *   - likedTopics: { [topic: string]: number } - complete replacement
 *   - likedCrops: { [crop: string]: number } - complete replacement
 *   - settings: { showReposts?: boolean, prioritizeFollowing?: boolean, contentTypes?: string[] }
 * 
 * Returns: Updated preferences
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user from headers
    const authPhone = request.headers.get('x-user-phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { hiddenPosts, mutedUsers, likedTopics, likedCrops, settings } = body;

    // Build update operations
    const updateOps: Record<string, unknown> = {};
    const pushOps: Record<string, unknown> = {};
    const pullOps: Record<string, unknown> = {};

    // Handle hiddenPosts updates
    if (hiddenPosts) {
      const operation = hiddenPosts.operation as ArrayOperation;
      const ids = hiddenPosts.ids || [];

      // Validate ObjectIds
      const validIds: mongoose.Types.ObjectId[] = [];
      for (const id of ids) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          validIds.push(new mongoose.Types.ObjectId(id));
        }
      }

      switch (operation) {
        case 'add':
          if (validIds.length > 0) {
            pushOps.hiddenPosts = { $each: validIds };
          }
          break;
        case 'remove':
          if (validIds.length > 0) {
            pullOps.hiddenPosts = { $in: validIds };
          }
          break;
        case 'set':
          updateOps.hiddenPosts = validIds;
          break;
        default:
          // If no operation specified, treat as 'set'
          updateOps.hiddenPosts = validIds;
      }
    }

    // Handle mutedUsers updates
    if (mutedUsers) {
      const operation = mutedUsers.operation as ArrayOperation;
      const ids = mutedUsers.ids || [];

      // Validate ObjectIds
      const validIds: mongoose.Types.ObjectId[] = [];
      for (const id of ids) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          validIds.push(new mongoose.Types.ObjectId(id));
        }
      }

      switch (operation) {
        case 'add':
          if (validIds.length > 0) {
            pushOps.mutedUsers = { $each: validIds };
          }
          break;
        case 'remove':
          if (validIds.length > 0) {
            pullOps.mutedUsers = { $in: validIds };
          }
          break;
        case 'set':
          updateOps.mutedUsers = validIds;
          break;
        default:
          updateOps.mutedUsers = validIds;
      }
    }

    // Handle likedTopics updates (complete replacement as Map)
    if (likedTopics && typeof likedTopics === 'object') {
      const topicsMap = new Map<string, number>();
      for (const [topic, score] of Object.entries(likedTopics)) {
        if (typeof score === 'number') {
          topicsMap.set(topic, score);
        }
      }
      updateOps.likedTopics = topicsMap;
    }

    // Handle likedCrops updates (complete replacement as Map)
    if (likedCrops && typeof likedCrops === 'object') {
      const cropsMap = new Map<string, number>();
      for (const [crop, score] of Object.entries(likedCrops)) {
        if (typeof score === 'number') {
          cropsMap.set(crop, score);
        }
      }
      updateOps.likedCrops = cropsMap;
    }

    // Handle settings updates (merge with existing)
    if (settings && typeof settings === 'object') {
      if (settings.showReposts !== undefined) {
        updateOps['settings.showReposts'] = settings.showReposts;
      }
      if (settings.prioritizeFollowing !== undefined) {
        updateOps['settings.prioritizeFollowing'] = settings.prioritizeFollowing;
      }
      if (settings.contentTypes && Array.isArray(settings.contentTypes)) {
        updateOps['settings.contentTypes'] = settings.contentTypes;
      }
    }

    // Build the final update query
    const updateQuery: Record<string, unknown> = {};
    
    if (Object.keys(updateOps).length > 0) {
      updateQuery.$set = updateOps;
    }
    if (Object.keys(pushOps).length > 0) {
      updateQuery.$addToSet = pushOps;
    }
    if (Object.keys(pullOps).length > 0) {
      updateQuery.$pull = pullOps;
    }

    // Check if there's anything to update
    if (Object.keys(updateQuery).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update or create preferences
    const updatedPreferences = await UserFeedPreference.findOneAndUpdate(
      { userId: user._id },
      {
        ...updateQuery,
        $setOnInsert: {
          userId: user._id,
          viewedPosts: [],
          preferredAuthors: new Map(),
          lastFeedRefresh: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
      }
    ).lean();

    if (!updatedPreferences) {
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Convert Maps to objects for JSON serialization
    const likedTopicsObj: Record<string, number> = {};
    const likedCropsObj: Record<string, number> = {};
    const preferredAuthorsObj: Record<string, number> = {};

    if (updatedPreferences.likedTopics instanceof Map) {
      updatedPreferences.likedTopics.forEach((value: number, key: string) => {
        likedTopicsObj[key] = value;
      });
    } else if (updatedPreferences.likedTopics && typeof updatedPreferences.likedTopics === 'object') {
      Object.assign(likedTopicsObj, updatedPreferences.likedTopics);
    }

    if (updatedPreferences.likedCrops instanceof Map) {
      updatedPreferences.likedCrops.forEach((value: number, key: string) => {
        likedCropsObj[key] = value;
      });
    } else if (updatedPreferences.likedCrops && typeof updatedPreferences.likedCrops === 'object') {
      Object.assign(likedCropsObj, updatedPreferences.likedCrops);
    }

    if (updatedPreferences.preferredAuthors instanceof Map) {
      updatedPreferences.preferredAuthors.forEach((value: number, key: string) => {
        preferredAuthorsObj[key] = value;
      });
    } else if (updatedPreferences.preferredAuthors && typeof updatedPreferences.preferredAuthors === 'object') {
      Object.assign(preferredAuthorsObj, updatedPreferences.preferredAuthors);
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        _id: updatedPreferences._id?.toString(),
        userId: updatedPreferences.userId.toString(),
        hiddenPosts: (updatedPreferences.hiddenPosts || []).map((id: mongoose.Types.ObjectId) => id.toString()),
        mutedUsers: (updatedPreferences.mutedUsers || []).map((id: mongoose.Types.ObjectId) => id.toString()),
        likedTopics: likedTopicsObj,
        likedCrops: likedCropsObj,
        preferredAuthors: preferredAuthorsObj,
        settings: updatedPreferences.settings || DEFAULT_PREFERENCES.settings,
        lastFeedRefresh: updatedPreferences.lastFeedRefresh,
        viewedPostsCount: (updatedPreferences.viewedPosts || []).length,
        createdAt: updatedPreferences.createdAt,
        updatedAt: updatedPreferences.updatedAt,
      },
    });

  } catch (error) {
    console.error('Update feed preferences error:', error);
    
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
      { success: false, error: 'Failed to update feed preferences' },
      { status: 500 }
    );
  }
}
