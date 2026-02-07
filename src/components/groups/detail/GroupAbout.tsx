'use client';

import React from 'react';
import {
  IconCalendar,
  IconShieldCheck,
  IconCrown,
  IconMail,
  IconMapPin,
  IconPlant,
  IconListDetails,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveImage } from '@/components/common';
import { GroupData, MemberRole } from '@/types/group';
import { GroupRules } from './GroupRules';

/**
 * Admin/Moderator display item
 */
interface AdminInfo {
  id: string;
  name: string;
  role: MemberRole;
  avatar?: string;
}

/**
 * GroupAbout component props
 */
interface GroupAboutProps {
  /** Group data */
  group: GroupData;
  /** List of admins and moderators */
  admins?: AdminInfo[];
  /** Group rules */
  rules?: string[];
  /** Contact information */
  contactInfo?: {
    email?: string;
    location?: string;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Role badge configuration
 */
const roleBadges: Record<MemberRole, { label: string; color: string; icon: React.ReactNode }> = {
  owner: {
    label: 'Owner',
    color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    icon: <IconCrown className="w-3 h-3" />,
  },
  admin: {
    label: 'Admin',
    color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    icon: <IconShieldCheck className="w-3 h-3" />,
  },
  moderator: {
    label: 'Moderator',
    color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    icon: <IconShieldCheck className="w-3 h-3" />,
  },
  member: {
    label: 'Member',
    color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    icon: null,
  },
};

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get first letter for avatar fallback
 */
function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

/**
 * GroupAbout component
 * 
 * About tab content showing group information.
 * 
 * Features:
 * - Full description
 * - Rules list (expandable/collapsible)
 * - Admins/moderators list with role badges
 * - Group creation date
 * - Contact information (if any)
 * - Associated crops display
 * - Dark mode support
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupAbout({
  group,
  admins = [],
  rules = [],
  contactInfo,
  className,
}: GroupAboutProps) {
  const {
    name: _name,
    description,
    createdAt,
    crops = [],
  } = group;

  const hasRules = rules.length > 0;
  const hasAdmins = admins.length > 0;
  const hasContactInfo = contactInfo?.email || contactInfo?.location;
  const hasCrops = crops.length > 0;

  return (
    <div
      className={cn('space-y-4 sm:space-y-6', className)}
      role="tabpanel"
      id="tabpanel-about"
      aria-labelledby="tab-about"
    >
      {/* Description section */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <IconListDetails className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            About this group
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {description || 'No description provided.'}
          </p>
          
          {/* Creation date */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <IconCalendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Created on {formatDate(createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associated crops */}
      {hasCrops && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <IconPlant className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-500" />
              Associated Crops
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {crops.map((crop, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm"
                >
                  {crop}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules section */}
      {hasRules && (
        <Card>
          <CardContent className="p-3 sm:p-4 pt-4 sm:pt-6">
            <GroupRules rules={rules} />
          </CardContent>
        </Card>
      )}

      {/* Admins and moderators */}
      {hasAdmins && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <IconShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-500" />
              Admins & Moderators
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <ul className="space-y-2 sm:space-y-3">
              {admins.map((admin) => {
                const roleConfig = roleBadges[admin.role];
                
                return (
                  <li
                    key={admin.id}
                    className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {admin.avatar ? (
                        <ResponsiveImage
                          src={admin.avatar}
                          alt={admin.name}
                          containerClassName="w-8 h-8 sm:w-10 sm:h-10"
                          isAvatar
                          fallbackComponent={
                            <div className="w-full h-full rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-medium text-primary-700 dark:text-primary-300">
                                {getInitial(admin.name)}
                              </span>
                            </div>
                          }
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                          <span className="text-xs sm:text-sm font-medium text-primary-700 dark:text-primary-300">
                            {getInitial(admin.name)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Name and role */}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                        {admin.name}
                      </p>
                    </div>
                    
                    {/* Role badge */}
                    <Badge className={cn('flex items-center gap-1 text-xs', roleConfig.color)}>
                      {roleConfig.icon}
                      <span className="hidden sm:inline">{roleConfig.label}</span>
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Contact information */}
      {hasContactInfo && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <IconMail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="space-y-2 sm:space-y-3">
              {contactInfo?.email && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <IconMail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="text-sm sm:text-base text-primary-600 dark:text-primary-400 hover:underline truncate"
                  >
                    {contactInfo.email}
                  </a>
                </div>
              )}
              {contactInfo?.location && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <IconMapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {contactInfo.location}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GroupAbout;
