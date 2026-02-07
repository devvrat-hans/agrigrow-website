'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProfileInfoCardProps {
  /** Card title */
  title: string;
  /** Optional icon to show before title */
  icon?: ReactNode;
  /** Content to render inside the card */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Reusable profile information card with title and icon.
 * Mobile-responsive with tighter padding on small screens.
 */
export function ProfileInfoCard({
  title,
  icon,
  children,
  className,
}: ProfileInfoCardProps) {
  return (
    <Card className={cn('p-3 sm:p-4', className)}>
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        {icon && <div className="text-primary">{icon}</div>}
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </Card>
  );
}
