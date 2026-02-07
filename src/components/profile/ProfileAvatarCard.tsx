'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ProfileAvatarSection } from './ProfileAvatarSection';
import { ProfileNameBadge } from './ProfileNameBadge';
import { ProfileStats } from './ProfileStats';

interface ProfileAvatarCardProps {
  /** User's full name */
  fullName: string;
  /** User's phone number */
  phone: string;
  /** User's bio */
  bio?: string;
  /** User's role */
  role: 'farmer' | 'student' | 'business';
  /** User's profile image URL */
  avatarUrl?: string;
  /** Additional stats to show */
  stats?: { label: string; value: string | number }[];
  /** Additional class names */
  className?: string;
}

/**
 * Gets the role badge styling based on role type.
 */
export function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'farmer':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'student':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'business':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Gets role display text with emoji.
 * Accepts an optional translate function for i18n support.
 */
export function getRoleDisplayText(role: string, t?: (key: string) => string) {
  if (t) {
    switch (role) {
      case 'farmer':
        return t('profile.farmerRole');
      case 'student':
        return t('profile.studentRole');
      case 'business':
        return t('profile.businessRole');
      default:
        return role;
    }
  }
  switch (role) {
    case 'farmer':
      return '🌾 Farmer';
    case 'student':
      return '📚 Student';
    case 'business':
      return '🏢 Business';
    default:
      return role;
  }
}

/**
 * Formats phone number for display.
 */
export function formatPhoneNumber(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
}

/**
 * Profile avatar and basic info card component.
 * Mobile-responsive: stacks vertically on mobile, horizontal on sm+ screens.
 */
export function ProfileAvatarCard({
  fullName,
  phone,
  bio,
  role,
  avatarUrl,
  stats,
  className,
}: ProfileAvatarCardProps) {
  return (
    <Card className={cn('p-4 sm:p-6', className)}>
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
        <ProfileAvatarSection avatarUrl={avatarUrl} fullName={fullName} />
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <ProfileNameBadge fullName={fullName} role={role} className="justify-center sm:justify-start mb-1" />
          <p className="text-sm text-muted-foreground mb-2">{formatPhoneNumber(phone)}</p>
          {bio && <p className="text-sm text-foreground">{bio}</p>}
        </div>
      </div>

      {/* Stats */}
      {stats && stats.length > 0 && <ProfileStats stats={stats} />}
    </Card>
  );
}
