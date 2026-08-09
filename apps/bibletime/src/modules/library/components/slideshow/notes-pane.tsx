import { useCallback, useEffect, useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { TextFontIcon } from "@hugeicons/core-free-icons"

const NOTES_SIZE_STORAGE_KEY = "bibletime.slideshow.notesSize"
/** Steps in `rem`, smallest to largest. The middle one is the default. */
const NOTES_SIZES = [0.875, 1, 1.25, 1.5, 1.875] as const
const DEFAULT_SIZE_INDEX = 1

const readStoredSizeIndex = (): number => {
  if (typeof window === "undefined") return DEFAULT_SIZE_INDEX

  const stored = Number.parseInt(window.localStorage.getItem(NOTES_SIZE_STORAGE_KEY) ?? "", 10)
  if (!Number.isFinite(stored) || stored < 0 || stored >= NOTES_SIZES.length) {
    return DEFAULT_SIZE_INDEX
  }
  return stored
}

interface NotesPaneProps {
  notes: string | undefined
}

/**
 * The current slide's speaker notes — read-only, by design.
 *
 * An editable field here would take focus and swallow every navigation key
 * the moment it did, and a write-through would fire project autosave during
 * a live service. Notes are written in the console, which is one `Esc` away.
 *
 * The size steppers persist to `localStorage` rather than onto the slide:
 * how large one operator needs their notes on one machine is not a property
 * of the notes, and syncing it through an exported project would impose one
 * person's eyesight on everyone they share the file with.
 */
export function NotesPane({ notes }: NotesPaneProps) {
  const { t } = useTranslation()
  // Starts at the default on both server and client, then resolves the
  // stored size once mounted — the same hydration-safe shape `LocaleProvider`
  // uses for its own stored preference.
  const [sizeIndex, setSizeIndex] = useState(DEFAULT_SIZE_INDEX)

  useEffect(() => {
    setSizeIndex(readStoredSizeIndex())
  }, [])

  const step = useCallback((delta: number) => {
    setSizeIndex((previous) => {
      const next = Math.min(Math.max(previous + delta, 0), NOTES_SIZES.length - 1)
      window.localStorage.setItem(NOTES_SIZE_STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wide text-white/50 uppercase">
          {t("slideshow.notes")}
        </h2>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={sizeIndex === NOTES_SIZES.length - 1}
            onClick={() => step(1)}
            className="text-white/60 hover:text-white"
          >
            <HugeiconsIcon icon={TextFontIcon} strokeWidth={2} />
            <span className="sr-only">{t("slideshow.notesLarger")}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={sizeIndex === 0}
            onClick={() => step(-1)}
            className="text-white/60 hover:text-white"
          >
            <HugeiconsIcon icon={TextFontIcon} strokeWidth={2} className="size-3" />
            <span className="sr-only">{t("slideshow.notesSmaller")}</span>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {notes ? (
          // `pre-line` keeps the operator's own line breaks — notes are
          // written as lines to glance at, not as a paragraph.
          <p
            className="leading-relaxed whitespace-pre-line text-white/85"
            style={{ fontSize: `${NOTES_SIZES[sizeIndex]}rem` }}
          >
            {notes}
          </p>
        ) : (
          <p className="text-xs text-white/35">{t("slideshow.notesEmpty")}</p>
        )}
      </div>
    </section>
  )
}
