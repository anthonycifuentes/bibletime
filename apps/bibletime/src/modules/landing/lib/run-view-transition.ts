type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Runs `update` inside a View Transition when the browser has one and the
 * visitor hasn't asked for reduced motion, and plainly otherwise.
 *
 * This is what animates the bento grid: CSS grid placement isn't an
 * animatable property, so a card growing from one cell to four can't be
 * transitioned directly. A view transition morphs the whole grid between
 * the two layouts, and where it isn't supported the layout simply snaps —
 * which is also exactly what reduced-motion visitors get.
 */
export function runViewTransition(update: () => void) {
  const doc = document as ViewTransitionDocument

  if (typeof doc.startViewTransition !== "function" || prefersReducedMotion()) {
    update()
    return
  }

  doc.startViewTransition(update)
}
