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

/**
 * Blanks the output to a solid color, or restores it with `null`, leaving
 * the slide itself untouched.
 *
 * Reads the stored payload and rewrites it with `blank` as the only
 * difference — `sentAt` explicitly included. The output window keeps the
 * same slide mounted, so restoring costs nothing: no re-send, no restarted
 * video, no re-run entrance animation (see `LiveSlidePayload.blank`).
 *
 * Holding `sentAt` still is safe *because* `blank` is itself part of the
 * serialized payload: changing it changes the stored string, which is all
 * `localStorage` needs to fire a `storage` event. Nothing has to be
 * artificially bumped, so the one field the output window keys media
 * playback off never moves for a blank.
 *
 * A no-op when nothing has been sent yet — there is no slide to blank, and
 * inventing an empty payload would put the output window into a state no
 * send produced.
 */
export const setLiveSlideBlank = (blank: LiveSlidePayload["blank"] | null): void => {
  if (!isBrowser) return

  const current = getLiveSlide()
  if (!current) return

  const { blank: _previous, ...rest } = current
  window.localStorage.setItem(
    LIVE_SLIDE_STORAGE_KEY,
    JSON.stringify(blank ? { ...rest, blank } : rest)
  )
}
