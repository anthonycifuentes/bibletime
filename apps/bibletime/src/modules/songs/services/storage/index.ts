import type { SongStorageDriver } from "@/modules/songs/interfaces"
import { desktopSongStorage } from "./desktop-song-storage"
import { webSongStorage } from "./web-song-storage"

/**
 * Picks the filesystem-backed driver when running inside the Electron shell
 * (the preload bridge is present), else the browser-local web driver.
 */
export const getSongStorage = (): SongStorageDriver => {
  if (typeof window !== "undefined" && window.bibletime?.songs) {
    return desktopSongStorage
  }
  return webSongStorage
}
