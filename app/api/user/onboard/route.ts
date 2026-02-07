import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import {
  validateBase64Image,
  isBase64DataUrl,
  estimateBase64Size,
  extractMimeTypeFromDataUrl,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/base64-image';

export async function POST(request: NextRequest) {
  try {
    console.log('[Onboard] Starting onboarding request...');
    
    // Connect to database with timeout
    try {
      await dbConnect();
      console.log('[Onboard] Database connected successfully');
    } catch (dbError) {
      console.error('[Onboard] Database connection failed:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database connection failed. Please try again.' },
        { status: 503 }
      );
    }
    
    const body = await request.json();
    console.log('[Onboard] Received body:', { ...body, phone: body.phone ? '***' : undefined });
    const { 
      phone, 
      fullName, 
      bio, 
      role, 
      language, 
      state, 
      district, 
      crops, 
      experienceLevel,
      interests,
      profileImage, // Profile image - can be base64 or URL
      // Student-specific fields
      studentDegree,
      collegeName,
      yearOfStudy,
      studentBackground,
      studentInterests,
      studentPurposes,
      // Business-specific fields
      organizationType,
      businessFocusAreas
    } = body;

    // Validate required fields
    if (!phone || !fullName || !role || !language || !experienceLevel) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate phone format
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['farmer', 'student', 'business'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Process profile image if provided
    let processedProfileImage: string | undefined = undefined;
    let profileImageMeta: { size: number; type: string; isBase64: boolean; updatedAt: Date } | undefined = undefined;

    if (profileImage) {
      if (typeof profileImage === 'string') {
        if (isBase64DataUrl(profileImage)) {
          // Validate base64 image
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
          processedProfileImage = profileImage;
          profileImageMeta = {
            size: imageSize,
            type: extractMimeTypeFromDataUrl(profileImage) || 'image/unknown',
            isBase64: true,
            updatedAt: new Date(),
          };
        } else if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
          // Allow URL-based images (backward compatibility with Cloudinary)
          processedProfileImage = profileImage;
          profileImageMeta = {
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

    // Check if user already exists
    const existingUser = await User.findOne({ phone: cleanPhone });
    
    if (existingUser) {
      // Update existing user
      existingUser.fullName = fullName;
      existingUser.bio = bio || '';
      existingUser.role = role;
      existingUser.language = language;
      existingUser.state = state || '';
      existingUser.district = district || '';
      existingUser.crops = crops || [];
      existingUser.experienceLevel = experienceLevel;
      existingUser.interests = interests || [];
      // Profile image (if provided)
      if (processedProfileImage) {
        existingUser.profileImage = processedProfileImage;
        existingUser.profileImageMeta = profileImageMeta;
      }
      // Student-specific fields
      existingUser.studentDegree = studentDegree || '';
      existingUser.collegeName = collegeName || '';
      existingUser.yearOfStudy = yearOfStudy || '';
      existingUser.studentBackground = studentBackground || '';
      existingUser.studentInterests = studentInterests || [];
      existingUser.studentPurposes = studentPurposes || [];
      // Business-specific fields
      existingUser.organizationType = organizationType || '';
      existingUser.businessFocusAreas = businessFocusAreas || [];
      existingUser.isOnboarded = true;
      
      console.log('[Onboard] Updating existing user:', existingUser._id);
      await existingUser.save();
      console.log('[Onboard] User updated successfully');
      
      return NextResponse.json({
        success: true,
        message: 'User profile updated successfully',
        user: {
          id: existingUser._id,
          phone: existingUser.phone,
          fullName: existingUser.fullName,
          role: existingUser.role,
          isOnboarded: existingUser.isOnboarded,
        },
      });
    }

    console.log('[Onboard] Creating new user with phone:', cleanPhone);
    // Create new user
    const newUser = new User({
      phone: cleanPhone,
      fullName,
      bio: bio || '',
      role,
      language,
      state: state || '',
      district: district || '',
      crops: crops || [],
      interests: interests || [],
      experienceLevel,
      // Profile image (if provided)
      profileImage: processedProfileImage,
      profileImageMeta: profileImageMeta,
      // Student-specific fields
      studentDegree: studentDegree || '',
      collegeName: collegeName || '',
      yearOfStudy: yearOfStudy || '',
      studentBackground: studentBackground || '',
      studentInterests: studentInterests || [],
      studentPurposes: studentPurposes || [],
      // Business-specific fields
      organizationType: organizationType || '',
      businessFocusAreas: businessFocusAreas || [],
      // System fields
      savedPosts: [],
      isOnboarded: true,
    });

    console.log('[Onboard] Saving new user...');
    await newUser.save();
    console.log('[Onboard] New user saved successfully:', newUser._id);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        phone: newUser.phone,
        fullName: newUser.fullName,
        role: newUser.role,
        isOnboarded: newUser.isOnboarded,
      },
    });

  } catch (error: unknown) {
    console.error('Onboarding error:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      // Duplicate key error
      if (error.message.includes('E11000') || error.message.includes('duplicate key')) {
        return NextResponse.json(
          { success: false, error: 'This phone number is already registered.' },
          { status: 409 }
        );
      }
      
      // Validation error
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { success: false, error: `Validation error: ${error.message}` },
          { status: 400 }
        );
      }
      
      // Connection error
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
        return NextResponse.json(
          { success: false, error: 'Database connection failed. Please try again later.' },
          { status: 503 }
        );
      }
      
      console.error('Detailed error:', error.message, error.stack);
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to save user data. Please try again.' },
      { status: 500 }
    );
  }
}
