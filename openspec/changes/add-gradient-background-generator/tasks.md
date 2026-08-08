## 1. Color model and gradient service

- [x] 1.1 Add `apps/bibletime/src/modules/presentation/services/gradient.ts` with the `RgbaColor` (`r`/`g`/`b` 0–255, `a` 0–100), `GradientStop` (`color` + `position` 0–100), `GradientKind` (`linear` | `radial`), and `GradientSpec` (`kind`, `angle`, `stops`) types.
- [x] 1.2 Add color conversion helpers to `gradient.ts`: `rgbaToHex` / `hexToRgba` (accepting 3-, 6-, and 8-digit hex with optional `#`, returning `null` on anything invalid) and `rgbaToCss`.
- [x] 1.3 Implement `toCssGradient(spec)` — stops sorted ascending by position without mutating the input, `linear-gradient(<angle>deg, …)` vs `radial-gradient(circle at 50% 50%, …)`, hex per stop when every stop is opaque and `rgb(r g b / a%)` for any stop with alpha below 100.
- [x] 1.4 Implement `parseCssGradient(value)` — narrow support for `linear-gradient(<angle>deg, <hex> [<pos>%], …)`, distributing positions evenly when absent, returning `null` for anything else (including the bundled `oklch()` gradients).
- [x] 1.5 Add `DEFAULT_GRADIENT_SPEC`, `interpolateStops(before, after, position)` for track insertion, and `GRADIENT_PRESETS` (six `GradientSpec` entries matching the reference row: teal→green→yellow, deep navy, teal→amber, magenta radial, red→blue, soft blue radial).
- [x] 1.6 Add `applyGradientSpec(spec)` returning the complete `{ type: "gradient", value, spec }` background — the single writer for gradient backgrounds.
- [x] 1.7 Re-export `gradient.ts` from `services/index.ts` and the public members from `modules/presentation/index.ts`.
- [x] 1.8 Verify by hand: `toCssGradient` on the three-stop teal/green/yellow spec at 90° produces `linear-gradient(90deg, #2A7B9B 0%, #57C785 50%, #EDDD53 100%)`, and `parseCssGradient("linear-gradient(160deg, #1b2735, #0a0e14)")` round-trips to a 2-stop 160° spec.

## 2. Background model and normalization

- [x] 2.1 Widen the `gradient` member of `SlideBackground` in `modules/presentation/interfaces/index.ts` to `{ type: "gradient"; value: string; spec?: GradientSpec }`, keeping `value` required.
- [x] 2.2 Extend `normalizeBackground` in `normalize-slide-template.ts` so a gradient with an empty/missing `value`, or a `spec` present with fewer than two stops, falls back to `DEFAULT_SLIDE_TEMPLATE.background`.
- [x] 2.3 Run `pnpm --filter web typecheck` and fix any exhaustiveness or destructuring fallout across the modules that consume `SlideBackground`.

## 3. ColorPicker primitive

- [ ] 3.1 Add a `usePointerDrag` helper (in `packages/ui/src/hooks/`) using `setPointerCapture`, reporting normalized 0–1 coordinates within the target element and clamping when the pointer leaves its bounds.
- [ ] 3.2 Create `packages/ui/src/components/color-picker.tsx` with the controlled `ColorPicker` (value + `onChange`, no committed internal state) and internal RGB↔HSV conversion derived per render.
- [ ] 3.3 Build the saturation/value square: hue-tinted background, draggable thumb, press-to-jump, drag-past-edge clamping via `usePointerDrag`, and a ref-held in-progress hue so it survives passing through pure black/white.
- [ ] 3.4 Build the hue slider (0–360) and alpha slider (0–100) — alpha over a checkerboard with its track tinted by the current color; both keyboard-adjustable with arrow keys and exposing their value to assistive technology.
- [ ] 3.5 Build the HEX field and the R/G/B/A numeric fields on the app's `Input`, holding a local draft while focused and committing on blur/Enter — reverting on unparseable hex, clamping R/G/B to 0–255 and A to 0–100, and never committing mid-typing partials.
- [ ] 3.6 Give every sub-control an accessible name via label props with English defaults, since `packages/ui` has no i18n.
- [ ] 3.7 Verify by hand: hex `#2A7B9B` fills R/G/B as 42/123/155; an 8-digit hex sets alpha; typing `300` in R clamps to 255; dragging out of the square keeps tracking; hue survives a drag through the black row.

