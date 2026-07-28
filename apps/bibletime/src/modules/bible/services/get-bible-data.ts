import type { BibleVersion } from "@/modules/bible/interfaces"

const BIBLE_DATA_URL = "/bible-data/rvr1960.json"

let cachedBibleData: Promise<BibleVersion> | null = null

/**
 * Fetches the bundled Bible translation once and caches the parsed result
 * in a module-level singleton for the rest of the session. The underlying
 * JSON is a static asset (not a JS import) so it never gets inlined into a
 * JS chunk — it's only loaded when Bible data is actually needed.
 */
export const getBibleData = (): Promise<BibleVersion> => {
  if (!cachedBibleData) {
    cachedBibleData = fetch(BIBLE_DATA_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load Bible data: ${response.status} ${response.statusText}`
          )
        }

        return response.json() as Promise<BibleVersion>
      })
      .catch((error: unknown) => {
        cachedBibleData = null
        throw error
      })
  }

  return cachedBibleData
}
