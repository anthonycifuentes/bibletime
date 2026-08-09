import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MediaDocument, MediaEntry } from "@/modules/media/interfaces"
import { buildDocumentPageSlide, buildEntrySlide, buildYouTubeSlide } from "@/modules/media/lib/build-media-slide"
import { buildCacheReference, buildMediaReference } from "@/modules/media/services/media-reference"

/**
 * The invariant these tests defend.
 *
 * In the browser a reference is resolved into an `blob:` object URL that is
 * valid only in the window that created it. Persisting one onto a slide —
 * or into the live-slide payload the output window reads — would appear to
 * work in the console and fail on stage, which is the worst possible place
 * to find out. So a slide's `src` must always stay a durable reference.
 */
const REFERENCE_FORM = /^bibletime-file:\/\//

const entry = (overrides: Partial<MediaEntry> = {}): MediaEntry => ({
  reference: buildMediaReference("root-abc123", "photos/sunset.jpg"),
  rootId: "root-abc123",
  relativePath: "photos/sunset.jpg",
  name: "sunset.jpg",
  extension: "jpg",
  kind: "image",
  size: 1024,
  mtimeMs: 1_700_000_000_000,
  ...overrides,
})

describe("a media slide's src is always a durable reference", () => {
  it("an image slide stores a reference, not a URL", () => {
    const slide = buildEntrySlide(entry())
    expect(slide.src).toMatch(REFERENCE_FORM)
    expect(slide.src).not.toMatch(/^blob:/)
  })

  it("a video slide stores a reference", () => {
    const slide = buildEntrySlide(entry({ kind: "video", name: "countdown.mp4", extension: "mp4" }))
    expect(slide.mediaType).toBe("video")
    expect(slide.src).toMatch(REFERENCE_FORM)
  })

  it("a document page stores its cache reference", () => {
    const document_: MediaDocument = {
      contentKey: "a1b2c3d4e5f60718",
      title: "sermon.pdf",
      pages: [
        { reference: buildCacheReference("a1b2c3d4e5f60718", "page-0001.png"), pageIndex: 0, width: 1600, height: 900 },
      ],
    }

    const slide = buildDocumentPageSlide(document_, 0)
    expect(slide?.src).toMatch(REFERENCE_FORM)
    expect(slide?.src).not.toMatch(/^blob:/)
  })

  it("a YouTube slide stores the watch URL, not an embed or object URL", () => {
    const slide = buildYouTubeSlide("dQw4w9WgXcQ")
    expect(slide.src).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    expect(slide.src).not.toMatch(/^blob:/)
    // The embed host is a render-time detail; storing it would leak a
    // presentation concern into the saved project.
    expect(slide.src).not.toContain("youtube-nocookie.com")
  })
})

describe("the live-slide payload preserves the reference across a send", () => {
  /** A minimal `localStorage`, since these tests run in Node. */
  const createStorage = () => {
    const store = new Map<string, string>()
    return {
      store,
      api: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    }
  }

  beforeEach(() => {
    vi.resetModules()
  })

  it("round-trips a media slide without rewriting its src", async () => {
    const { store, api } = createStorage()
    // Stubbed before the import: `live-slide` reads `typeof window` at
    // module scope to decide whether it is in a browser.
    vi.stubGlobal("window", { localStorage: api })

    const { getLiveSlide, setLiveSlide } = await import("@/modules/library/services/live-slide")
    const { DEFAULT_SLIDE_TEMPLATE } = await import("@/modules/presentation")

    const media = buildEntrySlide(entry())
    setLiveSlide({ media, template: DEFAULT_SLIDE_TEMPLATE, sentAt: 0 })

    const readBack = getLiveSlide()
    expect(readBack?.media?.src).toBe(media.src)
    expect(readBack?.media?.src).toMatch(REFERENCE_FORM)

    // Nothing resembling an object URL reached storage at all.
    expect([...store.values()].join("")).not.toMatch(/blob:/)

    vi.unstubAllGlobals()
  })

  it("stamps sentAt so re-sending the same slide still notifies the output window", async () => {
    const { api } = createStorage()
    vi.stubGlobal("window", { localStorage: api })

    const { getLiveSlide, setLiveSlide } = await import("@/modules/library/services/live-slide")
    const { DEFAULT_SLIDE_TEMPLATE } = await import("@/modules/presentation")

    setLiveSlide({ media: buildEntrySlide(entry()), template: DEFAULT_SLIDE_TEMPLATE, sentAt: 0 })
    const first = getLiveSlide()?.sentAt

    expect(typeof first).toBe("number")
    expect(first).toBeGreaterThan(0)

    vi.unstubAllGlobals()
  })
})
