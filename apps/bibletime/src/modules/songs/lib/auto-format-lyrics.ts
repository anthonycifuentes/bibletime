import { splitLyricBlocks } from "@/modules/songs/lib/parse-lyrics"

/** How many lines the grouping pass puts on one slide. A constant for now — promotable to a setting without touching the song schema. */
export const LINES_PER_SLIDE = 4

/**
 * Lines at or under this length are already lyric-length and are left alone.
 * Tuned to how a sung line actually scans (roughly one phrase) rather than to
 * how much text fits on screen — auto-fit already handles the fitting.
 */
const MAX_LINE_LENGTH = 40

const SENTENCE_TERMINATORS = ".!?…"
const CLAUSE_SEPARATORS = ",;:—–"

/**
 * Offsets just after a break character that is followed by whitespace. The
 * whitespace requirement is what keeps "3.16" or "Sr." from being treated as
 * a sentence end.
 */
const punctuationBreaks = (line: string, characters: string): number[] => {
  const breaks: number[] = []
  for (let index = 0; index < line.length - 1; index += 1) {
    const character = line[index]
    const next = line[index + 1]
    if (character && next && characters.includes(character) && /\s/.test(next)) {
      breaks.push(index + 1)
    }
  }
  return breaks
}

const spaceBreaks = (line: string): number[] => {
  const breaks: number[] = []
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === " ") breaks.push(index)
  }
  return breaks
}

/**
 * Breaks one over-long line into lyric-length lines: at sentence
 * terminators first, then clause separators, then plain spaces as a last
 * resort. Each pass picks the candidate nearest the line's midpoint and
 * recurses, so a long paragraph comes apart evenly instead of shedding one
 * short tail at a time. A line with no usable break point is left whole.
 */
const reflowLine = (line: string): string[] => {
  if (line.length <= MAX_LINE_LENGTH) return [line]

  const midpoint = line.length / 2
  const strategies = [
    punctuationBreaks(line, SENTENCE_TERMINATORS),
    punctuationBreaks(line, CLAUSE_SEPARATORS),
    spaceBreaks(line),
  ]

  for (const candidates of strategies) {
    if (candidates.length === 0) continue

    const best = candidates.reduce((closest, candidate) =>
      Math.abs(closest - midpoint) <= Math.abs(candidate - midpoint) ? closest : candidate
    )
    const left = line.slice(0, best).trim()
    const right = line.slice(best).trim()
    if (left === "" || right === "") continue

    return [...reflowLine(left), ...reflowLine(right)]
  }

  return [line]
}

/**
 * The "I pasted a wall of text" fix, in two passes: reflow over-long lines
 * into lyric-length ones, then insert a blank line every `linesPerSlide`
 * lines so the result is slide-sized sections.
 *
 * Each existing block is grouped independently, so blank lines the user
 * already placed are never merged away. Running this on lyrics that are
 * already lyric-length and already at or under the grouping size returns
 * them unchanged.
 *
 * Callers write the result back into the editor's textarea rather than
 * transforming at save time — the user sees exactly what they'll get, can
 * hand-edit it, and can undo it natively.
 */
export const autoFormatLyrics = (text: string, linesPerSlide: number = LINES_PER_SLIDE): string => {
  const groups: string[][] = []

  for (const block of splitLyricBlocks(text)) {
    const reflowed = block.flatMap(reflowLine)
    for (let index = 0; index < reflowed.length; index += linesPerSlide) {
      groups.push(reflowed.slice(index, index + linesPerSlide))
    }
  }

  return groups.map((lines) => lines.join("\n")).join("\n\n")
}
