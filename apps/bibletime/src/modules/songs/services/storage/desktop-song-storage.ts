import type { SongStorageDriver } from "@/modules/songs/interfaces"
import { fromSongFile, toSongFile } from "@/modules/songs/services/song-file"

/**
 * Desktop build: songs are read/written as individual JSON files in a
 * dedicated `songs` folder under the app's user-data directory, via the IPC
 * bridge the Electron preload script exposes on `window.bibletime.songs`
 * (see apps/desktop/src/{main,preload}.ts) — mirrors `desktopLibraryStorage`.
 */
export const desktopSongStorage: SongStorageDriver = {
  canWrite: true,
  list: async () => {
    const raw = await window.bibletime!.songs.list()
    return raw
      .map((entry) => fromSongFile(entry))
      .filter((song): song is NonNullable<typeof song> => song !== undefined)
  },
  save: async (song) => {
    await window.bibletime!.songs.save(toSongFile(song))
  },
  remove: async (id) => {
    await window.bibletime!.songs.remove(id)
  },
}
