/**
 * Design Tokens for Agrigrow
 * Centralized file for colors, z-indices, spacing, and other design constants
 */

// Z-Index Scale
export const zIndex = {
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  navbar: 50,
} as const;

// Shadow Variants (using Tailwind classes)
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  none: 'shadow-none',
} as const;

// Border Radius (using Tailwind classes)
export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

// Transition Durations (using Tailwind classes)
export const transitions = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
} as const;

// Opacity Values
export const opacity = {
  overlay: '50', // Used for hero overlay
  backdrop: '80', // Used for modal backdrops
  disabled: '50',
  muted: '60',
} as const;

// Breakpoints (for reference, matches Tailwind defaults)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Container Max Widths
export const containerMaxWidth = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
} as const;

// Spacing Values (for padding/margin consistency)
export const spacing = {
  section: {
    padding: 'py-16 md:py-24 px-6',
    paddingTop: 'pt-24 md:pt-32',
    paddingBottom: 'pb-16 md:pb-24',
  },
  container: 'max-w-7xl mx-auto',
} as const;

// Typography Scale (for reference)
export const typography = {
  heading: {
    h1: 'text-4xl md:text-5xl lg:text-6xl font-bold',
    h2: 'text-3xl md:text-4xl font-bold',
    h3: 'text-lg font-semibold',
    h4: 'text-sm font-semibold',
  },
  body: {
    lg: 'text-lg',
    base: 'text-base',
    sm: 'text-sm',
    xs: 'text-xs',
  },
} as const;

export type ZIndex = typeof zIndex;
export type Shadows = typeof shadows;
export type BorderRadius = typeof borderRadius;
export type Transitions = typeof transitions;
export type Opacity = typeof opacity;
export type Breakpoints = typeof breakpoints;
export type ContainerMaxWidth = typeof containerMaxWidth;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
