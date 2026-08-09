import type {
  MediaAccessDriver,
  MediaCacheDriver,
  MediaCapabilities,
  MediaRelinkResult,
  MediaRoot,
  MediaRootStatus,
  RawMediaDirectoryListing,
} from "@/modules/media/interfaces"

/**
 * The preload bridge. This module is the *only* place in the media feature
 * that may read `window.bibletime` — everything else goes through
 * `getMediaAccess()`, which is what lets the tab render in a build that has
 * no bridge at all (see `enable-media-tab-on-web` design decision 1).
 */
const bridge = () => (typeof window !== "undefined" ? window.bibletime?.media : undefined)
const cacheBridge = () => (typeof window !== "undefined" ? window.bibletime?.mediaCache : undefined)

/** Whether this build has the Electron bridge, and can therefore use the desktop driver at all. */
export const hasDesktopMediaBridge = (): boolean => bridge() !== undefined

/**
 * Everything is available on desktop. Stated as a literal rather than
 * computed, because the point of the capability record is that each flag
 * has an independent answer — and on desktop every answer happens to be yes.
 */
const DESKTOP_CAPABILITIES: MediaCapabilities = {
  canBrowseDirectories: true,
  canConvertDocuments: true,
  canImportGoogleSlides: true,
  canRevealInFolder: true,
  canPersistAcrossReload: true,
}

/**
 * The main process reports a root as available or not; it has no notion of
 * a lapsed permission, which is a browser-only state. `kind` is always
 * `directory` because a stash only exists where directories cannot be read.
 */
const toRootStatus = (root: MediaRoot & { isAvailable: boolean }): MediaRootStatus => ({
  ...root,
  kind: "directory",
  state: root.isAvailable ? "ready" : "unavailable",
  isAvailable: root.isAvailable,
})

const desktopCache: MediaCacheDriver = {
  list: async (contentKey) => (await cacheBridge()?.list(contentKey)) ?? [],
  write: async (contentKey, fileName, buffer) => {
    const written = await cacheBridge()?.write(contentKey, fileName, buffer)
    if (!written) throw new Error("Media cache is unavailable")
    return written
  },
  size: async () => (await cacheBridge()?.size()) ?? 0,
  clear: async () => {
    await cacheBridge()?.clear()
  },
}

/**
 * The desktop adapter: a thin pass-through to the preload bridge, holding
 * exactly the feature-detection and error-swallowing behavior the four
 * media services used to each carry their own copy of.
 */
export const desktopMediaAccess: MediaAccessDriver = {
  capabilities: DESKTOP_CAPABILITIES,

  readRoots: async () => ((await bridge()?.listRoots()) ?? []).map(toRootStatus),

  addDirectoryRoot: async () => {
    const added = await bridge()?.addRoot()
    return added ? toRootStatus(added) : null
  },

  addDirectoryRootByPath: async (directoryPath) => {
    const added = await bridge()?.addRootByPath(directoryPath)
    return added ? toRootStatus(added) : null
  },

  removeRoot: async (rootId) => {
    await bridge()?.removeRoot(rootId)
  },

  relocateRoot: async (rootId) => {
    const relocated = await bridge()?.relocateRoot(rootId)
    return relocated ? toRootStatus(relocated) : null
  },

  readFavorites: async () => (await bridge()?.listFavorites()) ?? [],

  setFavorite: async (reference, isFavorite) => (await bridge()?.setFavorite(reference, isFavorite)) ?? [],

  listDirectory: async (rootId, relativePath): Promise<RawMediaDirectoryListing> =>
    (await bridge()?.listDirectory(rootId, relativePath)) ?? {
      rootId,
      relativePath,
      directories: [],
      files: [],
    },

  statFile: async (reference) => {
    const media = bridge()
    if (!media) return { size: 0, mtimeMs: 0, exists: false }
    try {
      return await media.statFile(reference)
    } catch {
      // A moved, deleted, or unreachable file — the caller renders the
      // missing state rather than treating this as an error.
      return { size: 0, mtimeMs: 0, exists: false }
    }
  },

  /** The privileged protocol serves the reference directly, so it is already a loadable URL. */
  resolveUrl: async (reference) => reference,

  readBlob: async (reference) => {
    try {
      const response = await fetch(reference)
      return response.ok ? await response.blob() : null
    } catch {
      return null
    }
  },

  revealInFolder: async (reference) => {
    await bridge()?.revealInFolder(reference)
  },

  relinkFileDialog: async (filters): Promise<MediaRelinkResult> =>
    (await bridge()?.relinkFileDialog(filters)) ?? null,

  cache: desktopCache,
}
