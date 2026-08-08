import type * as PdfJs from "pdfjs-dist"

import type { MediaDocumentPage, MediaDocumentError } from "@/modules/media/interfaces"
import { buildCacheReference } from "@/modules/media/services/media-reference"

/**
 * pdf.js is imported on demand rather than at module scope. v6 touches the
 * `Iterator` global while evaluating, and that global doesn't exist until
 * Node 22 — with a static import, merely pulling this module into the
 * server's graph throws during `renderToReadableStream` and drops the whole
 * route to client-only rendering, even on pages that never open a PDF.
 *
 * Deferring costs nothing here: everything below needs a canvas and the
 * desktop cache bridge, so none of it can run outside a browser anyway.
 *
 * The type-only import above is erased at compile time and is safe to keep.
 */
let pdfjsModule: Promise<typeof PdfJs> | undefined

const loadPdfjs = (): Promise<typeof PdfJs> => {
  pdfjsModule ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ])

    // pdf.js needs its worker resolved as a URL Vite will emit; the bundler
    // rewrites this to the built asset path, so it works in dev and in a
    // packaged build without a copy step. Set once, on first load.
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })()

  return pdfjsModule
}

/**
 * Long edge of a rendered page. 1600px covers a 1080p projector with room
 * to spare while keeping a 90-page deck's cache in the tens of megabytes
 * rather than the hundreds.
 */
const PAGE_MAX_EDGE = 1600

const pageFileName = (pageIndex: number): string => `page-${String(pageIndex + 1).padStart(4, "0")}.png`

/** Matches `pageFileName`, for counting what a cache directory already holds. */
const PAGE_FILE_PATTERN = /^page-\d{4}\.png$/

const cacheBridge = () => (typeof window !== "undefined" ? window.bibletime?.mediaCache : undefined)

export interface RenderPdfProgress {
  renderedPages: number
  totalPages: number
}

export type RenderPdfResult =
  | { ok: true; pages: MediaDocumentPage[] }
  | { ok: false; error: MediaDocumentError }

const canvasToPng = async (canvas: HTMLCanvasElement): Promise<ArrayBuffer> => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("Could not encode page")
  return blob.arrayBuffer()
}

/** Yields to the event loop so a long deck doesn't lock the UI between pages. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Reuses an already-rendered deck. Page count comes from the cache
 * directory listing, so a cache hit costs one IPC round trip and no
 * PDF parsing at all.
 */
export const readCachedPages = async (contentKey: string): Promise<MediaDocumentPage[] | null> => {
  const cache = cacheBridge()
  if (!cache) return null

  const files = (await cache.list(contentKey)).filter((file) => PAGE_FILE_PATTERN.test(file)).sort()
  if (files.length === 0) return null

  // Dimensions aren't cached alongside the pages; the tile reads them from
  // the image itself once loaded, and the slide letterboxes regardless.
  return files.map((file, pageIndex) => ({
    reference: buildCacheReference(contentKey, file),
    pageIndex,
    width: 0,
    height: 0,
  }))
}

/**
 * Rasterizes every page of a PDF to a cached PNG. The source is addressed
 * by URL rather than by bytes, so pdf.js streams it through the custom
 * protocol instead of a multi-megabyte buffer crossing the IPC boundary.
 */
export const renderPdfPages = async (
  pdfReference: string,
  contentKey: string,
  options: { signal?: AbortSignal; onProgress?: (progress: RenderPdfProgress) => void } = {}
): Promise<RenderPdfResult> => {
  const cache = cacheBridge()
  if (!cache) return { ok: false, error: { code: "desktop-required" } }

  const pdfjs = await loadPdfjs()

  // The source is addressed by URL, so pdf.js streams it through the custom
  // protocol rather than a multi-megabyte buffer crossing the IPC boundary.
  const loadingTask = pdfjs.getDocument({ url: pdfReference })

  let document_: PdfJs.PDFDocumentProxy
  try {
    document_ = await loadingTask.promise
  } catch (error) {
    await loadingTask.destroy()
    const name = (error as { name?: string }).name
    return {
      ok: false,
      error: {
        code: name === "PasswordException" ? "pdf-password-protected" : "pdf-unreadable",
        detail: String(error),
      },
    }
  }

  try {
    const totalPages = document_.numPages
    const pages: MediaDocumentPage[] = []

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      if (options.signal?.aborted) return { ok: false, error: { code: "conversion-failed", detail: "Aborted" } }

      const page = await document_.getPage(pageIndex + 1)
      try {
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = Math.min(1, PAGE_MAX_EDGE / Math.max(baseViewport.width, baseViewport.height))
        const viewport = page.getViewport({ scale: scale * (globalThis.devicePixelRatio || 1) })

        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.floor(viewport.width))
        canvas.height = Math.max(1, Math.floor(viewport.height))

        const context = canvas.getContext("2d")
        if (!context) throw new Error("No 2D context")

        // A PDF page has no background of its own; without this a slide
        // with transparent regions projects as black rather than white.
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, canvas.width, canvas.height)

        await page.render({ canvas, canvasContext: context, viewport }).promise

        const reference = await cache.write(contentKey, pageFileName(pageIndex), await canvasToPng(canvas))
        pages.push({ reference, pageIndex, width: canvas.width, height: canvas.height })
      } finally {
        page.cleanup()
      }

      options.onProgress?.({ renderedPages: pageIndex + 1, totalPages })
      await yieldToUi()
    }

    return { ok: true, pages }
  } catch (error) {
    return { ok: false, error: { code: "pdf-unreadable", detail: String(error) } }
  } finally {
    // Destroying the loading task tears down the worker too — leaving it
    // alive per deck would accumulate a worker for every file selected.
    await loadingTask.destroy()
  }
}
