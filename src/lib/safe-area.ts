/**
 * Safe Area Utilities
 * 
 * Provides utility functions and CSS custom properties for handling safe areas
 * on notched devices (iPhone X+, Android devices with display cutouts).
 * 
 * Usage:
 * - CSS: Use safeAreaVar() in style objects or the exported CSS variables
 * - JavaScript: Use getSafeAreaInset() to get computed values
 * - Tailwind: Use pb-[env(safe-area-inset-bottom)] or the constants below
 */

/**
 * Safe area inset names
 */
export type SafeAreaInset = 'top' | 'right' | 'bottom' | 'left';

/**
 * CSS environment variable names for safe areas
 */
export const SAFE_AREA_VARS = {
  top: 'env(safe-area-inset-top)',
  right: 'env(safe-area-inset-right)',
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
} as const;

/**
 * CSS custom properties for common safe area patterns
 * These can be used in style objects or CSS-in-JS
 */
export const SAFE_AREA_STYLES = {
  /**
   * Padding that includes safe area insets
   */
  paddingTop: { paddingTop: 'env(safe-area-inset-top)' },
  paddingBottom: { paddingBottom: 'env(safe-area-inset-bottom)' },
  paddingLeft: { paddingLeft: 'env(safe-area-inset-left)' },
  paddingRight: { paddingRight: 'env(safe-area-inset-right)' },
  
  /**
   * All sides padding
   */
  paddingAll: {
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  },
  
  /**
   * Horizontal safe insets
   */
  paddingHorizontal: {
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  },
  
  /**
   * Vertical safe insets
   */
  paddingVertical: {
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
} as const;

/**
 * Get the CSS environment variable string for a safe area inset
 * @param inset - The safe area inset name
 * @returns CSS env() function string
 * 
 * @example
 * safeAreaVar('bottom') // Returns 'env(safe-area-inset-bottom)'
 */
export function safeAreaVar(inset: SafeAreaInset): string {
  return SAFE_AREA_VARS[inset];
}

/**
 * Create a CSS calc() expression combining a value with a safe area inset
 * @param inset - The safe area inset name
 * @param baseValue - Base value to add to the safe area (e.g., '16px', '1rem')
 * @returns CSS calc() expression string
 * 
 * @example
 * safeAreaCalc('bottom', '16px') // Returns 'calc(16px + env(safe-area-inset-bottom))'
 */
export function safeAreaCalc(inset: SafeAreaInset, baseValue: string): string {
  return `calc(${baseValue} + ${SAFE_AREA_VARS[inset]})`;
}

/**
 * Create a CSS max() expression for minimum value with safe area
 * Useful when you want at least a certain amount of padding
 * @param inset - The safe area inset name
 * @param minValue - Minimum value (e.g., '16px', '1rem')
 * @returns CSS max() expression string
 * 
 * @example
 * safeAreaMax('bottom', '20px') // Returns 'max(20px, env(safe-area-inset-bottom))'
 */
export function safeAreaMax(inset: SafeAreaInset, minValue: string): string {
  return `max(${minValue}, ${SAFE_AREA_VARS[inset]})`;
}

/**
 * Create a style object with padding-bottom that accounts for safe area
 * @param basePadding - Base padding value (default: '0px')
 * @returns Style object with calculated paddingBottom
 * 
 * @example
 * <div style={safeAreaBottomPadding('16px')}>Content</div>
 */
export function safeAreaBottomPadding(basePadding: string = '0px'): React.CSSProperties {
  return {
    paddingBottom: safeAreaCalc('bottom', basePadding),
  };
}

/**
 * Create a style object with padding-top that accounts for safe area
 * @param basePadding - Base padding value (default: '0px')
 * @returns Style object with calculated paddingTop
 */
export function safeAreaTopPadding(basePadding: string = '0px'): React.CSSProperties {
  return {
    paddingTop: safeAreaCalc('top', basePadding),
  };
}

/**
 * Create a style object with all safe area paddings
 * @param basePadding - Base padding for all sides (default: '0px')
 * @returns Style object with all safe area paddings
 */
export function safeAreaPaddingAll(basePadding: string = '0px'): React.CSSProperties {
  return {
    paddingTop: safeAreaCalc('top', basePadding),
    paddingBottom: safeAreaCalc('bottom', basePadding),
    paddingLeft: safeAreaCalc('left', basePadding),
    paddingRight: safeAreaCalc('right', basePadding),
  };
}

/**
 * Get the computed value of a safe area inset
 * Only works in browser environment after layout
 * @param inset - The safe area inset name
 * @returns The numeric value in pixels, or 0 if not available
 * 
 * @example
 * const bottomInset = getSafeAreaInset('bottom'); // e.g., 34 for iPhone X
 */
export function getSafeAreaInset(inset: SafeAreaInset): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  // Create a temporary element to measure the safe area
  const temp = document.createElement('div');
  temp.style.position = 'fixed';
  temp.style.visibility = 'hidden';
  temp.style.pointerEvents = 'none';
  
  // Set the dimension based on the inset we want to measure
  if (inset === 'top' || inset === 'bottom') {
    temp.style.height = `env(safe-area-inset-${inset})`;
  } else {
    temp.style.width = `env(safe-area-inset-${inset})`;
  }
  
  document.body.appendChild(temp);
  
  const value = inset === 'top' || inset === 'bottom'
    ? temp.offsetHeight
    : temp.offsetWidth;
    
  document.body.removeChild(temp);
  
  return value;
}

