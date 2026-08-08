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
   * Set when the extension is recognized but this build cannot decode it
   * (e.g. HEIC, `.avi`). Such an entry is listed with a note and cannot be
   * added — never silently hidden, so a user can find the file they came for.
   */
  unsupportedReason?: "codec" | "format"
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
