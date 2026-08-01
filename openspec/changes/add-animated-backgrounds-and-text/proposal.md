## Why

The template editor (`/templates/$templateId`) currently backs `SlideBackground` with solid color, gradient, image, and video — every one of them static or a fixed clip, with no motion that responds to the slide itself. The user wants a fifth background option, an animated one sourced from React Bits, plus a subtle fade-in/fade-out entrance for the slide text, so a service's projected slides can feel alive without ever feeling flashy — everything stays minimalist by constraint, not just by choice.

## What Changes

- Add `gsap` as a project dependency — it drives the text entrance/exit animation described below.
- Add an **animated background** option to `SlideBackground` (`{ type: "animated"; presetId; params }`), rendered by a small vendored set of React Bits background components (copied in via React Bits' own install method, not a single npm package). Only presets actually vendored in this change are selectable — no placeholder entries for components not yet added.
- Each vendored preset exposes its own small set of numeric/color controls (e.g. speed, scale, color, noise, rotation — whatever that specific effect supports), rendered generically in the editor from a per-preset control schema rather than one hardcoded form.
- Add a single **"animate text" toggle** to `SlideTemplate` that fades the slide text in and out (via GSAP) whenever the displayed text content changes — no separate duration/easing controls exposed; the motion is tuned once, fixed, and deliberately subtle so it can't be cranked into something distracting.
- Extend the template editor's background section with the inputs needed for the new preset (dropdown to pick a preset + its generated control rows), matching the existing card/row style already used for color/image/video — not a redesign of the editor's visual language.
- Add a `Slider` primitive to `packages/ui` (wrapping the already-installed `@base-ui/react` slider) for the new numeric preset controls, since no slider exists in the design system yet.
- Extend `normalizeSlideTemplate` so existing saved templates (no `animated` background ever selected, no `textAnimation` field) keep loading and rendering exactly as before.

## Capabilities

### New Capabilities
- `slide-template-animated-backgrounds`: The animated background type on `SlideTemplate` — which presets exist, how each preset's parameters are stored/defaulted, and how the preset renders in the editor preview vs. the live output surface.
- `slide-text-entrance-animation`: The text fade-in/fade-out behavior — when it triggers (content change, not every style edit), how "subtle" is enforced as a fixed, non-configurable motion, and how it's toggled per template.

### Modified Capabilities
- none (no existing `openspec/specs/` capabilities predate this change — `slide-template-backgrounds` was implemented but not yet archived/synced into `openspec/specs/`)

## Impact

- `apps/bibletime/package.json` — add `gsap`, plus whatever peer dependency (`ogl` and/or `three`) each vendored React Bits background component requires.
- `apps/bibletime/src/modules/presentation/interfaces/index.ts` — `SlideBackground` gains an `animated` variant; `SlideTemplate` gains a `textAnimation` (boolean-ish) field.
- `apps/bibletime/src/modules/presentation/components/backgrounds/` (new) — vendored React Bits background components plus a registry mapping preset id → component + control schema.
- `apps/bibletime/src/modules/presentation/components/{template-editor,slide-preview}.tsx` — preset picker + generated controls; GSAP-driven fade in `SlidePreview` keyed off text content, not style props.
- `apps/bibletime/src/modules/presentation/services/*` — animated background preset registry, `normalizeSlideTemplate` updates for the new fields.
- `packages/ui/src/components/slider.tsx` (new) — thin wrapper over `@base-ui/react`'s slider, styled to match `input.tsx`/`select.tsx`.
- Existing saved templates predate the `animated` background type and `textAnimation` field — reads need backward-compatible defaults so old templates render unchanged.
