'use client';

import { IconPlant } from '@tabler/icons-react';
import { ProfileInfoCard } from './ProfileInfoCard';
import { BadgeList } from './BadgeList';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();

  return (
    <>
      {crops && crops.length > 0 && (
        <ProfileInfoCard
          title={t('profile.myCrops')}
          icon={<IconPlant className="w-5 h-5" />}
          className={className}
        >
          <BadgeList items={crops} variant="secondary" />
        </ProfileInfoCard>
      )}
      
      {interests && interests.length > 0 && (
        <ProfileInfoCard title={t('profile.interests')} className={className}>
          <BadgeList items={interests} variant="outline" />
        </ProfileInfoCard>
      )}
    </>
  );
}
