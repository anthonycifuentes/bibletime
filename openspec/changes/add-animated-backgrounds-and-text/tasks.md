## 1. Dependencies & preset research

- [x] 1.1 Run `npm install gsap` (workspace: `apps/bibletime`).
- [x] 1.2 Pick 2-3 React Bits background presets suited to a subtle, minimalist text backdrop (avoid busy/high-contrast effects); for each, note its exact peer dependency (`ogl` and/or `three`) from React Bits' own install output. **Picked**: `Silk` (matches the user's reference image exactly — speed/scale/color/noiseIntensity/rotation; needs `three` + `@react-three/fiber`) and `DarkVeil` (all effects default to 0/off except a slow `speed`, extremely subtle out of the box; needs `ogl`). Confirmed against the real `DavidHDev/react-bits` GitHub source (reactbits.dev itself is a client-rendered SPA that couldn't be introspected).
- [x] 1.3 Add the resolved peer dependencies to `apps/bibletime/package.json`. Installed `gsap@3.15.0`, `three@0.185.1`, `@react-three/fiber@9.7.0` (peer-compatible with React 19.2), `ogl@1.0.11`, plus `@types/three` as a dev dependency (three ships no bundled types in this version).

## 2. Data model

- [x] 2.1 Add `{ type: "animated"; presetId: string; params: Record<string, number | string> }` to `SlideBackground` in `modules/presentation/interfaces`.
- [x] 2.2 Add `textAnimation: boolean` to `SlideTemplate` in `modules/presentation/interfaces`.
- [x] 2.3 Set `textAnimation: false` on `DEFAULT_SLIDE_TEMPLATE` (`modules/presentation/services/slide-template.ts`).

## 3. `Slider` UI primitive

- [x] 3.1 Add `packages/ui/src/components/slider.tsx`, wrapping `@base-ui/react`'s `Slider`/`SliderTrack`/`SliderThumb`, styled to match `input.tsx`'s border/ring treatment.
- [x] 3.2 Export it from `packages/ui`'s component exports the same way `select.tsx`/`input.tsx` are exported. (No barrel file exists — `packages/ui`'s `package.json` already wildcard-exports `./components/*`, so `@workspace/ui/components/slider` is importable immediately, same as every other component.)

## 4. Animated background preset registry

- [x] 4.1 Vendor each chosen React Bits background component's source under `modules/presentation/components/backgrounds/` (one file per preset). Added `silk-background.tsx` and `dark-veil-background.tsx`.
- [x] 4.2 Write `ANIMATED_BACKGROUND_REGISTRY: AnimatedBackgroundPreset[]` in `modules/presentation/services`, each entry declaring `id`, `label`, its rendering component, and an ordered `controls` list (key/label/type/min/max/step/default) matching that component's actual props. Silk exposes all 5 of its real props (speed/scale/color/noiseIntensity/rotation — matches the user's reference image); DarkVeil exposes 3 of its 7 (speed/hueShift/noiseIntensity), leaving scanline/warp/resolution at their subtle defaults.
- [x] 4.3 Add a lookup helper (`getAnimatedPreset(presetId)`) mirroring the existing `getFontStack` fallback pattern — returns `undefined` for an unknown id rather than throwing. Also added `getDefaultAnimatedParams(preset)` for initializing `params` when a preset is first selected.

## 5. Template editor UI — animated backgrounds

- [x] 5.1 Add an "Animado" option to the background section's preset picker in `TemplateEditor`, listing entries from `ANIMATED_BACKGROUND_REGISTRY`.
- [x] 5.2 When an animated preset is selected, render one `SettingRow` per control from that preset's `controls` list — a `Slider` for `"number"` controls, the existing color swatch+hex pairing for `"color"` controls — writing updates into `background.params`.
- [x] 5.3 Add the "Animar texto" toggle to the typography or a new section of `TemplateEditor`, wired to `template.textAnimation`. No other control (duration/easing) is exposed alongside it.

## 6. Rendering — animated backgrounds and text crossfade

