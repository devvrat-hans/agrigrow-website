'use client';

import { SectionHeader, FeatureCard } from '@/components/common';
import { spacing, containerMaxWidth } from '@/lib/design-tokens';

const features = [
  {
    title: 'AI Crop Diagnosis',
    description:
      'Upload a photo of your crop and get analysis of potential diseases, deficiencies, and recommended treatments.',
  },
  {
    title: 'Community Answers',
    description:
      'Ask questions and get solutions from experienced farmers who have faced similar challenges.',
  },
  {
    title: 'Crop Planning',
    description:
      'Get personalized recommendations on what to grow based on your soil, climate, and market conditions.',
  },
  {
    title: 'Expert Knowledge',
    description:
      'Access guides reviewed by agricultural scientists and KVK experts on best farming practices.',
  },
  {
    title: 'Local Languages',
    description:
      'Use the platform in Hindi, Marathi, or English - whichever you are comfortable with.',
  },
  {
    title: 'Works Offline',
    description:
      'Download guides and access key features even when internet connectivity is limited.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className={`${spacing.section.padding} bg-muted`}>
      <div className={`${containerMaxWidth['7xl']} mx-auto`}>
        <SectionHeader
          label="Features"
          title="What we are building"
          description="Simple tools designed for real farming problems, built with input from farmers across India."
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
