import { useCallback, useEffect, useRef, useState } from "react"

import type { MediaEntry } from "@/modules/media/interfaces"
import { generateThumbnail, readCachedThumbnail } from "@/modules/media/services"

/**
 * How many thumbnails may be decoding at once. Four keeps a fast scroll
 * from launching hundreds of simultaneous decodes while still filling a
 * screen of tiles quickly.
 */
const MAX_CONCURRENT = 4

interface QueuedJob {
  run: () => Promise<void>
  /** Checked immediately before starting — a tile scrolled past while queued is dropped rather than decoded. */
  isStale: () => boolean
}

// Module-level, so the cap is global across every mounted tile rather than
// per-component (which would make it no cap at all).
const queue: QueuedJob[] = []
let activeCount = 0

const pump = () => {
  while (activeCount < MAX_CONCURRENT) {
    const job = queue.shift()
    if (!job) return
    if (job.isStale()) continue

    activeCount += 1
    void job.run().finally(() => {
      activeCount -= 1
      pump()
    })
  }
}

const enqueue = (job: QueuedJob) => {
  queue.push(job)
  pump()
}

export interface MediaThumbnailState {
  /** A `bibletime-file://cache/...` reference, or `null` while unresolved. */
  reference: string | null
  isGenerating: boolean
  hasFailed: boolean
}

/**
 * Resolves a tile's thumbnail, lazily. Returns a ref to attach to the tile:
 * generation is only requested once that element actually intersects the
 * viewport, so opening a directory of 500 photos decodes the ~20 on screen
 * rather than all 500.
 *
 * A cached thumbnail short-circuits the queue entirely — the second visit
 * to a directory is a plain image load with no decoding in the path.
 */
export const useMediaThumbnail = (entry: MediaEntry | undefined): MediaThumbnailState & {
  ref: (element: HTMLElement | null) => void
} => {
  const [state, setState] = useState<MediaThumbnailState>({
    reference: null,
    isGenerating: false,
    hasFailed: false,
  })

  const [element, setElement] = useState<HTMLElement | null>(null)
  const isMountedRef = useRef(true)
  // Read by the queue right before a job starts, so a tile unmounted or
  // pointed at a different file while waiting never does the work.
  const wantedReferenceRef = useRef<string | undefined>(entry?.reference)

  wantedReferenceRef.current = entry?.reference

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setState({ reference: null, isGenerating: false, hasFailed: false })
  }, [entry?.reference])

  useEffect(() => {
    if (!element || !entry) return
    // A document is thumbnailed from its first rendered page, and a file
    // this build cannot decode has nothing to render.
    if (entry.kind === "document" || entry.unsupportedReason) return

    let isCancelled = false

    const observer = new IntersectionObserver(
      (observed) => {
        if (!observed.some((record) => record.isIntersecting)) return
        observer.disconnect()

        void (async () => {
          const cached = await readCachedThumbnail(entry)
          if (isCancelled || !isMountedRef.current) return
          if (cached) {
            setState({ reference: cached, isGenerating: false, hasFailed: false })
            return
          }

          setState((current) => ({ ...current, isGenerating: true }))
          enqueue({
            isStale: () =>
              isCancelled || !isMountedRef.current || wantedReferenceRef.current !== entry.reference,
            run: async () => {
              try {
                const generated = await generateThumbnail(entry)
                if (isCancelled || !isMountedRef.current) return
                setState({ reference: generated.reference, isGenerating: false, hasFailed: false })
              } catch {
                if (isCancelled || !isMountedRef.current) return
                setState({ reference: null, isGenerating: false, hasFailed: true })
              }
            },
          })
        })()
      },
      // A little margin so a tile is decoded just before it scrolls in,
      // rather than visibly popping in blank first.
      { rootMargin: "200px" }
    )

    observer.observe(element)
    return () => {
      isCancelled = true
      observer.disconnect()
    }
  }, [element, entry])

  const ref = useCallback((next: HTMLElement | null) => setElement(next), [])

  return { ...state, ref }
}
