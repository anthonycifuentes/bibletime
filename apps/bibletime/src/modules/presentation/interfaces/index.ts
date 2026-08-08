import type { RgbaColor } from "@workspace/ui/lib/color"

export type { RgbaColor }

export type GradientKind = "linear" | "radial"

export interface GradientStop {
  color: RgbaColor
  /** Percentage along the gradient, 0–100. */
  position: number
}

/**
 * The editable form of a gradient background. Only the generator writes it;
 * rendering always goes through the serialized `value` beside it, so a
 * gradient stays renderable even when nothing can produce a spec for it.
 */
export interface GradientSpec {
  kind: GradientKind
  /** Degrees, 0–359. Ignored by `radial`, but kept so switching kinds is lossless. */
  angle: number
  stops: GradientStop[]
}

export type SlideBackground =
  | { type: "color"; value: string }
  /**
   * `value` is the rendered CSS and the only thing consumers read. `spec` is
   * the structured source it was serialized from — absent on gradients saved
   * before the generator existed, and on the bundled `oklch()` ones, which
   * keep rendering from `value` alone.
   */
  | { type: "gradient"; value: string; spec?: GradientSpec }
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
