import { BUNDLED_TEMPLATES } from "@/modules/templates/services/bundled-templates"
import type { TemplateStorageDriver } from "@/modules/templates/interfaces"

/**
 * Desktop build: user templates are read/written as individual JSON files
 * in a dedicated folder under the app's user-data directory, via the IPC
 * bridge the Electron preload script exposes on `window.bibletime.templates`
 * (see apps/desktop/src/{main,preload}.ts). Bundled templates are still
 * listed alongside the user's own, but stay read-only.
 */
export const desktopTemplateStorage: TemplateStorageDriver = {
  canWrite: true,
  supportsVideoBackground: true,
  list: async () => {
    const saved = await window.bibletime!.templates.list()
    return [...BUNDLED_TEMPLATES, ...saved]
  },
  save: async (template) => {
    await window.bibletime!.templates.save(template)
  },
  remove: async (id) => {
    if (id.startsWith("bundled-")) {
      throw new Error("No se pueden eliminar las plantillas incluidas.")
    }
    await window.bibletime!.templates.remove(id)
  },
}
