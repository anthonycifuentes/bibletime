import { useCallback, useEffect, useState } from "react"

import {
  addMediaRoot,
  addMediaRootByPath,
  isMediaAvailable,
  readMediaFavorites,
  readMediaRoots,
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
 * `isAvailable` reports whether the library exists at all: false in the web
 * build, where the tab renders a "requires the desktop app" state instead.
 */
export const useMediaRoots = () => {
  const [roots, setRoots] = useState<MediaRootStatus[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isAvailable = isMediaAvailable()

  const refresh = useCallback(async () => {
    if (!isAvailable) {
      setIsLoading(false)
      return
    }
    const [nextRoots, nextFavorites] = await Promise.all([readMediaRoots(), readMediaFavorites()])
    setRoots(nextRoots)
    setFavorites(nextFavorites)
    setIsLoading(false)
  }, [isAvailable])

  useEffect(() => {
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

  const toggleFavorite = useCallback(async (reference: string, isFavorite: boolean) => {
    setFavorites(await setMediaFavorite(reference, isFavorite))
  }, [])

  return {
    isAvailable,
    isLoading,
    roots,
    favorites,
    refresh,
    addRoot,
    addRootByPath,
    removeRoot,
    relocateRoot,
    toggleFavorite,
  }
}
