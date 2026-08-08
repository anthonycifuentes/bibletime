import type { Song, SongFile } from "@/modules/songs/interfaces"

const SCHEMA_VERSION = 1

/** `undefined` for a blank or whitespace-only value, so absent metadata is genuinely absent rather than an empty string the UI would render as a blank label. */
const orUndefined = (value: string | undefined): string | undefined =>
  value?.trim() ? value.trim() : undefined

/**
 * Builds the on-disk shape: the song stamped with a schema version, with
 * optional metadata omitted rather than emptied. Anything not destructured
 * here (including fields a newer version added) rides along in `rest`, so a
 * read/write round-trip is non-destructive.
 */
export const toSongFile = (song: Song): SongFile => {
  const { author, copyright, ccliNumber, key, ...rest } = song

  return {
    ...rest,
    ...(orUndefined(author) ? { author: orUndefined(author) } : {}),
    ...(orUndefined(copyright) ? { copyright: orUndefined(copyright) } : {}),
    ...(orUndefined(ccliNumber) ? { ccliNumber: orUndefined(ccliNumber) } : {}),
    ...(orUndefined(key) ? { key: orUndefined(key) } : {}),
    schemaVersion: SCHEMA_VERSION,
  }
}

/**
 * Reads a stored song back. Unrecognized fields are carried through rather
 * than stripped, so a file written by a newer version survives a round-trip
 * through an older one. Returns `undefined` for anything that isn't
 * recognizably a song, which callers skip rather than treating as a failure.
 */
export const fromSongFile = (raw: unknown): Song | undefined => {
  if (typeof raw !== "object" || raw === null) return undefined

  const candidate = raw as Partial<SongFile> & Record<string, unknown>
  if (typeof candidate.id !== "string" || typeof candidate.title !== "string") return undefined
  if (!Array.isArray(candidate.sections)) return undefined

  const { schemaVersion: _schemaVersion, ...rest } = candidate

  return {
    ...rest,
    id: candidate.id,
    title: candidate.title,
    sections: candidate.sections,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : 0,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
  }
}
