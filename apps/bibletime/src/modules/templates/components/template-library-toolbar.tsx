import { useNavigate } from "@tanstack/react-router"
import { useRef } from "react"

import type { useTemplates } from "@/modules/templates/actions/use-templates"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Upload01Icon } from "@hugeicons/core-free-icons"

interface TemplateLibraryToolbarProps {
  canWrite: boolean
  importTemplate: ReturnType<typeof useTemplates>["importTemplate"]
  size?: "sm" | "default" | "lg"
}

/**
 * "Nueva"/"Importar" — shared by the full `/templates` page header (large)
 * and the Bible console's compact settings drawer (small), so the create/
 * import behavior stays in one place regardless of where it's triggered
 * from. "Nueva" just navigates; `/templates/new` does the actual creating.
 */
export function TemplateLibraryToolbar({ canWrite, importTemplate, size = "default" }: TemplateLibraryToolbarProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    try {
      await importTemplate(file)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo importar la plantilla.")
    }
  }

  if (!canWrite) {
    return (
      <p className="text-xs text-muted-foreground">
        En la versión web solo se pueden usar las plantillas incluidas.
      </p>
    )
  }

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size={size} onClick={() => void navigate({ to: "/templates/new" })}>
        Nueva
      </Button>
      <Button type="button" variant="outline" size={size} onClick={() => fileInputRef.current?.click()}>
        <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
        Importar
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />
    </div>
  )
}
