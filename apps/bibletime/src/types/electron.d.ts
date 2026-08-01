import type { BibleVersionCatalogEntry, DownloadedBibleVersionMeta, BibleVersion } from "@/modules/bible/interfaces"
import type { SavedTemplate } from "@/modules/templates/interfaces"
import type { Folder, Project } from "@/modules/library/interfaces"

export {}

declare global {
  interface Window {
    /**
     * Exposed by apps/desktop's preload script (contextBridge) when running
     * inside the Electron shell. Absent in the plain web build — every
     * consumer must feature-detect with `window.bibletime?.templates`.
     */
    bibletime?: {
      versions?: NodeJS.ProcessVersions
      appVersion?: string
      templates: {
        list: () => Promise<SavedTemplate[]>
        save: (template: SavedTemplate) => Promise<void>
        remove: (id: string) => Promise<void>
      }
      templateMedia: {
        /** Copies the given video into local storage, returning a `bibletime-media:///<file>` reference to use as a `SlideBackground`'s video value. */
        save: (buffer: ArrayBuffer, extension: string) => Promise<string>
        remove: (reference: string) => Promise<void>
      }
      bibleVersionDownloads: {
        list: () => Promise<DownloadedBibleVersionMeta[]>
        download: (entry: BibleVersionCatalogEntry) => Promise<DownloadedBibleVersionMeta>
        read: (versionId: number) => Promise<BibleVersion>
        remove: (versionId: number) => Promise<void>
      }
      library: {
        list: () => Promise<Folder[]>
        save: (folder: Folder) => Promise<void>
        remove: (id: string) => Promise<void>
      }
      project: {
        list: () => Promise<Project[]>
        save: (project: Project) => Promise<void>
        remove: (id: string) => Promise<void>
      }
    }
  }
}
