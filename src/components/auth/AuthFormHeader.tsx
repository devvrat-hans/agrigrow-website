'use client';

interface AuthFormHeaderProps {
  title: string;
  description: string;
}

export function AuthFormHeader({ title, description }: AuthFormHeaderProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {title}
      </h1>
      <p className="text-muted-foreground mb-8">
        {description}
      </p>
    </>
  );
}
