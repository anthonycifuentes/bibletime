## Why

Testing the redesigned template editor (`redesign-template-builder-layout`) surfaced two rough edges. First, a long Bible verse at a normal font size silently clips inside the slide box — `SlidePreview` renders text at a flat `template.fontSize` inside an `overflow-hidden` container with no measurement against the actual text length, so nothing keeps a verse's text visible once it's taller than the box, on the editor preview, the console preview, and the live `/present` output alike. Second, the template editor autosaves every keystroke with no visible confirmation and no way to delete a template without leaving the page and going back to the gallery — there's no way to discard an in-progress edit, and no quick way to remove a template you're already looking at.

## What Changes

- Add text auto-fit to `SlidePreview`: when the rendered verse text is taller than the slide box, the effective font size scales down (from the template's authored `fontSize`) until it fits, down to a readable floor — short verses that already fit are rendered at the exact authored size, unaffected. Applies everywhere `SlidePreview` renders real text (editor, console preview, `/present` output), not just the template editor.
- Add a manual "split into slides" action next to "Convertir a diapositiva" in the Bible picker, for a single verse whose text is long enough that even the auto-fit floor would look cramped — splits the verse's text across multiple consecutive slide entries appended to the open folder in one action, instead of relying on auto-fit alone.
- **BREAKING**: Replace the template editor's autosave-on-every-change behavior with an explicit save model. `/templates/$templateId` now holds edits locally (name and template both) and only writes them to storage when "Save" (top-right of the page) is clicked; the "Restablecer plantilla" reset button now resets the local draft, not the persisted record, until Save is clicked.
- Add a "Delete" action next to "Save" (top-right of the editable template screen) that removes the template from storage after a confirmation dialog, reusing this app's existing delete-confirmation pattern (`ProjectList`'s `Dialog`), then navigates back to the template gallery — today deletion is only reachable from the gallery's cards.
- Add an unsaved-changes guard when navigating away from the editor (back button) with a pending draft that hasn't been saved.

## Capabilities

### New Capabilities
- `slide-text-autofit`: `SlidePreview`'s text-sizing behavior — shrinking the effective font size to keep verse text fully visible inside the slide box, with a readable minimum floor, everywhere a slide is rendered.
- `verse-slide-splitting`: The Bible picker's manual action to split one verse's text across multiple consecutive slides in the open folder.
- `template-editor-explicit-save`: The template editor's save/delete/discard lifecycle — local draft editing, an explicit Save action, a Delete action with confirmation, "Restablecer plantilla" acting on the draft, and the unsaved-changes navigation guard.

### Modified Capabilities
_None — no existing specs in this project yet; all three capabilities above are new._

## Impact

- `apps/bibletime/src/modules/presentation/components/slide-preview.tsx` — measure rendered text against the box and compute an auto-fit scale factor alongside the existing `scale` prop.
- `apps/bibletime/src/modules/presentation/hooks/use-slide-fit.ts` — likely home for the auto-fit measurement hook (parallel to `useSlideFit`/`useElementWidthScale`), or a new sibling hook in the same file.
- `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx` — new "split into slides" action alongside `handleConvert`, a splitting algorithm over `pendingText`, and a UI control for it.
- `apps/bibletime/src/modules/library/actions/use-library.ts` — new `addItemsToFolder` (plural, batched) alongside the existing single-item `addItemToFolder`, so a split produces one atomic folder write instead of N sequential ones.
- `apps/bibletime/src/modules/library/components/bottom-drawer.tsx`, `apps/bibletime/src/modules/library/views/console-view.tsx` — thread a new `onAddVerses` (plural) callback alongside the existing `onAddVerse`.
- `apps/bibletime/src/routes/templates/$templateId.tsx` — local draft state for `name`/`template`, dirty tracking against the last-saved values, explicit Save/Delete buttons (top-right), unsaved-changes navigation guard, "Restablecer plantilla" wired to the draft.
- `apps/bibletime/src/modules/presentation/components/template-editor.tsx` — `onChange`/`onReset` now target the local draft (signature likely unchanged, only what the route passes in changes).
- `apps/bibletime/src/modules/templates/actions/use-templates.ts` — `update`/`remove` are called from the route only on explicit Save/Delete now, not on every field change.
- `apps/bibletime/src/modules/library/components/project-list.tsx` — reused as the reference pattern for the new delete-confirmation `Dialog`, not modified itself.
- i18n dictionaries (`apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts`) — new strings for Save/Delete/discard-confirmation/split-into-slides.
