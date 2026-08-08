import type { MediaEntry } from "@/modules/media/interfaces"
import { contentKey } from "@/modules/media/lib/content-key"
import { buildCacheReference } from "@/modules/media/services/media-reference"

/** Long edge of a cached thumbnail. Large enough for the biggest tile the size slider offers, on a 2x display. */
const THUMBNAIL_MAX_EDGE = 640

/** Where in a video the still frame is taken from — far enough in to skip a fade-from-black title card. */
const VIDEO_FRAME_SECOND = 1

const THUMBNAIL_FILE = "thumb.jpg"

const cacheBridge = () => (typeof window !== "undefined" ? window.bibletime?.mediaCache : undefined)

export interface ThumbnailResult {
  reference: string
  width: number
  height: number
  /** Video only — used to label the tile and stored on the slide at add-time. */
  durationMs?: number
}

/** Scales to fit within `THUMBNAIL_MAX_EDGE` without enlarging anything already smaller. */
const fitWithin = (width: number, height: number) => {
  const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

const canvasToArrayBuffer = async (canvas: HTMLCanvasElement): Promise<ArrayBuffer> => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82))
  if (!blob) throw new Error("Could not encode thumbnail")
  return blob.arrayBuffer()
}

/**
 * Decodes off the main thread via `createImageBitmap`, then draws once into
 * a canvas — no `sharp`, no native image module, which is the whole point
 * of rasterizing in the renderer (see `add-media-tab` design decision 2).
 */
interface RenderedThumbnail {
  buffer: ArrayBuffer
  width: number
  height: number
  /** Video only. */
  durationMs?: number
}

const renderImageThumbnail = async (url: string): Promise<RenderedThumbnail> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not read image: ${response.status}`)

  const bitmap = await createImageBitmap(await response.blob())
  try {
    const size = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = size.width
    canvas.height = size.height

    const context = canvas.getContext("2d")
    if (!context) throw new Error("No 2D context")
    context.drawImage(bitmap, 0, 0, size.width, size.height)

    return { buffer: await canvasToArrayBuffer(canvas), width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

/**
 * Seeks a detached `<video>` to a frame and draws it — the reason no ffmpeg
 * binary has to be bundled, licensed, and codesigned.
 */
const renderVideoThumbnail = async (url: string): Promise<RenderedThumbnail> => {
  const video = document.createElement("video")
  video.preload = "metadata"
  video.muted = true
  video.playsInline = true
  video.crossOrigin = "anonymous"

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error("Could not read video"))
      video.src = url
    })

    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error("Could not seek video"))
      // A clip shorter than the target lands on its midpoint instead.
      video.currentTime = Math.min(VIDEO_FRAME_SECOND, (video.duration || 0) / 2)
    })

    const size = fitWithin(video.videoWidth, video.videoHeight)
    const canvas = document.createElement("canvas")
    canvas.width = size.width
    canvas.height = size.height

    const context = canvas.getContext("2d")
    if (!context) throw new Error("No 2D context")
    context.drawImage(video, 0, 0, size.width, size.height)

    return {
      buffer: await canvasToArrayBuffer(canvas),
      width: video.videoWidth,
      height: video.videoHeight,
      durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0,
    }
  } finally {
    // Release the decoder even when the seek failed — a leaked <video>
    // holding a 4 GB file open is not recoverable by GC alone.
    video.removeAttribute("src")
    video.load()
  }
}

/**
 * Returns a cached thumbnail reference when one already exists, so a second
 * visit to a directory is a plain image load with no JavaScript in the path.
 * Dimensions come back from the cached artifact itself, since the source is
 * not decoded on a cache hit.
 */
export const readCachedThumbnail = async (entry: MediaEntry): Promise<string | null> => {
  const cache = cacheBridge()
  if (!cache) return null

  const key = contentKey(entry.rootId, entry.relativePath, entry.size, entry.mtimeMs)
  const files = await cache.list(key)
  return files.includes(THUMBNAIL_FILE) ? buildCacheReference(key, THUMBNAIL_FILE) : null
}

/**
 * Generates and caches a thumbnail for an image or video entry. Documents
 * are thumbnailed from their first rendered page instead (see
 * `render-pdf-pages`), so they never reach here.
 */
export const generateThumbnail = async (entry: MediaEntry): Promise<ThumbnailResult> => {
  const cache = cacheBridge()
  if (!cache) throw new Error("Media cache is desktop-only")
  if (entry.unsupportedReason) throw new Error(`Cannot decode ${entry.extension}`)

  const rendered =
    entry.kind === "video" ? await renderVideoThumbnail(entry.reference) : await renderImageThumbnail(entry.reference)

  const key = contentKey(entry.rootId, entry.relativePath, entry.size, entry.mtimeMs)
  const reference = await cache.write(key, THUMBNAIL_FILE, rendered.buffer)

  return { reference, width: rendered.width, height: rendered.height, durationMs: rendered.durationMs }
}
