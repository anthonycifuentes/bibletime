## Context

`SlideBackground` (`modules/presentation/interfaces/index.ts`) is a five-member union, and its `gradient` member is `{ type: "gradient"; value: string }` — an opaque CSS string. `SlidePreview.backgroundStyle` maps it to `{ backgroundImage: value }` and that is the whole rendering path. The only gradients that exist are six literals: four in `PRESET_BACKGROUNDS` (`services/slide-template.ts`, simple `linear-gradient(160deg, #hex, #hex)` forms) and two in `bundled-templates.ts` (hand-written 15-stop `oklch()` radial gradients). `TemplateEditor` exposes solid color, image upload, video upload, and animated presets — nothing that authors a gradient.

Templates persist as JSON through two storage drivers (`web-template-storage`, `desktop-template-storage`) and an export file (`template-file.ts`, `schemaVersion: 1`), all of which just serialize the `SlideTemplate` object wholesale. `normalizeSlideTemplate` is the single choke point that repairs templates read from any of those sources. The editor page holds a draft and diffs it with `JSON.stringify` to drive the unsaved-changes guard.

`packages/ui` has no color picker; the app uses the native `<input type="color">` in three places, which offers no alpha and no consistent cross-platform UI. The workspace has no test runner — `apps/bibletime`'s scripts are `lint`, `format`, `typecheck`, so verification is typecheck plus manual exercise.

## Goals / Non-Goals

**Goals:**

- Let a user author a multi-stop gradient (linear or radial, with angle, alpha, and arbitrary stops) from inside the template editor, with the slide preview updating live.
- Keep the render path untouched: everything that draws a gradient today keeps reading `background.value`.
- Preserve every existing saved and bundled gradient, including ones no parser can round-trip.
- Ship a reusable color picker into `packages/ui` with no new dependency.

**Non-Goals:**

- Retrofitting the existing solid-color, font-color, and underline-color inputs onto the new picker. That is a follow-up; this change only proves the component out in one place.
- Retrofitting `template-editor.tsx`'s existing hardcoded Spanish strings to `t()`. New strings use `t()`; the pre-existing ones stay as they are so the diff stays reviewable.
- Conic gradients, per-stop midpoints/easing, radial shape/size/position controls beyond the fixed `circle at 50% 50%`, or gradient overlays composited on top of an image or video background.
- A gradient parser general enough to read the bundled `oklch()` gradients back into editable stops.
- Bumping `schemaVersion` or migrating stored data.

## Decisions

### Extend the gradient variant rather than replace it

`gradient` becomes `{ type: "gradient"; value: string; spec?: GradientSpec }` — `value` stays required and authoritative for rendering, `spec` is the editable source that `value` was serialized from.

- *Alternative rejected — replace `value` with a fully structured shape and derive CSS at render time.* That is the cleaner model, but it breaks both bundled templates outright (their `oklch()` gradients have no representation in any stop model we would build), forces every consumer to import a serializer, and turns every stored gradient into a migration.
- *Alternative rejected — keep the string only and re-parse on every edit.* Round-tripping through CSS text loses precision, and any gradient the parser cannot read would become uneditable rather than merely unseeded.

Consequence: `value` and `spec` can drift if something writes one without the other. The generator is the only writer, and it always sets both through a single helper, so this is contained by construction rather than by validation.

### Serialize on every edit, parse only on open

`toCssGradient(spec)` runs on every generator mutation; `parseCssGradient(value)` runs once when the generator mounts against a gradient with no `spec`. Parsing is deliberately narrow — `linear-gradient(<angle>deg, <hex> [<pos>%], …)`, which is exactly the shape of `PRESET_BACKGROUNDS` — and returns `null` for anything else, in which case the generator seeds `DEFAULT_GRADIENT_SPEC`.

Critically, seeding does **not** write back to the template. The spec lives in generator-local state until the user's first actual edit, so merely opening a legacy template does not flip the `JSON.stringify` draft diff and light up the Save button. This is the single subtlest behavior in the change and the one most likely to regress.

### Colors as `{ r, g, b, a }`, alpha 0–100

Stop colors are stored as RGBA objects, not hex strings, matching the reference panel's R/G/B/A fields and avoiding repeated hex↔RGB conversion during a drag. Alpha is 0–100 (percent) rather than 0–1 so the numeric field shows `100` like the screenshot and JSON stays free of float noise. HSV exists only inside the picker's interaction layer — it is derived from RGB on render and converted straight back, never persisted, since HSV↔RGB is lossy at the extremes (a black color has no meaningful hue) and persisting it would let the square's thumb drift.

Serialization emits hex when every stop is opaque so the common case produces readable CSS strings identical in shape to the existing presets, and `rgb(r g b / a%)` only when alpha is actually in play.

### `ColorPicker` built in `packages/ui` from pointer events

