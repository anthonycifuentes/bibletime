import type { MediaDocumentError } from "@/modules/media/interfaces"

const bridge = () => (typeof window !== "undefined" ? window.bibletime?.mediaConvert : undefined)

export type ConvertDocumentResult =
  | { ok: true; reference: string }
  | { ok: false; error: MediaDocumentError }

/**
 * Whether PowerPoint conversion is possible on this machine. Surfaced in
 * Settings as well as in the preview column, so a user finds out before
 * Sunday rather than during it.
 */
export const probeLibreOffice = async (): Promise<{ available: boolean; path: string | null }> =>
  (await bridge()?.probeLibreOffice()) ?? { available: false, path: null }

/**
 * Converts a deck to PDF through a locally installed LibreOffice. Never
 * bundles or installs anything — an absent LibreOffice is a named state the
 * preview column can act on, not a failure.
 */
export const convertDocumentToPdf = async (
  contentKey: string,
  reference: string
): Promise<ConvertDocumentResult> => {
  const convert = bridge()
  if (!convert) return { ok: false, error: { code: "desktop-required" } }

  const result = await convert.toPdf(contentKey, reference)
  return result.ok ? { ok: true, reference: result.reference } : { ok: false, error: { code: result.code, detail: result.detail } }
}

/** Abandons an in-flight conversion — what selecting a different file does. */
export const cancelConversion = async (contentKey: string): Promise<void> => {
  await bridge()?.cancel(contentKey)
}
