import { DEFAULT_SLIDE_TEMPLATE } from "@/modules/presentation"
import type { SlideTemplate } from "@/modules/presentation"
import type { SavedTemplate } from "@/modules/templates"
import type { FolderItem } from "@/modules/library/interfaces"

export interface ResolvedFolderItemContent {
  text?: string
  reference?: string
  versionLabel?: string
  template: SlideTemplate
  /** Shown instead of `text` when this item's content type has no real data yet (`song`/`media` today). */
  emptyMessage?: string
}

/** Resolves a `FolderItem` + the template library into what `SlidePreview` needs, regardless of content type. */
export const resolveFolderItemContent = (
  item: FolderItem,
  templates: SavedTemplate[]
): ResolvedFolderItemContent => {
  const template = templates.find((saved) => saved.id === item.templateId)?.template ?? DEFAULT_SLIDE_TEMPLATE

  switch (item.type) {
    case "bible-passage":
      return {
        text: item.data.text,
        reference: item.data.reference,
        versionLabel: item.data.versionAbbreviation,
        template,
      }
    case "song":
      return { template, emptyMessage: `${item.data.title} — contenido de canciones próximamente.` }
    case "media":
      return { template, emptyMessage: `${item.data.title} — contenido multimedia próximamente.` }
  }
}
