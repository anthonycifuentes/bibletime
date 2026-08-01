import * as React from "react"

/** The output resolution `SlideTemplate.fontSize` (and friends) are effectively authored against — a standard 16:9 HD canvas. Every preview scale is relative to this. */
export const REFERENCE_WIDTH = 1920

function computeFit(boxWidth: number, boxHeight: number, ratio: number): { width: number; height: number } {
  if (boxWidth <= 0 || boxHeight <= 0) return { width: 0, height: 0 }
  return boxWidth / boxHeight > ratio
    ? { width: boxHeight * ratio, height: boxHeight }
    : { width: boxWidth, height: boxWidth / ratio }
}

/**
 * Fits a box to `ratio` inside whatever size a container actually renders
 * at, measured live via `ResizeObserver` — not CSS `aspect-ratio`, which is
 * ignored once both width and height are already definite (the case for any
 * box that must flex in both dimensions, like a preview panel or the output
 * window). Also derives a `scale` (fitted width / `REFERENCE_WIDTH`) so a
 * template's font size can shrink/grow in proportion to the fitted box.
 *
 * `width`/`height` are `undefined` until the first `ResizeObserver`
 * callback fires — callers should fall back to filling the container
 * unscaled for that one frame.
 */
export function useSlideFit(ratio: number) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [fit, setFit] = React.useState<{ width: number; height: number } | undefined>(undefined)

  React.useEffect(() => {
    const node = containerRef.current
    if (!node) return

    // Recreated (not just re-measured) whenever `ratio` changes, so the
    // observer's callback always closes over the current ratio — cheap,
    // since the ratio only changes on an explicit Settings action.
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setFit(computeFit(width, height, ratio))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ratio])

  return {
    containerRef,
    width: fit?.width,
    height: fit?.height,
    scale: fit && fit.width > 0 ? fit.width / REFERENCE_WIDTH : 1,
  }
}

/**
 * Measures an element's own rendered width (via `ResizeObserver`) and
 * derives a `scale` against `REFERENCE_WIDTH` — for call sites whose height
 * is already correctly derived (e.g. a fixed-width thumbnail using CSS
 * `aspect-ratio`, which works fine when only one axis is constrained) but
 * whose font size was previously a hand-picked constant unrelated to the
 * element's real size.
 */
export function useElementWidthScale() {
  const elementRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const node = elementRef.current
    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect
      if (width > 0) setScale(width / REFERENCE_WIDTH)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { elementRef, scale }
}
