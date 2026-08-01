## Context

The template builder lives across three modules:
- `modules/presentation` — the `SlideTemplate`/`SlideBackground` data model, the `TemplateEditor` controls, and the `SlidePreview` renderer.
- `modules/templates` — the saved-template CRUD layer, with two storage drivers: `desktopTemplateStorage` (Electron IPC → JSON files under `userData/templates/`) and `webTemplateStorage` (`localStorage`).
- `apps/desktop` — the Electron `main.ts`/`preload.ts` pair that already exposes `templates:*` and `bible-version-downloads:*` IPC channels, both following the same shape: a `userData` subfolder, a manifest or per-id file, list/save/remove (or download/read/remove) handlers.

Today `SlideTemplate.background` is `{type: "color"|"gradient"|"image", value}` where `image` is a base64 data URL capped at 3 MB, embedded directly in the template JSON/localStorage entry. `fontFamily` is a closed 4-value union backed by hardcoded CSS stacks (`FONT_FAMILY_STACKS`). `underline` is a boolean that inherits `fontColor`. The editor page (`/templates/$templateId`) renders `TemplateEditor` with no preview at all in the writable branch — `SlidePreview` is only used in the read-only branch and in the gallery cards.

`packages/fonts/` already has font files for 8 additional families checked into the repo, but only `essential-sans` has a `package.json` export and CSS wired up; the rest aren't loaded or referenced anywhere in app code yet.

## Goals / Non-Goals

**Goals:**
- Add a `video` background variant, stored on disk (not embedded as base64) and playable in both the editor preview and the eventual output surface.
- Make every font under `packages/fonts/` selectable from the template editor.
- Add an independent underline color.
- Add a live preview pinned to the top of `/templates/$templateId` while editing.
- Keep old saved templates (missing `underlineColor`, using the old 4 font ids, no `video` background) loading without crashing.

**Non-Goals:**
- Building a general-purpose asset manager/library (video/image reuse across templates, thumbnails, storage quotas UI) — this change only adds the one video background field.
- Bringing video backgrounds to the web build — out of scope per the proposal; the web build keeps color/gradient/image only.
- Changing the live output/projection surface (`/present`) — this change only touches the template *editor* preview. Output-surface changes are a separate concern if `/present` needs video too.
- Font upload UI — fonts are added to `packages/fonts/` by a developer checking in files, same as today; this change only makes already-checked-in fonts selectable.

## Decisions

### 1. Video background storage: filesystem + custom protocol, not base64
Video files are large enough that embedding them as base64 in a JSON template file (desktop) or a `localStorage` entry (web) is impractical — `localStorage` has a ~5-10 MB origin quota, and base64 already used for images bloats size by ~33%. Instead:
- The desktop main process gets a `template-media` store: `userData/template-media/<mediaId>.<ext>`, mirroring the existing `templates/` and `bible-versions/` folders.
- New IPC channels: `template-media:save` (accepts a file path or `ArrayBuffer` + extension picked via a native file dialog, returns a `mediaId`), `template-media:remove(mediaId)`.
- The main process registers a custom `bibletime-media://` protocol (`protocol.handle` / `registerFileProtocol`) that streams the file at `userData/template-media/<mediaId>.<ext>` back to the renderer. `SlideBackground` for video stores `{ type: "video", value: "bibletime-media://<mediaId>.<ext>" }`, and `<video src={value}>` just works without loading the whole file into memory as a data URL.
- **Alternative considered**: base64 data URL like images. Rejected — video files are commonly tens of MB; doing this would bloat the JSON template file, blow past `localStorage` quota entirely (making the option web-incompatible in a way that silently corrupts storage), and load the whole file into memory for playback.
- **Alternative considered**: keep an absolute `file://` path to wherever the user's original file lives. Rejected — the source file could move/be deleted, and the app should own a stable copy the way it already does for images (copied inline) and downloaded Bible versions (copied into `userData`).

### 2. Video is gated to the desktop build via `TemplateStorageDriver`
Rather than a UI-only check, add `readonly supportsVideoBackground: boolean` to `TemplateStorageDriver`, set `true` on `desktopTemplateStorage` and `false` on `webTemplateStorage`. `TemplateEditor` reads this (already receives storage-derived state via the `useTemplates` hook chain) to hide the video upload control entirely on web, rather than showing a disabled control with an explanatory tooltip. This keeps the constraint expressed once, next to where the other capability flag (`canWrite`) already lives, instead of a scattered `if (isDesktop)` check.
- **Alternative considered**: feature-detect `window.bibletime` directly in the component. Rejected — `canWrite` already established the pattern of exposing storage capabilities as flags on the driver; a second ad hoc detection path would be an inconsistent way to express the same kind of constraint.

