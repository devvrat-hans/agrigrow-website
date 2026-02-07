'use client';

import { ReactNode, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface TouchButtonProps {
  /** Button content */
  children: ReactNode;
  /** Click handler */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?: ButtonVariant;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Additional class names */
  className?: string;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Map internal variants to shadcn/ui Button variants.
 */
const variantMap: Record<ButtonVariant, 'default' | 'secondary' | 'ghost'> = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
};

/**
 * TouchButton Component
 *
 * Touch-friendly button wrapper with proper touch targets and feedback.
 * Minimum height of 44px on mobile for accessibility.
 * Includes scale animation for touch feedback.
 *
 * @example
 * <TouchButton onClick={handleSubmit} variant="primary" fullWidth>
 *   Analyze Crop
 * </TouchButton>
 */
export function TouchButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
}: TouchButtonProps) {
  return (
    <Button
      type={type}
      variant={variantMap[variant]}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[44px] sm:min-h-[40px]',
        'active:scale-[0.98] transition-transform',
        fullWidth && 'w-full',
        className
      )}
    >
      {children}
    </Button>
  );
}
