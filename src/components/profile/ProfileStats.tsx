'use client';

import { cn } from '@/lib/utils';

interface ProfileStatsProps {
  /** Array of stats to display */
  stats: { label: string; value: string | number }[];
  /** Additional class names */
  className?: string;
}

/**
 * Profile stats grid component.
 * Mobile-responsive with proper touch targets.
 */
export function ProfileStats({ stats, className }: ProfileStatsProps) {
  if (!stats || stats.length === 0) return null;

  return (
    <div
      className={cn(
        'border-t border-border pt-4 mt-4 sm:pt-4 sm:mt-6',
        className
      )}
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
        {stats.map((stat) => (
          <div key={stat.label} className="min-h-[44px] flex flex-col justify-center">
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
