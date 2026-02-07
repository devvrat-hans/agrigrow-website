'use client';

import { Card, CardContent } from '@/components/ui/card';
import { opacity } from '@/lib/design-tokens';

interface HighlightCardProps {
  label: string;
  description: string;
  className?: string;
}

export function HighlightCard({
  label,
  description,
  className = '',
}: HighlightCardProps) {
  return (
    <Card 
      className={`border-0 shadow-none backdrop-blur-sm ${className}`}
      style={{ backgroundColor: `rgba(255, 255, 255, ${parseInt(opacity.backdrop) / 100})` }}
    >
      <CardContent className="p-4">
        <div className="text-sm font-medium text-primary mb-2">{label}</div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
