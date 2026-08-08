import type { MediaEntryKind } from "@/modules/media/interfaces"

/**
 * What the grid lists, as an explicit allowlist rather than a denylist —
 * a media root is usually a general-purpose folder, so anything not named
 * here (documents, archives, project files, `.DS_Store`) is simply not
 * media and never appears.
 */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg", "heic", "heif"] as const

export const VIDEO_EXTENSIONS = ["mp4", "m4v", "webm", "ogv", "mov", "mkv", "avi", "wmv"] as const

export const DOCUMENT_EXTENSIONS = ["pdf", "pptx", "ppt", "odp"] as const

/**
 * Recognized above so the user can find the file, but not renderable by
 * Chromium: listing them with a note beats hiding them, because a user who
 * cannot find the file they came for concludes the app is broken. `.mov` is
 * deliberately absent — the common H.264-in-MOV case plays, and the HEVC
 * case that doesn't cannot be told apart by extension (it surfaces as a
 * load error at preview time instead).
 */
const UNDECODABLE_EXTENSIONS = new Set(["heic", "heif", "avi", "wmv", "mkv"])

/** Which formats need LibreOffice before they can enter the PDF pipeline. */
const CONVERTIBLE_DOCUMENT_EXTENSIONS = new Set(["pptx", "ppt", "odp"])

const IMAGE_SET = new Set<string>(IMAGE_EXTENSIONS)
const VIDEO_SET = new Set<string>(VIDEO_EXTENSIONS)
const DOCUMENT_SET = new Set<string>(DOCUMENT_EXTENSIONS)

/** Lowercase extension without the dot; `""` when the name has none. */
export const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".")
  if (dot <= 0 || dot === fileName.length - 1) return ""
  return fileName.slice(dot + 1).toLowerCase()
}

/** `undefined` for anything that isn't media — the signal to omit it from the grid entirely. */
export const kindForExtension = (extension: string): MediaEntryKind | undefined => {
  if (IMAGE_SET.has(extension)) return "image"
  if (VIDEO_SET.has(extension)) return "video"
  if (DOCUMENT_SET.has(extension)) return "document"
  return undefined
}

export const isSupportedExtension = (extension: string): boolean => kindForExtension(extension) !== undefined

/** Set on an entry the grid lists but cannot render, so the tile can say why and the add actions can refuse it. */
export const unsupportedReasonFor = (extension: string): "codec" | undefined =>
  UNDECODABLE_EXTENSIONS.has(extension) ? "codec" : undefined

/** True for a deck that must go through LibreOffice before it can be rasterized. */
export const needsConversion = (extension: string): boolean => CONVERTIBLE_DOCUMENT_EXTENSIONS.has(extension)

/** File-dialog filters for the relink picker, matching the allowlist above. */
export const MEDIA_DIALOG_FILTERS = [
  { name: "Media", extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...DOCUMENT_EXTENSIONS] },
  { name: "Images", extensions: [...IMAGE_EXTENSIONS] },
  { name: "Video", extensions: [...VIDEO_EXTENSIONS] },
  { name: "Presentations", extensions: [...DOCUMENT_EXTENSIONS] },
]
