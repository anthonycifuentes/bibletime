export { SlidePreview } from "@/modules/presentation/components/slide-preview"
export type { SlidePreviewProps } from "@/modules/presentation/components/slide-preview"
export { SlideFrame } from "@/modules/presentation/components/slide-frame"
export { useElementWidthScale } from "@/modules/presentation/hooks/use-slide-fit"
export { TemplateEditor } from "@/modules/presentation/components/template-editor"
export {
  ANIMATED_BACKGROUND_REGISTRY,
  DEFAULT_SLIDE_TEMPLATE,
  FONT_REGISTRY,
  PRESET_BACKGROUNDS,
  getAnimatedPreset,
  getDefaultAnimatedParams,
  normalizeSlideTemplate,
} from "@/modules/presentation/services"
export type { AnimatedBackgroundPreset, AnimatedBackgroundControl } from "@/modules/presentation/services"
export type {
  SlideBackground,
  SlideTemplate,
  SlideTextAlign,
} from "@/modules/presentation/interfaces"
