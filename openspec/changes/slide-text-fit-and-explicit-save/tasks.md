## 1. Auto-fit text sizing

- [x] 1.1 Add `useAutoFitFontScale` to `apps/bibletime/src/modules/presentation/hooks/use-slide-fit.ts` — takes a box ref, a text ref, and the nominal font size; binary-searches an `autoFitScale` (floor to `1.0`) by measuring `scrollHeight` against the box's available content height.
- [x] 1.2 Define the floor (`MIN_AUTOFIT_FONT_PX = 18`) and the `autoFitScale` floor calculation (`MIN_AUTOFIT_FONT_PX / nominalFontSize`, clamped to at most `1`).
- [x] 1.3 Wire the hook into `slide-preview.tsx`: add a box ref on the root element, compute `autoFitScale`, and apply it multiplicatively with the existing `scale` prop to both the body text and reference-line font sizes.
- [x] 1.4 Re-run the measurement on text/reference/template changes and on box resize (`ResizeObserver`), matching the existing crossfade `useEffect`'s dependency style.
- [ ] 1.5 Verify short text (already fits) renders at the exact nominal size — no shrinkage — across the editor preview, a folder thumbnail, and `/present`.
- [ ] 1.6 Verify long text shrinks to fit without clipping, down to the floor, and clips (rather than shrinking further) only once the floor is reached.

## 2. Manual verse splitting

- [x] 2.1 Add a text-splitting utility (e.g. `apps/bibletime/src/modules/library/lib/split-verse-text.ts`) implementing the punctuation-nearest-to-midpoint algorithm with whitespace fallback, returning N ordered text chunks for a given verse text and split count.
- [x] 2.2 Add `addItemsToFolder` (plural) to `apps/bibletime/src/modules/library/actions/use-library.ts` — appends an array of items to a folder in one `storage.save` call, parallel to the existing singular `addItemToFolder`.
- [x] 2.3 Thread a new `onAddVerses` callback prop through `apps/bibletime/src/modules/library/components/bottom-drawer.tsx` and wire it in `apps/bibletime/src/modules/library/views/console-view.tsx` to `library.addItemsToFolder`.
- [x] 2.4 In `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx`, add a split-count control (`Select`, values 2–5, default 2) and a "Dividir en diapositivas" button next to "Convertir a diapositiva", gated by the same `canConvert` condition.
- [x] 2.5 Implement the split handler: split `pendingText` via the utility from 2.1, build one `BiblePassageItemData` per chunk (same `bookUsfm`/`chapterUsfm`/`verseNumber`/`versionId`/`versionAbbreviation`, `reference` suffixed with `(i/N)`), and call `onAddVerses`.
- [x] 2.6 Add the new i18n strings (split button label, split-count control) to `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts`.
- [x] 2.7 Verify a split verse produces N ordered slides in the folder grid whose reference labels show the part/total suffix, with no dropped or duplicated words across the chunks. Verified with Esther 8:9 split into 3 — see section 4.

## 3. Explicit save/delete/discard for the template editor

