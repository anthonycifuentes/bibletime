## 1. Shared measurement hooks

- [x] 1.1 Create `apps/bibletime/src/modules/presentation/hooks/use-slide-fit.ts` exporting a shared `REFERENCE_WIDTH` constant (1920).
- [x] 1.2 Implement `useSlideFit(ratio: number)` in that file: a `ResizeObserver`-backed hook returning `{ containerRef, width, height, scale }`, where `width`/`height` are the largest box satisfying `ratio` that fits the observed container, and `scale = width / REFERENCE_WIDTH`. Returns `width: undefined, height: undefined, scale: 1` before the first observer callback fires.
- [x] 1.3 Implement `useElementWidthScale()` in the same file: a lighter `ResizeObserver`-backed hook returning `{ elementRef, scale }`, measuring the element's own `clientWidth` against `REFERENCE_WIDTH`. Returns `scale: 1` before the first measurement.
- [x] 1.4 Export both hooks from `apps/bibletime/src/modules/presentation/index.ts` only if a call site outside the module needs them directly; otherwise keep them internal to the module (`slide-frame.tsx` and `slide-card.tsx` import from the hook file directly).

## 2. Fix `SlideFrame`'s aspect-ratio fit

- [x] 2.1 In `slide-frame.tsx`, replace the `w-full h-full` + `style={{ aspectRatio: ratio }}` approach with `useSlideFit(ratio)`: attach `containerRef` to the outer centering `div`, and apply the returned `width`/`height` (px, when defined) as inline styles on the inner `SlidePreview` instead of the `max-h-full max-w-full` sizing classes tied to `aspect-ratio`.
- [x] 2.2 Pass the hook's computed `scale` as `SlidePreview`'s `scale` prop, but only when the caller didn't already pass an explicit `scale` (`props.scale ?? computedScale`).
- [x] 2.3 Confirm the outer container still centers the fitted box (`items-center justify-center` retained) so letterbox/pillarbox bars are visually centered.

## 3. Confirm `SlidePreview`'s scale plumbing

- [x] 3.1 Verify `SlidePreview`'s existing `scale` prop (already multiplies `template.fontSize`) needs no changes — `SlideFrame` now supplies a real value instead of call sites omitting it — and double check `lineHeight`/`letterSpacing` (already unit-relative: `em`/unitless) don't need separate scaling.

## 4. Update fixed-width thumbnail call site

- [x] 4.1 In `apps/bibletime/src/modules/library/components/slide-card.tsx`, replace the hardcoded `scale={0.32}` with `useElementWidthScale()`'s computed scale, attaching its `elementRef` to the thumbnail's sizing wrapper (or directly to the `SlidePreview` root if it accepts a ref — otherwise wrap in a small `div`).
- [x] 4.2 In `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx`, remove the explicit `scale={0.32}` passed to `SlideFrame` so it falls through to the auto-computed value.
- [x] 4.3 Leave `apps/bibletime/src/routes/templates/$templateId.tsx`'s two `SlidePreview` usages unchanged (full-size editing preview, explicitly out of scope per design.md).

## 5. Verify

- [x] 5.1 Run `pnpm --filter bibletime typecheck` and `pnpm --filter bibletime lint`.
- [ ] 5.2 Manually verify in the running app: console main preview panel shows correct letterboxed 16:9 (and other configured ratios) with proportionally-sized text; resizing the window or switching aspect ratio in Settings updates both the box shape and text size live; `/present` output window letterboxes correctly against black; `slide-card` thumbnails and the Bible picker's preview column show proportionally-scaled text without the old guessed constants.
