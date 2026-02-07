'use client';

import { ReactNode } from 'react';

interface InfoCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
}

export function InfoCard({
  title,
  description,
  icon,
  className = '',
}: InfoCardProps) {
  return (
    <div className={`flex gap-4 ${className}`}>
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
