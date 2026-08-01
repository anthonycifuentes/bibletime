import type { ProjectStorageDriver } from "@/modules/library/interfaces"

/**
 * Desktop build: projects are read/written as individual JSON files in a
 * dedicated folder under the app's user-data directory, via the IPC bridge
 * the Electron preload script exposes on `window.bibletime.project` (see
 * apps/desktop/src/{main,preload}.ts) — mirrors `desktopLibraryStorage`.
 */
export const desktopProjectStorage: ProjectStorageDriver = {
  canWrite: true,
  list: async () => window.bibletime!.project.list(),
  save: async (project) => {
    await window.bibletime!.project.save(project)
  },
  remove: async (id) => {
    await window.bibletime!.project.remove(id)
  },
}
