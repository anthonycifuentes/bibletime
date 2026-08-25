import { isOutputWindowAlive } from "@/modules/library/services/output-heartbeat"

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
 * The window the last `openOutputWindow` produced. Module-level, not React
 * state: the eight call sites are spread across hooks and plain handlers,
 * and there is exactly one output window per console.
 */
let outputWindow: Window | null = null

/** The desktop shell exposes a preload bridge; the web build has none. */
const isDesktopRuntime = (): boolean =>
  typeof window !== "undefined" && Boolean((window as { bibletime?: unknown }).bibletime)

interface OpenOutputWindowOptions {
  /**
   * Bring an already-open output window to the front. Off by default: a
   * send is not a reason to pull keyboard focus away from the console, and
   * the slide itself arrives through `storage` events regardless.
   */
  focus?: boolean
}

/**
 * Opens the presentation output window if none is open. Otherwise leaves
 * it alone — or, on request, focuses it.
 *
 * The single place `/present` is opened from, so the window name and the
 * popup features cannot drift between the eight call sites that need it.
 *
 * Why an already-open window must not be reopened: `window.open(url, name)`
 * with a *non-empty* url and an existing window of that name **navigates**
 * that window — a full reload of `/present`, which drops HTML fullscreen
 * and restarts whatever was playing. That was the "fullscreen only lasts
 * one slide" bug, reproduced in Chromium: a storage write, `focus()`, and
 * `window.open("", name)` all keep fullscreen; `window.open("/present",
 * name)` alone loses it. The slide never needed the call — it travels
 * through `localStorage` + `storage` events — so for an open window there
 * is nothing left to do.
 *
 * "Open" is known two ways: the handle from opening it, and — after this
 * console reloaded and lost the handle — the heartbeat `/present` writes
 * (see `output-heartbeat.ts`).
 *
 * On desktop, Electron's `setWindowOpenHandler` intercepts `/present`: it
 * builds a chrome-less `BrowserWindow` the first time and denies afterwards
 * — but the *denied* call still drops the output's fullscreen (reproduced
 * with Playwright: the `window.open` itself does it, not the handler's
 * `focus()`), so an alive output on desktop is never re-targeted at all.
 * The web build can reach an existing window without navigating it via
 * `window.open("", name)`; on desktop that URL would fall through the
 * handler as a new `about:blank` window, hence the split.
 *
 * Must be called inside a user gesture — a popup opened from a timer or an
 * effect is exactly what popup blockers exist to stop.
 */
export const openOutputWindow = ({ focus = false }: OpenOutputWindowOptions = {}): void => {
  if (typeof window === "undefined") return

  if (outputWindow && !outputWindow.closed) {
    if (focus) outputWindow.focus()
    return
  }

  if (isOutputWindowAlive()) {
    if (!focus || isDesktopRuntime()) return
    outputWindow = window.open("", OUTPUT_WINDOW_NAME, outputWindowFeatures())
    outputWindow?.focus()
    return
  }

  outputWindow = window.open("/present", OUTPUT_WINDOW_NAME, outputWindowFeatures())
}
