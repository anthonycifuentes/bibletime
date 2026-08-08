import type { MediaDirectoryListing, MediaEntry } from "@/modules/media/interfaces"
import {
  extensionOf,
  kindForExtension,
  unsupportedReasonFor,
} from "@/modules/media/lib/supported-formats"
import {
  buildMediaReference,
  MEDIA_CACHE_HOST,
  parseMediaReference,
} from "@/modules/media/services/media-reference"

const bridge = () => (typeof window !== "undefined" ? window.bibletime?.media : undefined)

/**
 * Turns the main process's raw directory listing into typed `MediaEntry`s,
 * dropping everything that isn't media. This is the one place format policy
 * is applied — `media:listDirectory` deliberately returns every regular
 * file so the allowlist lives in a single, testable module.
 */
export const listDirectory = async (
  rootId: string,
  relativePath: string
): Promise<MediaDirectoryListing> => {
  const media = bridge()
  if (!media) return { rootId, relativePath, directories: [], files: [] }

  const raw = await media.listDirectory(rootId, relativePath)

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
      unsupportedReason: unsupportedReasonFor(extension),
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

export const listAllRoots = async (rootIds: string[]): Promise<MediaEntry[]> => {
  const collected: MediaEntry[] = []

  for (const rootId of rootIds) {
    let frontier = [{ relativePath: "", depth: 0 }]

    while (frontier.length > 0) {
      const next: { relativePath: string; depth: number }[] = []

      for (const { relativePath, depth } of frontier) {
        let listing: MediaDirectoryListing
        try {
          listing = await listDirectory(rootId, relativePath)
        } catch {
          continue // An unreadable directory shouldn't empty the whole view.
        }

        collected.push(...listing.files)
        if (depth >= ALL_VIEW_MAX_DEPTH) continue
        next.push(
          ...listing.directories.map((directory) => ({
            relativePath: directory.relativePath,
            depth: depth + 1,
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
  const media = bridge()
  if (!media) return []

  const entries = await Promise.all(
    references.map(async (reference): Promise<MediaEntry | null> => {
      const parsed = parseMediaReference(reference)
      if (!parsed || parsed.host === MEDIA_CACHE_HOST) return null

      try {
        const stats = await media.statFile(reference)
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
          unsupportedReason: unsupportedReasonFor(extension),
        } satisfies MediaEntry
      } catch {
        return null
      }
    })
  )

  return entries.filter((entry): entry is MediaEntry => entry !== null)
}
