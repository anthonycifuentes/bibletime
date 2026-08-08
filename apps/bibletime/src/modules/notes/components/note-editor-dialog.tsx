import { useEffect, useState } from "react"

import type { NoteDraft } from "@/modules/notes/interfaces"
import { useTranslation } from "@/modules/core/i18n"
import { SlideFrame } from "@/modules/presentation"
import type { SlideTemplate } from "@/modules/presentation"
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

export interface NoteEditorValues {
  heading: string
  text: string
}

interface NoteEditorDialogProps {
  open: boolean
  /** The draft being edited, or `undefined` when writing a new one. */
  draft: NoteDraft | undefined
  /** The tab's selected template — the preview renders in it, so what you see here is what lands in the folder. */
  template: SlideTemplate
  onSave: (values: NoteEditorValues) => void
  onClose: () => void
}

/**
 * The full-screen note editor: an optional heading, one body box,
 * and a live preview of the single slide they produce.
 *
 * Deliberately smaller than the song editor. There is no blank-line rule to
 * teach, no slide-boundary column, and no auto-format button, because one
 * note is always exactly one slide — a blank line the user types is
 * a blank line *on* the slide. Over-long text is handled by the template's
 * existing auto-fit, and the preview shows that happening while they type.
 */
export function NoteEditorDialog({
  open,
  draft,
  template,
  onSave,
  onClose,
}: NoteEditorDialogProps) {
  const { t } = useTranslation()

  const [heading, setHeading] = useState("")
  const [text, setText] = useState("")

  // Re-seeds whenever the dialog opens (or opens on a different draft), so a
  // dismissed edit never leaks into the next one.
  useEffect(() => {
    if (!open) return
    setHeading(draft?.heading ?? "")
    setText(draft?.text ?? "")
  }, [open, draft])

  const canSave = text.trim() !== ""

  const handleSave = () => {
    if (!canSave) return
    onSave({ heading: heading.trim(), text })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? undefined : onClose())}>
      <DialogContent className="h-[92vh] max-h-none w-[92vw] max-w-none">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {draft ? t("notes.editorEditTitle") : t("notes.editorNewTitle")}
          </DialogTitle>
          <DialogDescription>{t("notes.editorDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[1fr_minmax(240px,380px)]">
          <div className="flex min-h-0 flex-col gap-3">
            <Input
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
              placeholder={t("notes.headingPlaceholder")}
              aria-label={t("notes.headingPlaceholder")}
              className="shrink-0"
            />
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("notes.bodyPlaceholder")}
              aria-label={t("notes.body")}
              className="min-h-0 flex-1 resize-none leading-relaxed"
            />
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <h3 className="shrink-0 text-xs font-semibold text-muted-foreground uppercase">
              {t("notes.previewHeading")}
            </h3>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
              <SlideFrame
                template={template}
                text={canSave ? text : undefined}
                reference={heading.trim() === "" ? undefined : heading.trim()}
                emptyMessage={t("notes.editorPreviewHint")}
                frameClassName="h-full w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          {!canSave ? (
            <span className="mr-auto text-xs text-muted-foreground">
              {t("notes.bodyRequired")}
            </span>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            {t("notes.cancel")}
          </Button>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            {t("notes.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
