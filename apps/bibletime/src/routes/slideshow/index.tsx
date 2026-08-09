import { createFileRoute } from "@tanstack/react-router"

import { SlideshowView } from "@/modules/library"

/**
 * The presenter view, as a top-level route rather than a mode of the
 * console: it replaces the console shell for its duration, so nothing under
 * it competes for space or — more importantly — for keystrokes.
 *
 * The guard for "reached with nothing to present" lives inside the view,
 * not in a `beforeLoad`: whether there is a deck depends on the console
 * store *and* on folders that are still loading from storage, neither of
 * which a loader can read synchronously. The view already renders an
 * empty state with a way out, which is the honest answer while loading and
 * the correct one after.
 */
export const Route = createFileRoute("/slideshow/")({
  component: SlideshowView,
})
