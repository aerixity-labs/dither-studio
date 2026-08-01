'use client'

import { Switch as SwitchPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        /**
         * `--primary` flips with the theme, so the stock component renders a pale
         * track with a dark knob once `dark` is on – the inverse of the intended
         * switch. The app is always dark, so both track colours are pinned here:
         * off sinks below the card and takes a visible edge to stay findable, on
         * lifts above it. The white knob is the constant in both.
         */
        'peer group/switch focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-input dark:data-checked:bg-input/80 dark:data-unchecked:bg-background dark:data-unchecked:border-input relative inline-flex shrink-0 items-center rounded-full border border-transparent px-px transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 active:scale-95 aria-invalid:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-4 data-[size=sm]:w-7',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        /**
         * White in both states and both themes, matching the slider handle.
         *
         * The travel is an explicit whole-pixel distance – track content width
         * minus the knob – rather than a `calc()` off the knob's own width. That
         * keeps the knob on the device-pixel grid and the inset an even 2px on
         * every side; fractional geometry is what made the gaps rasterise
         * unevenly, symmetric numbers notwithstanding.
         */
        className="pointer-events-none block rounded-full bg-white ring-1 ring-black/10 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[16px] group-data-[size=sm]/switch:data-checked:translate-x-[12px] group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
