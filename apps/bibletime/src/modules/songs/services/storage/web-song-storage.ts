import type { Song, SongStorageDriver } from "@/modules/songs/interfaces"
import { fromSongFile, toSongFile } from "@/modules/songs/services/song-file"

const STORAGE_KEY = "bibletime.songs"

const isBrowser = typeof window !== "undefined"

const readSongs = (): Song[] => {
  if (!isBrowser) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Skips entries that aren't valid song JSON rather than failing the whole
    // list, matching what the desktop driver does with unreadable files.
    return parsed
      .map((entry) => fromSongFile(entry))
      .filter((song): song is Song => song !== undefined)
  } catch {
    return []
  }
}

const writeSongs = (songs: Song[]): void => {
  if (!isBrowser) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(songs.map(toSongFile)))
}

/** Web build: songs are persisted to this browser's own `localStorage` — per-browser, not portable. */
export const webSongStorage: SongStorageDriver = {
  canWrite: true,
  list: async () => readSongs(),
  save: async (song) => {
    writeSongs([...readSongs().filter((entry) => entry.id !== song.id), song])
  },
  remove: async (id) => {
    writeSongs(readSongs().filter((entry) => entry.id !== id))
  },
}
