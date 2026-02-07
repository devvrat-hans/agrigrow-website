'use client';

import { ProfileInfoCard } from './ProfileInfoCard';
import { BadgeList, formatBadgeText } from './BadgeList';

interface StudentProfileCardsProps {
  /** Student's degree program */
  degree?: string;
  /** College/university name */
  collegeName?: string;
  /** Year of study */
  yearOfStudy?: string;
  /** Academic background */
  background?: string;
  /** Areas of interest */
  interests?: string[];
  /** Purposes for using the platform */
  purposes?: string[];
  /** Additional class names */
  className?: string;
}

/**
 * Student-specific profile cards for academic info and interests.
 */
export function StudentProfileCards({
  degree,
  collegeName,
  yearOfStudy,
  background,
  interests,
  purposes,
  className,
}: StudentProfileCardsProps) {
  const hasAcademicDetails = degree || collegeName || yearOfStudy || background;

  return (
    <>
      {hasAcademicDetails && (
        <ProfileInfoCard title="Academic Details" className={className}>
          <div className="space-y-2">
            {degree && (
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Degree:</span>{' '}
                {formatBadgeText(degree)}
              </p>
            )}
            {collegeName && (
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">College:</span> {collegeName}
              </p>
            )}
            {yearOfStudy && (
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Year:</span>{' '}
                {formatBadgeText(yearOfStudy)}
              </p>
            )}
            {background && (
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Background:</span>{' '}
                {formatBadgeText(background)}
              </p>
            )}
          </div>
        </ProfileInfoCard>
      )}

      {interests && interests.length > 0 && (
        <ProfileInfoCard title="Areas of Interest" className={className}>
          <BadgeList items={interests} variant="outline" />
        </ProfileInfoCard>
      )}

      {purposes && purposes.length > 0 && (
        <ProfileInfoCard title="Platform Purposes" className={className}>
          <BadgeList items={purposes} variant="secondary" />
        </ProfileInfoCard>
      )}
    </>
  );
}
