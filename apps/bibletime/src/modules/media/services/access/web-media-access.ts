import type {
  MediaAccessDriver,
  MediaCacheDriver,
  MediaCapabilities,
  MediaRootStatus,
  RawMediaDirectoryListing,
} from "@/modules/media/interfaces"
import {
  clearCache,
  deleteCacheForContentKeys,
  deleteFavoritesForRoot,
  deleteStashedFiles,
  deleteStoredSource,
  isMediaDbAvailable,
  listCachedFiles,
  readCachedBlob,
  readStashedFile,
  readStashedFiles,
  readStoredFavorites,
  readStoredSource,
  readStoredSources,
  requestPersistentStorage,
  totalCachedBytes,
  writeCachedBlob,
  writeStashedFile,
  writeStoredFavorite,
  writeStoredSource,
} from "@/modules/media/services/access/web-media-db"
import {
  buildCacheReference,
  MEDIA_CACHE_HOST,
  parseMediaReference,
} from "@/modules/media/services/media-reference"

/**
 * Whether this browser can hand the app a whole folder. Everything that
 * differs between the two web experiences follows from this one answer.
 */
const supportsDirectoryPicker = (): boolean =>
  typeof window !== "undefined" && typeof window.showDirectoryPicker === "function"

const WEB_CAPABILITIES = (): MediaCapabilities => ({
  canBrowseDirectories: supportsDirectoryPicker(),
  // LibreOffice cannot run in a browser, and the Google Slides export is a
  // cross-origin fetch no page can make. Both are stated as absent rather
  // than attempted and failed.
  canConvertDocuments: false,
  canImportGoogleSlides: false,
  canRevealInFolder: false,
  canPersistAcrossReload: isMediaDbAvailable(),
})

/**
 * Root ids are minted exactly as the main process mints them —
 * `root-<lowercase hex>` — which is what keeps `parseMediaReference`'s
 * invariants true: the reserved lowercase `cache` host can never be claimed
 * by a real root, and a reference is the same string in both builds.
 */
