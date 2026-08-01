import { normalizeSlideTemplate } from "@/modules/presentation"
import type { SavedTemplate, TemplateFile } from "@/modules/templates/interfaces"

const SCHEMA_VERSION = 1 as const

export const toTemplateFile = (saved: SavedTemplate): TemplateFile => ({
  schemaVersion: SCHEMA_VERSION,
  name: saved.name,
  template: saved.template,
})

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "plantilla"

/** Triggers a browser download of the template as a `.json` file. */
export const downloadTemplateFile = (saved: SavedTemplate): void => {
  const file = toTemplateFile(saved)
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `${slugify(saved.name)}.bibletime-template.json`
  link.click()

  URL.revokeObjectURL(url)
}

/** Parses and validates an imported template file's contents. Throws a descriptive error on invalid input. */
export const parseTemplateFile = (raw: string): TemplateFile => {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error("El archivo no es un JSON válido.")
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("schemaVersion" in data) ||
    !("name" in data) ||
    !("template" in data)
  ) {
    throw new Error("El archivo no tiene el formato de una plantilla de BibleTime.")
  }

  // Widened to `unknown` rather than asserting the full `TemplateFile` shape
  // up front — otherwise TS treats `schemaVersion` as the literal type `1`
  // and flags this check as always-true, even though the actual parsed
  // value (external, untrusted input) may not be.
  const { schemaVersion } = data as { schemaVersion: unknown }
  if (schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Versión de plantilla no compatible: ${String(schemaVersion)}.`)
  }

  const file = data as TemplateFile
  return { ...file, template: normalizeSlideTemplate(file.template) }
}
