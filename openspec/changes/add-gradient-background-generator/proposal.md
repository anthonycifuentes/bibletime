## Why

`SlideBackground` already has a `gradient` variant, but nothing in the app can author one: the template editor's "Fondo" card offers six hardcoded `PRESET_BACKGROUNDS` swatches, a single solid-color input, image/video upload, and animated presets — so the only gradients a user can ever apply are the four literal CSS strings baked into `slide-template.ts` and the two in `bundled-templates.ts`. Anyone who wants a background gradient in their own colors has no path at all, which is a conspicuous gap next to the fully parameterized animated backgrounds sitting right below it in the same card. A gradient generator — multi-stop track, linear/radial, angle, and a real color picker — closes that gap and makes the most common "make it look like our church's colors" request self-serve.

## What Changes

- Extend the `gradient` variant of `SlideBackground` from an opaque CSS string into a structured, editable spec: gradient kind (`linear` | `radial`), angle, and an ordered list of stops (color + position). The serialized CSS string is kept alongside it as the render input, so `SlidePreview` and every other consumer keep reading `background.value` exactly as they do today.
- Add a gradient generator to the template editor's "Fondo" card, expanding inline when the current background is a gradient (the same in-place pattern the animated-background param controls already use):
  - A live gradient preview strip above a draggable multi-stop track — drag to reposition, click the track to insert a stop, remove a stop from its row.
  - Linear/radial segmented toggle plus an angle dial and numeric angle field (linear only).
  - A row of preset gradient swatches that seed the generator with a starting point instead of replacing it wholesale.
  - A stops list, one row per stop: swatch, hex field, position field, and a remove action.
- Add a reusable `ColorPicker` primitive to `packages/ui`: saturation/value square, hue slider, alpha slider, and HEX + R/G/B/A numeric fields, built from pointer events and the existing `Input`/`Button` primitives — no new third-party dependency. The gradient generator drives it for the selected stop; the existing solid-color, font-color, and underline-color inputs are left on the native `<input type="color">` in this change.
- Gradient stops carry an alpha channel, so a stop can fade toward transparent; the serialized CSS uses `rgb(... / a)` when any stop is translucent and plain hex when none are.
- Normalize legacy gradients: templates saved before this change (and the bundled ones, whose values are hand-written `oklch()` radial gradients) have no structured spec. They keep rendering from their stored string; the generator best-effort parses the simple `linear-gradient(<angle>, <hex>, …)` form used by `PRESET_BACKGROUNDS` so those round-trip, and falls back to seeding a default two-stop spec for anything it can't parse — never silently rewriting the stored value until the user edits it.
- Add the generator's user-facing strings to the `en`/`es`/`pt` dictionaries. **Note:** `template-editor.tsx` is currently hardcoded Spanish while its host route uses `t()`; this change adds new strings via `t()` and does not retrofit the existing ones.

## Capabilities

### New Capabilities
- `slide-gradient-background`: The gradient background data model and its rendering contract — the structured `{ kind, angle, stops }` spec, its deterministic serialization to a CSS gradient string, alpha handling, and how legacy string-only gradients are normalized and parsed so old templates keep loading.
- `gradient-background-authoring`: The gradient generator UI in the template editor — the stop track (add/move/remove), linear/radial toggle, angle dial, preset swatches, per-stop hex/position rows, and how edits flow into the live `SlidePreview`.
- `color-picker-control`: The reusable color picker in `packages/ui` — SV square, hue and alpha sliders, HEX and R/G/B/A fields, their two-way synchronization, and invalid-input handling.

### Modified Capabilities
_None — `openspec/specs/` holds no published specs yet, so all three capabilities above are new._

## Impact

- `apps/bibletime/src/modules/presentation/interfaces/index.ts` — widen the `gradient` member of `SlideBackground` with the optional structured spec (`kind`, `angle`, `stops`); `value` stays required, so existing consumers and stored data remain type-valid (non-breaking).
- `apps/bibletime/src/modules/presentation/services/` — new `gradient.ts` holding the spec types, CSS serializer, best-effort parser, default spec, and generator presets; exported through `services/index.ts` and the module barrel `modules/presentation/index.ts`.
- `apps/bibletime/src/modules/presentation/services/normalize-slide-template.ts` — extend `normalizeBackground` so a gradient with a malformed/empty stop list falls back cleanly rather than serializing to an invalid CSS value.
- `apps/bibletime/src/modules/presentation/components/template-editor.tsx` — new inline gradient section in the "Fondo" card, wired through the existing `setBackground` (which already releases video media before replacing a background).
- `apps/bibletime/src/modules/presentation/components/gradient-editor.tsx` — new component for the generator; exported from the presentation barrel per module convention.
- `packages/ui/src/components/color-picker.tsx` — new primitive, imported as `@workspace/ui/components/color-picker` (per-file import pattern, no barrel).
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — new `templates.gradient.*` keys.
- `apps/bibletime/src/modules/presentation/components/slide-preview.tsx` — unchanged; `backgroundStyle`'s `case "gradient"` keeps reading `background.value`.
- Storage/export paths (`modules/templates/services/template-file.ts`, both storage drivers) — unchanged; the structured spec is plain JSON and rides along inside the existing `SlideTemplate` payload. Files written after this change are read by older builds as ordinary gradients (the extra fields are ignored), so exports stay backward compatible.
- No new runtime dependencies.
