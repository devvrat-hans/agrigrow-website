'use client';

import { Button } from '@/components/ui/button';
import { HighlightCard } from '@/components/common';
import { opacity, spacing, containerMaxWidth } from '@/lib/design-tokens';

const highlights = [
  {
    label: 'AI-Powered',
    description: 'Smart crop diagnosis and recommendations tailored to your region',
  },
  {
    label: 'Community-Driven',
    description: 'Learn from farmers who have solved similar problems',
  },
  {
    label: 'Expert Verified',
    description: 'Content reviewed by agricultural scientists',
  },
];

export function HeroSection() {
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
            For Indian Farmers
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Modern Farming Starts With </span>
            <span className="text-primary italic">Trusted Knowledge</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl">
            Join a growing community of farmers using AI-powered insights and shared wisdom to make better decisions about crops, diseases, and yields.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-16">
            <Button variant="outline" size="lg">
              Learn More
            </Button>
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
