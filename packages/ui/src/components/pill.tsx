import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const pillVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        signal: "border-transparent bg-signal/10 text-signal",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Pill({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return (
    <span
      data-slot="pill"
      className={cn(pillVariants({ variant, className }))}
      {...props}
    />
  )
}

function PillDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="pill-dot"
      className={cn("size-1.5 shrink-0 rounded-full bg-current", className)}
      {...props}
    />
  )
}

export { Pill, PillDot, pillVariants }
