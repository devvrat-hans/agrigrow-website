import { NextRequest, NextResponse } from 'next/server';
import {
  storeOTP,
  isRateLimited,
  generateOTP,
  isValidIndianMobile,
  cleanPhoneNumber,
} from '@/lib/otp-store';

// In production, this should use a proper OTP service like Twilio, MSG91, etc.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // Validate phone number
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean phone number (remove any non-digit characters)
    const cleanPhone = cleanPhoneNumber(phone);

    if (!isValidIndianMobile(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit Indian mobile number' },
        { status: 400 }
      );
    }

    // Check for rate limiting (max 3 OTPs per 10 minutes)
    if (isRateLimited(cleanPhone, 3)) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP with 5 minutes expiry
    storeOTP(cleanPhone, otp, 5 * 60 * 1000);

    // In production, send OTP via SMS service
    // For development, log to console
    console.log(`[DEV] OTP for ${cleanPhone}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // In development, include OTP for testing (remove in production!)
      ...(process.env.NODE_ENV === 'development' && { devOTP: otp }),
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
