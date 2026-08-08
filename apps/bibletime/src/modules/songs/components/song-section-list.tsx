import { useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import type { Song } from "@/modules/songs/interfaces"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit02Icon } from "@hugeicons/core-free-icons"

interface SongSectionListProps {
  song: Song | undefined
  selectedIndex: number | null
  canWrite: boolean
  onSelectSection: (index: number) => void
  /** Double-click shortcut — selects the section and presents it in one gesture, matching the Bible tab's verse list. */
  onPresentSection: (index: number) => void
  /** Renames one section's label on the song ("Verse 2" → "Pre-chorus"). */
  onRenameSection: (index: number, label: string) => void
  onEdit: () => void
  onDelete: () => void
}

/**
 * The Songs tab's middle column: the selected song's sections, in order,
 * each one a slide. Selecting a section only previews it — adding and
 * presenting are explicit actions in the preview column, same split the
 * Bible tab uses for verses.
 *
 * Labels are inferred when the song is parsed but editable here, since only
 * the user knows a block is a pre-chorus rather than the verse the
 * repeat-detection guessed. They name the slide in the console's own chrome
 * and never reach the projected output.
 */
export function SongSectionList({
  song,
  selectedIndex,
  canWrite,
  onSelectSection,
  onPresentSection,
  onRenameSection,
  onEdit,
  onDelete,
}: SongSectionListProps) {
  const { t } = useTranslation()

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draftLabel, setDraftLabel] = useState("")

  const commitRename = () => {
    if (editingIndex !== null) onRenameSection(editingIndex, draftLabel)
    setEditingIndex(null)
  }

  if (!song) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">
          {t("songs.lyrics")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("songs.selectSongHint")}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h2 className="truncate text-xs font-semibold text-muted-foreground uppercase">
          {song.title}
        </h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          {song.sections.length === 1
            ? t("songs.oneSlide")
            : t("songs.slideCount", { count: song.sections.length })}
        </span>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!canWrite}
          onClick={onEdit}
        >
          {t("songs.edit")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!canWrite}
          onClick={onDelete}
        >
          {t("songs.delete")}
        </Button>
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {song.sections.map((section, index) => (
          <li key={index} className="group relative">
            <button
              type="button"
              onClick={() => onSelectSection(index)}
              onDoubleClick={() => onPresentSection(index)}
              aria-current={index === selectedIndex}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent",
                index === selectedIndex && "bg-accent"
              )}
            >
              {/* Kept in flow while renaming so the row doesn't change height. */}
              <span
                className={cn(
                  "block text-xs font-medium tracking-wide text-muted-foreground uppercase",
                  editingIndex === index && "invisible"
                )}
              >
                {section.label}
              </span>
              <span className="mt-1 block text-sm whitespace-pre-line">
                {section.lines.join("\n")}
              </span>
            </button>

            {editingIndex === index ? (
              <Input
                autoFocus
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    commitRename()
                  }
                  if (event.key === "Escape") setEditingIndex(null)
                }}
                aria-label={t("songs.renameSection")}
                className="absolute top-1 left-2 h-6 w-40 px-2 text-xs"
              />
            ) : canWrite ? (
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(index)
                  setDraftLabel(section.label)
                }}
                title={t("songs.renameSection")}
                className="absolute top-1.5 right-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background focus-visible:opacity-100"
              >
                <HugeiconsIcon icon={PencilEdit02Icon} size={14} strokeWidth={2} />
                <span className="sr-only">{t("songs.renameSection")}</span>
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
