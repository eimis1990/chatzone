'use client'

import * as React from 'react'
import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@/lib/utils'

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('relative w-full', className)}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full touch-none items-center py-1.5 select-none">
        <SliderPrimitive.Track className="h-2 w-full rounded-full bg-muted select-none">
          <SliderPrimitive.Indicator className="h-full rounded-full bg-primary select-none" />
          <SliderPrimitive.Thumb className="size-4 rounded-full bg-background shadow-sm outline outline-2 outline-primary transition-[outline-width] select-none hover:outline-[3px] focus-visible:outline-[3px]" />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