## 4. Gradient generator UI

- [ ] 4.1 Create `apps/bibletime/src/modules/presentation/components/gradient-editor.tsx` taking the current gradient background plus an `onChange`, seeding local spec state from `background.spec` → `parseCssGradient(background.value)` → `DEFAULT_GRADIENT_SPEC`, and never emitting until a real edit occurs.
- [ ] 4.2 Render the live gradient preview strip painted with `toCssGradient` of the current spec.
- [ ] 4.3 Build the stop track: one handle per stop positioned by percentage, drag-to-reposition via `usePointerDrag` clamped to 0–100, click-empty-track to insert an interpolated stop that becomes selected, click-handle to select, and arrow-key nudge by one percentage point on the focused handle.
- [ ] 4.4 Add the linear/radial segmented toggle (stops and angle preserved across switches) and, for linear only, the angle dial plus numeric field bound to the same degrees value, wrapping typed input into 0–359.
- [ ] 4.5 Add the `GRADIENT_PRESETS` swatch row — applying one replaces kind, angle, and stops, and stays fully editable afterwards.
- [ ] 4.6 Wire `ColorPicker` to the selected stop's color.
- [ ] 4.7 Build the stop rows list ordered by position: swatch, hex field (commit only valid colors), position field, and remove action — selected row visually distinguished, remove disabled when only two stops remain, and selection moving to an adjacent stop when the selected one is removed.
- [ ] 4.8 Route every mutation through `applyGradientSpec` into `onChange` so `value` and `spec` are always written together.

## 5. Template editor integration

- [ ] 5.1 Add a "Gradiente" row to the Fondo card in `template-editor.tsx` that switches the background to a gradient through the existing `setBackground` (so video media is released), plus a remove action back to `PRESET_BACKGROUNDS[0]` matching the image/video/animated rows.
- [ ] 5.2 Render `GradientEditor` inline below that row, gated on `template.background.type === "gradient"`, mirroring how the animated-background param controls are gated.
- [ ] 5.3 Export `GradientEditor` from `modules/presentation/index.ts` per module convention.
- [ ] 5.4 Confirm `SlidePreview` needs no change — its `case "gradient"` still reads `background.value`.

## 6. Localization

- [ ] 6.1 Add `templates.gradient.*` keys to `apps/bibletime/src/modules/core/i18n/dictionaries/en.ts` (section title, linear, radial, angle, add/remove stop, stop color, stop position, preset row label, and accessible names for the track handles and dial).
- [ ] 6.2 Mirror the same keys in `es.ts` and `pt.ts`.
- [ ] 6.3 Consume them via `useTranslation` in `gradient-editor.tsx`, and pass the `ColorPicker` label props from there.

## 7. Verification

- [ ] 7.1 Run `pnpm --filter web typecheck`, `pnpm --filter @workspace/ui typecheck`, and `pnpm --filter web lint` clean.
- [ ] 7.2 Author a three-stop linear gradient end to end: drag stops, insert a stop by clicking the track, change the angle, remove a stop, save, reload the page, and confirm the gradient and its editable spec both come back.
- [ ] 7.3 Set a stop's alpha below 100 and confirm the serialized value uses `rgb(… / …%)` and the slide preview composites over the real slide surface.
- [ ] 7.4 Open a bundled template (the `oklch()` radial gradient), confirm it renders unchanged, the generator seeds defaults, and Save stays disabled until an actual edit is made.
- [ ] 7.5 Apply the "Medianoche" preset swatch, open the generator, and confirm it round-trips into a 2-stop 160° spec rather than falling back to defaults.
- [ ] 7.6 Export a template with a generated gradient and re-import it; confirm `schemaVersion` is unchanged and the gradient loads with its spec intact.
- [ ] 7.7 Exercise the generator on the desktop build and at a narrow window width where the editor falls back to its stacked layout.
