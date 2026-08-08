import { useCallback, useEffect, useState } from "react"

import type { Song } from "@/modules/songs/interfaces"
import { getSongStorage } from "@/modules/songs/services"

const createId = (): string => `song-${Math.random().toString(36).slice(2, 10)}`

// A stable singleton per platform (see `getSongStorage`), so this is safe to
// depend on directly below without re-resolving it on every render.
const storage = getSongStorage()

/**
 * The song repertoire: the full list plus create/update/remove. Songs are
 * global rather than project-scoped (see `getSongStorage`), so unlike
 * `useLibrary` this takes no project id and never re-fetches on a project
 * switch.
 */
export const useSongs = () => {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await storage.list()
    // Newest first, so a song just created or imported is at the top of the list.
    setSongs([...list].sort((a, b) => b.updatedAt - a.updatedAt))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Creates a song and returns it, so callers can select it or open it in the editor without waiting on a re-read. */
  const create = useCallback(
    async (song: Omit<Song, "id" | "createdAt" | "updatedAt">) => {
      const now = Date.now()
      const created: Song = { ...song, id: createId(), createdAt: now, updatedAt: now }
      await storage.save(created)
      await refresh()
      return created
    },
    [refresh]
  )

  /**
   * Patches an existing song in place. `createdAt` and any field not in
   * `changes` are carried over — notably `source`, so an imported song keeps
   * its provenance through later edits.
   */
  const update = useCallback(
    async (songId: string, changes: Partial<Omit<Song, "id" | "createdAt">>) => {
      const existing = songs.find((song) => song.id === songId)
      if (!existing) return undefined

      const updated: Song = { ...existing, ...changes, updatedAt: Date.now() }
      await storage.save(updated)
      await refresh()
      return updated
    },
    [songs, refresh]
  )

  const remove = useCallback(
    async (songId: string) => {
      await storage.remove(songId)
      await refresh()
    },
    [refresh]
  )

  return { songs, isLoading, canWrite: storage.canWrite, create, update, remove, refresh }
}
