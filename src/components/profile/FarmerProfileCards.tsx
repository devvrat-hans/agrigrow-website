'use client';

import { IconPlant } from '@tabler/icons-react';
import { ProfileInfoCard } from './ProfileInfoCard';
import { BadgeList } from './BadgeList';

interface FarmerProfileCardsProps {
  /** List of crops */
  crops?: string[];
  /** List of interests */
  interests?: string[];
  /** Additional class names */
  className?: string;
}

/**
 * Farmer-specific profile cards for crops and interests.
 */
export function FarmerProfileCards({
  crops,
  interests,
  className,
}: FarmerProfileCardsProps) {
  return (
    <>
      {crops && crops.length > 0 && (
        <ProfileInfoCard
          title="My Crops"
          icon={<IconPlant className="w-5 h-5" />}
          className={className}
        >
          <BadgeList items={crops} variant="secondary" />
        </ProfileInfoCard>
      )}
      
      {interests && interests.length > 0 && (
        <ProfileInfoCard title="Interests" className={className}>
          <BadgeList items={interests} variant="outline" />
        </ProfileInfoCard>
      )}
    </>
  );
}