const mintRootId = (): string => {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return `root-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

// ------------------------------------------------------------ object URLs

/**
 * A bounded pool of live object URLs.
 *
 * `createObjectURL` leaks until revoked, and a thousand-photo grid would
 * otherwise pin every file it ever displayed. Eviction is by insertion
 * order, which for a scrolling grid is a good enough approximation of
 * least-recently-needed (see `enable-media-tab-on-web` design decision 5).
 */
const MAX_LIVE_URLS = 64
const liveUrls = new Map<string, string>()

const rememberUrl = (reference: string, url: string): string => {
  liveUrls.set(reference, url)

  while (liveUrls.size > MAX_LIVE_URLS) {
    const oldest = liveUrls.keys().next()
    if (oldest.done) break
    const stale = liveUrls.get(oldest.value)
    if (stale) URL.revokeObjectURL(stale)
    liveUrls.delete(oldest.value)
  }

  return url
}

const releaseAllUrls = (): void => {
  for (const url of liveUrls.values()) URL.revokeObjectURL(url)
  liveUrls.clear()
}

// ------------------------------------------------------------- permission

type PermissionState = "granted" | "prompt" | "denied"

const queryHandlePermission = async (handle: FileSystemDirectoryHandle): Promise<PermissionState> => {
  try {
    return await handle.queryPermission({ mode: "read" })
  } catch {
    return "denied"
  }
}

/**
 * Turns a stored source into what the explorer renders.
 *
 * The three states send the user to three different remedies, so they are
 * computed here rather than collapsed into one "unavailable": a lapsed
 * permission needs one click, a missing folder needs relocating or
 * removing, and a ready root needs nothing.
 */
const toRootStatus = async (source: {
  root: MediaRootStatus | { id: string; label: string; path: string; addedAt: number }
  kind: "directory" | "stash"
  handle?: FileSystemDirectoryHandle
}): Promise<MediaRootStatus> => {
  const base = {
    id: source.root.id,
    label: source.root.label,
    path: source.root.path,
    addedAt: source.root.addedAt,
    kind: source.kind,
  }

  if (source.kind === "stash") {
    const files = await readStashedFiles(source.root.id)
    const storedBytes = files.reduce((total, [, file]) => total + file.size, 0)
    // A stash holds its own bytes, so it is never unreachable — there is no
    // folder that could have gone away.
    return { ...base, state: "ready", isAvailable: true, storedBytes }
  }

  if (!source.handle) return { ...base, state: "unavailable", isAvailable: false }

  const permission = await queryHandlePermission(source.handle)
  if (permission === "granted") return { ...base, state: "ready", isAvailable: true }
  if (permission === "prompt") return { ...base, state: "needs-permission", isAvailable: false }
  return { ...base, state: "unavailable", isAvailable: false }
}

// ------------------------------------------------------------- traversal

/** Walks a POSIX-separated relative path down from a root handle. */
const resolveDirectoryHandle = async (
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<FileSystemDirectoryHandle | null> => {
  let current = root
  for (const segment of relativePath.split("/").filter(Boolean)) {
    try {
      current = await current.getDirectoryHandle(segment)
    } catch {
      return null
    }
  }
  return current
}

/** The `File` behind a reference, or `null` when it cannot be reached. */
const resolveFile = async (reference: string): Promise<File | null> => {
  const parsed = parseMediaReference(reference)
  if (!parsed) return null

  if (parsed.host === MEDIA_CACHE_HOST) {
    const slash = parsed.path.indexOf("/")
    if (slash <= 0) return null
    const blob = await readCachedBlob(parsed.path.slice(0, slash), parsed.path.slice(slash + 1))
    return blob ? new File([blob], parsed.path.slice(slash + 1)) : null
  }

  const source = await readStoredSource(parsed.host)
  if (!source) return null

  if (source.kind === "stash") return (await readStashedFile(parsed.host, parsed.path)) ?? null
  if (!source.handle) return null

  const segments = parsed.path.split("/").filter(Boolean)
  const fileName = segments.pop()
  if (!fileName) return null

  const directory = await resolveDirectoryHandle(source.handle, segments.join("/"))
  if (!directory) return null

  try {
    return await (await directory.getFileHandle(fileName)).getFile()
  } catch {
    return null
  }
}

// ----------------------------------------------------------------- cache

const webCache: MediaCacheDriver = {
  list: async (contentKey) => listCachedFiles(contentKey),
  write: async (contentKey, fileName, buffer) => {
    // A failed cache write is deliberately not an error: the artifact was
    // already rendered, and the caller gets a usable reference either way.
    await writeCachedBlob(contentKey, fileName, new Blob([buffer]))
    return buildCacheReference(contentKey, fileName)
  },
  size: async () => totalCachedBytes(),
  clear: async () => clearCache(),
}

// ---------------------------------------------------------------- driver

export const webMediaAccess: MediaAccessDriver = {
  get capabilities() {
    return WEB_CAPABILITIES()
  },

  readRoots: async () => {
    if (!isMediaDbAvailable()) return []
    const sources = await readStoredSources()
    const roots = await Promise.all(sources.map((source) => toRootStatus(source)))
    return roots.sort((left, right) => left.addedAt - right.addedAt)
  },

  addDirectoryRoot: async () => {
    if (!supportsDirectoryPicker()) return null

    let handle: FileSystemDirectoryHandle
    try {
      handle = await window.showDirectoryPicker!({ mode: "read", id: "bibletime-media" })
    } catch {
      return null // The user canceled — not a failure.
    }

    // The same folder twice would give one directory two identities and two
    // sets of references, so an existing root wins and is returned as-is.
    for (const source of await readStoredSources()) {
      if (source.handle && (await source.handle.isSameEntry(handle))) return toRootStatus(source)
    }

    const root = { id: mintRootId(), label: handle.name, path: handle.name, addedAt: Date.now() }
    await writeStoredSource({ root, kind: "directory", handle })
    void requestPersistentStorage()

    return toRootStatus({ root, kind: "directory", handle })
  },

  addFilesRoot: async (files, rootId) => {
    if (files.length === 0) return null

    const existing = rootId ? await readStoredSource(rootId) : undefined
    const source =
      existing ?? {
        root: { id: mintRootId(), label: "", path: "", addedAt: Date.now() },
        kind: "stash" as const,
      }
    if (!existing) {
      source.root.label = files.length === 1 ? files[0].name : `${files.length} files`
      source.root.path = source.root.label
    }

    // Two files can share a name without sharing a folder, and a stash is
    // flat — so a collision is renamed rather than silently overwriting.
    const taken = new Set((await readStashedFiles(source.root.id)).map(([name]) => name))
    for (const file of files) {
      let name = file.name
      for (let suffix = 2; taken.has(name); suffix += 1) {
        const dot = file.name.lastIndexOf(".")
        name =
          dot > 0
            ? `${file.name.slice(0, dot)} (${suffix})${file.name.slice(dot)}`
            : `${file.name} (${suffix})`
      }
      taken.add(name)
      await writeStashedFile(source.root.id, name, file)
    }

    if (!existing) {
      await writeStoredSource({ root: source.root, kind: "stash" })
      void requestPersistentStorage()
    }

    return toRootStatus({ root: source.root, kind: "stash" })
  },

  removeRoot: async (rootId) => {
    // Everything the app stored for this root goes; nothing on the user's
    // machine is touched.
    const contentKeys = new Set<string>()
    for (const [relativePath, file] of await readStashedFiles(rootId)) {
      const { contentKey } = await import("@/modules/media/lib/content-key")
      contentKeys.add(contentKey(rootId, relativePath, file.size, file.lastModified))
    }

    await Promise.all([
      deleteStoredSource(rootId),
      deleteStashedFiles(rootId),
      deleteFavoritesForRoot(rootId),
      deleteCacheForContentKeys(contentKeys),
    ])
  },

  /**
   * Repointing means picking the folder again. The root keeps its id, so
   * every slide referencing anything inside it is fixed at once — the same
   * property the desktop build's relocate has.
   */
  relocateRoot: async (rootId) => {
    if (!supportsDirectoryPicker()) return null

    const source = await readStoredSource(rootId)
    if (!source || source.kind !== "directory") return null

    let handle: FileSystemDirectoryHandle
    try {
      handle = await window.showDirectoryPicker!({ mode: "read", id: "bibletime-media" })
    } catch {
      return null
    }

    const root = { ...source.root, label: handle.name, path: handle.name }
    await writeStoredSource({ root, kind: "directory", handle })
    return toRootStatus({ root, kind: "directory", handle })
  },

  reconnectRoot: async (rootId) => {
    const source = await readStoredSource(rootId)
    if (!source?.handle) return null

    try {
      // Only meaningful inside a user gesture; the browser rejects it
      // otherwise, which is why this is reached from a click handler.
      await source.handle.requestPermission({ mode: "read" })
    } catch {
      return toRootStatus(source)
    }

    return toRootStatus(source)
  },

  readFavorites: async () => (isMediaDbAvailable() ? readStoredFavorites() : []),

  setFavorite: async (reference, isFavorite) => {
    await writeStoredFavorite(reference, isFavorite)
    return readStoredFavorites()
  },

  listDirectory: async (rootId, relativePath): Promise<RawMediaDirectoryListing> => {
    const empty = { rootId, relativePath, directories: [], files: [] }
    const source = await readStoredSource(rootId)
    if (!source) return empty

    if (source.kind === "stash") {
      // A stash is flat by construction, so any non-root path is empty.
      if (relativePath) return empty
      const files = await readStashedFiles(rootId)
      return {
        rootId,
        relativePath,
        directories: [],
        files: files.map(([name, file]) => ({
          name,
          relativePath: name,
          size: file.size,
          mtimeMs: file.lastModified,
        })),
      }
    }

    if (!source.handle) return empty
    const directory = await resolveDirectoryHandle(source.handle, relativePath)
    if (!directory) return empty

    const directories: { name: string; relativePath: string }[] = []
    const files: { name: string; relativePath: string; size: number; mtimeMs: number }[] = []
    const prefix = relativePath ? `${relativePath}/` : ""

    try {
      for await (const [name, entry] of directory.entries()) {
        if (entry.kind === "directory") {
          directories.push({ name, relativePath: `${prefix}${name}` })
          continue
        }
        try {
          const file = await (entry).getFile()
          files.push({ name, relativePath: `${prefix}${name}`, size: file.size, mtimeMs: file.lastModified })
        } catch {
          // One unreadable entry shouldn't empty the whole listing — the
          // same tolerance the desktop listing has.
        }
      }
    } catch {
      return empty
    }

    return { rootId, relativePath, directories, files }
  },

  statFile: async (reference) => {
    const file = await resolveFile(reference)
    return file
      ? { size: file.size, mtimeMs: file.lastModified, exists: true }
      : { size: 0, mtimeMs: 0, exists: false }
  },

  resolveUrl: async (reference) => {
    const cached = liveUrls.get(reference)
    if (cached) return cached

    const file = await resolveFile(reference)
    return file ? rememberUrl(reference, URL.createObjectURL(file)) : null
  },

  readBlob: async (reference) => resolveFile(reference),

  releaseUrls: releaseAllUrls,

  cache: webCache,
}
