'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MemberRole } from '@/types/group';

/**
 * MemberRoleBadge component props
 */
interface MemberRoleBadgeProps {
  /** Member role */
  role: MemberRole;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Role color configuration
 */
const roleColors: Record<MemberRole, string> = {
  owner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  moderator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  member: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/**
 * Role labels
 */
const roleLabels: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Mod',
  member: 'Member',
};

/**
 * MemberRoleBadge component
 * 
 * A compact, mobile-friendly role badge for displaying member roles.
 * Uses responsive sizing and color variants.
 * 
 * @example
 * ```tsx
 * <MemberRoleBadge role="admin" />
 * ```
 */
export function MemberRoleBadge({ role, className }: MemberRoleBadgeProps) {
  // Don't show badge for regular members to reduce visual noise
  if (role === 'member') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'text-xs px-2 py-0.5',
        'rounded-full',
        'font-medium',
        'whitespace-nowrap',
        roleColors[role],
        className
      )}
    >
      {roleLabels[role]}
    </span>
  );
}

export default MemberRoleBadge;
