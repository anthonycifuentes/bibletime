import type { Folder, LibraryStorageDriver } from "@/modules/library/interfaces"

const STORAGE_KEY = "bibletime.library.folders"

const isBrowser = typeof window !== "undefined"

const readFolders = (): Folder[] => {
  if (!isBrowser) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Folder[]) : []
  } catch {
    return []
  }
}

const writeFolders = (folders: Folder[]): void => {
  if (!isBrowser) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(folders))
}

/** Web build: folders are persisted to this browser's own `localStorage` — per-browser, not portable. */
export const webLibraryStorage: LibraryStorageDriver = {
  canWrite: true,
  list: async () => readFolders(),
  save: async (folder) => {
    const next = [...readFolders().filter((item) => item.id !== folder.id), folder]
    writeFolders(next)
  },
  remove: async (id) => {
    writeFolders(readFolders().filter((item) => item.id !== id))
  },
}
