'use client';

import { Badge } from '@/components/ui/badge';
import { ProfileInfoCard } from './ProfileInfoCard';
import { BadgeList, formatBadgeText } from './BadgeList';

interface BusinessProfileCardsProps {
  /** Type of organization */
  organizationType?: string;
  /** Business focus areas */
  focusAreas?: string[];
  /** Additional class names */
  className?: string;
}

/**
 * Business/Organization-specific profile cards.
 */
export function BusinessProfileCards({
  organizationType,
  focusAreas,
  className,
}: BusinessProfileCardsProps) {
  return (
    <>
      {organizationType && (
        <ProfileInfoCard title="Organization Type" className={className}>
          <Badge variant="secondary">{formatBadgeText(organizationType)}</Badge>
        </ProfileInfoCard>
      )}

      {focusAreas && focusAreas.length > 0 && (
        <ProfileInfoCard title="Focus Areas" className={className}>
          <BadgeList items={focusAreas} variant="outline" />
        </ProfileInfoCard>
      )}
    </>
  );
}
