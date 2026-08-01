import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@workspace/ui/lib/utils"

function Slider({
  className,
  ...props
}: SliderPrimitive.Root.Props<number>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none items-center py-2 select-none", className)}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full items-center py-1">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-input/50">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-foreground" />
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className="block size-4 rounded-full border border-input bg-background shadow-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
