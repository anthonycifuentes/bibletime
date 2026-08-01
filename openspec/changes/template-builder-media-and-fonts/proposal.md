## Why

The template builder (`/templates/$templateId`) already supports color/gradient/image backgrounds and a fixed set of generic font stacks, but three gaps limit what a service can actually produce: there's no video background option, the fonts already uploaded to the project (`packages/fonts/`) aren't selectable anywhere in the editor, there's no way to style an underline in a color other than the body text color, and — most noticeably — editing a template shows no live preview at all (only the read-only "can't edit this" view does). People are styling slides blind and re-visiting `/templates` to see what changed.

## What Changes

- Add a **video background** option to `SlideBackground` (alongside the existing color/gradient/image), stored and played back via the desktop app's filesystem (Electron main process + IPC), not embedded as base64 — video is desktop-only because the web build's `localStorage`-backed template storage can't hold video-sized payloads.
- Wire up the fonts already uploaded under `packages/fonts/` (Cinzel, Germania One, Limelight, Manufacturing Consent, Mea Culpa, Petit Formal Script, Smokum, Geist, Quicksand, Roboto) as real `@font-face` families, and replace the editor's fixed 4-option font dropdown with a dynamic list sourced from a font registry.
- Add a **colored underline** style: an `underlineColor` field on the slide template, editable next to the existing underline toggle, independent of the main font color.
- Add a **live preview pinned to the top of the screen** on the template editor page (`/templates/$templateId`) so every change (background, font, color, underline, spacing) renders instantly — today this page has no preview at all while actively editing.
- Confirm/keep existing background-color and image support as-is; this change is additive to backgrounds, not a rewrite.

## Capabilities

### New Capabilities
- `slide-template-backgrounds`: What background types a slide template supports (color, gradient, image, video) and how each is stored/played back, including the desktop-only constraint on video.
- `slide-template-typography`: Selecting a font from the set of fonts bundled with the project, and styling a colored underline independent of the text color.
- `template-editor-live-preview`: A live, always-visible preview at the top of the template editor screen that reflects the in-progress template on every change.

### Modified Capabilities
- none (no existing `openspec/specs/` capabilities predate this change)

## Impact

- `apps/bibletime/src/modules/presentation/interfaces/index.ts` — `SlideBackground` union gains a `video` variant; `SlideTemplate` gains `underlineColor`; `fontFamily` widens from a closed 4-value union to a font-registry-backed id.
- `apps/bibletime/src/modules/presentation/services/*` — new font registry (labels/stacks/CSS imports), background preset list unchanged.
- `apps/bibletime/src/modules/presentation/components/{template-editor,slide-preview}.tsx` — video upload control, dynamic font select, underline color control, video playback in preview.
- `apps/bibletime/src/routes/templates/$templateId.tsx` — add the live preview to the editable branch, pinned to the top.
- `apps/desktop/src/{main,preload}.ts` — new IPC channels for saving/reading/removing template video media on disk (mirrors the existing `templates:*` and `bible-version-downloads:*` patterns).
- `packages/fonts/` — new `@font-face` CSS per uploaded family and corresponding `package.json` exports.
- Existing saved templates (JSON files / `localStorage`) predate `underlineColor` and the new font ids — reads need a backward-compatible default so old templates don't break.
