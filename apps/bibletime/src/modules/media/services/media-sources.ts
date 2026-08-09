import type { MediaCapabilities, MediaRootStatus } from "@/modules/media/interfaces"
import { getMediaAccess } from "@/modules/media/services/access"

export type { MediaRootStatus } from "@/modules/media/interfaces"

/**
 * What the current build can do with media.
 *
 * This replaced a single `isMediaAvailable()` boolean that answered two
 * questions at once — "can I read files?" and "am I Electron?" — which is
 * what kept the entire tab off the web build. Each affordance now reads the
 * one flag it needs (see `enable-media-tab-on-web` design decision 2).
 */
export const mediaCapabilities = (): MediaCapabilities => getMediaAccess().capabilities

/**
 * Whether a media library is reachable at all.
 *
 * Retained for the handful of call sites that only care whether the tab has
 * anything to show. It is no longer a proxy for "is desktop" — a browser
 * that can hold roots answers true.
 */
export const isMediaAvailable = (): boolean => {
  const { canBrowseDirectories, canPersistAcrossReload } = mediaCapabilities()
  return canBrowseDirectories || canPersistAcrossReload
}

export const readMediaRoots = async (): Promise<MediaRootStatus[]> => getMediaAccess().readRoots()

export const addMediaRoot = async (): Promise<MediaRootStatus | null> => getMediaAccess().addDirectoryRoot()

/** Registers a folder dropped from the OS file manager, which arrives as a path rather than through a dialog. */
export const addMediaRootByPath = async (directoryPath: string): Promise<MediaRootStatus | null> =>
  (await getMediaAccess().addDirectoryRootByPath?.(directoryPath)) ?? null

/** Adds loose files to a flat root, creating one when `rootId` is omitted. Browsers without a directory picker only. */
export const addMediaFiles = async (files: File[], rootId?: string): Promise<MediaRootStatus | null> =>
  (await getMediaAccess().addFilesRoot?.(files, rootId)) ?? null

export const removeMediaRoot = async (rootId: string): Promise<void> => {
  await getMediaAccess().removeRoot(rootId)
}

export const relocateMediaRoot = async (rootId: string): Promise<MediaRootStatus | null> =>
  getMediaAccess().relocateRoot(rootId)

/** Re-requests a lapsed permission. Must be called from a user gesture, so only ever from a click handler. */
export const reconnectMediaRoot = async (rootId: string): Promise<MediaRootStatus | null> =>
  (await getMediaAccess().reconnectRoot?.(rootId)) ?? null

export const readMediaFavorites = async (): Promise<string[]> => getMediaAccess().readFavorites()

export const setMediaFavorite = async (reference: string, isFavorite: boolean): Promise<string[]> =>
  getMediaAccess().setFavorite(reference, isFavorite)

export const revealMediaInFolder = async (reference: string): Promise<void> => {
  await getMediaAccess().revealInFolder?.(reference)
}

export const statMediaFile = async (
  reference: string
): Promise<{ size: number; mtimeMs: number; exists: boolean }> => getMediaAccess().statFile(reference)

/**
 * A reference turned into something an `<img>` or `<video>` can load.
 *
 * Never persist the result onto a slide: in the browser it is an object URL
 * valid only in the context that minted it, which is why the `/present`
 * window resolves references for itself (see design decision 6).
 */
export const resolveMediaUrl = async (reference: string): Promise<string | null> =>
  getMediaAccess().resolveUrl(reference)

export const readMediaBlob = async (reference: string): Promise<Blob | null> =>
  getMediaAccess().readBlob(reference)

export const relinkMediaFile = async (
  filters: { name: string; extensions: string[] }[]
): Promise<
  { rootId: string; relativePath: string; size: number; mtimeMs: number } | { outsideRoots: true } | null
> => (await getMediaAccess().relinkFileDialog?.(filters)) ?? null
