import { useMemo, useState } from "react"

import { normalizeText } from "@/modules/bible"
import type { BibleVersionCatalogEntry, BibleVersionSummary } from "@/modules/bible"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Pill } from "@workspace/ui/components/pill"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "@/modules/core/i18n"
import type { TranslationKey } from "@/modules/core/i18n"

interface VersionListPanelProps {
  versions: BibleVersionSummary[]
  selectedVersionId?: number
  canDownload: boolean
  onSelectVersion: (version: BibleVersionSummary) => void
  onDownload: (entry: BibleVersionCatalogEntry) => void
  onRemove: (versionId: number) => void
}

const STATUS_LABEL_KEY: Record<BibleVersionSummary["status"], TranslationKey> = {
  bundled: "bible.version.status.bundled",
  downloaded: "bible.version.status.downloaded",
  available: "bible.version.status.available",
  downloading: "bible.version.status.downloading",
  error: "bible.version.status.error",
}

/**
 * The Bible tab's first column: every translation, inline with its own
 * search bar (not a dialog) — this column is the whole point of the
 * column-based layout, so it stays visible alongside books/chapters/verses
 * rather than opening over them.
 */
export function VersionListPanel({
  versions,
  selectedVersionId,
  canDownload,
  onSelectVersion,
  onDownload,
  onRemove,
}: VersionListPanelProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")

  const filteredVersions = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    if (!normalizedQuery) return versions

    return versions.filter(
      (version) =>
        normalizeText(version.local_abbreviation).includes(normalizedQuery) ||
        normalizeText(version.local_title).includes(normalizedQuery) ||
        normalizeText(version.lang_name).includes(normalizedQuery)
    )
  }, [versions, query])

  return (
    <div className="flex h-full flex-col gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("bible.version.searchPlaceholder")}
        aria-label={t("bible.version.searchAriaLabel")}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {filteredVersions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bible.version.noneFound")}</p>
        ) : (
          filteredVersions.map((version) => {
            const isActive = version.version_id === selectedVersionId

            return (
              <div
                key={version.version_id}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-accent",
                  isActive && "bg-accent"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectVersion(version)}
                  disabled={version.status === "downloading"}
                  className="flex flex-1 flex-col items-start truncate text-left"
                >
                  <span className="truncate text-sm font-medium">{version.local_abbreviation}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t(STATUS_LABEL_KEY[version.status])}
                  </span>
                </button>

                {canDownload && version.status === "available" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDownload(version)}>
                    {t("bible.version.download")}
                  </Button>
                ) : null}
                {canDownload && version.status === "error" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDownload(version)}>
                    {t("bible.version.retry")}
                  </Button>
                ) : null}
                {canDownload && version.status === "downloaded" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(version.version_id)}>
                    {t("bible.version.remove")}
                  </Button>
                ) : null}
                {isActive ? <Pill variant="signal">{t("bible.version.active")}</Pill> : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
