import { useMemo, useState } from "react"

import type { BibleVersionCatalogEntry, BibleVersionSummary } from "@/modules/bible/interfaces"
import { normalizeText } from "@/modules/bible/lib/normalize-text"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Pill } from "@workspace/ui/components/pill"
import { useTranslation } from "@/modules/core/i18n"
import type { TranslationKey } from "@/modules/core/i18n"

interface BibleVersionSelectorProps {
  /** Catalog entries tagged with their current status (bundled/downloaded/available/downloading/error). */
  versions: BibleVersionSummary[]
  selectedVersionId?: number
  /** False in the plain web build — hides download/remove actions entirely. */
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

/** Groups catalog entries by language, preserving first-seen order. */
function groupByLanguage(versions: BibleVersionSummary[]): { langName: string; versions: BibleVersionSummary[] }[] {
  const groups: { langName: string; versions: BibleVersionSummary[] }[] = []

  for (const version of versions) {
    const group = groups.find((candidate) => candidate.langName === version.lang_name)
    if (group) {
      group.versions.push(version)
    } else {
      groups.push({ langName: version.lang_name, versions: [version] })
    }
  }

  return groups
}

/**
 * A compact trigger showing the active translation, which opens a dialog
 * to search/browse every translation in the remote catalog (grouped by
 * language), see which are bundled/downloaded/available/downloading/failed,
 * pick one to read, and (where supported) download or remove one for
 * offline use.
 */
export function BibleVersionSelector({
  versions,
  selectedVersionId,
  canDownload,
  onSelectVersion,
  onDownload,
  onRemove,
}: BibleVersionSelectorProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedVersion = versions.find((version) => version.version_id === selectedVersionId)

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

  const groups = groupByLanguage(filteredVersions)

  const handleSelect = (version: BibleVersionSummary) => {
    onSelectVersion(version)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery("")
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" className="w-full justify-between" />}
      >
        <span className="truncate">{selectedVersion?.local_abbreviation ?? t("bible.version.choose")}</span>
        <span className="truncate text-xs text-muted-foreground">
          {selectedVersion ? t(STATUS_LABEL_KEY[selectedVersion.status]) : t("bible.version.change")}
        </span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("bible.version.choose")}</DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          size="lg"
          className="shrink-0"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("bible.version.searchPlaceholder")}
          aria-label={t("bible.version.searchAriaLabel")}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("bible.version.noneFound")}</p>
          ) : (
            groups.map((group) => (
              <div key={group.langName} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">{group.langName}</h3>
                <ul className="flex flex-col gap-2">
                  {group.versions.map((version) => {
                    const isActive = version.version_id === selectedVersionId

                    return (
                      <li
                        key={version.version_id}
                        className="flex items-center gap-2 rounded-lg border border-border p-2"
                      >
                        <div className="flex flex-1 flex-col gap-1 truncate">
                          <div className="flex items-center gap-2 truncate text-sm">
                            <span className="truncate font-medium">{version.local_abbreviation}</span>
                            {isActive ? <Pill variant="signal">{t("bible.version.active")}</Pill> : null}
                          </div>
                          <span className="truncate text-xs text-muted-foreground">
                            {version.local_title} · {t(STATUS_LABEL_KEY[version.status])}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant={isActive ? "default" : "outline"}
                          size="lg"
                          onClick={() => handleSelect(version)}
                          disabled={version.status === "downloading"}
                        >
                          {t("bible.version.use")}
                        </Button>

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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(version.version_id)}
                          >
                            {t("bible.version.remove")}
                          </Button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
