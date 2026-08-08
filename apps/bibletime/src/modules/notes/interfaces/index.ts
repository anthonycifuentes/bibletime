/**
 * One note written this session: a heading-optional block of text
 * that becomes exactly one slide.
 *
 * Deliberately has no storage driver and no file schema. Drafts live in
 * `useConsoleStore` and are gone on reload — the durable copy of an
 * note is the slide added to a Library folder, which is already
 * persisted, exported, and re-openable. See `design.md`, Decision 1.
 */
export interface NoteDraft {
  id: string
  /** Optional heading. Absent or empty means the slide renders body-only, with no reference line. */
  heading?: string
  /** The note body — becomes the slide's text verbatim, newlines and all. */
  text: string
}

/**
 * What the Notes panel hands up to the console when the user adds
 * one — the item's data, with the list label already derived, and without
 * the id the library layer assigns. Mirrors how `SongSlidePayload` carries a
 * song section across the same boundary.
 */
export interface NoteSlidePayload {
  heading?: string
  text: string
  label: string
}
