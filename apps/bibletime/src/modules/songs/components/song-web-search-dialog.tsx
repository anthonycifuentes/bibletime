import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { useSearchSongsOnline } from "@/modules/songs/actions/queries/use-search-songs-online"
import type { SongSearchResult } from "@/modules/songs/interfaces"
import { countLyricSections } from "@/modules/songs/lib/parse-lyrics"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

interface SongWebSearchDialogProps {
  open: boolean
  onImport: (result: SongSearchResult) => void
  onClose: () => void
}

const formatDuration = (seconds: number | undefined): string | undefined => {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return undefined
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/** Title / artist / album / duration, joined so an unavailable field just drops out instead of leaving a dangling separator. */
const resultSubtitle = (result: SongSearchResult): string =>
  [result.artist, result.album, formatDuration(result.durationSeconds)]
    .filter((part): part is string => Boolean(part))
    .join(" · ")

/**
 * Imports a song from the online lyrics provider. Selecting a result only
 * fetches and previews it — importing is a separate, explicit action, so
 * browsing never writes to the song library.
 *
 * A provider failure renders as an explicit "unavailable" state, never as
 * "no results": the two call for completely different responses from the
 * user, and typing lyrics by hand is always still available behind this
 * dialog.
 */
export function SongWebSearchDialog({ open, onImport, onClose }: SongWebSearchDialogProps) {
  const { t } = useTranslation()
  const { state, search, reset } = useSearchSongsOnline()

  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<SongSearchResult | undefined>(undefined)

  // Clears the query, results, and preview each time the dialog opens, so it
  // never reopens showing a previous session's search.
  useEffect(() => {
    if (open) return
    setQuery("")
    setSelected(undefined)
    reset()
  }, [open, reset])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSelected(undefined)
    void search(query)
  }

  const lyrics = selected?.plainLyrics?.trim() ?? ""
  const canImport = lyrics !== ""
  const slideCount = countLyricSections(lyrics)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? undefined : onClose())}>
      <DialogContent className="h-[80vh] max-h-none w-[72vw] max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("songs.webSearchTitle")}</DialogTitle>
          <DialogDescription>{t("songs.webSearchNotice")}</DialogDescription>
        </DialogHeader>

        <form className="flex shrink-0 gap-2" onSubmit={handleSubmit}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("songs.webSearchPlaceholder")}
            aria-label={t("songs.webSearchPlaceholder")}
          />
          <Button type="submit" disabled={query.trim() === ""}>
            {t("songs.webSearchSubmit")}
          </Button>
        </form>

        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
          <div className="min-h-0 overflow-y-auto">
            {state.status === "idle" ? (
              <p className="p-2 text-sm text-muted-foreground">{t("songs.webSearchIdle")}</p>
            ) : null}
            {state.status === "loading" ? (
              <p className="p-2 text-sm text-muted-foreground">{t("songs.webSearchLoading")}</p>
            ) : null}
            {state.status === "empty" ? (
              <p className="p-2 text-sm text-muted-foreground">{t("songs.webSearchEmpty")}</p>
            ) : null}
            {state.status === "unavailable" ? (
              <div className="flex flex-col items-start gap-2 p-2">
                <p className="text-sm text-muted-foreground">
                  {t("songs.webSearchUnavailable")}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => void search(query)}>
                  {t("songs.webSearchRetry")}
                </Button>
              </div>
            ) : null}
            {state.status === "results" ? (
              <ul className="flex flex-col gap-1">
                {state.results.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(result)}
                      aria-current={result.id === selected?.id}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent",
                        result.id === selected?.id && "bg-accent"
                      )}
                    >
                      <span className="block truncate text-sm font-medium">{result.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {resultSubtitle(result)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <div className="flex shrink-0 items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("songs.importedLyrics")}
              </h3>
              {canImport ? (
                <span className="text-xs text-muted-foreground">
                  {slideCount === 1
                    ? t("songs.oneSlide")
                    : t("songs.slideCount", { count: slideCount })}
                </span>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border p-3">
              {selected === undefined ? (
                <p className="text-sm text-muted-foreground">{t("songs.webSearchIdle")}</p>
              ) : canImport ? (
                <p className="text-sm whitespace-pre-line">{lyrics}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("songs.webSearchNoLyrics")}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("songs.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canImport}
            onClick={() => selected && onImport(selected)}
          >
            {t("songs.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
