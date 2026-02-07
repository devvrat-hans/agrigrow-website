'use client';

import { ReactNode } from 'react';
import { IconMapPin, IconLanguage } from '@tabler/icons-react';
import { ProfileInfoCard } from './ProfileInfoCard';
import { getLanguageDisplayName } from '@/constants/languages';

// State code to name mapping
const stateMap: Record<string, string> = {
  AP: 'Andhra Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JH: 'Jharkhand',
  KA: 'Karnataka',
  KL: 'Kerala',
  MP: 'Madhya Pradesh',
  MH: 'Maharashtra',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  PB: 'Punjab',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TS: 'Telangana',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UK: 'Uttarakhand',
  WB: 'West Bengal',
};

/**
 * Get readable language name from code.
 */
export function getLanguageName(code: string): string {
  return getLanguageDisplayName(code);
}

/**
 * Get readable state name from code.
 */
export function getStateName(code: string): string {
  return stateMap[code] || code;
}

interface ProfileDetailRowProps {
  /** Icon to display */
  icon: ReactNode;
  /** Main text/value */
  value: string;
  /** Label text below value */
  label: string;
}

/**
 * Single detail row with icon, value, and label.
 * Touch-friendly with min-height for comfortable tapping.
 */
export function ProfileDetailRow({ icon, value, label }: ProfileDetailRowProps) {
  return (
    <div className="flex items-center gap-3 min-h-[44px] py-1">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface ProfileDetailsCardProps {
  /** User's state code */
  state?: string;
  /** User's district */
  district?: string;
  /** User's language code */
  language: string;
  /** Additional class names */
  className?: string;
}

/**
 * Profile details card showing location and language.
 */
export function ProfileDetailsCard({
  state,
  district,
  language,
  className,
}: ProfileDetailsCardProps) {
  return (
    <ProfileInfoCard title="Details" className={className}>
      <div className="space-y-2 sm:space-y-3">
        {(state || district) && (
          <ProfileDetailRow
            icon={<IconMapPin className="w-4 h-4 sm:w-5 sm:h-5" />}
            value={`${district ? `${district}, ` : ''}${getStateName(state || '')}`}
            label="Location"
          />
        )}
        <ProfileDetailRow
          icon={<IconLanguage className="w-4 h-4 sm:w-5 sm:h-5" />}
          value={getLanguageName(language)}
          label="Preferred Language"
        />
      </div>
    </ProfileInfoCard>
  );
}
