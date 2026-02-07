/**
 * OTP Storage Module
 * 
 * Shared in-memory storage for OTP codes.
 * In production, this should be replaced with Redis or database storage.
 */

export interface OTPData {
  otp: string;
  expiresAt: number;
  attempts: number;
}

// Singleton Map for OTP storage
// Note: This works for development but won't persist across serverless function invocations
// For production, use Redis or database
const otpStore = new Map<string, OTPData>();

/**
 * Store an OTP for a phone number
 */
export function storeOTP(phone: string, otp: string, ttlMs: number = 5 * 60 * 1000): void {
  const existing = otpStore.get(phone);
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + ttlMs,
    attempts: (existing?.attempts || 0) + 1,
  });
}

/**
 * Get stored OTP data for a phone number
 */
export function getOTP(phone: string): OTPData | undefined {
  return otpStore.get(phone);
}

/**
 * Delete OTP for a phone number
 */
export function deleteOTP(phone: string): boolean {
  return otpStore.delete(phone);
}

/**
 * Check if phone has exceeded rate limit
 */
export function isRateLimited(phone: string, maxAttempts: number = 3): boolean {
  const existing = otpStore.get(phone);
  if (!existing) return false;
  return existing.attempts >= maxAttempts && existing.expiresAt > Date.now();
}

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate Indian mobile phone number format
 */
export function isValidIndianMobile(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Clean phone number (remove non-digit characters)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Development OTP for testing (use 123456 in dev mode)
 */
export const DEV_OTP = '123456';
