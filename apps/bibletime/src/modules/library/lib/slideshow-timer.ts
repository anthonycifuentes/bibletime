/**
 * The elapsed timer's whole state: time banked from earlier runs, plus when
 * the current run started (`null` while paused).
 *
 * Wall-clock arithmetic rather than a tick counter, because a browser
 * throttles timers in a backgrounded window hard — and backgrounding this
 * window is exactly what an operator does when they click into the output
 * window. A counter would quietly under-report the length of the service;
 * subtracting two timestamps cannot.
 */
export interface SlideshowTimerState {
  accumulatedMs: number
  startedAt: number | null
}

export const startedTimer = (now: number): SlideshowTimerState => ({
  accumulatedMs: 0,
  startedAt: now,
})

export const elapsedMs = (state: SlideshowTimerState, now: number): number =>
  state.startedAt === null ? state.accumulatedMs : state.accumulatedMs + (now - state.startedAt)

/** Banks the running span and stops the clock. Pausing an already-paused timer is a no-op. */
export const pauseTimer = (state: SlideshowTimerState, now: number): SlideshowTimerState =>
  state.startedAt === null
    ? state
    : { accumulatedMs: state.accumulatedMs + (now - state.startedAt), startedAt: null }

/** Restarts the clock from the banked total. Resuming a running timer is a no-op. */
export const resumeTimer = (state: SlideshowTimerState, now: number): SlideshowTimerState =>
  state.startedAt === null ? { ...state, startedAt: now } : state

/** Back to zero, still running if it was running — resetting is not a way to pause. */
export const resetTimer = (state: SlideshowTimerState, now: number): SlideshowTimerState => ({
  accumulatedMs: 0,
  startedAt: state.startedAt === null ? null : now,
})

/**
 * `h:mm:ss` once the hour is reached, `m:ss` before that — the same shape a
 * stopwatch uses, so a 3-minute song reads as `3:04` rather than `00:03:04`.
 */
export const formatElapsed = (totalMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const paddedSeconds = String(seconds).padStart(2, "0")
  if (hours === 0) return `${minutes}:${paddedSeconds}`

  return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`
}
