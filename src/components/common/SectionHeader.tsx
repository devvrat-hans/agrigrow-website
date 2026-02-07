'use client';

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeader({
  label,
  title,
  description,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {label && (
        <p className="text-primary font-medium mb-3">{label}</p>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
