'use client';

import { IconUser } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ResponsiveImage } from '@/components/common';

interface ProfileAvatarSectionProps {
  /** User's profile image URL or base64 data URL */
  avatarUrl?: string;
  /** User's full name for alt text */
  fullName: string;
  /** Avatar size in pixels (default 80) */
  size?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Profile avatar section component.
 * Mobile-responsive: 72px on mobile, 80px on sm+ screens.
 * Supports both URL and base64 data URL images.
 */
export function ProfileAvatarSection({
  avatarUrl,
  fullName,
  size: _size = 80,
  className,
}: ProfileAvatarSectionProps) {
  // Custom fallback with user icon
  const fallbackComponent = (
    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
      <IconUser className="w-9 h-9 sm:w-10 sm:h-10 text-primary" />
    </div>
  );

  return (
    <div
      className={cn(
        'w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0',
        className
      )}
    >
      {avatarUrl ? (
        <ResponsiveImage
          src={avatarUrl}
          alt={fullName}
          isAvatar
          objectFit="cover"
          fallbackComponent={fallbackComponent}
          placeholderIconSize={36}
        />
      ) : (
        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
          <IconUser className="w-9 h-9 sm:w-10 sm:h-10 text-primary" />
        </div>
      )}
    </div>
  );
}
