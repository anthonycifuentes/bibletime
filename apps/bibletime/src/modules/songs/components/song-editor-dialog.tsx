import { useEffect, useRef, useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import type { Song } from "@/modules/songs/interfaces"
import { autoFormatLyrics } from "@/modules/songs/lib/auto-format-lyrics"
import { countLyricSections, splitLyricBlocks } from "@/modules/songs/lib/parse-lyrics"
import { serializeLyrics } from "@/modules/songs/lib/serialize-lyrics"
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
import { Textarea } from "@workspace/ui/components/textarea"

export interface SongEditorValues {
  title: string
  author: string
  lyrics: string
}

interface SongEditorDialogProps {
  open: boolean
  /** The song being edited, or `undefined` when creating a new one. */
  song: Song | undefined
  onSave: (values: SongEditorValues) => void
  onClose: () => void
}

/**
 * The full-screen song editor: a title, an optional author, and one lyrics
 * box. Deliberately minimal — no rich text, no per-section forms. The blank
 * line between blocks is the only structure the user has to think about, and
 * "Break into slides" handles the case where they pasted a wall of text
 * without any.
 *
 * Auto-format writes back into the textarea rather than transforming at save
 * time, so the result is visible, hand-editable, and natively undoable.
 */
export function SongEditorDialog({ open, song, onSave, onClose }: SongEditorDialogProps) {
  const { t } = useTranslation()

  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [lyrics, setLyrics] = useState("")
  const lyricsRef = useRef<HTMLTextAreaElement>(null)

  // Re-seeds the fields whenever the dialog opens (or opens on a different
  // song), so a dismissed edit never leaks into the next one. Existing songs
  // are reconstructed from their stored sections via `serializeLyrics`,
  // which round-trips exactly back to the blank-line-separated text.
  useEffect(() => {
    if (!open) return
    setTitle(song?.title ?? "")
    setAuthor(song?.author ?? "")
    setLyrics(song ? serializeLyrics(song.sections) : "")
  }, [open, song])

  const slideCount = countLyricSections(lyrics)
  const hasTitle = title.trim() !== ""
  const canSave = hasTitle && slideCount > 0

  const handleAutoFormat = () => {
    setLyrics(autoFormatLyrics(lyrics))
    lyricsRef.current?.focus()
  }

  const handleSave = () => {
    if (!canSave) return
    onSave({ title: title.trim(), author: author.trim(), lyrics })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? undefined : onClose())}>
      <DialogContent className="h-[92vh] max-h-none w-[92vw] max-w-none">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {song ? t("songs.editorEditTitle") : t("songs.editorNewTitle")}
          </DialogTitle>
          <DialogDescription>{t("songs.editorDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[1fr_minmax(200px,260px)]">
          <div className="flex min-h-0 flex-col gap-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("songs.titlePlaceholder")}
              aria-label={t("songs.titlePlaceholder")}
              className="shrink-0"
            />
            <Input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder={t("songs.authorPlaceholder")}
              aria-label={t("songs.authorPlaceholder")}
              className="shrink-0"
            />
            <Textarea
              ref={lyricsRef}
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder={t("songs.lyricsPlaceholder")}
              aria-label={t("songs.lyrics")}
              className="min-h-0 flex-1 resize-none font-mono leading-relaxed"
            />
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAutoFormat}>
                {t("songs.autoFormat")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("songs.autoFormatHint")}</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <div className="flex shrink-0 items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("songs.slidesHeading")}
              </h3>
              <span className="text-xs text-muted-foreground">
                {slideCount === 1 ? t("songs.oneSlide") : t("songs.slideCount", { count: slideCount })}
              </span>
            </div>

            <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {splitLyricBlocks(lyrics).map((lines, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-border px-3 py-2 text-xs whitespace-pre-line text-muted-foreground"
                >
                  {lines.join("\n")}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          {!hasTitle ? (
            <span className="mr-auto text-xs text-muted-foreground">
              {t("songs.titleRequired")}
            </span>
          ) : slideCount === 0 ? (
            <span className="mr-auto text-xs text-muted-foreground">
              {t("songs.lyricsRequired")}
            </span>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            {t("songs.cancel")}
          </Button>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            {t("songs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