- [x] 6.1 Update `SlidePreview`'s `backgroundStyle`/render branch to mount the selected preset's component (sized to fill the slide, same footprint as the existing `<video>` element) when `background.type === "animated"`, passing `background.params` as props.
- [x] 6.2 Add internal `displayedText`/`displayedReference` state to `SlidePreview`; when `template.textAnimation` is true and the incoming `text`/`reference` prop differs from what's currently displayed, run a GSAP timeline that fades the current content to opacity 0, swaps the internal state, then fades to opacity 1 — fixed short durations, opacity-only, no configurable params. (Fade-in ends at 1 for the main text and 0.8 for the reference line, matching its existing `opacity-80` resting style, so the tween doesn't permanently override it.)
- [x] 6.3 When `textAnimation` is false, or on first mount, skip the timeline and render the incoming `text`/`reference` immediately (current behavior, unchanged). (First mount naturally never triggers a "change" since `displayed` state is initialized directly from the initial `text`/`reference` props — no special-casing needed.)
- [x] 6.4 Confirm the crossfade does not replay when only style props (font, color, background, spacing) change with `text`/`reference` held constant. (The effect's dependency array is `[text, reference]` only — style props aren't watched.)

## 7. Backward compatibility

- [x] 7.1 Update `normalizeSlideTemplate` (`modules/presentation/services`) to default `textAnimation` to `false` when absent.
- [x] 7.2 Update `normalizeSlideTemplate` to fall back an `animated` background with an unrecognized `presetId` to the first `PRESET_BACKGROUNDS` entry.
- [x] 7.3 Confirm existing bundled templates and previously-saved custom templates (no `animated` background, no `textAnimation`) still load and render exactly as before. Verified with a script exercising `normalizeSlideTemplate` directly: a template missing `textAnimation` normalizes to `false`; a template with `background: {type: "animated", presetId: "removed-preset"}` falls back to the default gradient background; a valid animated background passes through unchanged.

## 8. Verification

- [x] `pnpm --filter web typecheck` and `pnpm --filter @workspace/ui typecheck` both pass with no errors.
- [x] `pnpm --filter web lint` and `pnpm --filter @workspace/ui lint` pass — the only remaining findings (`nav-main.tsx`, `button.tsx`, `input.tsx`, `pill.tsx`, `sidebar.tsx`, `utils.ts`) predate this change and weren't touched by it; every new file (`slider.tsx`, `silk-background.tsx`, `dark-veil-background.tsx`, `animated-background.ts`, and the edited `template-editor.tsx`/`slide-preview.tsx`/`normalize-slide-template.ts`) is clean.
- [x] Dev server smoke test: `/templates` and `/templates/bundled-0` both return 200 with no server errors, confirming the full import graph (including `three`, `@react-three/fiber`, `ogl`, `gsap`, the new registry, and both vendored background components) resolves and executes under SSR without throwing.
- [x] Registry/normalizer logic exercised directly via a script (not a browser): `ANIMATED_BACKGROUND_REGISTRY` contains `silk`/`dark-veil`; `getAnimatedPreset` returns the right preset or `undefined` for an unknown id; `getDefaultAnimatedParams` produces the expected keys/values; `normalizeSlideTemplate` correctly defaults `textAnimation` and falls back an unknown `presetId`, while a valid animated background passes through unchanged.
- [ ] 8.1 Manually verify: select each vendored animated preset, confirm it renders and its controls (sliders/color inputs) visibly change the effect in the live preview. **Not yet run** — this environment has no browser to click through the editor UI; the underlying registry/render logic was verified as above.
- [ ] 8.2 Manually verify: enable "Animar texto," change the previewed verse/reference, confirm text fades out then in, with no movement or scaling — only opacity changes. **Not yet run** — same limitation; the crossfade's trigger condition (`[text, reference]` dependency array) and fixed opacity-only tween values were verified by code inspection.
- [ ] 8.3 Manually verify: with "Animar texto" on, adjust a style control (font color, background) without changing the text — confirm no crossfade plays. **Not yet run** — same limitation.
- [ ] 8.4 Manually verify: open the template gallery (`template-manager.tsx`) with several templates using animated backgrounds — confirm no crash and acceptable performance with multiple instances rendering at once. **Not yet run** — same limitation.
- [ ] 8.5 Manually verify on `/present`: an animated background and text crossfade both render correctly on the live output surface, not just the editor preview. **Not yet run** — same limitation; `/present` also renders via the shared `SlidePreview`, which received the same code path as the editor preview.
