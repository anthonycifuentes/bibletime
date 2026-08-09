import { useEffect, useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { getMediaAccess, mediaCapabilities, readStorageEstimate } from "@/modules/media"
import { Button } from "@workspace/ui/components/button"

/** Bytes → a short human-readable size, for the cache figure. */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`
}

/**
 * Media conversion and cache status.
 *
 * The cache exists in both builds — on disk in the desktop app, in browser
 * storage otherwise — so its size and the way to reclaim it are reported
 * everywhere. LibreOffice is the desktop-only part, and surfacing its
 * presence *here* is the point: a user finds out that PowerPoint conversion
 * needs it while setting up, rather than at the moment they select a deck
 * on Sunday morning.
 */
export function MediaStoragePanel() {
  const { t } = useTranslation()
  const [libreOffice, setLibreOffice] = useState<{ available: boolean } | null>(null)
  const [cacheSize, setCacheSize] = useState<number | null>(null)
  const [quota, setQuota] = useState<{ usage?: number; quota?: number }>({})
  const [isBusy, setIsBusy] = useState(false)
  const [canConvertDocuments, setCanConvertDocuments] = useState(false)

  // `window` doesn't exist during SSR — same reasoning as `SystemInfoPanel`.
  const mediaConvert = typeof window !== "undefined" ? window.bibletime?.mediaConvert : undefined

  useEffect(() => {
    setCanConvertDocuments(mediaCapabilities().canConvertDocuments)
    void getMediaAccess().cache.size().then(setCacheSize)
    void mediaConvert?.probeLibreOffice().then(setLibreOffice)
    // Only the browser reports a quota; on desktop this stays empty and the
    // line below is simply not rendered.
    void readStorageEstimate().then(setQuota)
  }, [mediaConvert])

  const handleClear = async () => {
    setIsBusy(true)
    try {
      await getMediaAccess().cache.clear()
      setCacheSize(await getMediaAccess().cache.size())
      setQuota(await readStorageEstimate())
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canConvertDocuments ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            {libreOffice === null
              ? "…"
              : t(
                  libreOffice.available
                    ? "settings.media.libreOfficeAvailable"
                    : "settings.media.libreOfficeMissing"
                )}
          </p>
          {libreOffice && !libreOffice.available ? (
            <p className="text-xs text-muted-foreground">{t("settings.media.libreOfficeHint")}</p>
          ) : null}
        </div>
      ) : (
        // Says what this build can't do with decks, rather than leaving the
        // section looking as though conversion simply failed to report.
        <p className="text-sm text-muted-foreground">{t("settings.media.webNote")}</p>
      )}

      <div className="flex flex-col gap-1">
        <p className="text-sm">
          {t("settings.media.cacheSize", { size: cacheSize === null ? "…" : formatBytes(cacheSize) })}
        </p>
        <p className="text-xs text-muted-foreground">{t("settings.media.cacheHint")}</p>
        {/* Browser only: what the origin is allowed before the browser starts evicting. */}
        {quota.quota ? (
          <p className="text-xs text-muted-foreground">
            {t("settings.media.storageQuota", {
              usage: formatBytes(quota.usage ?? 0),
              quota: formatBytes(quota.quota),
            })}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void handleClear()}>
          {t("settings.media.clearCache")}
        </Button>
      </div>
    </div>
  )
}
