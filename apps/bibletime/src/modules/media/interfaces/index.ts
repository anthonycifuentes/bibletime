export type { MediaFit, MediaSlideData, MediaSlideKind } from "@/modules/core/interfaces"

/**
 * What a *file* in the browser is, as opposed to what a *slide* is: a deck
 * is one `document` entry here, but becomes N `document-page` slides (see
 * `MediaSlideKind`).
 */
export type MediaEntryKind = "image" | "video" | "document"

/**
 * A folder on the user's disk the library browses. Files are never copied
 * out of it — a root is a lens onto the filesystem, and removing one leaves
 * every file inside it untouched.
 */
export interface MediaRoot {
  /** Generated, stable for the root's lifetime, and the host part of every reference into it. */
  id: string
  /** Display name — the folder's own basename unless the user renames it. */
  label: string
  /** Absolute path. Changing this repoints every reference into the root at once. */
  path: string
  addedAt: number
}

/** The persisted shape of `<userData>/media-sources.json`. */
export interface MediaSourcesFile {
  schemaVersion: 1
  roots: MediaRoot[]
  /** References (`bibletime-file://<rootId>/<path>`) the user has starred — global, not per-project. */
  favorites: string[]
}

/** One subdirectory of a root, as returned by a directory listing. */
export interface MediaDirectory {
  name: string
  /** Path relative to the containing root, POSIX-separated; `""` is the root itself. */
  relativePath: string
}

/** One browsable file inside a root. */
export interface MediaEntry {
  /** `bibletime-file://<rootId>/<relativePath>` — the identity used everywhere downstream. */
  reference: string
  rootId: string
  /** Path relative to the containing root, POSIX-separated. */
  relativePath: string
  name: string
  /** Lowercase, without the dot. */
  extension: string
  kind: MediaEntryKind
  size: number
  mtimeMs: number
  /**
   * Set when the extension is recognized but this build cannot render it.
   * Such an entry is listed with a note and cannot be added — never
   * silently hidden, so a user can find the file they came for.
   *
   * `codec` is a file no build can decode (HEIC, `.avi`); `desktop-only` is
   * a PowerPoint deck in a build with no LibreOffice, where exporting to
   * PDF is the way forward.
   */
  unsupportedReason?: "codec" | "format" | "desktop-only"
}

/**
 * What `media:listDirectory` returns: every regular file, with no notion of
 * what counts as media. Format policy lives in one place — the renderer's
 * `supported-formats` — which then produces `MediaDirectoryListing`.
 */
export interface RawMediaDirectoryListing {
  rootId: string
  relativePath: string
  directories: MediaDirectory[]
  files: { name: string; relativePath: string; size: number; mtimeMs: number }[]
}

/** A directory listing: its subdirectories and its supported files. */
export interface MediaDirectoryListing {
  rootId: string
  relativePath: string
  directories: MediaDirectory[]
  files: MediaEntry[]
}

/** One rendered page of a document, cached on disk as an image. */
export interface MediaDocumentPage {
  /** `bibletime-file://cache/<contentKey>/page-NNNN.png`. */
  reference: string
  /** 0-based. */
  pageIndex: number
  width: number
  height: number
}

/** A document whose pages have been rendered and cached. */
export interface MediaDocument {
  /** The source file's content key — also the cache directory name and `MediaSlideData.documentId`. */
  contentKey: string
  title: string
  /** The entry this was rendered from; absent for a Google Slides import, which has no local source file. */
  sourceReference?: string
  pages: MediaDocumentPage[]
  /** Set for a Google Slides import — when the snapshot was fetched. */
  importedAt?: number
  /** Set for a Google Slides import — so it can be re-fetched. */
  sourceUrl?: string
}

/** Why a document could not be turned into pages. Each maps to its own message in the preview column. */
export type MediaDocumentErrorCode =
  | "libreoffice-missing"
  | "conversion-failed"
  | "conversion-timeout"
  | "pdf-unreadable"
  | "pdf-password-protected"
  | "not-a-slides-url"
  | "slides-not-shared"
  | "network"
  | "desktop-required"

export interface MediaDocumentError {
  code: MediaDocumentErrorCode
  /** Underlying detail for logs — never the whole user-facing message, which is localized. */
  detail?: string
}

/** The progress of turning a selected document into pages. */
export type MediaDocumentState =
  | { status: "idle" }
  | { status: "converting" }
  | { status: "rendering"; renderedPages: number; totalPages: number }
  | { status: "ready"; document: MediaDocument }
  | { status: "failed"; error: MediaDocumentError }

export type MediaSortKey = "name" | "date" | "size"

/** The grid's view settings, preserved while browsing and across bottom-tab switches. */
export interface MediaViewSettings {
  sortKey: MediaSortKey
  /** `null` shows every kind. */
  kindFilter: MediaEntryKind | null
  search: string
  /** Tile width in pixels. */
  thumbnailSize: number
}

/**
 * Where the grid is pointed. A root/directory pair, or one of the two
 * synthetic views that span roots.
 */
export type MediaLocation =
  | { kind: "directory"; rootId: string; relativePath: string }
  | { kind: "all" }
  | { kind: "favorites" }

/**
 * Reads and writes the media library's roots and favorites. Desktop-only —
 * unlike `LibraryStorageDriver` there is no web twin, because a media
 * library is a view onto a filesystem the web build cannot reach (see
 * `add-media-tab` design decision 9).
 */
export interface MediaSourcesDriver {
  readonly isAvailable: boolean
  read: () => Promise<MediaSourcesFile>
  write: (file: MediaSourcesFile) => Promise<void>
}

