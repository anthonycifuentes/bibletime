import type { MediaDirectoryListing, MediaEntry } from "@/modules/media/interfaces"
import {
  extensionOf,
  kindForExtension,
  unsupportedReasonFor,
} from "@/modules/media/lib/supported-formats"
import { getMediaAccess } from "@/modules/media/services/access"
import {
  buildMediaReference,
  MEDIA_CACHE_HOST,
  parseMediaReference,
} from "@/modules/media/services/media-reference"

/**
 * Turns the driver's raw directory listing into typed `MediaEntry`s,
 * dropping everything that isn't media. This is the one place format policy
 * is applied — a directory listing deliberately returns every regular file
 * so the allowlist lives in a single, testable module.
 */
export const listDirectory = async (
  rootId: string,
  relativePath: string
): Promise<MediaDirectoryListing> => {
  const access = getMediaAccess()
  const raw = await access.listDirectory(rootId, relativePath)
  const { canConvertDocuments } = access.capabilities

  const files: MediaEntry[] = []
  for (const file of raw.files) {
    const extension = extensionOf(file.name)
    const kind = kindForExtension(extension)
    if (!kind) continue

    files.push({
      reference: buildMediaReference(rootId, file.relativePath),
      rootId,
      relativePath: file.relativePath,
      name: file.name,
      extension,
      kind,
      size: file.size,
      mtimeMs: file.mtimeMs,
      unsupportedReason: unsupportedReasonFor(extension, { canConvertDocuments }),
    })
  }

  return { rootId, relativePath, directories: raw.directories, files }
}

/**
 * The "All" view: every root's files, flattened. Walks each root's tree
 * breadth-first with a bounded depth, because a media root can be a whole
 * Pictures library and an unbounded walk would block on the first use.
 */
const ALL_VIEW_MAX_DEPTH = 3

/**
 * How many directories to enumerate at once.
 *
 * On desktop each level is one IPC call per directory; in the browser it is
 * an async iterator per directory, which is slower and unbounded in fan-out
 * — a wide Pictures library would otherwise open hundreds of concurrent
 * reads and stall the first paint. Capping helps both builds.
 */
const ALL_VIEW_CONCURRENCY = 8

/** Runs `work` over `items` with at most `limit` in flight, preserving nothing but completion. */
const mapWithLimit = async <TItem, TResult>(
  items: TItem[],
  limit: number,
  work: (item: TItem) => Promise<TResult>
): Promise<TResult[]> => {
  const results: TResult[] = []
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      results.push(await work(item))
    }
  })

  await Promise.all(runners)
  return results
}

export const listAllRoots = async (rootIds: string[]): Promise<MediaEntry[]> => {
  const collected: MediaEntry[] = []

  for (const rootId of rootIds) {
    let frontier = [{ relativePath: "", depth: 0 }]

    while (frontier.length > 0) {
      const listings = await mapWithLimit(frontier, ALL_VIEW_CONCURRENCY, async ({ relativePath, depth }) => {
        try {
          return { listing: await listDirectory(rootId, relativePath), depth }
        } catch {
          return null // An unreadable directory shouldn't empty the whole view.
        }
      })

      const next: { relativePath: string; depth: number }[] = []
      for (const entry of listings) {
        if (!entry) continue

        collected.push(...entry.listing.files)
        if (entry.depth >= ALL_VIEW_MAX_DEPTH) continue
        next.push(
          ...entry.listing.directories.map((directory) => ({
            relativePath: directory.relativePath,
            depth: entry.depth + 1,
          }))
        )
      }

      frontier = next
    }
  }

  return collected
}

/** Resolves starred references back into entries by stat-ing each one; a missing file is simply dropped from the view. */
export const listFavoriteEntries = async (references: string[]): Promise<MediaEntry[]> => {
  const access = getMediaAccess()
  const { canConvertDocuments } = access.capabilities

  const entries = await Promise.all(
    references.map(async (reference): Promise<MediaEntry | null> => {
      const parsed = parseMediaReference(reference)
      if (!parsed || parsed.host === MEDIA_CACHE_HOST) return null

      try {
        const stats = await access.statFile(reference)
        if (!stats.exists) return null

        const name = parsed.path.split("/").pop() ?? parsed.path
        const extension = extensionOf(name)
        const kind = kindForExtension(extension)
        if (!kind) return null

        return {
          reference,
          rootId: parsed.host,
          relativePath: parsed.path,
          name,
          extension,
          kind,
          size: stats.size,
          mtimeMs: stats.mtimeMs,
          unsupportedReason: unsupportedReasonFor(extension, { canConvertDocuments }),
        } satisfies MediaEntry
      } catch {
        return null
      }
    })
  )

  return entries.filter((entry): entry is MediaEntry => entry !== null)
}
