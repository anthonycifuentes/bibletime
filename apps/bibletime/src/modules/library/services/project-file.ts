import type { Folder, Project, ProjectFile } from "@/modules/library/interfaces"

const SCHEMA_VERSION = 1 as const

export const toProjectFile = (project: Project, folders: Folder[]): ProjectFile => ({
  schemaVersion: SCHEMA_VERSION,
  project: { name: project.name },
  folders,
})

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "proyecto"

/** Triggers a browser download of the project (and its folders/slides) as a `.json` file. */
export const downloadProjectFile = (project: Project, folders: Folder[]): void => {
  const file = toProjectFile(project, folders)
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `${slugify(project.name)}.bibletime-project.json`
  link.click()

  URL.revokeObjectURL(url)
}

/** Parses and validates an opened project file's contents. Throws a descriptive error on invalid input. */
export const parseProjectFile = (raw: string): ProjectFile => {
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
    !("project" in data) ||
    !("folders" in data)
  ) {
    throw new Error("El archivo no tiene el formato de un proyecto de BibleTime.")
  }

  // The `in` narrowing above already types these as `unknown` (not the
  // literal `1` `schemaVersion` would otherwise carry), so checks below
  // against untrusted, external input actually run instead of being
  // flagged as always-true.
  const { schemaVersion, project, folders } = data
  if (schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Versión de proyecto no compatible: ${String(schemaVersion)}.`)
  }
  if (typeof project !== "object" || project === null || typeof (project as { name?: unknown }).name !== "string") {
    throw new Error("El archivo no tiene el formato de un proyecto de BibleTime.")
  }
  if (!Array.isArray(folders)) {
    throw new Error("El archivo no tiene el formato de un proyecto de BibleTime.")
  }

  return data as ProjectFile
}
