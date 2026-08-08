import type { MediaSlideData } from "@/modules/core/interfaces"
import type { SlideTemplate } from "@/modules/presentation"

/** A single Bible verse, captured at add-time so the slide renders without re-querying the translation. */
export interface BiblePassageItemData {
  bookUsfm: string
  chapterUsfm: string
  verseNumber: number
  versionId?: number
  /** The version's abbreviation at add-time, e.g. "RV1960" — captured alongside `versionId` so the slide can show it without re-resolving the version. */
  versionAbbreviation?: string
  /** Human-readable label, e.g. "Génesis 1:1". */
  reference: string
  text: string
}

/**
 * One section of a song, captured at add-time so the slide renders without
 * reading the song library — the same denormalization `BiblePassageItemData`
 * does for verses. Editing or deleting the source song leaves slides already
 * added to a folder rendering unchanged, and an exported project stays
 * self-contained.
 */
export interface SongItemData {
  /** The source `Song`'s id — provenance only; the slide never reads through it to render. */
  songId: string
  title: string
  /** This section's label at add-time, e.g. "Verse 1", "Chorus". */
  sectionLabel: string
  /** This section's lines, newline-joined — the slide's body text. */
  text: string
  /** 0-based position among the song's sections at add-time. */
  sectionIndex: number
}

/**
 * A block of text typed in the moment — an note, a reminder, a line
 * of sermon notes. Fully denormalized like `BiblePassageItemData` and
 * `SongItemData`, and then some: it deliberately holds *no* reference back
 * to the draft it came from, because note drafts are session state
 * and never outlive the app. Once added, the slide is the only copy.
 */
export interface NoteItemData {
  /** Optional heading, rendered as the slide's reference line. Absent means a body-only slide, which is the right look for a bare reminder. */
  heading?: string
  /** The note body — the slide's text, exactly as typed, newlines included. */
  text: string
  /** Never-empty label for the folder tree and slide console, derived at add-time from the heading or the body's first words. Fixed at add-time so changing the derivation rule never re-labels slides the user already arranged. */
  label: string
}

/**
 * An image, video, or rendered document page. Defined in `core` because the
 * `media` module builds one when the user adds a file and this module
 * stores and renders it, and feature modules never import each other's
 * internals.
 *
 * Alone among the item types, this holds a *reference* rather than the
 * content — a media file is never copied into app storage. See
 * `MediaSlideData` for what that costs and what it buys.
 */
export type MediaItemData = MediaSlideData

export type FolderItemType = "bible-passage" | "song" | "note" | "media"

interface FolderItemOf<TType extends FolderItemType, TData> {
  id: string
  type: TType
  /** A `SavedTemplate` id (see `@/modules/templates`); absent means the default template. */
  templateId?: string
  data: TData
}

/**
 * One entry in a folder's ordered list. Tagged by `type` so the slide
 * console and preview panel can render every content type uniformly. Every
 * type now carries its own real content: a verse and a song section hold
 * their text, a media item holds a reference to its file.
 */
export type FolderItem =
  | FolderItemOf<"bible-passage", BiblePassageItemData>
  | FolderItemOf<"song", SongItemData>
  | FolderItemOf<"note", NoteItemData>
  | FolderItemOf<"media", MediaItemData>

/** A user-created group of mixed-type items, shown in the Library tab's folder tree. Belongs to exactly one `Project`. */
export interface Folder {
  id: string
  projectId: string
  /** The containing folder's id, or `null` for a root-level folder — nesting is capped at 3 levels total. Missing on folders saved before nesting existed, which are treated as root-level. */
  parentId?: string | null
  /** Sort order among sibling folders sharing the same `parentId` within this project. Missing on folders saved before manual reordering existed, which fall back to their storage-list order. */
  position?: number
  name: string
  items: FolderItem[]
  createdAt: number
  updatedAt: number
}

