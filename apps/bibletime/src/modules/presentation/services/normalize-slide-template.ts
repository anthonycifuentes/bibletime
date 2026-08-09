import { getAnimatedPreset } from "@/modules/presentation/services/animated-background"
import {
  DEFAULT_SLIDE_TEMPLATE,
  clampFontSize,
  isKnownFontId,
} from "@/modules/presentation/services/slide-template"
import type { SlideBackground, SlideTemplate } from "@/modules/presentation/interfaces"

/**
 * Whether a background can actually render: an `animated` one needs a
 * registered `presetId` (a preset may have been removed since this was
 * saved), and a `gradient` needs something renderable — a non-empty `value`,
 * and a structured spec long enough to serialize into valid CSS.
 */
const canRenderBackground = (background: SlideBackground): boolean => {
  if (background.type === "animated") return Boolean(getAnimatedPreset(background.presetId))
  if (background.type === "gradient") {
    const hasValue = typeof background.value === "string" && background.value.trim() !== ""
    const hasUsableSpec = !background.spec || background.spec.stops.length >= 2
    return hasValue && hasUsableSpec
  }
  return true
}

/** Falls back a background that can't render to the default one. */
const normalizeBackground = (background: SlideBackground): SlideBackground =>
  canRenderBackground(background) ? background : DEFAULT_SLIDE_TEMPLATE.background

/**
 * Fills in fields that postdate a given saved/imported template — data read
 * from disk/localStorage/an imported file may predate `underlineColor` or
 * `textAnimation`, reference a font id that's since been removed, or an
 * animated background preset that's since been removed — so old templates
 * keep loading instead of rendering an undefined color, a missing typeface,
 * or a blank background.
 */
export const normalizeSlideTemplate = (template: unknown): SlideTemplate => {
  const value = (template ?? {}) as Partial<SlideTemplate>

  return {
    ...DEFAULT_SLIDE_TEMPLATE,
    ...value,
    background: value.background ? normalizeBackground(value.background) : DEFAULT_SLIDE_TEMPLATE.background,
    fontFamily: isKnownFontId(value.fontFamily) ? value.fontFamily : DEFAULT_SLIDE_TEMPLATE.fontFamily,
    fontSize:
      typeof value.fontSize === "number" && Number.isFinite(value.fontSize)
        ? clampFontSize(value.fontSize)
        : DEFAULT_SLIDE_TEMPLATE.fontSize,
    underlineColor:
      typeof value.underlineColor === "string"
        ? value.underlineColor
        : (value.fontColor ?? DEFAULT_SLIDE_TEMPLATE.underlineColor),
    textAnimation: typeof value.textAnimation === "boolean" ? value.textAnimation : DEFAULT_SLIDE_TEMPLATE.textAnimation,
  }
}

/** Every key of `SlideTemplate` — the allowlist `normalizeSlideTemplateOverride` filters an untrusted override against. */
const SLIDE_TEMPLATE_KEYS = Object.keys(DEFAULT_SLIDE_TEMPLATE) as (keyof SlideTemplate)[]

/**
 * The partial-override counterpart to `normalizeSlideTemplate`, for a single
 * slide's own style (see `FolderItem.templateOverride`). Where that function
 * *fills in* missing or unusable fields from `DEFAULT_SLIDE_TEMPLATE`, this
 * one *subtracts* them: an override exists precisely to say "this one field
 * differs from my template", so filling a default would silently turn a
 * one-field override into a full template snapshot and detach the slide from
 * the template it's supposed to keep following. Dropping the bad field
 * instead lets the base template supply it, which is the right fallback for
 * a partial.
 *
 * Overrides arrive from the same untrusted places templates do — localStorage,
 * a project file written by an older or newer build, a file from another
 * machine — so they need the same defensive pass.
 */
export const normalizeSlideTemplateOverride = (value: unknown): Partial<SlideTemplate> => {
  if (typeof value !== "object" || value === null) return {}
  const source = value as Partial<SlideTemplate>
  const override: Partial<SlideTemplate> = {}

  for (const key of SLIDE_TEMPLATE_KEYS) {
    if (source[key] === undefined) continue

    // A font or animated-background preset this build no longer has: drop
    // just that field so the slide renders its template's instead of an
    // undefined typeface or a blank background.
    if (key === "fontFamily") {
      if (isKnownFontId(source.fontFamily)) override.fontFamily = source.fontFamily
      continue
    }
    if (key === "background") {
      if (source.background && canRenderBackground(source.background)) override.background = source.background
      continue
    }
    if (key === "fontSize") {
      if (typeof source.fontSize === "number" && Number.isFinite(source.fontSize)) {
        override.fontSize = clampFontSize(source.fontSize)
      }
      continue
    }

    // Every remaining field is a plain scalar the renderer tolerates as-is.
    override[key] = source[key] as never
  }

  return override
}
