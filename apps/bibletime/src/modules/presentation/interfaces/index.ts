export type SlideBackground =
  | { type: "color"; value: string }
  | { type: "gradient"; value: string }
  | { type: "image"; value: string }
  | { type: "video"; value: string }
  | { type: "animated"; presetId: string; params: Record<string, number | string | boolean> }

export type SlideTextAlign = "left" | "center" | "right"

/**
 * Everything that controls how a slide (a Bible verse today; songs/ads once
 * those modules exist) is rendered on the output/preview surface.
 */
export interface SlideTemplate {
  background: SlideBackground
  /** A `FONT_REGISTRY` id (see `modules/presentation/services`), not a closed union — new fonts don't require a type change. */
  fontFamily: string
  fontColor: string
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  /** Color of the underline decoration, independent of `fontColor`. */
  underlineColor: string
  textAlign: SlideTextAlign
  lineHeight: number
  letterSpacing: number
  /** Fades text out/in via GSAP whenever the displayed text or reference changes. Fixed, subtle motion — not further configurable. */
  textAnimation: boolean
}
