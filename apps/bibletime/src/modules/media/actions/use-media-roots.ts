import { useCallback, useEffect, useState } from "react"

import type { MediaCapabilities } from "@/modules/media/interfaces"
import {
  addMediaFiles,
  addMediaRoot,
  addMediaRootByPath,
  mediaCapabilities,
  readMediaFavorites,
  readMediaRoots,
  reconnectMediaRoot,
  relocateMediaRoot,
  removeMediaRoot,
  setMediaFavorite,
} from "@/modules/media/services"
import type { MediaRootStatus } from "@/modules/media/services"

/**
 * The media library's registered roots and starred files. Called once at
 * the Media tab's root and passed down, so the explorer and the grid read
 * the same list rather than each keeping a copy that could drift — the same
 * shape `useLibrary` uses for folders.
 *
 * `capabilities` reports what this build can do with media. It replaced a
 * single availability boolean that meant "is this Electron", which is what
 * kept the tab off the web build entirely (see `enable-media-tab-on-web`
 * design decision 2).
 */
export const useMediaRoots = () => {
  const [roots, setRoots] = useState<MediaRootStatus[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  /**
   * Read once into state rather than on every render: the driver is picked
   * lazily on first use, so calling this during the server pass and again
   * after hydration would otherwise report two different answers and
   * mismatch the markup.
   */
  const [capabilities, setCapabilities] = useState<MediaCapabilities>(() => mediaCapabilities())

  const refresh = useCallback(async () => {
    const [nextRoots, nextFavorites] = await Promise.all([readMediaRoots(), readMediaFavorites()])
    setRoots(nextRoots)
    setFavorites(nextFavorites)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    setCapabilities(mediaCapabilities())
    void refresh()
  }, [refresh])

  const addRoot = useCallback(async () => {
    const added = await addMediaRoot()
    if (added) await refresh()
    return added
  }, [refresh])

  /** Registers a folder dropped from the OS file manager, which arrives as a path rather than through a dialog. */
  const addRootByPath = useCallback(
    async (directoryPath: string) => {
      const added = await addMediaRootByPath(directoryPath)
      if (added) await refresh()
      return added
    },
    [refresh]
  )

  /**
   * Adds loose files, for a browser that cannot open a whole folder. Passing
   * an existing `rootId` appends to that stash instead of creating another.
   */
  const addFiles = useCallback(
    async (files: File[], rootId?: string) => {
      const added = await addMediaFiles(files, rootId)
      if (added) await refresh()
      return added
    },
    [refresh]
  )

  const removeRoot = useCallback(
    async (rootId: string) => {
      await removeMediaRoot(rootId)
      await refresh()
    },
    [refresh]
  )

  /** Repoints a root that moved — fixes every slide referencing anything inside it in one action. */
  const relocateRoot = useCallback(
    async (rootId: string) => {
      const relocated = await relocateMediaRoot(rootId)
      if (relocated) await refresh()
      return relocated
    },
    [refresh]
  )

  /**
   * Re-grants a lapsed browser permission. Must be reached from a click:
   * the browser refuses a permission request that isn't tied to a gesture,
   * which is exactly why this is a button and not something the app does on
   * load (see `enable-media-tab-on-web` design decision 9).
   */
  const reconnectRoot = useCallback(
    async (rootId: string) => {
      const reconnected = await reconnectMediaRoot(rootId)
      if (reconnected) await refresh()
      return reconnected
    },
    [refresh]
  )

  const toggleFavorite = useCallback(async (reference: string, isFavorite: boolean) => {
    setFavorites(await setMediaFavorite(reference, isFavorite))
  }, [])

  return {
    capabilities,
    isLoading,
    roots,
    favorites,
    refresh,
    addRoot,
    addRootByPath,
    addFiles,
    removeRoot,
    relocateRoot,
    reconnectRoot,
    toggleFavorite,
  }
}
