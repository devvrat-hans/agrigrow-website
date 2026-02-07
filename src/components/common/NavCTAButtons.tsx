'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface NavCTAButtonsProps {
  className?: string;
  variant?: 'desktop' | 'mobile';
}

export function NavCTAButtons({ className = '', variant = 'desktop' }: NavCTAButtonsProps) {
  if (variant === 'mobile') {
    return (
      <div className={`flex gap-3 pt-4 border-t border-border ${className}`}>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/auth/signin">Signin</Link>
        </Button>
        <Button className="flex-1" asChild>
          <Link href="/auth/signup">Signup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Button variant="ghost" asChild>
        <Link href="/auth/signin">Signin</Link>
      </Button>
      <Button asChild>
        <Link href="/auth/signup">Signup</Link>
      </Button>
    </div>
  );
}