/**
 * How a root's files are reached. Desktop roots are always `directory`;
 * `stash` exists for browsers with no directory picker, where the only
 * handle to the bytes is the `File` object itself (see
 * `enable-media-tab-on-web` design decision 3).
 */
export type MediaRootKind = "directory" | "stash"

/**
 * Whether a root can be read right now.
 *
 * `needs-permission` is deliberately distinct from `unavailable`: the first
 * means the folder is there and one click restores it, the second means the
 * folder is gone. Telling a user to reconnect a folder that no longer
 * exists — or to relocate one that is merely locked — sends them at the
 * wrong remedy.
 */
export type MediaRootState = "ready" | "needs-permission" | "unavailable"

/**
 * What the current build can do with media. Replaces the single
 * `isMediaAvailable()` boolean, which conflated "can I read files?" with
 * "am I Electron?" — the conflation that kept the whole tab off the web
 * build (see `enable-media-tab-on-web` design decision 2).
 *
 * Each affordance reads the one flag it needs, and an absent capability
 * means the control is *not rendered* rather than rendered disabled.
 */
export interface MediaCapabilities {
  /** False in browsers without the File System Access API — those get a flat stash root. */
  canBrowseDirectories: boolean
  /** LibreOffice. Desktop only; elsewhere `.pptx`/`.ppt`/`.odp` are listed with an explanation. */
  canConvertDocuments: boolean
  /** The export fetch is cross-origin, so only the main process can make it. */
  canImportGoogleSlides: boolean
  /** `shell.showItemInFolder`; no browser equivalent. */
  canRevealInFolder: boolean
  /** Whether roots survive a restart/reload. False only if browser storage is unavailable. */
  canPersistAcrossReload: boolean
}

/** A registered root plus how it is reached and whether it can be read right now. */
export type MediaRootStatus = MediaRoot & {
  kind: MediaRootKind
  state: MediaRootState
  /** Retained so call sites written against the desktop-only shape keep working. */
  isAvailable: boolean
  /** Bytes this root occupies in app storage. Non-zero only for a `stash`. */
  storedBytes?: number
}

/** What a relink pick can produce. `outsideRoots` means the file is real but unaddressable. */
export type MediaRelinkResult =
  | { rootId: string; relativePath: string; size: number; mtimeMs: number }
  | { outsideRoots: true }
  | null

/** Derived artifacts — thumbnails and rendered pages — keyed by content identity. */
export interface MediaCacheDriver {
  list: (contentKey: string) => Promise<string[]>
  /** Returns a `bibletime-file://cache/<key>/<file>` reference to the written artifact. */
  write: (contentKey: string, fileName: string, buffer: ArrayBuffer) => Promise<string>
  size: () => Promise<number>
  clear: () => Promise<void>
}

/**
 * The one seam between the media feature and the platform underneath it.
 *
 * Before this existed, four services each opened with their own
 * `window.bibletime?.media` feature detect, which meant four places to get
 * the browser path subtly wrong and components above them branching on the
 * bridge. Everything above this interface — format policy, thumbnail
 * rasterization, the pdf.js loop, the whole `views/` layer — is now
 * build-agnostic.
 *
 * The port deliberately exposes *bytes and metadata*, not features: it
 * answers "what is in this directory" and "give me a URL for this
 * reference", never "render this deck".
 */
export interface MediaAccessDriver {
  readonly capabilities: MediaCapabilities

  readRoots: () => Promise<MediaRootStatus[]>
  /** Picks a directory. `null` when the user cancels. */
  addDirectoryRoot: () => Promise<MediaRootStatus | null>
  /** Registers a directory that arrived as a path (an OS drag-and-drop) rather than through a picker. Desktop only. */
  addDirectoryRootByPath?: (directoryPath: string) => Promise<MediaRootStatus | null>
  /** Adds loose files to a flat root, creating it when `rootId` is omitted. Browser only. */
  addFilesRoot?: (files: File[], rootId?: string) => Promise<MediaRootStatus | null>
  removeRoot: (rootId: string) => Promise<void>
  /** Repoints a root that moved — fixes every slide referencing anything inside it at once. */
  relocateRoot: (rootId: string) => Promise<MediaRootStatus | null>
  /** Re-requests a lapsed permission. Must be called from a user gesture. Browser only. */
  reconnectRoot?: (rootId: string) => Promise<MediaRootStatus | null>

  readFavorites: () => Promise<string[]>
  setFavorite: (reference: string, isFavorite: boolean) => Promise<string[]>

  /** Every regular file and subdirectory — format policy stays in `supported-formats`. */
  listDirectory: (rootId: string, relativePath: string) => Promise<RawMediaDirectoryListing>
  statFile: (reference: string) => Promise<{ size: number; mtimeMs: number; exists: boolean }>

  /**
   * A reference turned into something an `<img>` or `<video>` can load.
   *
   * On desktop the reference already *is* that URL, because a privileged
   * protocol serves it. In the browser this mints an object URL, which is
   * why the result must never be persisted onto a slide: it is valid only
   * in the browsing context that created it (see design decision 6).
   */
  resolveUrl: (reference: string) => Promise<string | null>
  readBlob: (reference: string) => Promise<Blob | null>
  /** Frees anything `resolveUrl` allocated for this context. No-op on desktop. */
  releaseUrls?: () => void

  revealInFolder?: (reference: string) => Promise<void>
  relinkFileDialog?: (filters: { name: string; extensions: string[] }[]) => Promise<MediaRelinkResult>

  readonly cache: MediaCacheDriver
}
