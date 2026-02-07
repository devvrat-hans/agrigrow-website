'use client';

import Link from 'next/link';

export function AuthTermsText() {
  return (
    <p className="text-xs text-muted-foreground text-center">
      By continuing, you agree to our{' '}
      <Link href="/terms" className="text-primary hover:underline">
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link href="/privacy" className="text-primary hover:underline">
        Privacy Policy
      </Link>
    </p>
  );
}
