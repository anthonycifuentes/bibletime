## 1. Data model

- [x] 1.1 Add `{ type: "video"; value: string }` to `SlideBackground` in `modules/presentation/interfaces`.
- [x] 1.2 Widen `SlideTemplate.fontFamily` from the closed `SlideFontFamily` union to `string` (a font-registry id); remove `SlideFontFamily` once nothing references it.
- [x] 1.3 Add `underlineColor: string` to `SlideTemplate`.
- [x] 1.4 Add `readonly supportsVideoBackground: boolean` to `TemplateStorageDriver` in `modules/templates/interfaces`.
- [x] 1.5 Write `normalizeSlideTemplate(template: unknown): SlideTemplate` in `modules/presentation/services` — defaults `underlineColor` from `fontColor` if missing, falls back `fontFamily` to `"brand"` if not a known registry id.

## 2. Font registry

- [x] 2.1 Add `@font-face` CSS (`index.css`, following the `essential-sans` pattern) for each family under `packages/fonts/`: Cinzel, Germania One, Limelight, Manufacturing Consent, Mea Culpa, Petit Formal Script, Smokum, and the Geist/Quicksand/Roboto set.
- [x] 2.2 Add corresponding exports to `packages/fonts/package.json` for each new CSS file.
- [x] 2.3 Import all bundled font CSS globally (alongside the existing `essential-sans.css` import).
- [x] 2.4 Replace `FONT_FAMILY_STACKS`/`FONT_FAMILY_LABELS` in `modules/presentation/services` with a single `FONT_REGISTRY: { id, label, stack }[]` covering the 4 existing generic stacks plus one entry per uploaded family.
- [x] 2.5 Update `DEFAULT_SLIDE_TEMPLATE` to set `underlineColor` and keep `fontFamily: "brand"` valid against the new registry.

## 3. Desktop video media storage (Electron)

- [x] 3.1 In `apps/desktop/src/main.ts`, add a `template-media` folder under `userData`, mirroring the existing `templates`/`bible-versions` folder setup.
- [x] 3.2 Add `template-media:save` IPC handler: accepts the picked video file, generates a `mediaId` via `crypto.randomUUID()`, copies the file into `template-media/<mediaId>.<ext>`, returns the `mediaId`+extension.
- [x] 3.3 Add `template-media:remove` IPC handler: deletes `template-media/<mediaId>.<ext>`, validating the resolved path stays inside `template-media/`.
- [x] 3.4 Register a `bibletime-media://` custom protocol that streams `template-media/<mediaId>.<ext>` back to the renderer, validating the requested id/path the same way as removal.
- [x] 3.5 Expose `templateMedia.save` / `templateMedia.remove` on `window.bibletime` in `apps/desktop/src/preload.ts`.
- [x] 3.6 Set `desktopTemplateStorage.supportsVideoBackground = true`; set `webTemplateStorage.supportsVideoBackground = false`.

## 4. Template editor UI — backgrounds

- [x] 4.1 Add a video upload control to `TemplateEditor`'s background section, shown only when `supportsVideoBackground` is true (threaded through from `useTemplates`/the storage driver).
- [x] 4.2 Wire the video upload control to `template-media:save`, then set `background: { type: "video", value: "bibletime-media://<mediaId>.<ext>" }`.
- [x] 4.3 When a video (or any) background is replaced or removed while the previous one was a video, call `template-media:remove` for the outgoing media.
- [x] 4.4 Update `SlidePreview`'s `backgroundStyle`/render logic to play a looping, muted `<video>` element when `background.type === "video"`.

## 5. Template editor UI — typography

- [x] 5.1 Update the font family `Select` in `TemplateEditor` to render options from `FONT_REGISTRY` instead of the fixed 4-entry object.
- [x] 5.2 Add an underline color control (swatch + hex input, mirroring the existing font color control) next to the underline toggle, visible only when underline is enabled.
- [x] 5.3 Update `SlidePreview`'s text style to set `textDecorationColor: template.underlineColor`.

## 6. Template editor UI — live preview

- [x] 6.1 Add a `SlidePreview` to the writable branch of `/templates/$templateId`, using the same `SAMPLE_TEXT` already used elsewhere on that page.
- [x] 6.2 Position the preview above the editor controls with `sticky top-0` (plus a background so scrolled content doesn't show through) so it stays visible while the controls scroll beneath it.

## 7. Backward compatibility & cleanup

- [x] 7.1 Apply `normalizeSlideTemplate` at every point templates are loaded: `useTemplates`'s list handling and `parseTemplateFile` (import path).
- [x] 7.2 Wire template deletion (`templates:remove` path, both storage drivers) to also remove any referenced video media before/while removing the template record.
- [x] 7.3 Confirm existing bundled templates and previously-saved custom templates (no `underlineColor`, old font ids, no `video` type) still load and render correctly.

## 8. Verification

- [ ] 8.1 Manually verify on desktop (Electron): create a template, set a video background, confirm it plays in the editor preview and in the gallery card preview, reload the app, confirm it persists. **Not yet run** — this environment has no display to launch the real Electron shell; `apps/desktop` typechecks cleanly and the IPC/protocol logic was reviewed, but the end-to-end desktop click-through is still open.
- [x] 8.2 Manually verify on web: confirm the video upload control is absent and color/gradient/image backgrounds still work. Verified via a headless-browser pass against the running dev server — no "Video" control renders, image/color/gradient controls behave as before.
- [x] 8.3 Manually verify: select each bundled font family, confirm it renders visibly differently in the preview. Verified the font dropdown lists all 14 fonts (4 generic + 10 bundled) and selecting Cinzel visibly changes the preview's typeface.
- [x] 8.4 Manually verify: enable underline, set a distinct underline color, confirm text color and underline color render independently. Verified — text stayed white while the underline rendered in a distinct magenta.
- [x] 8.5 Manually verify: on `/templates/$templateId`, confirm the preview updates live for every control and stays pinned to the top while scrolling. Verified — the preview reflects font/underline changes immediately and stays pinned above the scrolling form.
