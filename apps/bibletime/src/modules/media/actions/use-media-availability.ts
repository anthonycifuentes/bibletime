import { useCallback, useEffect, useState } from "react"

import type { MediaSlideData } from "@/modules/media/interfaces"
import { MEDIA_DIALOG_FILTERS } from "@/modules/media/lib/supported-formats"
import { buildMediaReference, isMediaAvailable, relinkMediaFile, statMediaFile } from "@/modules/media/services"

export type RelinkOutcome =
  | { status: "relinked"; src: string }
  | { status: "outside-roots" }
  | { status: "canceled" }

/**
 * Whether a media slide's source file still resolves.
 *
 * This check exists because a media item is the one slide type that holds a
 * *reference* rather than its content: the file can be moved, renamed, or
 * sitting on a drive that isn't plugged in. Rather than letting that render
 * as a broken image, the slide keeps its place in the running order and
 * says what happened.
 */
export const useMediaAvailability = (media: MediaSlideData | undefined) => {
  const [isMissing, setIsMissing] = useState(false)

  useEffect(() => {
    if (!media) {
      setIsMissing(false)
      return
    }

    // In the web build nothing resolves, and that is not a per-file
    // problem — the whole library is out of reach, so every media slide
    // shows the missing state (see `add-media-tab` design decision 9).
    if (!isMediaAvailable()) {
      setIsMissing(true)
      return
    }

    let isCancelled = false
    void statMediaFile(media.src).then((stats) => {
      if (!isCancelled) setIsMissing(!stats.exists)
    })

    return () => {
      isCancelled = true
    }
  }, [media])

  /**
   * Points a missing slide at the file's new location. The pick has to land
   * inside a registered root, because a reference can only address
   * something under one — otherwise the caller is told to add that folder
   * as a root first.
   */
  const relink = useCallback(async (): Promise<RelinkOutcome> => {
    const picked = await relinkMediaFile(MEDIA_DIALOG_FILTERS)
    if (!picked) return { status: "canceled" }
    if ("outsideRoots" in picked) return { status: "outside-roots" }

    setIsMissing(false)
    return { status: "relinked", src: buildMediaReference(picked.rootId, picked.relativePath) }
  }, [])

  return { isMissing, relink }
}
