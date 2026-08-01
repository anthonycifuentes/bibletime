export interface BibleLanguage {
  iso_639_1: string
  iso_639_3: string
  language_tag: string
  local_name: string
  text_direction: string
}

export interface BiblePublisher {
  name: string
}

export interface BibleCopyright {
  html: string
  text: string
}

export interface NextPrev {
  usfm: string
  human: string
  canonical: boolean
  toc: boolean
}

export type ChapterItemType =
  | "section1"
  | "section2"
  | "heading1"
  | "heading2"
  | "label"
  | "verse"

export interface ChapterItemRlwLine {
  text: string
  rl: boolean
}

export interface ChapterItem {
  type: ChapterItemType
  verse_numbers: number[]
  lines: string[]
  rlw_lines: ChapterItemRlwLine[][]
}

export interface ChapterCurrent {
  usfm: string
  human: string
}

export interface Chapter {
  chapter_usfm: string
  is_chapter: boolean
  previous: NextPrev | null
  current: ChapterCurrent
  next: NextPrev | null
  items: ChapterItem[]
}

export interface Book {
  book_usfm: string
  name: string
  chapters: Chapter[]
}

export interface BibleVersion {
  version_id: number
  local_abbreviation: string
  local_title: string
  language: BibleLanguage
  repository: string
  publisher: BiblePublisher
  copyright: BibleCopyright
  books: Book[]
}

/** One translation as listed by the remote snapshots catalog (`bible-version-catalog`). */
export interface BibleVersionCatalogEntry {
  version_id: number
  local_abbreviation: string
  local_title: string
  json_url: string
  lang_name: string
  lang_key: string
}

/**
 * - `bundled`: ships with the app, always readable offline, no download needed.
 * - `downloaded`: fetched once and stored in the local downloads folder (desktop only).
 * - `available`: listed in the catalog but not downloaded — viewable online only.
 * - `downloading` / `error`: transient states while a download is in flight or failed.
 */
export type BibleVersionStatus = "bundled" | "downloaded" | "available" | "downloading" | "error"

/** A catalog entry plus its local availability, for the version selector. */
export interface BibleVersionSummary extends BibleVersionCatalogEntry {
  status: BibleVersionStatus
}

/** Where a `BibleVersion`'s data should be read from for a given selection. */
export type BibleDataSource =
  | { kind: "bundled" }
  | { kind: "downloaded"; versionId: number }
  | { kind: "network"; versionId: number; jsonUrl: string }

/** Metadata for a translation downloaded to the local downloads folder (desktop only). */
export interface DownloadedBibleVersionMeta {
  version_id: number
  local_abbreviation: string
  local_title: string
  json_url: string
  downloaded_at: number
  bytes: number
}

/**
 * Local storage backend for downloaded Bible versions. Two implementations
 * back this: a no-op driver for the plain web build, and a filesystem-backed
 * one (via the Electron preload bridge) for desktop — chosen at runtime by
 * feature detection, see `getBibleVersionDownloads`.
 */
export interface BibleVersionDownloadDriver {
  /** Whether this driver can actually persist downloads, or is read-only/unsupported. */
  readonly canDownload: boolean
  list: () => Promise<DownloadedBibleVersionMeta[]>
  download: (entry: BibleVersionCatalogEntry) => Promise<DownloadedBibleVersionMeta>
  read: (versionId: number) => Promise<BibleVersion>
  remove: (versionId: number) => Promise<void>
}
