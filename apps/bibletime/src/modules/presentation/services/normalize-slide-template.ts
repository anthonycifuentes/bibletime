import { getAnimatedPreset } from "@/modules/presentation/services/animated-background"
import { DEFAULT_SLIDE_TEMPLATE, isKnownFontId } from "@/modules/presentation/services/slide-template"
import type { SlideBackground, SlideTemplate } from "@/modules/presentation/interfaces"

/**
 * Falls back a background that can't render to the default one: an `animated`
 * background whose `presetId` isn't registered (a preset removed since this
 * was saved), or a `gradient` with nothing renderable — an empty `value`, or
 * a structured spec too short to serialize into valid CSS.
 */
const normalizeBackground = (background: SlideBackground): SlideBackground => {
  if (background.type === "animated" && !getAnimatedPreset(background.presetId)) {
    return DEFAULT_SLIDE_TEMPLATE.background
  }
  if (background.type === "gradient") {
    const hasValue = typeof background.value === "string" && background.value.trim() !== ""
    const hasUsableSpec = !background.spec || background.spec.stops.length >= 2
    if (!hasValue || !hasUsableSpec) return DEFAULT_SLIDE_TEMPLATE.background
  }
  return background
}

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
    underlineColor:
      typeof value.underlineColor === "string"
        ? value.underlineColor
        : (value.fontColor ?? DEFAULT_SLIDE_TEMPLATE.underlineColor),
    textAnimation: typeof value.textAnimation === "boolean" ? value.textAnimation : DEFAULT_SLIDE_TEMPLATE.textAnimation,
  }
}
