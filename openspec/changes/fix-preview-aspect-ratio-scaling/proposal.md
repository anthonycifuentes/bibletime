## Why

The console's main preview panel doesn't actually render at the aspect ratio configured in Settings — it stretches to fill whatever shape its panel happens to be, and the slide's font size stays fixed regardless of how large or small that panel renders. The root cause is a CSS conflict in `SlideFrame`: it sets both `width: 100%` and `height: 100%` on the previewed slide *and* a CSS `aspect-ratio`, but `aspect-ratio` only has an effect when at least one of width/height is left to be derived — with both pinned to 100%, the browser ignores the ratio entirely. Font size compounds the problem: it's a fixed pixel value from the template (authored for real output resolution) with no relationship to the shrunken preview box, so text looks arbitrarily oversized or undersized instead of a scaled-down match of what the output window actually shows.

## What Changes

- Fix `SlideFrame` to measure its actual box (via `ResizeObserver`) and compute the largest width/height that both fit inside it and satisfy the configured aspect ratio, then apply that as explicit pixel dimensions — replacing the CSS `aspect-ratio` + `100%`/`100%` approach that silently no-ops.
- Add automatic font-size scaling to `SlidePreview`: derive a `scale` from the ratio of the rendered preview width to a fixed reference width the template's `fontSize`/`lineHeight`/`letterSpacing` are authored against, so text shrinks and grows in proportion to the preview box instead of staying pinned at the template's literal pixel value.
- `SlidePreview`'s existing `scale` prop remains as an explicit override; call sites that don't pass it get the computed value instead of unscaled full-size text.
- Remove the guessed constant `scale` props (`0.32`, `0.26`) from `slide-card.tsx` and `bible-picker-panel.tsx` now that the computed value replaces them.

## Capabilities

### New Capabilities
- `slide-preview-rendering`: how a `SlidePreview`/`SlideFrame` fits the configured aspect ratio inside its container and scales slide typography to match, so any preview instance is a faithful, correctly-proportioned miniature of the real output.

### Modified Capabilities
(none — no existing archived specs cover this behavior yet)

## Impact

- `apps/bibletime/src/modules/presentation/components/slide-frame.tsx` — replace the CSS-only fit with a measured, computed-dimension fit.
- `apps/bibletime/src/modules/presentation/components/slide-preview.tsx` — accept/derive a scale factor and apply it to font-related styles.
- `apps/bibletime/src/modules/library/components/slide-card.tsx`, `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx` — drop the now-redundant hardcoded `scale` values.
- No API/data changes; purely a rendering fix for every existing `SlidePreview`/`SlideFrame` consumer (console preview panel, output window, thumbnails, template editor).
