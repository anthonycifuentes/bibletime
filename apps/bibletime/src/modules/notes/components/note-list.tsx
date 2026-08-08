import type { NoteDraft } from "@/modules/notes/interfaces"
import { noteLabel } from "@/modules/notes/lib/note-label"
import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface NoteListProps {
  drafts: NoteDraft[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

/**
 * The Notes tab's first column: what's been written this session, in
 * the order it was written, plus the one way to get a new one in.
 *
 * The empty state states outright that notes aren't kept between
 * sessions. That limitation is deliberate (see `design.md`, Decision 1), so
 * the user should meet it here rather than discover it after a reload.
 */
export function NoteList({
  drafts,
  selectedId,
  onSelect,
  onNew,
  onEdit,
  onDelete,
}: NoteListProps) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button type="button" variant="outline" className="shrink-0" onClick={onNew}>
        {t("notes.newNote")}
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {drafts.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-sm font-medium">{t("notes.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("notes.emptyDescription")}</p>
            <p className="text-xs text-muted-foreground">{t("notes.notSavedNotice")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {drafts.map((draft) => {
              const isSelected = draft.id === selectedId

              return (
                <li key={draft.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg transition-colors hover:bg-accent",
                      isSelected && "bg-accent"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(draft.id)}
                      onDoubleClick={() => onEdit(draft.id)}
                      aria-current={isSelected}
                      className="min-w-0 flex-1 px-3 py-2 text-left"
                    >
                      <span className="block truncate text-sm font-medium">
                        {noteLabel(draft)}
                      </span>
                      {draft.heading?.trim() ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {draft.text.replace(/\s+/g, " ").trim()}
                        </span>
                      ) : null}
                    </button>

                    <div className="flex shrink-0 items-center gap-1 pr-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(draft.id)}
                      >
                        {t("notes.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(draft.id)}
                      >
                        {t("notes.delete")}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {drafts.length > 0 ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          {t("notes.notSavedNotice")}
        </p>
      ) : null}
    </div>
  )
}
