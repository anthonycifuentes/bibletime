/**
 * Ported from the MIT-licensed beui `overflow-actions` block
 * (https://beui.dev/components/blocks/overflow-actions) rather than installed
 * via `npx shadcn add` — the CLI writes to an app-local path and pulls in
 * `lucide-react`, which this repo does not use.
 *
 * Two deliberate deviations from upstream:
 * - `OverflowActionItem.icon` stays a `ReactNode` supplied by the caller, so
 *   this primitive is icon-library-agnostic (call sites pass `HugeiconsIcon`).
 *   The one exception is the toggle, where the icon *is* the state signal.
 * - Unavailable actions are rendered disabled, never unmounted, so a rail's
 *   width does not change as its actions come and go.
 */
import { useId, useState } from "react"
import type { ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"

import { cn } from "@workspace/ui/lib/utils"

const SHELL_TRANSITION = {
  type: "spring",
  stiffness: 220,
  damping: 17,
  mass: 0.85,
} as const

const ICON_TRANSITION = { duration: 0.18 } as const

const INSTANT = { duration: 0 } as const

export type OverflowActionsSize = "sm" | "md"

export interface OverflowActionItem {
  /** Stable identifier reported back through `onAction`. */
  id: string
  label: ReactNode
  icon?: ReactNode
  onClick?: () => void
  /** Renders the pill disabled — it keeps its slot but reports no activation. */
  disabled?: boolean
  ariaLabel?: string
}

export interface OverflowActionsClassNames {
  root?: string
  track?: string
  action?: string
  primaryAction?: string
  overflowAction?: string
  toggle?: string
  icon?: string
  label?: string
}

const trackVariants = cva(
  "inline-flex items-center rounded-full border border-border bg-background",
  {
    variants: {
      size: {
        sm: "p-1 text-xs",
        md: "p-1.5 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  }
)

/**
 * Each pill group carries its own trailing padding instead of the track using
 * `gap` — a collapsed overflow group is zero-width and `overflow-hidden`, so a
 * track-level gap would leave a stray sliver of space beside the toggle.
 */
const rowVariants = cva("flex items-center", {
  variants: {
    size: {
      sm: "gap-1 pr-1",
      md: "gap-1.5 pr-1.5",
    },
  },
  defaultVariants: { size: "md" },
})

const actionVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap text-foreground transition-colors outline-none select-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        sm: "h-8 min-w-8 gap-1.5 px-3",
        md: "h-9 min-w-9 gap-2 px-3.5",
      },
    },
    defaultVariants: { size: "md" },
  }
)

const toggleVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-9 w-9",
      },
    },
    defaultVariants: { size: "md" },
  }
)

export interface OverflowActionsProps
  extends VariantProps<typeof trackVariants> {
  /** Always visible, on both sides of the toggle's state. */
  primaryActions: OverflowActionItem[]
  /** Hidden until the rail is expanded. */
  overflowActions: OverflowActionItem[]
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  onAction?: (item: OverflowActionItem) => void
  collapseOnAction?: boolean
  size?: OverflowActionsSize
  openLabel?: string
  closeLabel?: string
  className?: string
  classNames?: OverflowActionsClassNames
}

/**
 * A connected pill rail: a row of action pills that springs open from — and
 * collapses back into — a single toggle. Collapsed, the toggle shows a
 * three-dots icon; expanded, it shows a close icon.
 */
export function OverflowActions({
  primaryActions,
  overflowActions,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onAction,
  collapseOnAction = false,
  size = "md",
  openLabel = "Show extra actions",
  closeLabel = "Hide extra actions",
  className,
  classNames,
}: OverflowActionsProps) {
  const overflowId = useId()
  const reduced = useReducedMotion()
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

  const isExpanded = expanded ?? internalExpanded

  const setExpanded = (next: boolean) => {
    if (expanded === undefined) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  const activate = (item: OverflowActionItem) => {
    if (item.disabled) return
    item.onClick?.()
    onAction?.(item)
    if (collapseOnAction) setExpanded(false)
  }

  const renderAction = (item: OverflowActionItem, isOverflow: boolean) => (
    <button
      key={item.id}
      type="button"
      data-slot={isOverflow ? "overflow-action" : "primary-action"}
      disabled={item.disabled}
      aria-label={item.ariaLabel}
      tabIndex={isOverflow && !isExpanded ? -1 : undefined}
      onClick={() => activate(item)}
      className={cn(
        actionVariants({ size }),
        classNames?.action,
        isOverflow ? classNames?.overflowAction : classNames?.primaryAction
      )}
    >
      {item.icon ? (
        <span
          data-slot="overflow-action-icon"
          aria-hidden
          className={cn("inline-flex items-center", classNames?.icon)}
        >
          {item.icon}
        </span>
      ) : null}
      <span data-slot="overflow-action-label" className={classNames?.label}>
        {item.label}
      </span>
    </button>
  )

  return (
    <div
      data-slot="overflow-actions"
      className={cn("inline-flex", className, classNames?.root)}
    >
      <div
        data-slot="overflow-actions-track"
        className={cn(trackVariants({ size }), classNames?.track)}
      >
        {primaryActions.length > 0 ? (
          <div className={rowVariants({ size })}>
            {primaryActions.map((item) => renderAction(item, false))}
          </div>
        ) : null}

        <motion.div
          id={overflowId}
          initial={false}
          animate={{ width: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
          transition={reduced ? INSTANT : SHELL_TRANSITION}
          className="overflow-hidden"
          aria-hidden={!isExpanded}
          inert={!isExpanded}
        >
          <div className={rowVariants({ size })}>
            {overflowActions.map((item) => renderAction(item, true))}
          </div>
        </motion.div>

        <button
          type="button"
          data-slot="overflow-actions-toggle"
          aria-expanded={isExpanded}
          aria-controls={overflowId}
          aria-label={isExpanded ? closeLabel : openLabel}
          onClick={() => setExpanded(!isExpanded)}
          className={cn(toggleVariants({ size }), classNames?.toggle)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isExpanded ? "close" : "open"}
              aria-hidden
              className="inline-flex items-center"
              initial={reduced ? false : { opacity: 0, filter: "blur(3px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, filter: "blur(3px)" }}
              transition={reduced ? INSTANT : ICON_TRANSITION}
            >
              <HugeiconsIcon
                icon={isExpanded ? Cancel01Icon : MoreHorizontalIcon}
                strokeWidth={2}
              />
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </div>
  )
}
