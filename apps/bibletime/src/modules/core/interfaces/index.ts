/** How a media slide fills the slide frame. */
export type MediaFit = "contain" | "cover"

/**
 * What a media slide renders. A document page is a pre-rendered image, so
 * it renders through the same path as any other image — see
 * `add-media-tab`'s "one pipeline" decision.
 */
export type MediaSlideKind = "image" | "video" | "document-page" | "youtube"

/**
 * A media slide's payload. Lives in `core` rather than in either feature
 * module because both produce and consume it and feature modules never
 * import each other's internals: the `media` module builds one when the
 * user adds a file, and the `library` module stores it as a `FolderItem`'s
 * data (see `MediaItemData`) and renders it.
 *
 * Unlike every other slide type, this holds a *reference* rather than the
 * content itself — a media file is never copied into app storage (see
 * `MEDIA_FILE_SCHEME`). Everything else here is denormalized at add-time so
 * the slide console can draw a correct, correctly proportioned tile even
 * when the underlying file is unreachable.
 */
export interface MediaSlideData {
  title: string
  mediaType: MediaSlideKind
  /** A `bibletime-file://<rootId>/<path>` reference — the source file is never copied. */
  src: string
  /** Natural pixel dimensions at add-time, so a tile can be sized before the file loads. */
  width?: number
  height?: number
  fit: MediaFit
  /** Video only. */
  loop?: boolean
  muted?: boolean
  durationMs?: number
  /** `document-page` only — the source document's content key, its 0-based page, and the deck's total pages. */
  documentId?: string
  pageIndex?: number
  pageCount?: number
  /**
   * `youtube` only — where in the video to start, in whole seconds.
   *
   * The video id is derived from `src` at render time rather than stored
   * alongside it, so the single source of truth for which video this is
   * stays the URL a person would recognize in an exported project file.
   */
  startSeconds?: number
}
