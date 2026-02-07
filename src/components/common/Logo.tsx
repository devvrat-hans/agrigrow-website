'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  variant?: 'default' | 'light';
}

const sizeMap = {
  sm: { image: 32, text: 'text-base' },
  md: { image: 44, text: 'text-xl' },
  lg: { image: 56, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, href = '/', variant = 'default' }: LogoProps) {
  const { image, text } = sizeMap[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-primary';

  const content = (
    <div className="flex items-center gap-2">
      <Image
        src="/logo-no-bg.png"
        alt="Agrigrow Logo"
        width={image}
        height={image}
        className="object-contain"
        style={{ width: image, height: image }}
      />
      {showText && (
        <span className={`font-semibold ${textColor} ${text}`}>
          AgriGrow
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
