import type { Folder, Project } from "@/modules/library/interfaces"

/**
 * A cheap fingerprint of everything an auto-save would write.
 *
 * Ids and timestamps only — never slide text — so it can run on every render
 * without serializing the project.
 *
 * Sorted, because folder order out of storage isn't guaranteed stable and a
 * reshuffled read isn't a content change. Folder *deletion* moves the
 * signature, which a max-of-`updatedAt` would miss. Every folder write
 * already stamps `updatedAt`, so this moves exactly when real content does.
 */
export const projectContentSignature = (project: Project, folders: Folder[]): string =>
  [
    project.name,
    folders
      .map((folder) => `${folder.id}:${folder.updatedAt}`)
      .sort()
      .join(","),
  ].join("|")
