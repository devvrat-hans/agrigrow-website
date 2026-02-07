'use client';

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export function AuthTermsText() {
  const { t } = useTranslation();

  return (
    <p className="text-xs text-muted-foreground text-center">
      {t('auth.termsPrefix')}{' '}
      <Link href="/terms" className="text-primary hover:underline">
        {t('auth.termsOfService')}
      </Link>{' '}
      {t('common.and')}{' '}
      <Link href="/privacy" className="text-primary hover:underline">
        {t('auth.privacyPolicy')}
      </Link>
    </p>
  );
}
