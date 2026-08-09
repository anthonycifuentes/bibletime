import type { MediaAccessDriver } from "@/modules/media/interfaces"
import { desktopMediaAccess, hasDesktopMediaBridge } from "@/modules/media/services/access/desktop-media-access"
import { webMediaAccess } from "@/modules/media/services/access/web-media-access"
import { isMediaDbAvailable } from "@/modules/media/services/access/web-media-db"

export type { MediaAccessDriver } from "@/modules/media/interfaces"
export { desktopMediaAccess, hasDesktopMediaBridge } from "@/modules/media/services/access/desktop-media-access"
export { readStorageEstimate, requestPersistentStorage } from "@/modules/media/services/access/web-media-db"

/**
 * Nothing is reachable. Used during server rendering, where there is
 * neither a bridge nor a browser: every read returns empty and every
 * capability is off, so a component that renders before hydration shows
 * its empty state rather than throwing.
 */
const unavailableMediaAccess: MediaAccessDriver = {
  capabilities: {
    canBrowseDirectories: false,
    canConvertDocuments: false,
    canImportGoogleSlides: false,
    canRevealInFolder: false,
    canPersistAcrossReload: false,
  },
  readRoots: async () => [],
  addDirectoryRoot: async () => null,
  removeRoot: async () => {},
  relocateRoot: async () => null,
  readFavorites: async () => [],
  setFavorite: async () => [],
  listDirectory: async (rootId, relativePath) => ({ rootId, relativePath, directories: [], files: [] }),
  statFile: async () => ({ size: 0, mtimeMs: 0, exists: false }),
  resolveUrl: async () => null,
  readBlob: async () => null,
  cache: {
    list: async () => [],
    write: async () => {
      throw new Error("Media cache is unavailable")
    },
    size: async () => 0,
    clear: async () => {},
  },
}

let selected: MediaAccessDriver | undefined

/**
 * The one place the build is identified, the way `getLibraryStorage()`
 * already picks between its desktop and web twins.
 *
 * Resolved lazily rather than at module load: this module is pulled into
 * the server's graph during SSR, where `window` does not exist, and a
 * top-level pick would freeze the unavailable driver in place for the
 * hydrated client too.
 */
export const getMediaAccess = (): MediaAccessDriver => {
  if (selected) return selected
  if (typeof window === "undefined") return unavailableMediaAccess

  selected = hasDesktopMediaBridge()
    ? desktopMediaAccess
    : isMediaDbAvailable()
      ? webMediaAccess
      : unavailableMediaAccess
  return selected
}