/**
 * Storage backend for Library folders. Mirrors `TemplateStorageDriver`'s
 * shape: a web (localStorage) and a desktop (filesystem, via the Electron
 * preload bridge) implementation, chosen at runtime — see `getLibraryStorage`.
 */
export interface LibraryStorageDriver {
  readonly canWrite: boolean
  list: () => Promise<Folder[]>
  save: (folder: Folder) => Promise<void>
  remove: (id: string) => Promise<void>
}

/**
 * A named group of folders — the unit "LIBRARY" used to be a stand-in for.
 * Exactly one project is active at a time; folders are created under it.
 */
export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /**
   * The file on disk this project is bound to — where "Save" writes without
   * asking. Set when a project is opened from a file or saved to one, so the
   * binding survives a restart alongside the rest of the project record.
   *
   * Desktop-only in practice: the web build has no filesystem access and
   * never sets it. Deliberately *not* part of `ProjectFile` — a project file
   * must never record where some earlier copy of it happened to live, or
   * opening a shared file would try to save over the sender's path.
   */
  filePath?: string
}

/** Storage backend for Projects. Mirrors `LibraryStorageDriver`'s shape. */
export interface ProjectStorageDriver {
  readonly canWrite: boolean
  list: () => Promise<Project[]>
  save: (project: Project) => Promise<void>
  remove: (id: string) => Promise<void>
}

/**
 * The outcome of saving a project to a file. A discriminated result rather
 * than a thrown error because "the user dismissed the dialog" is a perfectly
 * normal outcome that must not be reported as a failure — and the three cases
 * lead to three different pieces of UI.
 *
 * `path` is absent on web, where the browser download decides the location.
 * `retryWithDialog` marks the one failure worth recovering from: a bound path
 * that has gone away, where the fix is to ask for a new location.
 */
export type ProjectSaveResult =
  | { status: "saved"; path?: string }
  | { status: "canceled" }
  | { status: "failed"; error: string; retryWithDialog?: boolean }

/**
 * How the active project's managed-storage state currently relates to the
 * file it is bound to.
 *
 * Runtime-only and deliberately *not* stored on `Project`: it describes a
 * relationship between two things right now, and a "saved" value restored
 * from disk at startup would be a claim this session never verified. The web
 * build, which has no file to be bound to, is always `unbound`.
 */
export type ProjectSaveState =
  /** No file binding — nothing is auto-saved, and the first explicit save binds it. */
  | { status: "unbound" }
  /** Written and up to date. `path` is the bound file. */
  | { status: "saved"; path: string }
  /** A write is in flight. */
  | { status: "saving"; path: string }
  /** Changed since the last successful write; a write is pending. */
  | { status: "unsaved"; path: string }
  /** The last write failed. Not retried on a timer — see the autosave hook. */
  | { status: "failed"; path: string; error: string }

/**
 * The on-disk/exported JSON shape for a single project file: the project's
 * name plus every one of its folders (including nested subfolders and
 * slides). `id`/`createdAt`/`updatedAt` are deliberately omitted from the
 * project itself — a fresh identity is assigned whenever a file is opened,
 * same as any other create flow.
 */
export interface ProjectFile {
  schemaVersion: 1
  project: { name: string }
  folders: Folder[]
}

/**
 * A fully-resolved slide, ready to render or broadcast to `/present` —
 * denormalized from whatever `FolderItem` produced it so `/present` never
 * needs to know about folders, items, or content types.
 */
export interface LiveSlidePayload {
  text?: string
  reference?: string
  versionLabel?: string
  /** Set for a `media` item — the image/video/page the output window renders under the text layer. */
  media?: MediaSlideData
  template: SlideTemplate
  /**
   * When this slide was sent, stamped by `setLiveSlide`. Load-bearing, not
   * diagnostic: `localStorage` fires a `storage` event only when the stored
   * value actually changes, so re-sending the *same* slide would otherwise
   * be a silent no-op in the output window. It also restarts video
   * playback from zero on each send (see `mediaPlaybackKey`).
   */
  sentAt?: number
}
