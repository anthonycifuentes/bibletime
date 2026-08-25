/**
 * The output window's "I am open and showing `/present`" signal.
 *
 * Why this exists: the console has to decide, *synchronously inside a click*
 * (popup blockers), whether an output window is already open. A cached
 * `window.open` handle answers that until the console reloads and loses it;
 * this heartbeat answers it afterwards. `localStorage` is the one channel
 * both windows share that can be read synchronously.
 */
export const OUTPUT_HEARTBEAT_STORAGE_KEY = "bibletime.presentHeartbeat"

/** How often `/present` refreshes the stamp. */
export const OUTPUT_HEARTBEAT_INTERVAL_MS = 2000

/**
 * How old a stamp can be and still mean "open". Well over one interval so a
 * busy tab that missed a tick is not mistaken for a closed window, and
 * short enough that a crashed window stops counting quickly.
 */
export const OUTPUT_HEARTBEAT_STALE_MS = 5000

const isBrowser = typeof window !== "undefined"

const writeHeartbeat = (): void => {
  try {
    window.localStorage.setItem(OUTPUT_HEARTBEAT_STORAGE_KEY, String(Date.now()))
  } catch {
    // Storage full or disabled: the console falls back to reopening, which
    // is the pre-heartbeat behavior — degraded, never broken.
  }
}

const clearHeartbeat = (): void => {
  try {
    window.localStorage.removeItem(OUTPUT_HEARTBEAT_STORAGE_KEY)
  } catch {
    // See `writeHeartbeat`.
  }
}

/**
 * Starts beating from the output window. Returns the stop function for the
 * effect cleanup. Clears the stamp on `pagehide` so a window the operator
 * just closed is not reported as open for another few seconds — that is
 * what would make the console hand back a blank popup instead of reopening.
 */
export const startOutputHeartbeat = (): (() => void) => {
  if (!isBrowser) return () => undefined

  writeHeartbeat()
  const interval = window.setInterval(writeHeartbeat, OUTPUT_HEARTBEAT_INTERVAL_MS)
  window.addEventListener("pagehide", clearHeartbeat)

  return () => {
    window.clearInterval(interval)
    window.removeEventListener("pagehide", clearHeartbeat)
    clearHeartbeat()
  }
}

/** Whether an output window has reported itself open recently enough to trust. */
export const isOutputWindowAlive = (now: number = Date.now()): boolean => {
  if (!isBrowser) return false

  try {
    const raw = window.localStorage.getItem(OUTPUT_HEARTBEAT_STORAGE_KEY)
    if (!raw) return false
    const stamp = Number(raw)
    return Number.isFinite(stamp) && now - stamp < OUTPUT_HEARTBEAT_STALE_MS
  } catch {
    return false
  }
}
