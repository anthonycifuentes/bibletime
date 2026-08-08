import type { MediaDocument, MediaDocumentError } from "@/modules/media/interfaces"
import { importedDocumentKey } from "@/modules/media/lib/content-key"
import { renderPdfPages } from "@/modules/media/services/render-pdf-pages"

const bridge = () => (typeof window !== "undefined" ? window.bibletime?.googleSlides : undefined)

export type ImportGoogleSlidesResult =
  | { ok: true; document: MediaDocument }
  | { ok: false; error: MediaDocumentError }

/**
 * Imports a Google Slides deck as a snapshot: fetched as PDF in the main
 * process (CORS makes the endpoint unreachable from here), then run through
 * exactly the same rasterizer as any other PDF.
 *
 * Deliberately not a live link — a deck edited ten minutes before the
 * service should not change what the operator already reviewed. Re-import
 * is a one-click action that produces a fresh snapshot under a new key.
 */
export const importGoogleSlides = async (
  url: string,
  title: string,
  options: { fetchedAt: number; onProgress?: (renderedPages: number, totalPages: number) => void }
): Promise<ImportGoogleSlidesResult> => {
  const slides = bridge()
  if (!slides) return { ok: false, error: { code: "desktop-required" } }

  // The deck id isn't known until the main process has parsed the URL, so
  // the key is provisional here and the fetch timestamp makes it unique.
  const provisionalKey = importedDocumentKey(url, options.fetchedAt)
  const exported = await slides.export(url, provisionalKey)
  if (!exported.ok) return { ok: false, error: { code: exported.code, detail: exported.detail } }

  const rendered = await renderPdfPages(exported.reference, provisionalKey, {
    onProgress: ({ renderedPages, totalPages }) => options.onProgress?.(renderedPages, totalPages),
  })
  if (!rendered.ok) return { ok: false, error: rendered.error }

  return {
    ok: true,
    document: {
      contentKey: provisionalKey,
      title,
      pages: rendered.pages,
      importedAt: exported.importedAt,
      sourceUrl: url,
    },
  }
}
