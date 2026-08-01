import type { SlideTemplate } from "@/modules/presentation"

/** A single Bible verse, captured at add-time so the slide renders without re-querying the translation. */
export interface BiblePassageItemData {
  bookUsfm: string
  chapterUsfm: string
  verseNumber: number
  versionId?: number
  /** Human-readable label, e.g. "Génesis 1:1". */
  reference: string
  text: string
}

/** Placeholder shape — the `songs` module has no real data yet. */
export interface SongItemData {
  title: string
}

/** Placeholder shape — the `media` module has no real data yet. */
export interface MediaItemData {
  title: string
  mediaType: "image" | "video"
}

export type FolderItemType = "bible-passage" | "song" | "media"

interface FolderItemOf<TType extends FolderItemType, TData> {
  id: string
  type: TType
  /** A `SavedTemplate` id (see `@/modules/templates`); absent means the default template. */
  templateId?: string
  data: TData
}

/**
 * One entry in a folder's ordered list. Tagged by `type` so the slide
 * console and preview panel can render every content type uniformly, even
 * `song`/`media` today, which have no real backing module yet and render as
 * a placeholder slide instead of being excluded from the list.
 */
export type FolderItem =
  | FolderItemOf<"bible-passage", BiblePassageItemData>
  | FolderItemOf<"song", SongItemData>
  | FolderItemOf<"media", MediaItemData>

/** A user-created group of mixed-type items, shown in the Library tab's folder tree. Belongs to exactly one `Project`. */
export interface Folder {
  id: string
  projectId: string
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
}

/** Storage backend for Projects. Mirrors `LibraryStorageDriver`'s shape. */
export interface ProjectStorageDriver {
  readonly canWrite: boolean
  list: () => Promise<Project[]>
  save: (project: Project) => Promise<void>
  remove: (id: string) => Promise<void>
}

/**
 * A fully-resolved slide, ready to render or broadcast to `/present` —
 * denormalized from whatever `FolderItem` produced it so `/present` never
 * needs to know about folders, items, or content types.
 */
export interface LiveSlidePayload {
  text?: string
  reference?: string
  template: SlideTemplate
}
