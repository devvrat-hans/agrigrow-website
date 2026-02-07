'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HighlightCard } from '@/components/common';
import { opacity, spacing, containerMaxWidth } from '@/lib/design-tokens';
import { useTranslation } from '@/hooks/useTranslation';

export function HeroSection() {
  const { t } = useTranslation();

  const highlights = [
    {
      label: t('landing.hero.highlights.aiPowered'),
      description: t('landing.hero.highlights.aiPoweredDesc'),
    },
    {
      label: t('landing.hero.highlights.communityDriven'),
      description: t('landing.hero.highlights.communityDrivenDesc'),
    },
    {
      label: t('landing.hero.highlights.expertVerified'),
      description: t('landing.hero.highlights.expertVerifiedDesc'),
    },
  ];

  return (
    <section className={`relative ${spacing.section.paddingTop} ${spacing.section.paddingBottom} px-6 min-h-[90vh] flex items-center`}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/landing-hero.jpg)' }}
      />
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-background"
        style={{ opacity: parseInt(opacity.overlay) / 100 }}
      />
      
      <div className={`${containerMaxWidth['7xl']} mx-auto relative z-10`}>
        <div className="max-w-3xl">
          <p className="text-primary font-medium mb-4">
            {t('landing.hero.tagline')}
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="text-foreground">{t('landing.hero.titlePart1')}</span>
            <span className="text-primary italic">{t('landing.hero.titleHighlight')}</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl">
            {t('landing.hero.description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-16">
            <Link href="/auth/signup">
              <Button variant="outline" size="lg">
                {t('landing.hero.learnMore')}
              </Button>
            </Link>
          </div>
        </div>

        {/* What we're building */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-border">
          {highlights.map((item) => (
            <HighlightCard
              key={item.label}
              label={item.label}
              description={item.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
