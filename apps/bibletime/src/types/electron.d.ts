import type { BibleVersionCatalogEntry, DownloadedBibleVersionMeta, BibleVersion } from "@/modules/bible/interfaces"
import type { SavedTemplate } from "@/modules/templates/interfaces"
import type { Folder, Project } from "@/modules/library/interfaces"
import type { Song } from "@/modules/songs/interfaces"
import type {
  MediaDocumentErrorCode,
  MediaRoot,
  RawMediaDirectoryListing,
} from "@/modules/media/interfaces"

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
      songs: {
        list: () => Promise<Song[]>
        save: (song: Song) => Promise<void>
        remove: (id: string) => Promise<void>
      }
      songSearch: {
        /** Queries the online lyrics provider from the main process (no CORS, and a real `User-Agent`), returning its raw result array. */
        query: (query: string) => Promise<unknown>
      }
      project: {
        list: () => Promise<Project[]>
        save: (project: Project) => Promise<void>
        remove: (id: string) => Promise<void>
        /** Shows a native "Open" file dialog and returns the selected file's path and contents, or `null` if canceled. */
        openFileDialog: () => Promise<{ path: string; contents: string } | null>
        /** Shows a native "Save" dialog seeded with `defaultPath`, then writes `contents` to the chosen path. */
        saveFileDialog: (
          defaultPath: string,
          contents: string
        ) => Promise<
          | { canceled: true }
          | { canceled: false; ok: true; path: string }
          | { canceled: false; ok: false; error: string }
        >
        /** Writes `contents` straight to an already-known path — no dialog. Reports failure rather than throwing, so the caller can fall back to `saveFileDialog`. */
        saveToPath: (
          filePath: string,
          contents: string
        ) => Promise<{ ok: true; path: string } | { ok: false; error: string }>
      }
      /**
       * The media library. Desktop-only with no web twin — a media library
       * is a view onto a filesystem the browser build cannot reach, and its
       * payload is gigabytes of video that `localStorage` could not hold.
       */
      media: {
        listRoots: () => Promise<(MediaRoot & { isAvailable: boolean })[]>
        /** Shows a native folder picker; returns the registered root, or `null` if canceled. */
        addRoot: () => Promise<(MediaRoot & { isAvailable: boolean }) | null>
        /** Registers a folder dropped from the OS file manager, which arrives as a path rather than through a dialog. */
        addRootByPath: (directoryPath: string) => Promise<MediaRoot & { isAvailable: boolean }>
        removeRoot: (rootId: string) => Promise<void>
        /** Repoints a root at a new directory — fixes every slide referencing anything inside it at once. */
        relocateRoot: (rootId: string) => Promise<(MediaRoot & { isAvailable: boolean }) | null>
        listFavorites: () => Promise<string[]>
        setFavorite: (reference: string, isFavorite: boolean) => Promise<string[]>
        /** Every regular file and subdirectory — format policy lives in the renderer's `supported-formats`. */
        listDirectory: (rootId: string, relativePath: string) => Promise<RawMediaDirectoryListing>
        statFile: (reference: string) => Promise<{ size: number; mtimeMs: number; exists: boolean }>
        revealInFolder: (reference: string) => Promise<void>
        /** Picks a file for relinking; reports `outsideRoots` when the pick isn't under any registered root. */
        relinkFileDialog: (
          filters: { name: string; extensions: string[] }[]
        ) => Promise<
          | { rootId: string; relativePath: string; size: number; mtimeMs: number }
          | { outsideRoots: true }
          | null
        >
      }
      /** Derived artifacts — thumbnails and rendered document pages — under a single managed, reclaimable directory. */
      mediaCache: {
        list: (contentKey: string) => Promise<string[]>
        /** Returns a `bibletime-file://cache/<key>/<file>` reference to the written artifact. */
        write: (contentKey: string, fileName: string, buffer: ArrayBuffer) => Promise<string>
        size: () => Promise<number>
        clear: () => Promise<void>
      }
      mediaConvert: {
        probeLibreOffice: () => Promise<{ available: boolean; path: string | null }>
        toPdf: (
          contentKey: string,
          reference: string
        ) => Promise<
          | { ok: true; reference: string }
          | { ok: false; code: MediaDocumentErrorCode; detail?: string }
        >
        cancel: (contentKey: string) => Promise<void>
      }
      googleSlides: {
        /** Fetches a deck as PDF from the main process (CORS makes it unreachable from here) and caches it under `contentKey`. */
        export: (
          url: string,
          contentKey: string
        ) => Promise<
          | { ok: true; deckId: string; importedAt: number; reference: string }
          | { ok: false; code: MediaDocumentErrorCode; detail?: string }
        >
      }
      projectSettings: {
        /** The current on-disk location projects (and their folders/slides) are stored, and whether it's still the app's default. */
        get: () => Promise<{ path: string; isDefault: boolean }>
        /** Shows a native folder picker; on selection, moves everything into a dedicated subfolder there and returns the new location, or `null` if canceled. */
        choose: () => Promise<{ path: string; isDefault: boolean } | null>
        /** Moves everything back to the app's default managed location. */
        resetToDefault: () => Promise<{ path: string; isDefault: boolean }>
      }
    }
  }
}
