import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import { calculateUserTrustScore } from '@/lib/trust-score';
import {
  validateBase64Image,
  isBase64DataUrl,
  estimateBase64Size,
  extractMimeTypeFromDataUrl,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/base64-image';

/**
 * GET /api/user/[id]
 * Get user details by ID
 * 
 * Authentication: Required via x-user-phone header
 * 
 * Parameters:
 *   - id: User ID (MongoDB ObjectId)
 * 
 * Returns:
 *   - success: boolean
 *   - user: User data (public fields only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Validate user ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Find user by ID - return public fields + role-specific fields + trust score fields
    const user = await User.findById(id)
      .select('phone fullName profileImage role bio state district experienceLevel language crops interests studentDegree collegeName yearOfStudy studentBackground studentInterests studentPurposes organizationType businessFocusAreas followersCount followingCount createdAt')
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Compute dynamic trust score
    const trustScore = await calculateUserTrustScore({
      userId: user._id.toString(),
      followersCount: (user as unknown as Record<string, unknown>).followersCount as number || 0,
      followingCount: (user as unknown as Record<string, unknown>).followingCount as number || 0,
      createdAt: user.createdAt as Date,
      experienceLevel: user.experienceLevel as 'beginner' | 'intermediate' | 'experienced' | 'expert',
      hasBio: !!user.bio,
      hasProfileImage: !!user.profileImage,
      cropsCount: ((user as unknown as Record<string, unknown>).crops as string[] || []).length,
      interestsCount: ((user as unknown as Record<string, unknown>).interests as string[] || []).length,
    });

    const typedUser = user as unknown as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id.toString(),
        phone: typedUser.phone,
        fullName: user.fullName,
        profileImage: user.profileImage,
        role: user.role,
        bio: user.bio,
        state: user.state,
        district: user.district,
        experienceLevel: user.experienceLevel,
        language: typedUser.language || 'en',
        // Farmer-specific fields
        crops: typedUser.crops || [],
        interests: typedUser.interests || [],
        // Student-specific fields
        studentDegree: typedUser.studentDegree,
        collegeName: typedUser.collegeName,
        yearOfStudy: typedUser.yearOfStudy,
        studentBackground: typedUser.studentBackground,
        studentInterests: typedUser.studentInterests || [],
        studentPurposes: typedUser.studentPurposes || [],
        // Business-specific fields
        organizationType: typedUser.organizationType,
        businessFocusAreas: typedUser.businessFocusAreas || [],
        // Counts & meta
        followersCount: typedUser.followersCount || 0,
        followingCount: typedUser.followingCount || 0,
        trustScore,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/[id]
 * Update user profile data including profile image
 * 
 * Authentication: Required via x-user-phone header
 * Only the authenticated user can update their own profile
 * 
 * Request body:
 *   - profileImage: base64 data URL string (optional)
 *   - fullName: string (optional)
 *   - bio: string (optional)
 * 
 * Returns:
 *   - success: boolean
 *   - user: Updated user data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const cleanAuthPhone = authPhone.replace(/\D/g, '');

    // Find the authenticated user
    const authUser = await User.findOne({ phone: cleanAuthPhone });
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authenticated user not found' },
        { status: 404 }
      );
    }

    // Find the user being updated
    let targetUser;
    
    // Check if id is a MongoDB ObjectId or a phone number
    if (mongoose.Types.ObjectId.isValid(id)) {
      targetUser = await User.findById(id);
    } else {
      // Assume it's a phone number
      const cleanTargetPhone = id.replace(/\D/g, '');
      targetUser = await User.findOne({ phone: cleanTargetPhone });
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Security: Only allow users to update their own profile
    if (targetUser.phone !== cleanAuthPhone) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { profileImage, fullName, bio } = body;

    // Prepare update object
    const updateData: Record<string, unknown> = {};

    // Handle profile image update
    if (profileImage !== undefined) {
      if (profileImage === null || profileImage === '') {
        // Allow removing profile image
        updateData.profileImage = null;
        updateData.profileImageMeta = null;
      } else if (typeof profileImage === 'string') {
        // Validate if it's a base64 image
        if (isBase64DataUrl(profileImage)) {
          const validation = validateBase64Image(profileImage);
          if (!validation.valid) {
            return NextResponse.json(
              { success: false, error: `Invalid profile image: ${validation.error}` },
              { status: 400 }
            );
          }

          // Check size
          const imageSize = estimateBase64Size(profileImage);
          if (imageSize > MAX_IMAGE_SIZE_BYTES) {
            const sizeMB = (imageSize / (1024 * 1024)).toFixed(2);
            return NextResponse.json(
              { success: false, error: `Profile image too large (${sizeMB}MB). Maximum size is 5MB.` },
              { status: 400 }
            );
          }

          // Set image and metadata
          updateData.profileImage = profileImage;
          updateData.profileImageMeta = {
            size: imageSize,
            type: extractMimeTypeFromDataUrl(profileImage) || 'image/unknown',
            isBase64: true,
            updatedAt: new Date(),
          };
        } else if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
          // Allow URL-based images (backward compatibility with Cloudinary)
          updateData.profileImage = profileImage;
          updateData.profileImageMeta = {
            size: 0, // Unknown for URL-based images
            type: 'image/unknown',
            isBase64: false,
            updatedAt: new Date(),
          };
        } else {
          return NextResponse.json(
            { success: false, error: 'Profile image must be a valid base64 data URL or HTTP(S) URL' },
            { status: 400 }
          );
        }
      }
    }

    // Handle full name update
    if (fullName !== undefined) {
      if (typeof fullName === 'string') {
        const trimmedName = fullName.trim();
        if (trimmedName.length < 2) {
          return NextResponse.json(
            { success: false, error: 'Full name must be at least 2 characters' },
            { status: 400 }
          );
        }
        if (trimmedName.length > 100) {
          return NextResponse.json(
            { success: false, error: 'Full name cannot exceed 100 characters' },
            { status: 400 }
          );
        }
        updateData.fullName = trimmedName;
      }
    }

    // Handle bio update
    if (bio !== undefined) {
      if (bio === null || bio === '') {
        updateData.bio = '';
      } else if (typeof bio === 'string') {
        const trimmedBio = bio.trim();
        if (trimmedBio.length > 500) {
          return NextResponse.json(
            { success: false, error: 'Bio cannot exceed 500 characters' },
            { status: 400 }
          );
        }
        updateData.bio = trimmedBio;
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      targetUser._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('fullName profileImage profileImageMeta bio role state district experienceLevel createdAt updatedAt');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id.toString(),
        phone: targetUser.phone,
        fullName: updatedUser.fullName,
        profileImage: updatedUser.profileImage,
        profileImageMeta: updatedUser.profileImageMeta,
        bio: updatedUser.bio,
        role: updatedUser.role,
        state: updatedUser.state,
        district: updatedUser.district,
        experienceLevel: updatedUser.experienceLevel,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { success: false, error: 'Validation error: ' + error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
