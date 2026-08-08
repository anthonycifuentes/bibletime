import { normalizeText } from "@/modules/core/lib"
import type { SongSection } from "@/modules/songs/interfaces"

/**
 * Supplies the localized labels `parseLyrics` stamps onto each section.
 * Passed in rather than imported so this stays a pure function with no
 * dependency on the locale context — and so the labels it writes are in the
 * language the user was actually using when they wrote the song.
 */
export interface SectionLabeler {
  /** `number` is 1-based. */
  verse: (number: number) => string
  chorus: string
}

/**
 * Splits lyric text into blocks on runs of one or more blank lines. A single
 * newline is a line break *within* a block; only an empty line starts a new
 * one — the OpenLP/ProPresenter convention, so lyrics pasted from those (or
 * from most lyric sites) split correctly with no editing.
 *
 * Runs of several blank lines separate exactly once, and leading/trailing
 * blank lines produce no empty blocks.
 */
export const splitLyricBlocks = (text: string): string[][] => {
  const blocks: string[][] = []
  let current: string[] = []

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim()
    if (line === "") {
      if (current.length > 0) {
        blocks.push(current)
        current = []
      }
      continue
    }
    current.push(line)
  }

  if (current.length > 0) blocks.push(current)
  return blocks
}

/** How many slides the given lyric text would produce — the editor's live count, without needing labels. */
export const countLyricSections = (text: string): number => splitLyricBlocks(text).length

/** Collapses a block to a comparison key that ignores case, accents, punctuation, and whitespace differences. */
const sectionKey = (lines: string[]): string =>
  normalizeText(lines.join(" "))
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Turns lyric text into ordered sections, labelling them without asking the
 * user to tag anything: blocks are numbered as consecutive verses, and any
 * block whose text repeats an earlier one is labelled a chorus and does not
 * consume a verse number. So A/B/A/C reads as verse 1, verse 2, chorus,
 * verse 3 — the common worship-song shape, right by default and editable
 * when it isn't.
 */
export const parseLyrics = (text: string, labeler: SectionLabeler): SongSection[] => {
  const seen = new Set<string>()
  let verseNumber = 0

  return splitLyricBlocks(text).map((lines) => {
    const key = sectionKey(lines)

    if (seen.has(key)) {
      return { type: "c", label: labeler.chorus, lines }
    }

    seen.add(key)
    verseNumber += 1
    return { type: "v", label: labeler.verse(verseNumber), lines }
  })
}
