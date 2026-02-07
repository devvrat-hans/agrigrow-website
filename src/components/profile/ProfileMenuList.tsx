'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ProfileMenuItem } from './ProfileMenuItem';

interface MenuItem {
  /** Unique identifier */
  id: string;
  /** Icon component */
  icon: React.ElementType;
  /** Menu item label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Link href (if navigating) */
  href?: string;
  /** Whether this item is destructive (e.g., logout) */
  destructive?: boolean;
}

interface ProfileMenuListProps {
  /** Menu items to display */
  items: MenuItem[];
  /** Additional class names */
  className?: string;
}

/**
 * Reusable menu list component for profile page.
 * Shows clickable items with icons and chevron arrows.
 */
export function ProfileMenuList({ items, className }: ProfileMenuListProps) {
  return (
    <Card className={cn('divide-y divide-border', className)}>
      {items.map((item) => (
        <ProfileMenuItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          onClick={item.onClick}
          destructive={item.destructive}
        />
      ))}
    </Card>
  );
}
