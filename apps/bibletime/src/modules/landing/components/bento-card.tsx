import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"

import { useTranslation } from "@/modules/core/i18n"
import type { LandingCard, LandingCardId } from "@/modules/landing/interfaces"
import { ScreenshotFrame } from "@/modules/landing/components/screenshot-frame"
import { cn } from "@workspace/ui/lib/utils"

interface BentoCardProps {
  card: LandingCard
  isExpanded: boolean
  onToggle: (id: LandingCardId) => void
}

/**
 * One feature cell. The whole card is a single `<button>`, which is why
 * nothing inside it is ever a link or another button — nesting interactive
 * elements is invalid and breaks keyboard and screen-reader behavior. The
 * page's real actions live in the hero and the footer instead.
 */
export function BentoCard({ card, isExpanded, onToggle }: BentoCardProps) {
  const { t } = useTranslation()
  const ref = React.useRef<HTMLButtonElement>(null)
  const detailId = `landing-card-detail-${card.id}`

  // Keeps a card the visitor just opened in view when the grid is a single
  // column and the card grew below the fold. `block: "nearest"` means this
  // does nothing when the card is already fully visible, which is the usual
  // case on wide viewports.
  React.useEffect(() => {
    if (!isExpanded) return
    if (window.matchMedia("(min-width: 768px)").matches) return

    ref.current?.scrollIntoView({ block: "nearest" })
  }, [isExpanded])

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={isExpanded}
      aria-controls={isExpanded ? detailId : undefined}
      onClick={() => onToggle(card.id)}
      // Named so a view transition morphs each card between its collapsed
      // and expanded cell instead of cross-fading the whole grid.
      style={{ viewTransitionName: `landing-card-${card.id}` }}
      className={cn(
        "group relative flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-left outline-none transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-6",
        // Expanding takes the whole row rather than a taller cell: grid rows
        // here are sized by their content, so a card spanning two of them
        // inherits its neighbours' height and opens as a mostly-empty box.
        isExpanded
          ? "md:col-span-2 lg:col-span-4 lg:flex-row lg:items-center lg:gap-10"
          : card.span === "md" && "md:col-span-2"
      )}
    >
      <div className={cn("flex flex-col gap-2", isExpanded && "lg:flex-1 lg:justify-center")}>
        <h2
          className={cn(
            "pr-8 font-bold text-balance",
            isExpanded ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
          )}
        >
          {t(card.titleKey)}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">{t(card.blurbKey)}</p>

        {isExpanded ? (
          <p
            id={detailId}
            className="mt-2 max-w-prose text-sm text-pretty text-foreground/80 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out-expo"
          >
            {t(card.detailKey)}
          </p>
        ) : null}
      </div>

      <ScreenshotFrame
        src={card.image}
        alt={t(card.altKey)}
        aspect={card.aspect}
        // Expanded, the frame is sized by height so a tall shot and a wide
        // one take the same band of the row instead of one of them
        // dictating how far the card opens.
        className={cn("mt-auto", isExpanded && "lg:mt-0 lg:h-72 lg:w-auto lg:shrink-0")}
      />

      <span
        aria-hidden
        className={cn(
          "absolute top-5 right-5 text-signal transition-transform sm:top-6 sm:right-6",
          isExpanded && "rotate-180"
        )}
      >
        <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4" />
      </span>

      <span className="sr-only">{isExpanded ? t("landing.collapse") : t("landing.expand")}</span>
    </button>
  )
}
