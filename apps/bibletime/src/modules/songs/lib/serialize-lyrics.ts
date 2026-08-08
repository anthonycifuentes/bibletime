import type { SongSection } from "@/modules/songs/interfaces"

/**
 * Rebuilds the editor's lyric text from a stored song's sections, joining
 * blocks with exactly one blank line. Paired with `parseLyrics`'s
 * split-on-blank-lines rule this round-trips losslessly:
 * `splitLyricBlocks(serializeLyrics(sections))` reproduces the same
 * boundaries and the same lines, so opening a song and saving it again
 * without edits is a no-op on its sections.
 */
export const serializeLyrics = (sections: SongSection[]): string =>
  sections.map((section) => section.lines.join("\n")).join("\n\n")
