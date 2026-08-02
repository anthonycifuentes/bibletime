/** Clause-ending punctuation a split may land after — checked before falling back to a plain word boundary. */
const CLAUSE_BREAK = /[,;:.…]+\s*/g
const WORD_BREAK = /\s+/g

/** Positions right after each match of `pattern` in `text` (i.e. valid places to cut without landing mid-word). */
function collectBoundaries(text: string, pattern: RegExp): number[] {
  const positions: number[] = []
  const re = new RegExp(pattern)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    positions.push(match.index + match[0].length)
    if (match[0].length === 0) re.lastIndex += 1
  }
  return positions
}

/** The boundary closest to `target`, restricted to `(min, max)` so splits stay ordered and non-empty. */
function nearestBoundary(boundaries: number[], target: number, min: number, max: number): number | undefined {
  let best: number | undefined
  let bestDistance = Infinity
  for (const boundary of boundaries) {
    if (boundary <= min || boundary >= max) continue
    const distance = Math.abs(boundary - target)
    if (distance < bestDistance) {
      best = boundary
      bestDistance = distance
    }
  }
  return best
}

/**
 * Splits a verse's text into `parts` ordered chunks for the Bible picker's
 * manual "split into slides" action. Each split point is the clause-ending
 * punctuation (comma, semicolon, colon, period, ellipsis) nearest to that
 * split's target position, so a split reads as a complete clause rather than
 * a mid-sentence fragment; falls back to the nearest word boundary where no
 * such punctuation exists nearby. Never splits mid-word.
 *
 * If the text has fewer valid split points than `parts - 1` (e.g. a very
 * short verse split into many parts), returns fewer, non-empty chunks rather
 * than padding with empty ones.
 */
export function splitVerseText(text: string, parts: number): string[] {
  const trimmed = text.trim()
  if (parts <= 1 || !trimmed) return [trimmed]

  const clauseBoundaries = collectBoundaries(trimmed, CLAUSE_BREAK)
  const wordBoundaries = collectBoundaries(trimmed, WORD_BREAK)

  const splitPoints: number[] = []
  let previous = 0
  for (let i = 1; i < parts; i++) {
    const target = Math.round((trimmed.length * i) / parts)
    const point =
      nearestBoundary(clauseBoundaries, target, previous, trimmed.length) ??
      nearestBoundary(wordBoundaries, target, previous, trimmed.length)
    if (point === undefined) break
    splitPoints.push(point)
    previous = point
  }

  const boundaries = [0, ...splitPoints, trimmed.length]
  const chunks: string[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const chunk = trimmed.slice(boundaries[i], boundaries[i + 1]).trim()
    if (chunk) chunks.push(chunk)
  }
  return chunks
}
