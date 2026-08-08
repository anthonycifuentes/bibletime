export { SlidePreview } from "@/modules/presentation/components/slide-preview"
export type { SlidePreviewProps } from "@/modules/presentation/components/slide-preview"
export { SlideFrame } from "@/modules/presentation/components/slide-frame"
export { useElementWidthScale } from "@/modules/presentation/hooks/use-slide-fit"
export { TemplateEditor } from "@/modules/presentation/components/template-editor"
export { GradientEditor } from "@/modules/presentation/components/gradient-editor"
export {
  ANIMATED_BACKGROUND_REGISTRY,
  DEFAULT_GRADIENT_SPEC,
  DEFAULT_SLIDE_TEMPLATE,
  FONT_REGISTRY,
  GRADIENT_PRESETS,
  PRESET_BACKGROUNDS,
  applyGradientSpec,
  clampStopPosition,
  getAnimatedPreset,
  getDefaultAnimatedParams,
  interpolateStops,
  normalizeSlideTemplate,
  parseCssGradient,
  toCssGradient,
  wrapAngle,
} from "@/modules/presentation/services"
export type { AnimatedBackgroundPreset, AnimatedBackgroundControl } from "@/modules/presentation/services"
export type {
  GradientKind,
  GradientSpec,
  GradientStop,
  RgbaColor,
  SlideBackground,
  SlideTemplate,
  SlideTextAlign,
} from "@/modules/presentation/interfaces"
