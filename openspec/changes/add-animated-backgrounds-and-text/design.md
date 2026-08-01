## Context

`SlideTemplate.background` (`modules/presentation/interfaces`) is currently `{type: "color"|"gradient"|"image"|"video", value}`. `TemplateEditor` renders one `SettingRow` per background type, and `SlidePreview` (`modules/presentation/components/slide-preview.tsx`) switches on `background.type` to produce either a CSS `background` style or an absolutely-positioned `<video>`. `SlidePreview` is shared by four call sites: the template editor's live preview, gallery cards (`template-manager.tsx`), the live output route (`/present`), and the Bible module's output preview — so any rendering change here reaches all of them for free.

`packages/ui` has no slider primitive yet, but `@base-ui/react` (already a dependency) ships an unstyled `Slider` that `select.tsx`/`input.tsx` already show the pattern for wrapping.

`apps/bibletime/src/modules/presentation/assets/backgrounds/` already holds eight vendored CSS gradient/noise background files (from a source called "FeralUI") that were checked in but never wired into `PRESET_BACKGROUNDS` or any component — precedent in this codebase for vendoring third-party background assets as flat files rather than pulling in a package.

Neither `gsap`, `ogl`, nor `three` are installed anywhere in the workspace today. React Bits (reactbits.dev) is a client-rendered site; it could not be introspected from this environment (fetching it returns only the page shell), so the exact catalog of background components and their peer dependencies (`ogl` vs `three`) aren't verified here — that's called out as an open question, not guessed at.

## Goals / Non-Goals

**Goals:**
- Add one new `SlideBackground` variant, `animated`, backed by a small, curated set of vendored React Bits background components — not the whole catalog, and not a live dependency on reactbits.dev at runtime.
- Make each animated preset's controls (whatever numeric/color knobs that specific effect exposes) render generically in the editor, so adding a sixth preset later doesn't mean writing a new form.
- Add a single, non-configurable "animate text" toggle that crossfades slide text (fade out old, fade in new) whenever the displayed text or reference changes, using `gsap`.
- Keep the motion fixed and deliberately subtle (opacity-only, short, no bounce) — there is no duration/easing control exposed, by design, so it can't be tuned into something flashy.
- Keep old saved templates rendering unchanged (no `animated` background ever selected, no `textAnimation` field).

**Non-Goals:**
- Vendoring the entire React Bits background catalog — only the presets picked and copied in during this change's implementation.
- Building a generic "any React Bits component" plugin system — the registry only needs to support whatever background presets exist today plus straightforward future additions, not arbitrary third-party components.
- Animating anything other than the slide text's appearance/disappearance — no entrance animation for the background itself switching, no per-word/per-letter text effects.
- Gating animated backgrounds to desktop-only. Unlike video (Decision in `template-builder-media-and-fonts`, gated because of filesystem/IPC storage), animated backgrounds are rendered code with no stored media, so they work identically on web and desktop.

## Decisions

### 1. React Bits components are vendored as flat files, not installed as an npm package
React Bits distributes components via copy-paste or its own CLI (jsrepo), not as a single importable package — there is no `npm install react-bits`. Each chosen background preset's source is copied into `modules/presentation/components/backgrounds/`, alongside whatever `ogl`/`three` dependency that specific preset needs, added to `apps/bibletime/package.json` explicitly.
- **Alternative considered**: keep React Bits' own CLI (jsrepo) wired into the repo as an ongoing tool for pulling/updating components. Rejected — the codebase already has a precedent (the unused FeralUI CSS files under `assets/backgrounds/`) for vendoring third-party visual assets as plain files owned by the app; a second, code-generating CLI dependency adds tooling surface for a small, rarely-changing set of components.

### 2. Animated background data shape: `{ type: "animated"; presetId: string; params: Record<string, number | string> }`
`presetId` selects a `AnimatedBackgroundPreset` from a new registry in `modules/presentation/services`; `params` holds that preset's current control values (e.g. `{ speed: 5, scale: 1, color: "#7b7481", noiseIntensity: 1.5, rotation: 0 }` for a Silk-like preset). Each registry entry looks like:
```
{ id, label, Component, controls: { key, label, type: "number" | "color", min?, max?, step?, default }[] }
```
`TemplateEditor` renders a preset `Select` plus one `SettingRow` per `controls` entry (a `Slider` for `"number"`, the existing color input for `"color"`) — the same generic-row pattern already used for spacing/typography, not a bespoke form per preset.
- **Alternative considered**: a closed union per preset (`{type: "silk"; speed; scale; ...} | {type: "aurora"; ...}`). Rejected — mirrors the exact problem Decision 3 in the prior change solved for fonts (`SlideFontFamily` union → registry): every new preset would touch the type definition, the editor form, and the renderer switch in lockstep. A registry + generic `params` bag scales without a type change.

