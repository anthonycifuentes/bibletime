import type { MediaRoot } from "@/modules/media/interfaces"

/** A registered root plus whether its directory is currently reachable. */
export type MediaRootStatus = MediaRoot & { isAvailable: boolean }

/**
 * The preload bridge, or `undefined` in the web build. Every call here
 * feature-detects rather than throwing, because the Media tab renders a
 * "requires the desktop app" state on web instead of failing (see
 * `add-media-tab` design decision 9).
 */
const bridge = () => (typeof window !== "undefined" ? window.bibletime?.media : undefined)

/** Whether a media library is reachable at all — false in the browser build. */
export const isMediaAvailable = (): boolean => bridge() !== undefined

export const readMediaRoots = async (): Promise<MediaRootStatus[]> => (await bridge()?.listRoots()) ?? []

export const addMediaRoot = async (): Promise<MediaRootStatus | null> => (await bridge()?.addRoot()) ?? null

export const addMediaRootByPath = async (directoryPath: string): Promise<MediaRootStatus | null> =>
  (await bridge()?.addRootByPath(directoryPath)) ?? null

export const removeMediaRoot = async (rootId: string): Promise<void> => {
  await bridge()?.removeRoot(rootId)
}

export const relocateMediaRoot = async (rootId: string): Promise<MediaRootStatus | null> =>
  (await bridge()?.relocateRoot(rootId)) ?? null

export const readMediaFavorites = async (): Promise<string[]> => (await bridge()?.listFavorites()) ?? []

export const setMediaFavorite = async (reference: string, isFavorite: boolean): Promise<string[]> =>
  (await bridge()?.setFavorite(reference, isFavorite)) ?? []

export const revealMediaInFolder = async (reference: string): Promise<void> => {
  await bridge()?.revealInFolder(reference)
}

export const statMediaFile = async (
  reference: string
): Promise<{ size: number; mtimeMs: number; exists: boolean }> => {
  const media = bridge()
  if (!media) return { size: 0, mtimeMs: 0, exists: false }
  try {
    return await media.statFile(reference)
  } catch {
    // A moved, deleted, or unreachable file — the caller renders the
    // missing state rather than treating this as an error.
    return { size: 0, mtimeMs: 0, exists: false }
  }
}

export const relinkMediaFile = async (
  filters: { name: string; extensions: string[] }[]
): Promise<
  { rootId: string; relativePath: string; size: number; mtimeMs: number } | { outsideRoots: true } | null
> => (await bridge()?.relinkFileDialog(filters)) ?? null
