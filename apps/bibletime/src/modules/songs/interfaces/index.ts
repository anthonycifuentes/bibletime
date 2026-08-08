/**
 * Section type codes borrowed from the OpenLyrics vocabulary — the de-facto
 * interchange format for church presentation software (OpenLP, OpenSong).
 * Storing them means a song file can be converted to/from OpenLyrics later
 * without a schema migration.
 */
export type SongSectionType = "v" | "c" | "p" | "b" | "e" | "t"

/** One slide's worth of a song: a label, its type, and its lines in order. */
export interface SongSection {
  type: SongSectionType
  /** Inferred at parse time (see `parseLyrics`) but user-editable, so it's stored rather than recomputed on read. */
  label: string
  lines: string[]
}

/** Where an imported song came from, so provenance survives later edits. */
export interface SongSource {
  provider: "lrclib"
  /** The provider's own identifier for the track. */
  id: string
}

/**
 * A song in the user's repertoire. Lives in a global library shared across
 * every project (see `getSongStorage`), because a congregation reuses the
 * same songs every week — the same call the template library already makes.
 */
export interface Song {
  id: string
  title: string
  /** Free-text author/artist credit; absent rather than empty when unset. */
  author?: string
  copyright?: string
  /** CCLI (or equivalent) licence number — projection of copyrighted lyrics generally requires one. */
  ccliNumber?: string
  /** Musical key, e.g. "G". */
  key?: string
  source?: SongSource
  sections: SongSection[]
  createdAt: number
  updatedAt: number
}

/**
 * The on-disk JSON shape: a `Song` plus an explicit `schemaVersion`, stored
 * flat exactly like `Folder` and `SavedTemplate` are. Unrecognized fields are
 * preserved on read (see `fromSongFile`) so a file written by a newer version
 * survives a round-trip through an older one.
 */
export interface SongFile extends Song {
  schemaVersion: 1
}

/**
 * Storage backend for the song library. Mirrors `LibraryStorageDriver`'s
 * shape: a web (localStorage) and a desktop (filesystem, via the Electron
 * preload bridge) implementation, chosen at runtime — see `getSongStorage`.
 */
export interface SongStorageDriver {
  readonly canWrite: boolean
  list: () => Promise<Song[]>
  save: (song: Song) => Promise<void>
  remove: (id: string) => Promise<void>
}

/** One result from the online lyrics provider, normalized away from its wire shape. */
export interface SongSearchResult {
  /** The provider's track id, stringified — becomes `SongSource.id` on import. */
  id: string
  title: string
  artist?: string
  album?: string
  durationSeconds?: number
  /** Absent or empty when the provider has no plain lyrics for this track, which makes the result non-importable. */
  plainLyrics?: string
}

/**
 * What the web-search UI renders. `unavailable` is deliberately distinct
 * from `empty`: a provider that can't be reached must never be reported as
 * "this song doesn't exist".
 */
export type SongSearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; results: SongSearchResult[] }
  | { status: "empty" }
  | { status: "unavailable" }
