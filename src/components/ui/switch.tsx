"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Switch/Toggle component (shadcn/ui style)
 * 
 * Compact, clean toggle with good mobile touch targets.
 * 
 * Mobile: 40×22 track, 18×18 thumb
 * Desktop: 36×20 track, 16×16 thumb
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
      // Mobile sizing: 40×22
      "h-[22px] w-[40px]",
      // Desktop sizing: 36×20
      "sm:h-[20px] sm:w-[36px]",
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
        // Mobile thumb: 18×18
        "h-[18px] w-[18px]",
        "data-[state=unchecked]:translate-x-[1px] data-[state=checked]:translate-x-[19px]",
        // Desktop thumb: 16×16
        "sm:h-[16px] sm:w-[16px]",
        "sm:data-[state=unchecked]:translate-x-[1px] sm:data-[state=checked]:translate-x-[17px]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
