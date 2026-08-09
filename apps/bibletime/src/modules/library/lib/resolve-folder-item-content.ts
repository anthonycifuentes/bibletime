import type { MediaSlideData } from "@/modules/core/interfaces"
import { DEFAULT_SLIDE_TEMPLATE, normalizeSlideTemplateOverride } from "@/modules/presentation"
import type { SlideTemplate } from "@/modules/presentation"
import type { SavedTemplate } from "@/modules/templates"
import type { FolderItem } from "@/modules/library/interfaces"

export interface ResolvedFolderItemContent {
  text?: string
  /** Rendered *on* the slide, under the text — so it goes to the projected output. A song slide has none: the congregation sees lyrics only. */
  reference?: string
  versionLabel?: string
  template: SlideTemplate
  /**
   * How the slide is named in the console's own chrome (card caption,
   * sidebar tree) — never rendered on the slide itself. For a verse this
   * matches its on-slide `reference`; for a song it's the section's label
   * ("Verse 1", "Chorus"), which identifies the slide while you build a
   * running order without projecting that word to the congregation.
   */
  caption?: string
  /** The image/video/page a `media` item renders, painted above the template background and below the text layer. */
  media?: MediaSlideData
  /**
   * Shown instead of `text` when there is nothing to render. Today that is
   * only a `media` item whose source file can't be resolved — every content
   * type otherwise carries its own real content.
   */
  emptyMessage?: string
}

/**
 * The template a slide points at, *without* its own style override — the base
 * the override layers over. The style dialog needs this separately from the
 * merged result, since clearing an override has to preview the template's own
 * look again.
 */
export const resolveItemBaseTemplate = (item: FolderItem, templates: SavedTemplate[]): SlideTemplate =>
  templates.find((saved) => saved.id === item.templateId)?.template ?? DEFAULT_SLIDE_TEMPLATE

/**
 * The slide's effective style: its template, with its own partial
 * `templateOverride` (if any) layered on top. This is the one place the merge
 * happens, which is what makes a per-slide override universal — the console
 * card, the preview panel, and the `/present` payload all resolve through
 * here, so none of them needs to know overrides exist.
 *
 * The override is normalized (not trusted) on the way in: a field this build
 * can't render is dropped so the template supplies it instead. See
 * `normalizeSlideTemplateOverride`.
 */
export const resolveItemTemplate = (item: FolderItem, templates: SavedTemplate[]): SlideTemplate => {
  const base = resolveItemBaseTemplate(item, templates)
  return item.templateOverride ? { ...base, ...normalizeSlideTemplateOverride(item.templateOverride) } : base
}

/** Resolves a `FolderItem` + the template library into what `SlidePreview` needs, regardless of content type. */
export const resolveFolderItemContent = (
  item: FolderItem,
  templates: SavedTemplate[]
): ResolvedFolderItemContent => {
  const template = resolveItemTemplate(item, templates)

  switch (item.type) {
    case "bible-passage":
      return {
        text: item.data.text,
        reference: item.data.reference,
        versionLabel: item.data.versionAbbreviation,
        template,
        caption: item.data.reference,
      }
    case "song":
      // No `reference`: the projected slide shows lyrics and nothing else.
      // The section label is console chrome only (see `caption`).
      return { text: item.data.text, template, caption: item.data.sectionLabel }
    case "note":
      return {
        text: item.data.text,
        reference: item.data.heading,
        template,
        caption: item.data.label,
      }
    case "media":
      // The item carries a reference, not the content — so unlike every
      // other type this can fail to resolve at render time. Whether the
      // file is actually reachable is decided where it's rendered (see
      // `useMediaAvailability`), which also supplies the localized missing
      // message; nothing user-facing is hardcoded here.
      return { media: item.data, template, caption: item.data.title }
  }
}
