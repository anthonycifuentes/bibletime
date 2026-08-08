import { useCallback, useEffect, useState } from "react"

import type { MediaDirectory, MediaEntry, MediaLocation } from "@/modules/media/interfaces"
import { listAllRoots, listDirectory, listFavoriteEntries } from "@/modules/media/services"

interface MediaDirectoryState {
  directories: MediaDirectory[]
  entries: MediaEntry[]
  isLoading: boolean
  /** Set when the location itself couldn't be read — an unmounted drive, a deleted folder, a permissions hole. */
  isUnreadable: boolean
}

const EMPTY: MediaDirectoryState = { directories: [], entries: [], isLoading: true, isUnreadable: false }

/**
 * Loads whatever the explorer is pointed at: a directory inside a root, or
 * one of the two synthetic views that span roots.
 *
 * Deliberately holds only data — sorting, filtering, and searching are pure
 * functions in `lib/sort-media-entries`, applied by the panel over the view
 * settings the console store persists. That split is what lets the view
 * settings survive a bottom-tab round-trip without this hook re-fetching.
 */
export const useMediaDirectory = (
  location: MediaLocation,
  options: { rootIds: string[]; favorites: string[] }
) => {
  const [state, setState] = useState<MediaDirectoryState>(EMPTY)

  // Serialized so the effect's identity tracks the location's *value*, not
  // the object identity a parent rebuilds on every render.
  const locationKey = JSON.stringify(location)
  const rootIdsKey = options.rootIds.join(",")
  const favoritesKey = options.favorites.join(",")

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, isUnreadable: false }))

    try {
      if (location.kind === "all") {
        setState({ directories: [], entries: await listAllRoots(options.rootIds), isLoading: false, isUnreadable: false })
        return
      }

      if (location.kind === "favorites") {
        setState({
          directories: [],
          entries: await listFavoriteEntries(options.favorites),
          isLoading: false,
          isUnreadable: false,
        })
        return
      }

      const listing = await listDirectory(location.rootId, location.relativePath)
      setState({ directories: listing.directories, entries: listing.files, isLoading: false, isUnreadable: false })
    } catch {
      setState({ directories: [], entries: [], isLoading: false, isUnreadable: true })
    }
    // Keyed on the serialized values, not the objects: a parent rebuilding
    // `location`/`options` each render would otherwise refetch every render.
  }, [locationKey, rootIdsKey, favoritesKey])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, refresh: load }
}
