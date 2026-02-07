'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRoleBadgeColor, getRoleDisplayText } from './ProfileAvatarCard';
import { useTranslation } from '@/hooks/useTranslation';

interface ProfileNameBadgeProps {
  /** User's full name */
  fullName: string;
  /** User's role */
  role: 'farmer' | 'student' | 'business';
  /** Additional class names */
  className?: string;
}

/**
 * Profile name and role badge component.
 * Mobile-responsive with name and badge wrapping on smaller screens.
 */
export function ProfileNameBadge({
  fullName,
  role,
  className,
}: ProfileNameBadgeProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
        {fullName}
      </h1>
      <Badge className={getRoleBadgeColor(role)}>
        {getRoleDisplayText(role, t)}
      </Badge>
    </div>
  );
}
