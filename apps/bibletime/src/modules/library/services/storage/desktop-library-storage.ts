import type { LibraryStorageDriver } from "@/modules/library/interfaces"

/**
 * Desktop build: folders are read/written as individual JSON files in a
 * dedicated folder under the app's user-data directory, via the IPC bridge
 * the Electron preload script exposes on `window.bibletime.library` (see
 * apps/desktop/src/{main,preload}.ts) — mirrors `desktopTemplateStorage`.
 */
export const desktopLibraryStorage: LibraryStorageDriver = {
  canWrite: true,
  list: async () => window.bibletime!.library.list(),
  save: async (folder) => {
    await window.bibletime!.library.save(folder)
  },
  remove: async (id) => {
    await window.bibletime!.library.remove(id)
  },
}
