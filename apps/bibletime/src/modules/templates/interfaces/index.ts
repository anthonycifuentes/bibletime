import type { SlideTemplate } from "@/modules/presentation"

/** One named, saved template — the unit create/save/edit/delete operate on. */
export interface SavedTemplate {
  id: string
  name: string
  template: SlideTemplate
  updatedAt: number
}

/** The on-disk/exported JSON shape for a single template file. */
export interface TemplateFile {
  schemaVersion: 1
  name: string
  template: SlideTemplate
}

/**
 * Storage backend for the template library. Two implementations back this:
 * a read-only bundled gallery for the web build, and a filesystem-backed
 * one (via the Electron preload bridge) for desktop, chosen at runtime by
 * feature detection — see `getTemplateStorage`.
 */
export interface TemplateStorageDriver {
  /** Whether this driver supports save/remove, or is a read-only gallery. */
  readonly canWrite: boolean
  /** Whether this driver can store video background media locally (desktop only — see `template-media` IPC). */
  readonly supportsVideoBackground: boolean
  list: () => Promise<SavedTemplate[]>
  save: (template: SavedTemplate) => Promise<void>
  remove: (id: string) => Promise<void>
}
