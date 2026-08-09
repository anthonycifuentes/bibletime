import type { MediaDocument, MediaEntry, MediaFit, MediaSlideData } from "@/modules/media/interfaces"
import { buildYouTubeWatchUrl } from "@/modules/core/lib"

/**
 * Letterboxing beats clipping as a default: cropping a sermon slide's text
 * is unrecoverable on stage, while a photo with bars is merely less pretty.
 * Overridable per item in the preview column.
 */
export const DEFAULT_MEDIA_FIT: MediaFit = "contain"

/** Video defaults: sound is opt-in per item, so a quiet room is never surprised by a clip's audio. */
const DEFAULT_VIDEO_MUTED = true
const DEFAULT_VIDEO_LOOP = false

const titleFromName = (name: string): string => {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(0, dot) : name
}

/**
 * Builds the slide payload for an image or video entry. Everything the
 * console needs to draw a correctly proportioned tile is captured here, at
 * add-time — the file itself is only ever referenced.
 */
export const buildEntrySlide = (
  entry: MediaEntry,
  options: { fit?: MediaFit; loop?: boolean; muted?: boolean; width?: number; height?: number; durationMs?: number } = {}
): MediaSlideData => ({
  title: titleFromName(entry.name),
  mediaType: entry.kind === "video" ? "video" : "image",
  src: entry.reference,
  width: options.width,
  height: options.height,
  fit: options.fit ?? DEFAULT_MEDIA_FIT,
  ...(entry.kind === "video"
    ? {
        loop: options.loop ?? DEFAULT_VIDEO_LOOP,
        muted: options.muted ?? DEFAULT_VIDEO_MUTED,
        durationMs: options.durationMs,
      }
    : {}),
})

/**
 * Builds a slide for a YouTube link.
 *
 * Unlike every other media slide this references nothing on disk, so it
 * needs no root, no thumbnail, and no cache — which is exactly why it is
 * available in both builds. `fit` is `contain` for the same reason a
 * document page is: a 16:9 video letterboxed into a 4:3 frame is better
 * than one with its edges cropped away.
 */
export const buildYouTubeSlide = (
  videoId: string,
  options: { title?: string; startSeconds?: number; loop?: boolean; muted?: boolean } = {}
): MediaSlideData => ({
  title: options.title?.trim() || "YouTube",
  mediaType: "youtube",
  src: buildYouTubeWatchUrl(videoId),
  fit: DEFAULT_MEDIA_FIT,
  loop: options.loop ?? DEFAULT_VIDEO_LOOP,
  muted: options.muted ?? DEFAULT_VIDEO_MUTED,
  startSeconds: options.startSeconds,
})

/** Builds the slide for one rendered page of a document — an image slide that knows where it came from. */
export const buildDocumentPageSlide = (
  document: MediaDocument,
  pageIndex: number,
  options: { fit?: MediaFit } = {}
): MediaSlideData | undefined => {
  const page = document.pages.at(pageIndex)
  if (!page) return undefined

  return {
    title: `${titleFromName(document.title)} — ${pageIndex + 1}`,
    mediaType: "document-page",
    src: page.reference,
    width: page.width || undefined,
    height: page.height || undefined,
    fit: options.fit ?? DEFAULT_MEDIA_FIT,
    documentId: document.contentKey,
    pageIndex,
    pageCount: document.pages.length,
  }
}

/** Every page of a document, in order — what "Add as folder" puts in the folder it creates. */
export const buildDocumentSlides = (document: MediaDocument, options: { fit?: MediaFit } = {}): MediaSlideData[] =>
  document.pages
    .map((_, pageIndex) => buildDocumentPageSlide(document, pageIndex, options))
    .filter((slide): slide is MediaSlideData => slide !== undefined)
