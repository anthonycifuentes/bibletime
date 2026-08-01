import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** Applies the hover lift/border/shadow treatment, for cards that act as links or buttons. */
  interactive?: boolean
}) {
  return (
    <div
      data-slot="card"
      data-interactive={interactive || undefined}
      className={cn(
        "flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 text-card-foreground",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-md",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-medium text-foreground", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}
