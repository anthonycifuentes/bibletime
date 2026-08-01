import { BUNDLED_TEMPLATES } from "@/modules/templates/services/bundled-templates"
import type { SavedTemplate, TemplateStorageDriver } from "@/modules/templates/interfaces"

const STORAGE_KEY = "bibletime.templates.custom"

const isBrowser = typeof window !== "undefined"

const readCustomTemplates = (): SavedTemplate[] => {
  if (!isBrowser) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedTemplate[]) : []
  } catch {
    return []
  }
}

const writeCustomTemplates = (templates: SavedTemplate[]): void => {
  if (!isBrowser) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

const isBundled = (id: string): boolean => id.startsWith("bundled-")

/**
 * Web build: bundled templates are always listed and stay read-only, but
 * custom templates the user creates are real — persisted to this browser's
 * own `localStorage`. Unlike the desktop build's filesystem-backed library,
 * these are per-browser and not portable, but create/edit/delete genuinely
 * work here rather than being disabled.
 */
export const webTemplateStorage: TemplateStorageDriver = {
  canWrite: true,
  supportsVideoBackground: false,
  list: async () => [...BUNDLED_TEMPLATES, ...readCustomTemplates()],
  save: async (template) => {
    if (isBundled(template.id)) {
      throw new Error("No se pueden editar las plantillas incluidas.")
    }
    const next = [...readCustomTemplates().filter((item) => item.id !== template.id), template]
    writeCustomTemplates(next)
  },
  remove: async (id) => {
    if (isBundled(id)) {
      throw new Error("No se pueden eliminar las plantillas incluidas.")
    }
    writeCustomTemplates(readCustomTemplates().filter((item) => item.id !== id))
  },
}
