import { useAspectRatio } from "@/modules/core/aspect-ratio"
import { SlidePreview } from "@/modules/presentation/components/slide-preview"
import type { SlidePreviewProps } from "@/modules/presentation/components/slide-preview"
import { useSlideFit } from "@/modules/presentation/hooks/use-slide-fit"
import { cn } from "@workspace/ui/lib/utils"

interface SlideFrameProps extends SlidePreviewProps {
  /** Classes for the outer box the frame fills — sizing/positioning only, decoration belongs on `className`. */
  frameClassName?: string
}

/**
 * Fits a `SlidePreview` to the console's configured aspect ratio inside a
 * box that can flex in both dimensions — letterboxing/pillarboxing instead
 * of stretching. Used for the console's live preview pane and the projected
 * output window; call sites where the preview's width is already fixed
 * (list thumbnails, editor cards) size their height off the ratio directly
 * instead and don't need this wrapper.
 *
 * Sizes via a measured `useSlideFit` fit, not CSS `aspect-ratio` — the
 * outer box flexes in both dimensions, so both width and height would be
 * definite and `aspect-ratio` would have no effect (it only resolves size
 * when at least one axis is left auto).
 */
export function SlideFrame({ frameClassName, className, scale, ...props }: SlideFrameProps) {
  const { ratio } = useAspectRatio()
  const { containerRef, width, height, scale: fitScale } = useSlideFit(ratio)

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-0 min-w-0 items-center justify-center overflow-hidden", frameClassName)}
    >
      <SlidePreview
        {...props}
        scale={scale ?? fitScale}
        className={cn(width === undefined && "h-full w-full", className)}
        style={width !== undefined && height !== undefined ? { width, height } : undefined}
      />
    </div>
  )
}
