'use client';

import { Logo, FooterLinkGroup } from '@/components/common';
import { containerMaxWidth } from '@/lib/design-tokens';
import { useTranslation } from '@/hooks/useTranslation';

export function Footer() {
  const { t } = useTranslation();

  const companyLinks = [
    { label: t('landing.footer.about'), href: '#' },
    { label: t('landing.footer.blog'), href: '#' },
    { label: t('landing.footer.careers'), href: '#' },
    { label: t('landing.footer.contact'), href: '#' },
  ];

  const legalLinks = [
    { label: t('landing.footer.privacy'), href: '#' },
    { label: t('landing.footer.terms'), href: '#' },
    { label: t('landing.footer.cookies'), href: '#' },
  ];

  return (
    <footer className="bg-muted border-t border-border py-12 px-6">
      <div className={`${containerMaxWidth['7xl']} mx-auto`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Logo size="md" href="/" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('landing.footer.tagline')}
            </p>
          </div>

          <FooterLinkGroup title={t('landing.footer.company')} links={companyLinks} />
          <FooterLinkGroup title={t('landing.footer.legal')} links={legalLinks} />
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t('landing.footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
