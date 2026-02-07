'use client';

import Image from 'next/image';
import { Logo } from '@/components/common';
import { useTranslation } from '@/hooks/useTranslation';

interface AuthBrandingSectionProps {
  title: string;
  description: string;
}

export function AuthBrandingSection({ title, description }: AuthBrandingSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
      {/* Background Image */}
      <Image
        src="/landing-hero.jpg"
        alt="Agriculture background"
        fill
        className="object-cover"
        priority
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/75 to-primary/65" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center w-full p-12">
        <div className="max-w-md text-center">
          <div className="mb-10 flex justify-center">
            <Logo size="lg" variant="light" href={undefined} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-white/90 leading-relaxed text-lg">
            {description}
          </p>
          
          {/* Trust Indicator */}
          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-3 text-white/80">
              <span className="text-2xl">🌾</span>
              <span className="text-sm font-medium">{t('auth.trustedByFarmers')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
