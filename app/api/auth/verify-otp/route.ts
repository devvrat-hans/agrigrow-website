import { NextRequest, NextResponse } from 'next/server';
import {
  getOTP,
  deleteOTP,
  cleanPhoneNumber,
  DEV_OTP,
} from '@/lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    // Validate inputs
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { success: false, error: 'OTP is required' },
        { status: 400 }
      );
    }

    // Clean phone number and OTP
    const cleanPhone = cleanPhoneNumber(phone);
    const cleanOTP = otp.replace(/\D/g, '');

    if (cleanOTP.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 6-digit OTP' },
        { status: 400 }
      );
    }

    // Get stored OTP from shared storage
    const storedData = getOTP(cleanPhone);

    // In development, accept the dev OTP for testing
    if (process.env.NODE_ENV === 'development' && cleanOTP === DEV_OTP) {
      // Clear the stored OTP after successful verification
      deleteOTP(cleanPhone);
      
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        isNewUser: true, // This would be determined by database lookup in production
      });
    }

    // Check if OTP exists
    if (!storedData) {
      // In development, also allow DEV_OTP if no stored OTP
      if (process.env.NODE_ENV === 'development' && cleanOTP === DEV_OTP) {
        return NextResponse.json({
          success: true,
          message: 'OTP verified successfully (dev mode)',
          isNewUser: true,
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'OTP expired or not found. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (storedData.expiresAt < Date.now()) {
      deleteOTP(cleanPhone);
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedData.otp !== cleanOTP) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    // Clear the stored OTP after successful verification
    deleteOTP(cleanPhone);

    // In production, you would:
    // 1. Check if user exists in database
    // 2. Create user if new
    // 3. Generate JWT token or session
    // 4. Return appropriate response

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      isNewUser: true, // This would be determined by database lookup
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