- [x] 3.1 In `apps/bibletime/src/routes/templates/$templateId.tsx`, generalize the existing `name` state into a full local draft: `draftName`/`draftTemplate`, initialized from `existing` and re-synced whenever `existing.id` changes.
- [x] 3.2 Compute `isDirty` via `JSON.stringify` comparison of the draft against `existing`'s current name/template.
- [x] 3.3 Wire `TemplateEditor`'s `onChange`/`onReset` and the name `Input`'s `onChange` to update the local draft only (no more `update()` calls from these handlers); `onReset` sets the draft to `DEFAULT_SLIDE_TEMPLATE`.
- [x] 3.4 Add a "Save" button (top-right of the page) that calls `update(existing.id, { name: draftName.trim(), template: draftTemplate })`, disabled when `!isDirty`.
- [x] 3.5 Add a "Delete" button (top-right, alongside Save) that opens a confirmation `Dialog` (reusing the `Dialog`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter` + destructive-button pattern from `apps/bibletime/src/modules/library/components/project-list.tsx`); confirming calls `remove(existing.id)` and navigates to `/library`.
- [x] 3.6 Add the unsaved-changes guard: `useBlocker` (checked `useBlocker.d.ts` in the installed `@tanstack/react-router` — the modern `{ shouldBlockFn, enableBeforeUnload, withResolver: true }` form) gated on `isDirty`, resolved through a reused confirmation `Dialog`. `enableBeforeUnload` covers the tab-close/reload case natively — no separate manual `beforeunload` listener needed.
- [x] 3.7 Confirm the read-only/bundled-template branch of `$templateId.tsx` is completely untouched by this change — no draft state, no Save/Delete, same as before.
- [x] 3.8 Add the new i18n strings (Save, Delete, delete-confirmation title/description, unsaved-changes prompt) to `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts`.
- [x] 3.9 Fix (found via live user testing): `/templates/new`'s auto-created record was being treated as already-saved — opening "New" and immediately backing out with zero edits left a permanent empty template in the gallery with no warning, and the button read "Delete" for something never actually saved. Added `?isNew=true` (set only by `/templates/new`'s redirect) and a `hasSavedOnce` flag: `isDirty` is now `!hasSavedOnce || <normal diff>`, the button reads "Cancel" pre-first-save and "Delete" after, and both the button's confirm and the blocker's "Discard changes" call `remove()` on a never-saved template instead of just navigating away. Also bumped the Save/Cancel-Delete buttons to `size="lg"` per feedback that they should be larger (they were already right-aligned via `ml-auto`).
- [x] 3.10 Fix: clearing `?isNew` after the first Save via `navigate({ search: () => ({}) })` was silently a no-op in the installed `@tanstack/react-router` (confirmed via direct console logging — the call ran, returned, but never touched `window.location`). Switched to `window.history.replaceState(history.state, "", location.pathname)`, which reliably updates the address bar so a later reload doesn't re-read the template as still-discardable.

## 4. Verify

- [x] 4.1 Run the app: paste a very long Bible verse into a folder and confirm it auto-fits without clipping in the editor preview, the console preview, and `/present`. Verified with Esther 8:9 (one of the longest verses in the Bible): renders fully, shrunk-to-fit, in the folder thumbnail, the full-size preview panel, and the `/present` projector output.
- [x] 4.2 Run the app: split a pending verse into 3 slides and confirm 3 correctly-labeled, correctly-ordered slides appear in the folder with the verse's full text covered. Verified: splitting Esther 8:9 into 3 produced "Ester 8:9 (1/3)"/"(2/3)"/"(3/3)", in order, each fitting comfortably.
- [x] 4.3 Run the app: edit a template's controls, confirm nothing persists until Save is clicked (reload the page mid-edit and confirm the draft is gone, last-saved state is intact), then confirm Save persists everything together. Verified: Save starts disabled, enables on edit, reload without Save reverts the name to its last-saved value, Save then reload persists it.
- [x] 4.4 Run the app: delete a template via the new button, confirm the confirmation dialog appears, canceling keeps the template, confirming removes it and returns to the gallery. Verified: Cancel keeps you on the editor; confirming navigates to `/library` and the template's URL 404s afterward.
- [x] 4.5 Run the app: make an edit, trigger back navigation, confirm the unsaved-changes prompt appears and correctly blocks/allows navigation depending on the user's choice. Verified: back-navigation with a dirty draft is blocked by the dialog; "Keep editing" stays; "Discard changes" proceeds to `/library`.
- [x] 4.6 Run the project's lint/typecheck for `apps/bibletime` and `packages/ui`. Both clean (typecheck and full-app lint, zero errors).

## 5. Follow-up polish (found via live user testing)

- [x] 5.1 Right-align "Nueva"/"Importar" in `template-library-toolbar.tsx` (`justify-end`), bump their size from `sm` to `default`, and change "Nueva" to the primary button style (default variant, black) with its plus icon removed — "Importar" keeps its outline style and icon.
- [x] 5.2 Add a `@7xl:grid-cols-5` breakpoint to the template gallery grid (`template-manager.tsx`), so a 5th column appears on wide screens instead of capping at 4.
- [x] 5.3 Fix: returning from the template editor (Save, Cancel/Delete, or the back arrow) always landed on the console's "Projects" bottom-tab instead of wherever the user actually came from (e.g. "Templates"). Root cause: `bottomTab` was local `useState` in `ConsoleView`, which remounts every time the router navigates away to `/templates/$templateId` and back. Moved `bottomTab`/`setBottomTab` into the existing module-level `useConsoleStore` (already used for `openFolderId`/selection for exactly this reason — it doesn't remount with the route) and moved the `BottomTab` type there too, re-exported from `bottom-drawer.tsx` for existing importers.
