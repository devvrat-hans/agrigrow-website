'use client';

import { SectionHeader, InfoCard } from '@/components/common';
import { spacing, containerMaxWidth } from '@/lib/design-tokens';
import { useTranslation } from '@/hooks/useTranslation';

export function AboutSection() {
  const { t } = useTranslation();

  const aboutFeatures = [
    {
      title: t('landing.about.trustedInfo'),
      description: t('landing.about.trustedInfoDesc'),
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: t('landing.about.farmerCommunity'),
      description: t('landing.about.farmerCommunityDesc'),
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: t('landing.about.multipleLanguages'),
      description: t('landing.about.multipleLanguagesDesc'),
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
    },
    {
      title: t('landing.about.mobileFirst'),
      description: t('landing.about.mobileFirstDesc'),
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="about" className={`${spacing.section.padding} bg-background`}>
      <div className={`${containerMaxWidth['7xl']} mx-auto`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionHeader
              label={t('landing.about.label')}
              title={t('landing.about.title')}
              className="mb-6"
            />
            
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {t('landing.about.paragraph1')}
            </p>
            
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {t('landing.about.paragraph2')}
            </p>


          </div>

          <div className="space-y-6">
            {aboutFeatures.map((feature) => (
              <InfoCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
