'use client';

import Link from 'next/link';

interface AuthLinkProps {
  question: string;
  linkText: string;
  href: string;
}

export function AuthLink({ question, linkText, href }: AuthLinkProps) {
  return (
    <p className="text-sm text-muted-foreground text-center">
      {question}{' '}
      <Link href={href} className="text-primary hover:underline font-medium">
        {linkText}
      </Link>
    </p>
  );
}
