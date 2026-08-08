import type { LiveSlidePayload } from "@/modules/library/interfaces"

/** Exported so `useLiveSlide` can filter `storage` events to just this key. */
export const LIVE_SLIDE_STORAGE_KEY = "bibletime.liveSlide"

const isBrowser = typeof window !== "undefined"

/**
 * Reads whatever was last sent to output, if any — the `/present` window's
 * initial paint (before any "send to output" arrives) comes from this.
 */
export const getLiveSlide = (): LiveSlidePayload | null => {
  if (!isBrowser) return null

  try {
    const raw = window.localStorage.getItem(LIVE_SLIDE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LiveSlidePayload) : null
  } catch {
    return null
  }
}

/**
 * Records a fully-resolved slide as the live output, so any open
 * `/present` window mirrors it.
 *
 * The `sentAt` stamp is what makes re-sending work at all: `localStorage`
 * fires a `storage` event only when the written value differs from the
 * stored one, so sending the same slide twice would otherwise never reach
 * an open output window.
 */
export const setLiveSlide = (payload: LiveSlidePayload): void => {
  if (!isBrowser) return
  window.localStorage.setItem(LIVE_SLIDE_STORAGE_KEY, JSON.stringify({ ...payload, sentAt: Date.now() }))
}
