import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

/**
 * GET /api/user/me
 * Fetches the current user's profile based on phone number
 * Request: Query param `phone` (required)
 * Response: User profile data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');

    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        bio: user.bio,
        role: user.role,
        language: user.language,
        state: user.state,
        district: user.district,
        crops: user.crops,
        experienceLevel: user.experienceLevel,
        interests: user.interests,
        // Student fields
        studentDegree: user.studentDegree,
        collegeName: user.collegeName,
        yearOfStudy: user.yearOfStudy,
        studentBackground: user.studentBackground,
        studentInterests: user.studentInterests,
        studentPurposes: user.studentPurposes,
        // Business fields
        organizationType: user.organizationType,
        businessFocusAreas: user.businessFocusAreas,
        profileImage: user.profileImage,
        isOnboarded: user.isOnboarded,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/me
 * Updates the current user's profile
 * Request: JSON body with updated fields + phone in body or header
 * Response: Updated user profile data
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, ...updateData } = body;

    // Get phone from body or header
    const userPhone = phone || request.headers.get('x-user-phone');

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required for authentication' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Clean phone number
    const cleanPhone = userPhone.replace(/\D/g, '');

    // Find existing user
    const existingUser = await User.findOne({ phone: cleanPhone });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Define allowed update fields based on role
    const allowedFields = [
      'fullName',
      'bio',
      'language',
      'state',
      'district',
      'profileImage',
    ];

    // Add role-specific allowed fields
    if (existingUser.role === 'farmer') {
      allowedFields.push('crops', 'experienceLevel', 'interests');
    } else if (existingUser.role === 'student') {
      allowedFields.push(
        'studentDegree',
        'collegeName',
        'yearOfStudy',
        'studentBackground',
        'studentInterests',
        'studentPurposes'
      );
    } else if (existingUser.role === 'business') {
      allowedFields.push('organizationType', 'businessFocusAreas');
    }

    // Filter update data to only allowed fields
    const sanitizedUpdate: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        sanitizedUpdate[key] = updateData[key];
      }
    }

    // Validate fullName if provided
    if (sanitizedUpdate.fullName && typeof sanitizedUpdate.fullName === 'string') {
      if (sanitizedUpdate.fullName.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: 'Full name must be at least 2 characters' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await User.findOneAndUpdate(
      { phone: cleanPhone },
      { $set: sanitizedUpdate },
      { new: true, runValidators: true }
    );

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
        id: updatedUser._id,
        phone: updatedUser.phone,
        fullName: updatedUser.fullName,
        bio: updatedUser.bio,
        role: updatedUser.role,
        language: updatedUser.language,
        state: updatedUser.state,
        district: updatedUser.district,
        crops: updatedUser.crops,
        experienceLevel: updatedUser.experienceLevel,
        interests: updatedUser.interests,
        studentDegree: updatedUser.studentDegree,
        collegeName: updatedUser.collegeName,
        yearOfStudy: updatedUser.yearOfStudy,
        studentBackground: updatedUser.studentBackground,
        studentInterests: updatedUser.studentInterests,
        studentPurposes: updatedUser.studentPurposes,
        organizationType: updatedUser.organizationType,
        businessFocusAreas: updatedUser.businessFocusAreas,
        profileImage: updatedUser.profileImage,
        isOnboarded: updatedUser.isOnboarded,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
