'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabPanelProps {
  /** Panel content */
  children: ReactNode;
  /** Whether this panel is currently active */
  isActive: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * TabPanel Component
 *
 * Content panel for tabs with smooth fade-in animation.
 * Only renders children when active.
 *
 * @example
 * <TabPanel isActive={activeTab === 'diseases'}>
 *   <DiseasesList diseases={diseases} />
 * </TabPanel>
 */
export function TabPanel({
  children,
  isActive,
  className,
}: TabPanelProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div
      className={cn(
        'p-3 sm:p-4',
        'animate-in fade-in-0 duration-200',
        className
      )}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
