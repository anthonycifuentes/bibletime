import { useMemo, useState } from "react"

import type { BibleVersionCatalogEntry, BibleVersionSummary } from "@/modules/bible"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "@/modules/core/i18n"
import { normalizeText } from "@/modules/core/lib"
import type { Locale, TranslationKey } from "@/modules/core/i18n"

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

/** Maps the app's UI locale to the catalog's own language code, so that language's section can be pinned first. */
const LOCALE_TO_LANG_KEY: Record<Locale, string> = {
  en: "eng",
  es: "spa",
  pt: "por",
}

interface VersionLanguageGroup {
  langName: string
  versions: BibleVersionSummary[]
}

/** Groups versions by language, sorting the section matching `locale` first and the rest alphabetically by language name. */
function groupVersionsByLanguage(
  versions: BibleVersionSummary[],
  locale: Locale
): VersionLanguageGroup[] {
  const groups = new Map<string, BibleVersionSummary[]>()
  for (const version of versions) {
    const existing = groups.get(version.lang_name)
    if (existing) existing.push(version)
    else groups.set(version.lang_name, [version])
  }

  const activeLangKey = LOCALE_TO_LANG_KEY[locale]

  return Array.from(groups, ([langName, groupVersions]) => ({
    langName,
    versions: groupVersions,
  })).sort((a, b) => {
    const aIsActive = a.versions.some((version) => version.lang_key === activeLangKey)
    const bIsActive = b.versions.some((version) => version.lang_key === activeLangKey)
    if (aIsActive !== bIsActive) return aIsActive ? -1 : 1
    return a.langName.localeCompare(b.langName)
  })
}

/**
 * The Bible tab's first column: every translation, grouped into collapsible
 * per-language sections with its own inline search bar (not a dialog) — this
 * column is the whole point of the column-based layout, so it stays visible
 * alongside books/chapters/verses rather than opening over them.
 */
export function VersionListPanel({
  versions,
  selectedVersionId,
  canDownload,
  onSelectVersion,
  onDownload,
  onRemove,
}: VersionListPanelProps) {
  const { t, locale } = useTranslation()
  const [query, setQuery] = useState("")

  const selectedVersion = versions.find((version) => version.version_id === selectedVersionId)

  // Only the active version's language starts expanded; toggling a section
  // never touches selection, and selecting a version never touches this set.
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(
    () => new Set(selectedVersion ? [selectedVersion.lang_name] : [])
  )

  const toggleLanguage = (langName: string) => {
    setExpandedLanguages((current) => {
      const next = new Set(current)
      if (next.has(langName)) next.delete(langName)
      else next.add(langName)
      return next
    })
  }

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

  const isSearching = query.trim().length > 0

  const languageGroups = useMemo(
    () => groupVersionsByLanguage(filteredVersions, locale),
    [filteredVersions, locale]
  )

  return (
    <div className="flex h-full flex-col gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("bible.version.searchPlaceholder")}
        aria-label={t("bible.version.searchAriaLabel")}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {languageGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bible.version.noneFound")}</p>
        ) : (
          languageGroups.map((group) => {
            // While searching, every group with a match renders expanded
            // regardless of `expandedLanguages` — that set is left untouched
            // so clearing the query restores whatever it was before.
            const isExpanded = isSearching || expandedLanguages.has(group.langName)

            return (
              <div key={group.langName} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleLanguage(group.langName)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-semibold text-muted-foreground uppercase hover:bg-accent"
                >
                  <span
                    aria-hidden
                    className={cn("inline-block transition-transform", isExpanded && "rotate-90")}
                  >
                    ▸
                  </span>
                  {group.langName}
                </button>

                {isExpanded
                  ? group.versions.map((version) => {
                      const isActive = version.version_id === selectedVersionId

                      return (
                        <div
                          key={version.version_id}
                          className={cn(
                            "flex items-center gap-1 rounded-md py-1.5 pr-2 pl-6 hover:bg-accent",
                            isActive && "bg-accent"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectVersion(version)}
                            disabled={version.status === "downloading"}
                            className="flex flex-1 flex-col items-start truncate text-left"
                          >
                            <span className="truncate text-sm font-medium">{version.local_title}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {version.local_abbreviation} · {t(STATUS_LABEL_KEY[version.status])}
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemove(version.version_id)}
                            >
                              {t("bible.version.remove")}
                            </Button>
                          ) : null}
                        </div>
                      )
                    })
                  : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
