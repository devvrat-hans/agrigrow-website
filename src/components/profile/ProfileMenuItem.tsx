'use client';

import { IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface ProfileMenuItemProps {
  /** Icon component to display */
  icon: React.ElementType;
  /** Menu item label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Whether this is a destructive action (shows in red) */
  destructive?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Single menu item for profile menu list.
 * Touch-friendly with proper touch feedback.
 */
export function ProfileMenuItem({
  icon: Icon,
  label,
  onClick,
  destructive = false,
  className,
}: ProfileMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-[48px] w-full flex items-center justify-between px-4 transition-colors',
        'active:bg-muted/70',
        destructive ? 'text-destructive' : 'text-foreground',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('w-5 h-5', destructive ? 'text-destructive' : 'text-muted-foreground')} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <IconChevronRight className={cn('w-5 h-5', destructive ? 'text-destructive/60' : 'text-muted-foreground')} />
    </button>
  );
}
