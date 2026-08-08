import { useEffect, useState } from "react"

import type { MediaDocumentState, MediaEntry } from "@/modules/media/interfaces"
import { contentKey } from "@/modules/media/lib/content-key"
import { needsConversion } from "@/modules/media/lib/supported-formats"
import {
  cancelConversion,
  convertDocumentToPdf,
  readCachedPages,
  renderPdfPages,
} from "@/modules/media/services"

const IDLE: MediaDocumentState = { status: "idle" }

/**
 * Turns the selected document into pages, and reports every step of it.
 *
 * Conversion is triggered by *selection*, not by adding: the operator sees
 * the real pages and the real page count before committing 40 slides to a
 * folder, which is the difference between adding the right deck and undoing
 * the wrong one. Selecting something else abandons whatever is in flight.
 *
 * The pipeline is one path with an optional first step — a PowerPoint or
 * ODP file is converted to PDF by LibreOffice first, and from there every
 * format is identical (see `add-media-tab` design decision 1).
 */
export const useDocumentPages = (entry: MediaEntry | undefined): MediaDocumentState => {
  const [state, setState] = useState<MediaDocumentState>(IDLE)

  useEffect(() => {
    if (!entry || entry.kind !== "document") {
      setState(IDLE)
      return
    }

    const key = contentKey(entry.rootId, entry.relativePath, entry.size, entry.mtimeMs)
    // One cancellation source rather than a separate boolean: TS can't see
    // a `let` mutated from the cleanup closure, and a signal is the thing
    // `renderPdfPages` already takes.
    const abortController = new AbortController()
    const isCancelled = () => abortController.signal.aborted

    void (async () => {
      // A cache hit costs one IPC round trip and no parsing at all, so an
      // already-previewed deck reopens instantly.
      const cached = await readCachedPages(key)
      if (isCancelled()) return
      if (cached) {
        setState({
          status: "ready",
          document: { contentKey: key, title: entry.name, sourceReference: entry.reference, pages: cached },
        })
        return
      }

      let pdfReference = entry.reference

      if (needsConversion(entry.extension)) {
        setState({ status: "converting" })
        const converted = await convertDocumentToPdf(key, entry.reference)
        if (isCancelled()) return
        if (!converted.ok) {
          setState({ status: "failed", error: converted.error })
          return
        }
        pdfReference = converted.reference
      }

      setState({ status: "rendering", renderedPages: 0, totalPages: 0 })
      const rendered = await renderPdfPages(pdfReference, key, {
        signal: abortController.signal,
        onProgress: ({ renderedPages, totalPages }) => {
          if (isCancelled()) return
          setState({ status: "rendering", renderedPages, totalPages })
        },
      })
      if (isCancelled()) return

      setState(
        rendered.ok
          ? {
              status: "ready",
              document: {
                contentKey: key,
                title: entry.name,
                sourceReference: entry.reference,
                pages: rendered.pages,
              },
            }
          : { status: "failed", error: rendered.error }
      )
    })()

    return () => {
      abortController.abort()
      // Kills an in-flight LibreOffice process too — a superseded
      // conversion of a 90-slide deck is minutes of CPU otherwise.
      void cancelConversion(key)
    }
  }, [entry])

  return state
}