### 3. `Slider` primitive added to `packages/ui`, wrapping `@base-ui/react`'s slider
Follows the same thin-wrapper pattern already used for `select.tsx` (built on `@base-ui/react`'s `Select`): a styled `Slider`/`SliderTrack`/`SliderThumb` composed from the already-installed `@base-ui/react/slider` primitives, styled to match `input.tsx`'s existing border/ring treatment. Used for every `"number"` control in the animated background registry (speed, scale, noise, rotation, etc.) instead of the numeric `Stepper` used elsewhere in `TemplateEditor` — a slider fits continuous shader-style parameters better than a click-to-increment stepper, matching the reference customization panel's own input choice for these fields.
- **Alternative considered**: reuse the existing `Stepper` (increment/decrement buttons) for these params too. Rejected — `Stepper` suits small, discrete-feeling ranges (font size, line height); the reference panel and the params themselves (continuous 0–10-ish ranges) read better as drag sliders.

### 4. Text animation is a buffered crossfade inside `SlidePreview`, not a prop-driven instant swap
Today `SlidePreview` is fully controlled — it renders whatever `text`/`reference` it's given, instantly. Implementing "fade out old, fade in new" requires holding onto the previously-displayed text for the duration of its fade-out. `SlidePreview` gains internal `displayedText`/`displayedReference` state: when the `text`/`reference` prop changes, a GSAP timeline fades the currently-displayed content to opacity 0, then swaps the internal state to the new prop values and fades to opacity 1. Only triggers when `template.textAnimation` is on; only triggers on a change to `text`/`reference` — not on any style prop (font, color, background), so tweaking a slider in the editor never replays the animation. Motion is fixed: opacity-only (no translate/scale), short (roughly 200–300ms per leg), a gentle ease — deliberately not exposed as configurable.
- **Alternative considered**: fade-in only (no fade-out of the old text), driven directly off the existing prop without buffered state. Rejected — drops the fade-out half of the explicit request, and a crossfade is what actually reads as "subtle" for a slide-to-slide transition; an abrupt disappearance followed by a fade-in would still read as a hard cut.
- **Why GSAP over CSS transitions** (the user specifically asked for `gsap`): a CSS-only crossfade needs `transitionend` listeners to sequence "fade out → swap DOM → fade in," which is exactly the kind of hand-rolled sequencing a GSAP timeline (`.to().call().to()`) expresses directly and reliably, including cleanup if the text changes again mid-animation.

### 5. Backward compatibility via `normalizeSlideTemplate`
Extends the existing normalizer (already handling unknown `fontFamily` and missing `underlineColor`): defaults `textAnimation` to `false` when absent, and falls back an `animated` background whose `presetId` isn't in the registry (a preset later removed, or corrupted data) to the first `PRESET_BACKGROUNDS` entry — the same "unknown id → known default" shape already used for fonts.

## Risks / Trade-offs

- [React Bits' exact background catalog and per-component peer dependency (`ogl` vs `three`) aren't verified from this environment — reactbits.dev is a client-rendered SPA that returned only a page shell when fetched] → Mitigation: resolve the concrete preset list and dependency names as the first implementation task against React Bits' own site/install output; the registry + generic-controls architecture (Decision 2) doesn't need to change regardless of which specific presets end up vendored.
- [WebGL/canvas backgrounds rendered in every gallery card thumbnail at once (`template-manager.tsx` renders many `SlidePreview` instances) could be expensive] → Mitigation: keep the initially-vendored preset set small and cheap (prefer `ogl`-based single-shader effects over full `three.js` scenes where the source offers both); revisit with an explicit low-power/static-thumbnail mode only if this measurably janks the gallery — consistent with how video backgrounds already autoplay unmitigated in the same thumbnails today.
- [Buffered crossfade state (Decision 4) is new internal state in what was previously a fully controlled, prop-driven component] → Mitigation: the buffering is scoped to exactly `text`/`reference`; every other prop continues to render synchronously and instantly, so nothing about editing background/font/spacing changes.
- [Old saved templates predate `textAnimation` and the `animated` background type] → Mitigation: `normalizeSlideTemplate` defaults (Decision 5), same additive-field pattern already proven for `underlineColor`/`fontFamily`.

## Migration Plan

No user-facing migration step — additive fields (`textAnimation`, the new `animated` background variant) load correctly under `normalizeSlideTemplate` the first time old data is read, no batch migration or `schemaVersion` bump needed. Roll-out is a normal app update; rollback is a normal revert, since no existing on-disk template shape is altered.

## Open Questions

- Exact set of React Bits background presets to vendor for v1, and each one's peer dependency (`ogl` and/or `three`) — to be confirmed against React Bits' own site/CLI output during implementation, since it couldn't be fetched here.
- Should `/present` (the live projection route) use the same crossfade timing as the editor preview, or does an operator-driven live output warrant different timing (e.g. slightly longer, since there's no live-editing churn to worry about replaying)? Default: reuse as-is, since `SlidePreview` is shared and the crossfade only triggers on text-content changes either way; revisit if `/present` needs distinct timing.
