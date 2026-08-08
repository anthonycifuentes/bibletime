import { normalizeText } from "@/modules/core/lib"
import type { Song } from "@/modules/songs/interfaces"

/** Everything a song can be matched on, flattened once per candidate. */
const searchableText = (song: Song): string =>
  [song.title, song.author ?? "", ...song.sections.flatMap((section) => section.lines)].join(" ")

/**
 * Filters the repertoire by title, author, or lyric text, case- and
 * accent-insensitively. A plain in-memory scan on purpose — a congregation's
 * repertoire is tens to low hundreds of songs, which doesn't justify an
 * index.
 */
export const filterSongs = (songs: Song[], query: string): Song[] => {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return songs

  return songs.filter((song) => normalizeText(searchableText(song)).includes(normalizedQuery))
}
