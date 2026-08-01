import { useCallback, useEffect, useState } from "react"

import type { BibleVersionCatalogEntry, DownloadedBibleVersionMeta } from "@/modules/bible/interfaces"
import { getBibleVersionDownloads } from "@/modules/bible/services"

// A stable singleton per platform (see `getBibleVersionDownloads`), so this is
// safe to depend on directly below without re-resolving it on every render.
const bibleVersionDownloads = getBibleVersionDownloads()

/**
 * Local download state for non-bundled translations: what's downloaded,
 * which versions are mid-download or failed, and the download/remove
 * actions. `canDownload` tells the UI whether to offer those actions at
 * all (false in the plain web build).
 */
export const useBibleVersionDownloads = () => {
  const [downloaded, setDownloaded] = useState<DownloadedBibleVersionMeta[]>([])
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set())
  const [errorIds, setErrorIds] = useState<Set<number>>(new Set())

  const refresh = useCallback(async () => {
    setDownloaded(await bibleVersionDownloads.list())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const download = useCallback(
    async (entry: BibleVersionCatalogEntry) => {
      setErrorIds((prev) => {
        if (!prev.has(entry.version_id)) return prev
        const next = new Set(prev)
        next.delete(entry.version_id)
        return next
      })
      setDownloadingIds((prev) => new Set(prev).add(entry.version_id))

      try {
        await bibleVersionDownloads.download(entry)
        await refresh()
      } catch {
        setErrorIds((prev) => new Set(prev).add(entry.version_id))
      } finally {
        setDownloadingIds((prev) => {
          const next = new Set(prev)
          next.delete(entry.version_id)
          return next
        })
      }
    },
    [refresh]
  )

  const remove = useCallback(
    async (versionId: number) => {
      await bibleVersionDownloads.remove(versionId)
      await refresh()
    },
    [refresh]
  )

  return {
    downloaded,
    canDownload: bibleVersionDownloads.canDownload,
    downloadingIds,
    errorIds,
    download,
    remove,
  }
}
