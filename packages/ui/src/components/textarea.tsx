import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Multi-line counterpart to `Input`, sharing its border/focus/invalid
 * treatment. Squared off rather than pill-shaped (`Input`'s `rounded-4xl`
 * reads wrong on a tall box) and vertically resizable only, so a caller's
 * column layout can't be dragged out of shape.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 resize-y rounded-2xl border border-input bg-input/30 px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
