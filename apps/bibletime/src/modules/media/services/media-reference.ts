/**
 * The custom scheme media files are served over. Registered as privileged
 * at module load in `apps/desktop/src/main.ts` — Electron requires that
 * before `app.whenReady()`.
 */
export const MEDIA_FILE_SCHEME = "bibletime-file"

/**
 * The reserved host for derived artifacts (thumbnails, rendered document
 * pages) under the managed cache directory.
 *
 * Root ids are minted only in the main process (`addMediaRoot` in
 * `apps/desktop/src/main.ts`) as `root-<lowercase hex>`, which is what
 * keeps two invariants true: a real root can never claim this host, and
 * every host is lowercase so parsing is agnostic to whether the platform's
 * URL implementation case-folds it.
 */
export const MEDIA_CACHE_HOST = "cache"

export interface ParsedMediaReference {
  /** A root id, or `MEDIA_CACHE_HOST`. */
  host: string
  /** POSIX-separated and percent-decoded, with no leading slash. */
  path: string
}

const encodePath = (path: string): string =>
  path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/")

/** A reference to a file inside a registered root. */
export const buildMediaReference = (rootId: string, relativePath: string): string =>
  `${MEDIA_FILE_SCHEME}://${rootId}/${encodePath(relativePath)}`

/** A reference to a derived artifact in the managed cache. */
export const buildCacheReference = (contentKey: string, fileName: string): string =>
  `${MEDIA_FILE_SCHEME}://${MEDIA_CACHE_HOST}/${encodePath(`${contentKey}/${fileName}`)}`

/**
 * Parses either form. Written as plain string work rather than via `URL` so
 * it behaves identically in the renderer and in the main process, where the
 * URL arrives already normalized by Chromium — and so it can be unit-tested
 * without a DOM.
 *
 * Root ids and content keys are lowercase by construction, which makes this
 * agnostic to whether the platform's URL parser case-folds the host.
 */
export const parseMediaReference = (reference: string): ParsedMediaReference | null => {
  const prefix = `${MEDIA_FILE_SCHEME}://`
  if (!reference.startsWith(prefix)) return null

  const remainder = reference.slice(prefix.length)
  const slash = remainder.indexOf("/")
  if (slash <= 0) return null

  const host = remainder.slice(0, slash).toLowerCase()
  const rawPath = remainder.slice(slash + 1)
  if (rawPath.length === 0) return null

  let path: string
  try {
    path = rawPath
      .split("/")
      .filter((segment) => segment.length > 0)
      .map(decodeURIComponent)
      .join("/")
  } catch {
    // A malformed percent-escape is not a reference we can resolve.
    return null
  }

  if (path.length === 0) return null
  return { host, path }
}

export const isCacheReference = (reference: string): boolean =>
  parseMediaReference(reference)?.host === MEDIA_CACHE_HOST
