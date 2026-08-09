import { useEffect, useState } from "react"

import { resolveMediaUrl } from "@/modules/media/services"

export type ResolvedMediaUrl =
  | { status: "resolving"; url: undefined }
  | { status: "ready"; url: string }
  | { status: "unresolvable"; url: undefined }

/**
 * Turns a stored `bibletime-file://` reference into something an `<img>` or
 * `<video>` can load, in *this* browsing context.
 *
 * Every surface that renders media goes through here rather than putting
 * the reference straight into a `src`, because the two builds answer
 * differently: on desktop the reference already is a loadable URL, while in
 * the browser it has to be resolved against IndexedDB into an object URL
 * that is valid only in the window that minted it.
 *
 * That last part is why the `/present` window calls this for itself instead
 * of receiving a URL from the console: a resolved URL cannot cross a window
 * boundary, and one that appeared to would fail on stage rather than in
 * testing (see `enable-media-tab-on-web` design decision 6).
 */
export const useResolvedMediaUrl = (reference: string | undefined): ResolvedMediaUrl => {
  const [resolved, setResolved] = useState<ResolvedMediaUrl>(
    reference ? { status: "resolving", url: undefined } : { status: "unresolvable", url: undefined }
  )

  useEffect(() => {
    if (!reference) {
      setResolved({ status: "unresolvable", url: undefined })
      return
    }

    let isCancelled = false
    setResolved({ status: "resolving", url: undefined })

    void resolveMediaUrl(reference).then((url) => {
      if (isCancelled) return
      setResolved(url ? { status: "ready", url } : { status: "unresolvable", url: undefined })
    })

    return () => {
      isCancelled = true
    }
  }, [reference])

  return resolved
}
