'use client';

import { SectionHeader, FeatureCard } from '@/components/common';
import { spacing, containerMaxWidth } from '@/lib/design-tokens';
import { useTranslation } from '@/hooks/useTranslation';

export function FeaturesSection() {
  const { t } = useTranslation();

  const features = [
    {
      title: t('landing.features.aiCropDiagnosis'),
      description: t('landing.features.aiCropDiagnosisDesc'),
    },
    {
      title: t('landing.features.communityAnswers'),
      description: t('landing.features.communityAnswersDesc'),
    },
    {
      title: t('landing.features.cropPlanning'),
      description: t('landing.features.cropPlanningDesc'),
    },
    {
      title: t('landing.features.expertKnowledge'),
      description: t('landing.features.expertKnowledgeDesc'),
    },
    {
      title: t('landing.features.localLanguages'),
      description: t('landing.features.localLanguagesDesc'),
    },
    {
      title: t('landing.features.worksOffline'),
      description: t('landing.features.worksOfflineDesc'),
    },
  ];

  return (
    <section id="features" className={`${spacing.section.padding} bg-muted`}>
      <div className={`${containerMaxWidth['7xl']} mx-auto`}>
        <SectionHeader
          label={t('landing.features.label')}
          title={t('landing.features.title')}
          description={t('landing.features.description')}
          className="mb-12"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden">
          {features.map((feature, index) => (
            <div key={index} className="bg-background">
              <FeatureCard title={feature.title} description={feature.description} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