/**
 * Get all safe area inset values
 * @returns Object with all safe area inset values in pixels
 */
export function getAllSafeAreaInsets(): Record<SafeAreaInset, number> {
  return {
    top: getSafeAreaInset('top'),
    right: getSafeAreaInset('right'),
    bottom: getSafeAreaInset('bottom'),
    left: getSafeAreaInset('left'),
  };
}

/**
 * Check if the device has safe area insets
 * @returns true if any safe area inset is greater than 0
 */
export function hasSafeAreaInsets(): boolean {
  const insets = getAllSafeAreaInsets();
  return insets.top > 0 || insets.right > 0 || insets.bottom > 0 || insets.left > 0;
}

/**
 * Tailwind-compatible class strings for safe area handling
 * Use these in className props for consistent safe area handling
 */
export const SAFE_AREA_CLASSES = {
  /**
   * Padding with safe area on bottom
   * Usage: className={SAFE_AREA_CLASSES.paddingBottom}
   */
  paddingBottom: 'pb-[env(safe-area-inset-bottom)]',
  
  /**
   * Padding with safe area on top
   */
  paddingTop: 'pt-[env(safe-area-inset-top)]',
  
  /**
   * Padding with safe area on left and right
   */
  paddingHorizontal: 'pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]',
  
  /**
   * Minimum padding with safe area (using max)
   */
  minPaddingBottom: 'pb-[max(16px,env(safe-area-inset-bottom))]',
  minPaddingTop: 'pt-[max(16px,env(safe-area-inset-top))]',
  
  /**
   * Common bottom nav safe area padding
   */
  bottomNavPadding: 'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
} as const;

/**
 * CSS custom property names for use in stylesheets
 * Can be set on :root or any element
 */
export const SAFE_AREA_CSS_VARS = {
  '--safe-area-top': 'env(safe-area-inset-top)',
  '--safe-area-right': 'env(safe-area-inset-right)',
  '--safe-area-bottom': 'env(safe-area-inset-bottom)',
  '--safe-area-left': 'env(safe-area-inset-left)',
} as const;

/**
 * Generate CSS string with safe area custom properties
 * Can be injected into a style tag for global access
 * @returns CSS string defining safe area custom properties on :root
 */
export function generateSafeAreaCss(): string {
  return `
:root {
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-right: env(safe-area-inset-right);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
}
`.trim();
}
