'use client';

import React, { 
  ReactNode, 
  forwardRef, 
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  HTMLAttributes,
  MouseEvent,
  KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimum touch target size per Apple/Google accessibility guidelines
 * Apple recommends 44x44 points, Google Material Design recommends 48x48dp
 * We use 44px as the minimum to satisfy both guidelines
 */
const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Base props shared across all variants
 */
interface TouchTargetBaseProps {
  /** Child elements to render inside the touch target */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether the touch target is disabled */
  disabled?: boolean;
  /** Minimum size in pixels (default: 44px per accessibility guidelines) */
  minSize?: number;
  /** Whether to show visual feedback on press */
  showPressEffect?: boolean;
  /** Custom aria-label for accessibility */
  'aria-label'?: string;
}

/**
 * Props for button variant
 */
interface TouchTargetButtonProps 
  extends TouchTargetBaseProps, 
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'disabled'> {
  /** Render as a button element */
  as?: 'button';
  /** Click handler */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Keyboard handler */
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * Props for anchor variant
 */
interface TouchTargetAnchorProps 
  extends TouchTargetBaseProps,
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className'> {
  /** Render as an anchor element */
  as: 'a';
  /** Link destination */
  href: string;
  /** Click handler */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Props for div variant (for wrapping non-interactive content)
 */
interface TouchTargetDivProps 
  extends TouchTargetBaseProps,
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'> {
  /** Render as a div element */
  as: 'div';
  /** Click handler */
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

/**
 * Union of all possible props
 */
type TouchTargetProps = TouchTargetButtonProps | TouchTargetAnchorProps | TouchTargetDivProps;

/**
 * Type guard for button props
 */
function isButtonProps(props: TouchTargetProps): props is TouchTargetButtonProps {
  return props.as === undefined || props.as === 'button';
}

/**
 * Type guard for anchor props
 */
function isAnchorProps(props: TouchTargetProps): props is TouchTargetAnchorProps {
  return props.as === 'a';
}

/**
 * TouchTarget Component
 * 
 * A wrapper component that ensures interactive elements meet the minimum
 * touch target size of 44x44px as recommended by Apple's Human Interface
 * Guidelines and Google's Material Design accessibility standards.
 * 
 * This component helps prevent frustrating "missed taps" on mobile devices
 * by ensuring all interactive elements have adequate tap areas.
 * 
 * Features:
 * - Enforces minimum 44x44px touch area (configurable)
 * - Supports button, anchor, and div elements
 * - Includes keyboard accessibility (Enter/Space for buttons)
 * - Optional visual press feedback
 * - Proper focus states for accessibility
 * 
 * @example
 * // Basic button usage
 * <TouchTarget onClick={() => handleClick()}>
 *   <IconHeart size={20} />
 * </TouchTarget>
 * 
 * @example
 * // As an anchor/link
 * <TouchTarget as="a" href="/profile">
 *   <IconUser size={20} />
 * </TouchTarget>
 * 
 * @example
 * // With custom size and press effect
 * <TouchTarget 
 *   minSize={48} 
 *   showPressEffect 
 *   onClick={handleAction}
 * >
 *   <span>Tap me</span>
 * </TouchTarget>
 */
const TouchTarget = forwardRef<
  HTMLButtonElement | HTMLAnchorElement | HTMLDivElement,
  TouchTargetProps
>((props, ref) => {
  const {
    children,
    className,
    disabled = false,
    minSize = MIN_TOUCH_TARGET_SIZE,
    showPressEffect = true,
    'aria-label': ariaLabel,
    ...restProps
  } = props;

  // Common styles for all variants
  const commonStyles = cn(
    // Flexbox centering
    'inline-flex items-center justify-center',
    // Minimum touch target size
    // Using inline style for dynamic minSize, but providing base class
    'touch-manipulation',
    // Focus styles for accessibility
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    // Transition for smooth interactions
    'transition-all duration-150',
    // Press effect (scale down slightly)
    showPressEffect && !disabled && 'active:scale-95',
    // Disabled state
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    // User selection prevention for better UX
    'select-none',
    // Additional classes
    className
  );

  // Inline styles for minimum size (allows dynamic minSize prop)
  const sizeStyles: React.CSSProperties = {
    minWidth: `${minSize}px`,
    minHeight: `${minSize}px`,
  };

  // Render button variant
  if (isButtonProps(props)) {
    const { onClick, onKeyDown, type = 'button', ...buttonRest } = restProps as Omit<TouchTargetButtonProps, keyof TouchTargetBaseProps>;
    
    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        type={type}
        className={commonStyles}
        style={sizeStyles}
        disabled={disabled}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        {...buttonRest}
      >
        {children}
      </button>
    );
  }

  // Render anchor variant
  if (isAnchorProps(props)) {
    const { href, onClick, target, rel, ...anchorRest } = restProps as Omit<TouchTargetAnchorProps, keyof TouchTargetBaseProps | 'as'>;
    
    // Add security attributes for external links
    const securityRel = target === '_blank' ? 'noopener noreferrer' : rel;
    
    return (
      <a
        ref={ref as React.ForwardedRef<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        className={commonStyles}
        style={sizeStyles}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        target={target}
        rel={securityRel}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        {...anchorRest}
      >
        {children}
      </a>
    );
  }

  // Render div variant
  const { onClick, role = 'button', tabIndex = 0, ...divRest } = restProps as Omit<TouchTargetDivProps, keyof TouchTargetBaseProps | 'as'>;
  
  // Handle keyboard interaction for div-as-button
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event as unknown as MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      ref={ref as React.ForwardedRef<HTMLDivElement>}
      className={commonStyles}
      style={sizeStyles}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      role={role}
      tabIndex={disabled ? -1 : tabIndex}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      {...divRest}
    >
      {children}
    </div>
  );
});

TouchTarget.displayName = 'TouchTarget';

export { TouchTarget, MIN_TOUCH_TARGET_SIZE };
export type { TouchTargetProps, TouchTargetButtonProps, TouchTargetAnchorProps, TouchTargetDivProps };
