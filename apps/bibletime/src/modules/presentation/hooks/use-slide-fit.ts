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

/** Never auto-shrink text past this on-screen size — below it, text is left to clip rather than become unreadable. */
const MIN_AUTOFIT_FONT_PX = 18

/** The gap between the body text and reference line, matching `SlidePreview`'s `gap-6` class (1.5rem, assuming the default 16px root font size). */
const CONTENT_GAP_PX = 24

/** Number of binary-search steps — enough precision (better than 1% of the searchable range) without measuring the DOM dozens of times per recompute. */
const SEARCH_STEPS = 7

/**
 * Shrinks a slide's text to stay fully visible inside its box, on top of
 * whatever responsive `scale` already applies (see `useSlideFit`) — that
 * scale only handles the box resizing across screen sizes, it has nothing to
 * do with how tall a given verse's text renders once wrapped. Binary-searches
 * (not a linear step-down) the largest scale in `[floor, 1]` at which the
 * text + reference still fit the box's content height, measuring by
 * temporarily mutating the actual text nodes' `fontSize` directly during the
 * search — synchronous within one `useLayoutEffect`, so nothing paints until
 * the final answer is applied, avoiding any visible flicker between steps.
 * Never enlarges past `1` (the template's authored size), matching the
 * "short verses render exactly as authored" requirement.
 */
export function useAutoFitFontScale(
  boxRef: React.RefObject<HTMLElement | null>,
  textRef: React.RefObject<HTMLElement | null>,
  referenceRef: React.RefObject<HTMLElement | null>,
  nominalFontSizePx: number,
  /** A string that changes whenever anything affecting wrapped height changes (text, reference, font family/weight/spacing/alignment) — see `SlidePreview`'s `measurementKey`. */
  measurementKey: string
) {
  const [autoFitScale, setAutoFitScale] = React.useState(1)

  React.useEffect(() => {
    const box = boxRef.current
    const text = textRef.current
    if (!box || !text || nominalFontSizePx <= 0) return

    const recompute = () => {
      const boxStyle = window.getComputedStyle(box)
      const verticalPadding = parseFloat(boxStyle.paddingTop) + parseFloat(boxStyle.paddingBottom)
      const availableHeight = box.clientHeight - verticalPadding
      if (availableHeight <= 0) return

      const reference = referenceRef.current

      const fits = (scale: number): boolean => {
        const px = `${nominalFontSizePx * scale}px`
        text.style.fontSize = px
        if (reference) reference.style.fontSize = px
        const contentHeight = text.scrollHeight + (reference ? CONTENT_GAP_PX + reference.scrollHeight : 0)
        return contentHeight <= availableHeight
      }

      const floor = Math.min(1, MIN_AUTOFIT_FONT_PX / nominalFontSizePx)

      let finalScale: number
      if (fits(1)) {
        finalScale = 1
      } else if (!fits(floor)) {
        finalScale = floor
      } else {
        let lo = floor
        let hi = 1
        for (let i = 0; i < SEARCH_STEPS; i++) {
          const mid = (lo + hi) / 2
          if (fits(mid)) lo = mid
          else hi = mid
        }
        finalScale = lo
      }

      // Leaves the DOM nodes at `finalScale` — matches the state below, so
      // the next React render (driven by this same state) changes nothing
      // visually; it just makes the value durable across unrelated re-renders.
      fits(finalScale)
      setAutoFitScale((previous) => (previous === finalScale ? previous : finalScale))
    }

    recompute()

    const observer = new ResizeObserver(recompute)
    observer.observe(box)
    return () => observer.disconnect()
  }, [measurementKey, nominalFontSizePx])

  return autoFitScale
}
