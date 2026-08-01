import { getAnimatedPreset } from "@/modules/presentation/services/animated-background"
import { DEFAULT_SLIDE_TEMPLATE, isKnownFontId } from "@/modules/presentation/services/slide-template"
import type { SlideBackground, SlideTemplate } from "@/modules/presentation/interfaces"

/** Falls back an `animated` background whose `presetId` isn't registered (a preset removed since this was saved) to the default background. */
const normalizeBackground = (background: SlideBackground): SlideBackground => {
  if (background.type === "animated" && !getAnimatedPreset(background.presetId)) {
    return DEFAULT_SLIDE_TEMPLATE.background
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