A single `color-picker.tsx` exporting a controlled `ColorPicker` plus the color conversion helpers it needs. The square and both sliders share one `usePointerDrag` helper built on `setPointerCapture` — that is what makes "drag past the edge and keep tracking" work without global listeners or cleanup bugs, and it is the same mechanism the gradient stop track needs, so it is written once and used four times.

- *Alternative rejected — `react-colorful`.* Small and proven, but its styling is opinionated enough that theming it costs about as much as the square+sliders do to write, and it does not supply the hex/RGBA field cluster, which is where most of the fiddly input-state work actually lives.
- *Alternative rejected — building on Base UI's `Slider`.* Base UI's slider is a good horizontal track but does not model a 2D thumb, so the square would need bespoke code regardless; using it for two of three controls and not the third would make the drag behavior inconsistent between them.

Text fields keep a local draft string while focused and commit on blur/Enter, reverting to the canonical value if unparseable. Committing on every keystroke would fight the user mid-typing (`#2A` parses as a 3-digit hex and would yank the color), which is why the spec calls out partial typing explicitly.

### Generator lives in the presentation module, inline in the Fondo card

`components/gradient-editor.tsx` in `modules/presentation`, rendered inside the existing "Fondo" `Card` and gated on `template.background.type === "gradient"` — structurally the same conditional the animated-background controls already sit behind, so the rail reads consistently. It receives the current background and a change callback, and routes through `TemplateEditor`'s existing `setBackground`, which already releases video media before swapping a background.

The stop track reuses `usePointerDrag`. Clicking the track inserts a stop whose color is a linear RGBA interpolation of its neighbours, which is the behavior that makes a 3-stop gradient feel like it was "split" rather than "reset".

### Gradient presets are specs, not strings

`GRADIENT_PRESETS` in the new `services/gradient.ts` holds `GradientSpec` objects. `PRESET_BACKGROUNDS` — the six swatches at the top of the Fondo card — is left alone; those are whole-background presets including the two solid colors, and rewriting them into specs would change behavior (their `isActive` check compares `value` strings) for no user-visible gain. The four gradient entries there stay parseable by `parseCssGradient`, so picking one and then opening the generator still round-trips.

### Localization

New strings go under a `templates.gradient.*` prefix in `en`/`es`/`pt`, consuming `useTranslation` inside `gradient-editor.tsx`. `ColorPicker` lives in `packages/ui`, which has no i18n dependency, so its labels arrive as props from the app side with English defaults.

## Risks / Trade-offs

- **`value` and `spec` drift out of sync** → All writes go through one `applyGradientSpec(spec)` helper that serializes and returns the complete background object; nothing else constructs a gradient background.
- **Opening a legacy template silently marks it dirty** → The seeded spec is generator-local state; it is never pushed into the draft until a real edit occurs. Worth verifying by opening a bundled template and confirming Save stays disabled.
- **Continuous re-serialization during a drag causes preview churn** → Serialization is string concatenation over a handful of stops and the preview is a single element's `backgroundImage`; if profiling shows jank, the drag can commit on pointer-up with a local preview in between, but starting simple is the right call.
- **A hand-written color picker is a well-known source of edge-case bugs** (hue lost at zero saturation, thumb drift on the value=0 row, alpha rounding) → Keep RGBA canonical and derive HSV per render, but hold the in-progress hue in a ref during a square drag so it survives a pass through pure black or white.
- **Alpha in a background is easy to misread** — a translucent gradient composites against whatever the slide surface is, which in the output window is black, not the editor's card background → The generator's preview strip and the slide preview both paint over the real slide surface, so what the user sees matches what is projected.
- **The parser accepts more than it should and produces a wrong spec** → It returns `null` on anything outside the narrow hex form rather than guessing; a wrong-but-plausible parse is worse than falling back to defaults, since the fallback never overwrites the stored value.
- **`SlideBackground` is a union consumed in several modules; widening a member can surface exhaustiveness errors** → `spec` is optional, so no existing `switch` or destructure changes shape. `typecheck` across the workspace is the gate.

## Migration Plan

None required. `spec` is additive and optional, `schemaVersion` is unchanged, and both storage drivers pass the object through untouched. Files written after this change load in older builds as ordinary gradients with ignored extra fields. Rollback is reverting the code; gradients authored in the meantime keep rendering from their `value`, losing only their editability.

## Open Questions

- Should the generator offer an eyedropper where `EyeDropper` is available (Chromium, so Electron always and most browsers)? Cheap to add later behind a capability check; deliberately not in this change.
- Whether the follow-up that moves solid-color / font-color / underline-color onto `ColorPicker` should also give those an alpha channel, which would mean widening `fontColor` and `underlineColor` beyond hex strings. Out of scope here, but the picker is being built so it does not block that.
