import { cn } from '@/lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton component for loading states
 * 
 * @example
 * <Skeleton className="h-4 w-48" />
 * <Skeleton className="h-12 w-full rounded-lg" />
 */
function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
