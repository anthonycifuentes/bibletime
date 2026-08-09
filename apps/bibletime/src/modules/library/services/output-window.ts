/**
 * The fixed window name every "send to output" reuses. Load-bearing: the
 * second send has to land in the window the operator already placed on the
 * projector, not spawn a new one beside it.
 */
const OUTPUT_WINDOW_NAME = "bibletime-present"

/** Opening size, clamped to the screen — a projector-sized default that a small laptop can still fit. */
const PREFERRED_WIDTH = 1280
const PREFERRED_HEIGHT = 720

/**
 * Why there is a features string at all.
 *
 * `window.open(url, name)` with no features is a request for a *tab*, and
 * every modern browser honors it as one — tab strip, address bar, bookmarks
 * and all, wrapped around what is supposed to be a clean projected surface.
 * Passing any features asks for a popup instead: no tabs, no address bar, no
 * toolbar.
 *
 * What this cannot remove is the small origin label a browser keeps on every
 * popup. That is deliberate anti-spoofing on the browser's part and no site
 * can opt out of it. Fullscreen is the only thing that hides it, which is
 * what the hint in `/present` is for.
 *
 * Centered on the current screen rather than dropped at the OS default,
 * since the operator's next move is usually to drag it to the projector.
 */
const outputWindowFeatures = (): string => {
  const { availWidth, availHeight } = window.screen
  const width = Math.min(PREFERRED_WIDTH, availWidth)
  const height = Math.min(PREFERRED_HEIGHT, availHeight)

  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${Math.max(0, Math.round((availWidth - width) / 2))}`,
    `top=${Math.max(0, Math.round((availHeight - height) / 2))}`,
  ].join(",")
}

/**
 * Opens the presentation output window, or focuses the one already open.
 *
 * The single place `/present` is opened from, so the window name and the
 * popup features cannot drift between the eight call sites that need it.
 *
 * Reuse still works exactly as before: a browser resolves the window *name*
 * first, and when a window with that name already exists it is reused and
 * the features are ignored — so an already-placed, already-fullscreen output
 * window is focused rather than reopened at these bounds.
 *
 * On desktop this whole string is moot: Electron's `setWindowOpenHandler`
 * intercepts the call and builds a real chrome-less `BrowserWindow` with its
 * own remembered bounds. Harmless there, load-bearing on web.
 *
 * Must be called inside a user gesture — a popup opened from a timer or an
 * effect is exactly what popup blockers exist to stop.
 */
export const openOutputWindow = (): void => {
  if (typeof window === "undefined") return
  window.open("/present", OUTPUT_WINDOW_NAME, outputWindowFeatures())
}
