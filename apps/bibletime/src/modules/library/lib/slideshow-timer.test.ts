import { describe, expect, it } from "vitest"

import {
  elapsedMs,
  formatElapsed,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startedTimer,
} from "@/modules/library/lib/slideshow-timer"

describe("slideshow timer", () => {
  it("counts from the moment it started", () => {
    const timer = startedTimer(1_000)
    expect(elapsedMs(timer, 1_000)).toBe(0)
    expect(elapsedMs(timer, 6_000)).toBe(5_000)
  })

  it("holds its total while paused, however long the pause lasts", () => {
    const paused = pauseTimer(startedTimer(1_000), 6_000)
    expect(elapsedMs(paused, 6_000)).toBe(5_000)
    expect(elapsedMs(paused, 600_000)).toBe(5_000)
  })

  it("continues from the banked total on resume", () => {
    const paused = pauseTimer(startedTimer(1_000), 6_000)
    const resumed = resumeTimer(paused, 100_000)
    expect(elapsedMs(resumed, 102_000)).toBe(7_000)
  })

  it("banks each span across several pauses", () => {
    let timer = startedTimer(0)
    timer = pauseTimer(timer, 3_000)
    timer = resumeTimer(timer, 10_000)
    timer = pauseTimer(timer, 14_000)
    expect(elapsedMs(timer, 99_000)).toBe(7_000)
  })

  it("ignores a pause while paused and a resume while running", () => {
    const paused = pauseTimer(startedTimer(1_000), 6_000)
    expect(pauseTimer(paused, 9_000)).toBe(paused)

    const running = startedTimer(1_000)
    expect(resumeTimer(running, 9_000)).toBe(running)
  })

  it("resets to zero and keeps running when it was running", () => {
    const reset = resetTimer(startedTimer(1_000), 6_000)
    expect(elapsedMs(reset, 6_000)).toBe(0)
    expect(elapsedMs(reset, 8_000)).toBe(2_000)
  })

  it("resets to zero and stays paused when it was paused", () => {
    const reset = resetTimer(pauseTimer(startedTimer(1_000), 6_000), 9_000)
    expect(elapsedMs(reset, 60_000)).toBe(0)
  })

  it("does not drift when the window was throttled for minutes", () => {
    // The whole reason this is timestamp arithmetic: no ticks happened
    // between these two reads, and the elapsed time is still correct.
    const timer = startedTimer(0)
    expect(elapsedMs(timer, 15 * 60_000)).toBe(900_000)
  })
})

describe("formatElapsed", () => {
  it("reads as a stopwatch below an hour", () => {
    expect(formatElapsed(0)).toBe("0:00")
    expect(formatElapsed(4_000)).toBe("0:04")
    expect(formatElapsed(184_000)).toBe("3:04")
  })

  it("adds the hour once there is one", () => {
    expect(formatElapsed(3_600_000)).toBe("1:00:00")
    expect(formatElapsed(3_784_000)).toBe("1:03:04")
  })

  it("floors partial seconds rather than rounding up to a second that has not passed", () => {
    expect(formatElapsed(1_999)).toBe("0:01")
  })

  it("never shows a negative time", () => {
    expect(formatElapsed(-5_000)).toBe("0:00")
  })
})
