import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  OUTPUT_HEARTBEAT_STALE_MS,
  OUTPUT_HEARTBEAT_STORAGE_KEY,
} from "@/modules/library/services/output-heartbeat"

/**
 * The module caches its window handle at module scope, so every case gets a
 * fresh import — otherwise a handle opened by one test would satisfy the
 * next. `vitest.config.ts` runs in Node, so `window` is stubbed by hand.
 */
const loadOpenOutputWindow = async () => {
  vi.resetModules()
  return (await import("@/modules/library/services/output-window")).openOutputWindow
}

const makeWindow = (storage: Map<string, string>) => {
  const open = vi.fn()
  const win = {
    open,
    screen: { availWidth: 1920, availHeight: 1080 },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
  }
  return { win, open }
}

describe("openOutputWindow", () => {
  const storage = new Map<string, string>()

  beforeEach(() => storage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it("opens /present when nothing is open and no heartbeat is present", async () => {
    const { win, open } = makeWindow(storage)
    vi.stubGlobal("window", win)
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow()

    expect(open).toHaveBeenCalledTimes(1)
    expect(open.mock.calls[0][0]).toBe("/present")
    expect(open.mock.calls[0][1]).toBe("bibletime-present")
    expect(open.mock.calls[0][2]).toContain("popup=yes")
  })

  it("leaves a window it already opened alone — never navigates or focuses it on a send", async () => {
    const { win, open } = makeWindow(storage)
    const handle = { closed: false, focus: vi.fn() }
    open.mockReturnValue(handle)
    vi.stubGlobal("window", win)
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow()
    openOutputWindow()
    openOutputWindow()

    expect(open).toHaveBeenCalledTimes(1)
    expect(handle.focus).not.toHaveBeenCalled()
  })

  it("focuses an open window only when asked to", async () => {
    const { win, open } = makeWindow(storage)
    const handle = { closed: false, focus: vi.fn() }
    open.mockReturnValue(handle)
    vi.stubGlobal("window", win)
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow()
    openOutputWindow({ focus: true })

    expect(open).toHaveBeenCalledTimes(1)
    expect(handle.focus).toHaveBeenCalledTimes(1)
  })

  it("reopens when the window it opened has since been closed", async () => {
    const { win, open } = makeWindow(storage)
    const handle = { closed: false, focus: vi.fn() }
    open.mockReturnValue(handle)
    vi.stubGlobal("window", win)
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow()
    handle.closed = true
    openOutputWindow()

    expect(open).toHaveBeenCalledTimes(2)
    expect(open.mock.calls[1][0]).toBe("/present")
  })

  it("does nothing for a live output it holds no handle to (console reloaded)", async () => {
    storage.set(OUTPUT_HEARTBEAT_STORAGE_KEY, String(Date.now()))
    const { win, open } = makeWindow(storage)
    vi.stubGlobal("window", win)
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow()

    expect(open).not.toHaveBeenCalled()
  })

  it("attaches to a live output with an empty URL when asked to focus it (web)", async () => {
    storage.set(OUTPUT_HEARTBEAT_STORAGE_KEY, String(Date.now()))
    const { win, open } = makeWindow(storage)
    const handle = { closed: false, focus: vi.fn() }
    open.mockReturnValue(handle)
    vi.stubGlobal("window", win)
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow({ focus: true })

    expect(open).toHaveBeenCalledTimes(1)
    expect(open.mock.calls[0][0]).toBe("")
    expect(handle.focus).toHaveBeenCalled()
  })

  it("never re-targets a live output on desktop, even when asked to focus it", async () => {
    // Electron denies the second /present open, but the denied call alone
    // still drops the output's fullscreen — so there is nothing safe to call.
    storage.set(OUTPUT_HEARTBEAT_STORAGE_KEY, String(Date.now()))
    const { win, open } = makeWindow(storage)
    vi.stubGlobal("window", { ...win, bibletime: {} })
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow({ focus: true })

    expect(open).not.toHaveBeenCalled()
  })

  it("treats a stale heartbeat as a closed window", async () => {
    storage.set(OUTPUT_HEARTBEAT_STORAGE_KEY, String(Date.now() - OUTPUT_HEARTBEAT_STALE_MS - 1))
    const { win, open } = makeWindow(storage)
    vi.stubGlobal("window", win)
    const openOutputWindow = await loadOpenOutputWindow()

    openOutputWindow()

    expect(open.mock.calls[0][0]).toBe("/present")
  })
})
