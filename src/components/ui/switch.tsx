"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Mobile-optimized Switch/Toggle component
 * 
 * Uses proper sizing for touch targets (min 44px tap area) while
 * keeping the visual track and thumb proportional and circular.
 * 
 * Mobile: 52×28 track, 22×22 thumb (large touch-friendly target)
 * Desktop: 44×24 track, 18×18 thumb
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Base: inline flex, rounded pill, smooth transition
      "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
      "border-2 border-transparent shadow-sm transition-colors duration-200 ease-in-out",
      // Focus ring
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked/unchecked colors — green when on, grey when off
      "data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600",
      // Mobile-first sizing: 52×28
      "h-[28px] w-[52px]",
      // Desktop sizing: 44×24
      "sm:h-[24px] sm:w-[44px]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // Circular thumb with shadow
        "pointer-events-none block rounded-full bg-white shadow-lg ring-0",
        "transition-transform duration-200 ease-in-out",
        // Mobile thumb: 22×22, translate 24px when checked (52 - 22 - 3*2 = 24)
        "h-[22px] w-[22px]",
        "data-[state=unchecked]:translate-x-[3px] data-[state=checked]:translate-x-[26px]",
        // Desktop thumb: 18×18, translate 21px when checked (44 - 18 - 2.5*2 ≈ 21)
        "sm:h-[18px] sm:w-[18px]",
        "sm:data-[state=unchecked]:translate-x-[3px] sm:data-[state=checked]:translate-x-[22px]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
