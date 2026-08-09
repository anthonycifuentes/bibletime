import { useCallback, useEffect, useState } from "react"

import type { MediaSlideData } from "@/modules/media/interfaces"
import { MEDIA_DIALOG_FILTERS } from "@/modules/media/lib/supported-formats"
import {
  buildMediaReference,
  parseMediaReference,
  readMediaRoots,
  relinkMediaFile,
  resolveMediaUrl,
  statMediaFile,
} from "@/modules/media/services"

export type RelinkOutcome =
  | { status: "relinked"; src: string }
  | { status: "outside-roots" }
  | { status: "canceled" }

/**
 * Why a slide's media cannot be shown.
 *
 * The distinction is the whole point: a file that has moved needs
 * relinking, while a root whose browser permission has lapsed needs one
 * click to reconnect — and sending the user at the wrong remedy is worse
 * than saying nothing (see `enable-media-tab-on-web` design decision 9).
 */
export type MediaMissingReason = "file-missing" | "needs-reconnect"

/**
 * Whether a media slide's source still resolves, and the URL to render it
 * with if so.
 *
 * This exists because a media item is the one slide type that holds a
 * *reference* rather than its content: the file can be moved, renamed,
 * sitting on a drive that isn't plugged in, or — in the browser — inside a
 * folder this window has not been granted access to yet. Rather than
 * letting any of that render as a broken image, the slide keeps its place
 * in the running order and says what happened.
 *
 * Resolution happens here, per component, rather than being stored on the
 * slide: in the browser a resolved URL is valid only in the browsing
 * context that minted it, so the output window must do its own.
 */
export const useMediaAvailability = (media: MediaSlideData | undefined) => {
  const [isMissing, setIsMissing] = useState(false)
  const [missingReason, setMissingReason] = useState<MediaMissingReason>("file-missing")
  const [url, setUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!media) {
      setIsMissing(false)
      setUrl(undefined)
      return
    }

    // An `AbortController` rather than a mutable flag: this effect awaits
    // several times, and a plain `let cancelled = false` gets narrowed to
    // its literal by control-flow analysis, making every later check look
    // like dead code.
    const controller = new AbortController()
    // Read through a function rather than inline: after the first
    // `if (signal.aborted) return`, control-flow analysis keeps the property
    // narrowed to `false` across every later `await`, so the subsequent
    // checks would be reported as dead code.
    const isAborted = () => controller.signal.aborted
    setUrl(undefined)

    const resolve = async () => {
      const resolved = await resolveMediaUrl(media.src)
      if (isAborted()) return

      if (resolved) {
        setUrl(resolved)
        setIsMissing(false)
        return
      }

      // Nothing resolved. Before calling the file missing, check whether its
      // root is merely waiting to be reconnected — the same file, one click
      // away, and a different thing to tell the user.
      const parsed = parseMediaReference(media.src)
      const root = parsed ? (await readMediaRoots()).find((candidate) => candidate.id === parsed.host) : undefined
      if (isAborted()) return

      if (root?.state === "needs-permission") {
        setMissingReason("needs-reconnect")
        setIsMissing(true)
        return
      }

      const stats = await statMediaFile(media.src)
      if (isAborted()) return

      setMissingReason("file-missing")
      setIsMissing(!stats.exists)
    }

    void resolve()

    return () => {
      controller.abort()
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

  return { isMissing, missingReason, url, relink }
}
