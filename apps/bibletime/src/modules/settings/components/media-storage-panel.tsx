import { useEffect, useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
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
 * Media conversion and cache status — desktop only, since the media library
 * is a view onto a filesystem the web build can't reach.
 *
 * Surfacing LibreOffice's presence *here* is the point: a user finds out
 * that PowerPoint conversion needs it while setting up, rather than at the
 * moment they select a deck on Sunday morning.
 */
export function MediaStoragePanel() {
  const { t } = useTranslation()
  const [libreOffice, setLibreOffice] = useState<{ available: boolean } | null>(null)
  const [cacheSize, setCacheSize] = useState<number | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // `window` doesn't exist during SSR — same reasoning as `SystemInfoPanel`.
  const mediaConvert = typeof window !== "undefined" ? window.bibletime?.mediaConvert : undefined
  const mediaCache = typeof window !== "undefined" ? window.bibletime?.mediaCache : undefined

  useEffect(() => {
    if (!mediaConvert || !mediaCache) return
    void mediaConvert.probeLibreOffice().then(setLibreOffice)
    void mediaCache.size().then(setCacheSize)
  }, [mediaConvert, mediaCache])

  if (!mediaConvert || !mediaCache) {
    return <p className="text-sm text-muted-foreground">{t("settings.media.webNote")}</p>
  }

  const handleClear = async () => {
    setIsBusy(true)
    try {
      await mediaCache.clear()
      setCacheSize(await mediaCache.size())
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-col gap-1">
        <p className="text-sm">
          {t("settings.media.cacheSize", { size: cacheSize === null ? "…" : formatBytes(cacheSize) })}
        </p>
        <p className="text-xs text-muted-foreground">{t("settings.media.cacheHint")}</p>
      </div>

      <div>
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void handleClear()}>
          {t("settings.media.clearCache")}
        </Button>
      </div>
    </div>
  )
}
