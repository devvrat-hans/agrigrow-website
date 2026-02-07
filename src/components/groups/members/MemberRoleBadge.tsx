'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MemberRole } from '@/types/group';
import {
  IconCrown,
  IconShield,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';

interface MemberRoleBadgeProps {
  /** Member role */
  role: MemberRole;
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show icon */
  showIcon?: boolean;
  /** Whether to show label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Role configuration with colors and labels
 */
const roleConfig: Record<
  MemberRole,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    borderColor: string;
    darkBgColor: string;
    darkTextColor: string;
  }
> = {
  owner: {
    label: 'Owner',
    icon: IconCrown,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    darkBgColor: 'dark:bg-amber-900/30',
    darkTextColor: 'dark:text-amber-400',
  },
  admin: {
    label: 'Admin',
    icon: IconShield,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    darkBgColor: 'dark:bg-blue-900/30',
    darkTextColor: 'dark:text-blue-400',
  },
  moderator: {
    label: 'Moderator',
    icon: IconShieldCheck,
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    darkBgColor: 'dark:bg-emerald-900/30',
    darkTextColor: 'dark:text-emerald-400',
  },
  member: {
    label: 'Member',
    icon: IconUser,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
    darkBgColor: 'dark:bg-gray-800',
    darkTextColor: 'dark:text-gray-400',
  },
};

/**
 * Size configurations for the badge
 */
const sizeConfig = {
  sm: {
    padding: 'px-1.5 py-0.5',
    text: 'text-xs',
    iconSize: 'h-3 w-3',
    gap: 'gap-0.5',
  },
  md: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    iconSize: 'h-3.5 w-3.5',
    gap: 'gap-1',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    iconSize: 'h-4 w-4',
    gap: 'gap-1.5',
  },
};

/**
 * MemberRoleBadge Component
 * 
 * Styled badge component for displaying member roles with appropriate colors:
 * - Owner: Gold/Amber
 * - Admin: Blue
 * - Moderator: Green/Emerald
 * - Member: Gray
 * 
 * @example
 * <MemberRoleBadge role="admin" size="md" showIcon />
 */
export function MemberRoleBadge({
  role,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className,
}: MemberRoleBadgeProps) {
  const config = roleConfig[role];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  // If neither icon nor label is shown, default to showing label
  const shouldShowLabel = showLabel || !showIcon;
  const shouldShowIcon = showIcon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        sizeStyles.padding,
        sizeStyles.text,
        sizeStyles.gap,
        config.bgColor,
        config.textColor,
        config.borderColor,
        config.darkBgColor,
        config.darkTextColor,
        'dark:border-opacity-50',
        className
      )}
    >
      {shouldShowIcon && <Icon className={sizeStyles.iconSize} />}
      {shouldShowLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Get role priority for sorting (higher is more important)
 */
export function getRolePriority(role: MemberRole): number {
  const priorities: Record<MemberRole, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
  };
  return priorities[role];
}

/**
 * Check if role1 can manage role2 (has higher privilege)
 */
export function canManageRole(
  managerRole: MemberRole,
  targetRole: MemberRole
): boolean {
  return getRolePriority(managerRole) > getRolePriority(targetRole);
}

/**
 * Get available roles that a manager can assign
 */
export function getAssignableRoles(managerRole: MemberRole): MemberRole[] {
  const allRoles: MemberRole[] = ['member', 'moderator', 'admin'];
  const managerPriority = getRolePriority(managerRole);
  
  return allRoles.filter(role => getRolePriority(role) < managerPriority);
}

export default MemberRoleBadge;
