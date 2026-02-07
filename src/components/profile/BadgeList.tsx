'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BadgeListProps {
  /** Array of items to display as badges */
  items: string[];
  /** Badge variant */
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  /** Additional class names for container */
  className?: string;
  /** Format function to transform item text */
  formatItem?: (item: string) => string;
}

/**
 * Default formatter for badge items.
 * Converts snake_case to Title Case.
 */
export function formatBadgeText(item: string): string {
  return item
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Reusable component to display a list of badges.
 * Mobile-responsive with tighter gap on small screens.
 */
export function BadgeList({
  items,
  variant = 'secondary',
  className,
  formatItem = formatBadgeText,
}: BadgeListProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5 sm:gap-2', className)}>
      {items.map((item) => (
        <Badge key={item} variant={variant}>
          {formatItem(item)}
        </Badge>
      ))}
    </div>
  );
}
