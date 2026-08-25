import { afterEach, describe, expect, it, vi } from "vitest"

import type { DownloadedBibleVersionMeta } from "@/modules/bible/interfaces"
import { BUNDLED_BIBLE_VERSION_CATALOG } from "@/modules/bible/services/bundled-catalog"
import { BUNDLED_VERSION_ID } from "@/modules/bible/services/get-bible-data"
import { getBibleVersionCatalog, getBibleVersions } from "@/modules/bible/services/get-bible-versions"

const remoteEntry = {
  version_id: 9999,
  local_abbreviation: "TEST",
  local_title: "Test Version",
  json_url: "https://example.test/TEST_vid_9999.json",
  lang_name: "Testish",
  lang_key: "te___tst___tst",
}

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, statusText: ok ? "OK" : "Not Found", json: async () => body }) as Response

describe("getBibleVersionCatalog", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("uses the remote catalog when it loads", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ available_versions: [remoteEntry] })))

    await expect(getBibleVersionCatalog()).resolves.toEqual([remoteEntry])
  })

  it("falls back to the bundled catalog on a 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse("Not Found", false, 404)))

    await expect(getBibleVersionCatalog()).resolves.toBe(BUNDLED_BIBLE_VERSION_CATALOG)
  })

  it("falls back to the bundled catalog on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }))

    await expect(getBibleVersionCatalog()).resolves.toBe(BUNDLED_BIBLE_VERSION_CATALOG)
  })

  it("passes a timeout signal and falls back when it aborts", async () => {
    // `AbortSignal.timeout` runs on a real timer fake timers cannot reach, so
    // the abort is simulated: the stubbed fetch rejects the way the platform
    // does once the signal fires, and asserts the signal was actually passed.
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      throw new DOMException("The operation timed out.", "TimeoutError")
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(getBibleVersionCatalog()).resolves.toBe(BUNDLED_BIBLE_VERSION_CATALOG)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("falls back to the bundled catalog on a malformed body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ versions: [] })))

    await expect(getBibleVersionCatalog()).resolves.toBe(BUNDLED_BIBLE_VERSION_CATALOG)
  })
})

describe("bundled catalog", () => {
  it("has unique version ids and well-formed urls", () => {
    const ids = BUNDLED_BIBLE_VERSION_CATALOG.map((entry) => entry.version_id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of BUNDLED_BIBLE_VERSION_CATALOG) {
      expect(entry.json_url).toBe(
        `https://mrk214.github.io/snapshots/${entry.lang_key}/${entry.local_abbreviation}_vid_${entry.version_id}.json`
      )
    }
  })

  it("lists the bundled RVR1960", () => {
    expect(BUNDLED_BIBLE_VERSION_CATALOG.some((entry) => entry.version_id === BUNDLED_VERSION_ID)).toBe(true)
  })
})

describe("getBibleVersions", () => {
  const downloadedMeta: DownloadedBibleVersionMeta = {
    version_id: 4242,
    local_abbreviation: "DL",
    local_title: "Downloaded Version",
    json_url: "https://example.test/DL_vid_4242.json",
    downloaded_at: 0,
    bytes: 1,
  }

  it("tags catalog entries by local availability", () => {
    const versions = getBibleVersions(BUNDLED_BIBLE_VERSION_CATALOG, [
      { ...downloadedMeta, version_id: 1 },
    ])
    expect(versions.find((v) => v.version_id === BUNDLED_VERSION_ID)?.status).toBe("bundled")
    expect(versions.find((v) => v.version_id === 1)?.status).toBe("downloaded")
    expect(versions.find((v) => v.version_id === 59)?.status).toBe("available")
  })

  it("always lists the bundled translation even when the catalog omits it", () => {
    const versions = getBibleVersions([remoteEntry], [])
    expect(versions.find((v) => v.version_id === BUNDLED_VERSION_ID)?.status).toBe("bundled")
  })

  it("lists a downloaded translation the catalog does not know about", () => {
    const versions = getBibleVersions([remoteEntry], [downloadedMeta])
    const entry = versions.find((v) => v.version_id === 4242)
    expect(entry?.status).toBe("downloaded")
    expect(entry?.local_abbreviation).toBe("DL")
  })
})