### 3. Font registry replaces the closed `SlideFontFamily` union
Add `packages/fonts/<family>/index.css` (same pattern as `essential-sans/index.css`) with `@font-face` rules for each family, and export each from `package.json`. In `modules/presentation/services`, replace `FONT_FAMILY_STACKS`/`FONT_FAMILY_LABELS` with a `FONT_REGISTRY: { id: string; label: string; stack: string }[]` covering the existing 4 generic stacks plus one entry per uploaded family (Cinzel, Germania One, Limelight, Manufacturing Consent, Mea Culpa, Petit Formal Script, Smokum, and the Geist/Quicksand/Roboto set). `SlideTemplate.fontFamily` becomes `string` (a registry id) instead of the closed union. All font CSS is imported once, globally (alongside the existing `essential-sans.css` import), since the files are small `.ttf`/`.woff2` and the app already ships them in the repo — no lazy-loading complexity for ~10 small files.
- Unknown font ids (an old template referencing a since-removed id, or a corrupted import) fall back to the default (`"brand"`) at read time via a small normalizer, same place `underlineColor` gets defaulted (see Decision 5).
- **Alternative considered**: keep `SlideFontFamily` as a union and add new literal values per font. Rejected — every new font would require touching the type definition, the stacks map, and the labels map in lockstep; a registry array is the same information as a single source of truth and scales without a code change to the type system.

### 4. Underline color as a plain new field, applied via `text-decoration-color`
Add `underlineColor: string` to `SlideTemplate`, sitting next to `fontColor` in the data model. `SlidePreview` applies `textDecorationColor: template.underlineColor` unconditionally (harmless when `underline` is false since `textDecoration` is already `"none"`). `TemplateEditor` reveals a color swatch + hex input next to the existing underline toggle, shown only when `underline` is on (mirrors the existing `fontColor` control's swatch+hex pairing).
- Default value at template creation: same as `fontColor`'s default (`"#FFFFFF"`), so a freshly-created template's underline (if turned on) matches the text color until the user changes it.
- **Alternative considered**: derive underline color from `fontColor` with an optional override (`underlineColor?: string`, undefined = "use fontColor"). Rejected — adds a second code path (resolved-color-or-fallback) everywhere the template is rendered for one field, for a marginal storage saving; a required field with a sensible default is simpler to reason about and matches how every other style field on `SlideTemplate` already works (all required, no optionals).

### 5. Backward compatibility for existing saved templates
Both storage drivers' `list()` currently return whatever was persisted as-is. Add one `normalizeSlideTemplate(template: unknown): SlideTemplate` in `modules/presentation/services`, applied at the point templates are loaded (`useTemplates`, and `parseTemplateFile` for imports): fills `underlineColor` from `fontColor` if missing, and falls back `fontFamily` to `"brand"` if it isn't a known registry id. This is the one seam where "old data, new shape" is handled, rather than scattering `?? fallback` across every consumer of `SlideTemplate`.

### 6. Live preview placement: sticky `SlidePreview` above the editor form
Add a `SlidePreview` to the writable branch of `/templates/$templateId`, positioned above `TemplateEditor`'s cards with `sticky top-0` (plus a background/blur so scrolled content doesn't show through) so it stays pinned as the editor's now-longer control stack (background/typography/underline/spacing) scrolls beneath it on smaller viewports. Reuses the same `SAMPLE_TEXT` constant the read-only branch and gallery cards already use — no new sample-text concept.
- **Alternative considered**: side-by-side two-column layout (editor left, preview right) instead of stacked-with-sticky-top. Rejected for this change — the page is currently a single centered column (`max-w-2xl`) at all viewport widths with no existing responsive split, and the proposal specifically asks for the preview "at the top of the screen," which the sticky-stacked approach satisfies directly without redesigning the page's grid.

## Risks / Trade-offs

- [Custom `bibletime-media://` protocol adds Electron-main-process surface area (protocol registration, path traversal on `mediaId`)] → Mitigation: generate `mediaId` server-side (e.g. `crypto.randomUUID()`) in the IPC handler, never accept a caller-supplied id/path for reads; validate the requested id resolves to a path strictly inside `template-media/` before serving.
- [Orphaned video files if a template is deleted or its background is replaced without removing the old media file] → Mitigation: `templates:remove` and background-replace flows call `template-media:remove(mediaId)` for the outgoing media before/while removing the template; acceptable to leave this as best-effort cleanup rather than building a GC pass, since this is a single-user local app.
- [Loading ~10 font families' worth of `.ttf` files globally on every app load adds some startup weight] → Mitigation: files are small (checked file sizes are tens of KB to low hundreds of KB each); acceptable for a desktop-first app. Revisit with lazy per-family loading only if this becomes measurably slow.
- [`fontFamily` widening from a closed union to `string` loses compile-time exhaustiveness checking wherever it was previously switched on] → Mitigation: the only place that switched on it was the stacks/labels lookup, which becomes a registry `find`/`map` anyway; no other exhaustive switches exist over `SlideFontFamily` today.

## Migration Plan

No user-facing migration step — `normalizeSlideTemplate` (Decision 5) makes old templates load correctly the first time they're read under the new code, without a one-time batch migration or version bump to `TemplateFile.schemaVersion`. Roll-out is a normal app update; rollback is a normal revert, since no destructive on-disk format change happens (new fields are additive, old `SlideTemplate` shapes stay parseable).

## Open Questions

- Should `/present` (the live output/projection route) also support video backgrounds in this change, or is editor-preview-only sufficient for now? Currently scoped as a non-goal; confirm before implementation if the output surface needs to match.
- Any desktop-side max file size / duration for uploaded videos, similar to the existing 3 MB image cap? Not specified by the user request; default to a generous but bounded limit (e.g. 100 MB) to keep `userData` from growing unbounded, adjustable during implementation.
