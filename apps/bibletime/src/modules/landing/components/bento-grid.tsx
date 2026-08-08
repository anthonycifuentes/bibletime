import * as React from "react"

import type { LandingCardId } from "@/modules/landing/interfaces"
import { BentoCard } from "@/modules/landing/components/bento-card"
import { LandingHero } from "@/modules/landing/components/landing-hero"
import { LANDING_CARDS } from "@/modules/landing/lib/landing-content"
import { runViewTransition } from "@/modules/landing/lib/run-view-transition"

/**
 * The page's one piece of state: which card is open, or none. Holding it
 * here — rather than in each card — is what makes "only one at a time"
 * true by construction instead of by coordination.
 */
export function BentoGrid() {
  const [expandedId, setExpandedId] = React.useState<LandingCardId | null>(null)

  const toggle = React.useCallback((id: LandingCardId) => {
    runViewTransition(() => {
      setExpandedId((current) => (current === id ? null : id))
    })
  }, [])

  // Escape collapses. The open card is always the button that was
  // activated, so it holds focus and the event reaches this container by
  // bubbling — no window listener to add, remove, or leak.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || expandedId === null) return

    event.stopPropagation()
    runViewTransition(() => setExpandedId(null))
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
    >
      <LandingHero />

      {LANDING_CARDS.map((card) => (
        <BentoCard
          key={card.id}
          card={card}
          isExpanded={expandedId === card.id}
          onToggle={toggle}
        />
      ))}
    </div>
  )
}
