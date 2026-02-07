'use client';

import { ReactNode } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon,
  className = '',
}: FeatureCardProps) {
  return (
    <div className={`p-6 ${className}`}>
      {icon && (
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
