import { useEffect, useState } from "react"

import type { FolderItem } from "@/modules/library/interfaces"
import {
  resolveFolderItemContent,
  resolveItemBaseTemplate,
} from "@/modules/library/lib/resolve-folder-item-content"
import { useMediaAvailability } from "@/modules/media"
import type { SavedTemplate } from "@/modules/templates"
import { SlidePreview, TemplateEditor, useElementWidthScale } from "@/modules/presentation"
import type { SlideTemplate } from "@/modules/presentation"
import { useAspectRatio } from "@/modules/core/aspect-ratio"
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

interface SlideStyleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The slide the controls are seeded from and the preview renders — the last-selected one when several are being edited at once. */
  item: FolderItem
  /** How many slides this save will write to, so the description can say so. */
  targetCount: number
  templates: SavedTemplate[]
  /** Whether a video background can be stored locally (desktop only) — passed straight through to `TemplateEditor`. */
  canUseVideoBackground: boolean
  /** `null` clears the override entirely; a patch sets it. */
  onSave: (override: Partial<SlideTemplate> | null) => void
}

/**
 * Edits one slide's own style — a partial override layered over whichever
 * template the slide points at — without creating or touching a template.
 *
 * Reuses `TemplateEditor` unchanged: that component is already a controlled
 * editor over a whole `SlideTemplate`, and its `onChange` already emits
 * exactly the partial shape an override is. Handing it the *merged* template
 * (the slide's base template plus the draft override) means every control
 * shows the slide's effective look and stays available whether or not that
 * particular field is currently overridden, while the draft accumulated from
 * its patches naturally contains only the fields the user actually touched.
 *
 * Nothing is written until Save, unlike the rest of the console — the same
 * reasoning `/templates/$templateId` follows: this is a surface for trying a
 * font and backing out. No navigation guard is needed here, because
 * dismissing a dialog *is* the discard affordance.
 */
export function SlideStyleDialog({
  open,
  onOpenChange,
  item,
  targetCount,
  templates,
  canUseVideoBackground,
  onSave,
}: SlideStyleDialogProps) {
  const { t } = useTranslation()
  const { ratio } = useAspectRatio()
  const { elementRef, scale } = useElementWidthScale()
  const [draft, setDraft] = useState<Partial<SlideTemplate>>(item.templateOverride ?? {})

  // Re-seeds on open and whenever the targeted slide changes, so reopening
  // never shows a stale draft from the last slide that was edited.
  useEffect(() => {
    if (open) setDraft(item.templateOverride ?? {})
  }, [open, item.id])

  const content = resolveFolderItemContent(item, templates)
  const { isMissing, missingReason, url: mediaUrl } = useMediaAvailability(content.media)

  // Built from the base template, *not* `content.template` — that one already
  // has the slide's saved override folded in, which would make clearing the
  // override impossible to preview.
  const base = resolveItemBaseTemplate(item, templates)
  const preview: SlideTemplate = { ...base, ...draft }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(item.templateOverride ?? {})

  const handleSave = () => {
    onSave(Object.keys(draft).length > 0 ? draft : null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("library.editStyleTitle")}</DialogTitle>
          <DialogDescription>
            {targetCount > 1
              ? t("library.editStyleDescriptionMultiple", { count: targetCount })
              : t("library.editStyleDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden sm:grid-cols-[1fr_340px]">
          {/* The slide's own content, not sample text — the point is to see this slide. */}
          <div className="flex items-start justify-center">
            <div className="w-full" style={{ aspectRatio: ratio }} ref={elementRef}>
              <SlidePreview
                template={preview}
                media={content.media}
                mediaUrl={mediaUrl}
                isMediaMissing={isMissing}
                text={content.text}
                reference={content.reference}
                versionLabel={content.versionLabel}
                emptyMessage={
                  content.media && isMissing
                    ? t(missingReason === "needs-reconnect" ? "media.needsReconnect" : "media.missingFile")
                    : content.emptyMessage
                }
                scale={scale}
                className="h-full w-full rounded-2xl ring-1 ring-border"
              />
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
            <TemplateEditor
              template={preview}
              onChange={(patch) => setDraft((previous) => ({ ...previous, ...patch }))}
              // Clears the override rather than resetting to app defaults —
              // the slide goes back to its template's look, and its
              // `templateId` is never touched.
              onReset={() => setDraft({})}
              resetLabel={t("library.editStyleReset")}
              canUseVideoBackground={canUseVideoBackground}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("library.cancel")}
          </Button>
          <Button type="button" disabled={!isDirty} onClick={handleSave}>
            {t("library.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
