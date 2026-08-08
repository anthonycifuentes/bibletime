/** Longest label derived from body text before it gets truncated — about one folder-tree row at the sidebar's width. */
const MAX_LABEL_LENGTH = 48

/** Below this fraction of the cap, a word boundary is too early to cut at and the label is clipped mid-word instead. */
const MIN_WORD_BREAK_RATIO = 0.6

export interface NoteLabelSource {
  heading?: string
  text: string
}

/**
 * The never-empty label an note lists under in the folder tree and
 * the slide console: its heading when it has one, otherwise the opening of
 * its body, flattened to a single line and truncated.
 *
 * Called at add-time and stored on the item, not re-derived at render time —
 * so a later change to this rule never re-labels slides the user has already
 * arranged. The result is non-empty for any note that could be added,
 * since a blank body can't be saved in the first place.
 */
export const noteLabel = ({ heading, text }: NoteLabelSource): string => {
  const trimmedHeading = heading?.trim() ?? ""
  if (trimmedHeading !== "") return trimmedHeading

  // Newlines and runs of spaces collapse to one space: a list row is one
  // line, and a three-line reminder shouldn't label as a wrapped fragment.
  const flattened = text.replace(/\s+/g, " ").trim()
  if (flattened.length <= MAX_LABEL_LENGTH) return flattened

  const clipped = flattened.slice(0, MAX_LABEL_LENGTH)
  const lastSpace = clipped.lastIndexOf(" ")
  const cut =
    lastSpace > MAX_LABEL_LENGTH * MIN_WORD_BREAK_RATIO ? clipped.slice(0, lastSpace) : clipped

  return `${cut.trimEnd()}…`
}
