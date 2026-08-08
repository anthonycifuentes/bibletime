import { useCallback, useRef, useState } from "react"

import type { SongSearchState } from "@/modules/songs/interfaces"
import { searchSongsOnline } from "@/modules/songs/services"

/**
 * Drives the web-search dialog. Keeps `unavailable` strictly separate from
 * `empty`: a provider that can't be reached must never be reported as "this
 * song doesn't exist", since the two call for completely different user
 * responses (retry vs. reword).
 *
 * Out-of-order responses are discarded by sequence number, so a slow earlier
 * query can't overwrite a faster later one.
 */
export const useSearchSongsOnline = () => {
  const [state, setState] = useState<SongSearchState>({ status: "idle" })
  const latestQueryId = useRef(0)

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      latestQueryId.current += 1
      setState({ status: "idle" })
      return
    }

    latestQueryId.current += 1
    const queryId = latestQueryId.current
    setState({ status: "loading" })

    try {
      const results = await searchSongsOnline(trimmed)
      if (queryId !== latestQueryId.current) return
      setState(results.length > 0 ? { status: "results", results } : { status: "empty" })
    } catch {
      if (queryId !== latestQueryId.current) return
      setState({ status: "unavailable" })
    }
  }, [])

  const reset = useCallback(() => {
    latestQueryId.current += 1
    setState({ status: "idle" })
  }, [])

  return { state, search, reset }
}
