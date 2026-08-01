import type { BibleDataSource, BibleVersion, BibleVersionSummary } from "@/modules/bible/interfaces"
import { getBibleVersionDownloads } from "@/modules/bible/services/downloads"

const BIBLE_DATA_URL = "/bible-data/rvr1960.json"

/** The one translation bundled as a static asset — always readable offline, no download needed. */
export const BUNDLED_VERSION_ID = 149

const bibleVersionDownloads = getBibleVersionDownloads()

const cacheKey = (source: BibleDataSource): string => {
  switch (source.kind) {
    case "bundled":
      return "bundled"
    case "downloaded":
      return `downloaded:${source.versionId}`
    case "network":
      return `network:${source.versionId}`
  }
}

/** Resolves how to load a version's data given its known local availability. */
export const resolveBibleDataSource = (version?: BibleVersionSummary): BibleDataSource => {
  if (!version || version.version_id === BUNDLED_VERSION_ID) {
    return { kind: "bundled" }
  }

  if (version.status === "downloaded") {
    return { kind: "downloaded", versionId: version.version_id }
  }

  return { kind: "network", versionId: version.version_id, jsonUrl: version.json_url }
}

const cache = new Map<string, Promise<BibleVersion>>()

const loadBibleData = (source: BibleDataSource): Promise<BibleVersion> => {
  switch (source.kind) {
    case "bundled":
      return fetch(BIBLE_DATA_URL).then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load Bible data: ${response.status} ${response.statusText}`
          )
        }
        return response.json() as Promise<BibleVersion>
      })
    case "downloaded":
      return bibleVersionDownloads.read(source.versionId)
    case "network":
      return fetch(source.jsonUrl).then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load Bible version ${source.versionId}: ${response.status} ${response.statusText}`
          )
        }
        return response.json() as Promise<BibleVersion>
      })
  }
}

/**
 * Fetches a translation's data once per source and caches the parsed result
 * in a module-level singleton, keyed by source, for the rest of the session.
 * Defaults to the bundled translation (a static asset, not a JS import, so
 * it never gets inlined into a JS chunk) when no source is given.
 */
export const getBibleData = (source: BibleDataSource = { kind: "bundled" }): Promise<BibleVersion> => {
  const key = cacheKey(source)
  const cached = cache.get(key)
  if (cached) return cached

  const promise = loadBibleData(source).catch((error: unknown) => {
    cache.delete(key)
    throw error
  })

  cache.set(key, promise)
  return promise
}
