import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { TemplateManager, useTemplates } from "@/modules/templates"
import { useTranslation } from "@/modules/core/i18n"

interface TemplatePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (templateId: string) => void
}

/**
 * Reuses the templates module's own `TemplateManager` gallery (create/
 * duplicate/import/export all keep working inside it) as a modal picker for
 * "apply template to selection" — clicking a card's "Usar" button here
 * applies it to the slide console's current selection instead of setting
 * the app-wide active template.
 */
export function TemplatePickerDialog({ open, onOpenChange, onApply }: TemplatePickerDialogProps) {
  const { t } = useTranslation()
  const templatesState = useTemplates()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("library.applyTemplate")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <TemplateManager
            {...templatesState}
            activeId={undefined}
            setActive={(templateId) => {
              onApply(templateId)
              onOpenChange(false)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
