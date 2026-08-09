import { useEffect, useState } from "react"

import type { FolderItem } from "@/modules/library/interfaces"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import type { SavedTemplate } from "@/modules/templates"
import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"

interface SlideNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The slide whose notes are being written. */
  item: FolderItem
  /** Used only to caption the dialog with the slide's name — notes never affect how a slide renders. */
  templates: SavedTemplate[]
  onSave: (notes: string) => void
}

/**
 * Writes one slide's speaker notes — what the operator reads off the
 * slideshow's notes pane while that slide is up.
 *
 * Deliberately the plainest dialog in the console: one box, no preview.
 * Every other slide editor shows a preview because it changes what the
 * congregation sees; this one changes nothing they see, so a preview would
 * imply an effect that does not exist. The slide's name in the description
 * is what ties the box to the right slide.
 *
 * Nothing is written until Save, matching `SlideStyleDialog` — dismissing a
 * dialog is the discard affordance.
 */
export function SlideNotesDialog({
  open,
  onOpenChange,
  item,
  templates,
  onSave,
}: SlideNotesDialogProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(item.speakerNotes ?? "")

  // Re-seeds on open and whenever the targeted slide changes, so reopening
  // never shows the last slide's notes.
  useEffect(() => {
    if (!open) return
    setNotes(item.speakerNotes ?? "")
  }, [open, item.id, item.speakerNotes])

  const caption = resolveFolderItemContent(item, templates).caption

  const handleSave = () => {
    onSave(notes)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("library.slideNotes")}</DialogTitle>
          <DialogDescription>
            {caption
              ? t("library.slideNotesForSlide", { name: caption })
              : t("library.slideNotesDescription")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("library.slideNotesPlaceholder")}
          rows={8}
          autoFocus
        />

        <p className="text-xs text-muted-foreground">{t("library.slideNotesHint")}</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("library.cancel")}
          </Button>
          <Button type="button" onClick={handleSave}>
            {t("library.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
