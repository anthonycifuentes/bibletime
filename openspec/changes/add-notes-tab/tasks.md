## 1. Item type and pure logic

- [x] 1.1 Add `NoteItemData` (`heading?: string`, `text: string`, `label: string`) to `modules/library/interfaces/index.ts`, extend `FolderItemType` with `"note"`, and add the matching `FolderItemOf<"note", NoteItemData>` arm to the `FolderItem` union. Document on the type that it is denormalized at add-time and holds no draft reference.
- [x] 1.2 Add `modules/notes/lib/note-label.ts` — a pure `noteLabel({ heading, text })` that returns the trimmed heading when non-empty, otherwise the body's first words truncated to a fixed maximum with an ellipsis, collapsing newlines to spaces. Guarantee a non-empty result for any input with non-empty body text.
- [x] 1.3 Verify `noteLabel` against the spec cases: heading wins; no heading falls back to truncated body; a multi-line body yields a single-line label; a body shorter than the cap is returned whole without an ellipsis; whitespace-only heading is treated as absent.
- [x] 1.4 Add `modules/notes/interfaces/index.ts` with `NoteDraft` (`id`, `heading?`, `text`) and `NoteSlidePayload` (what the panel hands up to the drawer: `heading?`, `text`, `label`). No storage-driver interface — notes have no storage.

## 2. Library rendering integration

- [x] 2.1 Add the `note` case to `modules/library/lib/resolve-folder-item-content.ts`: `text` from the item, `reference` from `heading` (omitted entirely when absent), never an `emptyMessage`.
- [x] 2.2 Extend `folderItemLabel` in `modules/library/components/folder-tree.tsx` with an `note` case returning `item.data.label`, keeping the switch exhaustive over the union.
- [x] 2.3 Verify a hand-constructed note item renders in the slide console, the preview panel, and `/present`: body as slide text, heading as the reference line, and no reference line at all when the heading is absent.

## 3. Console store state

- [x] 3.1 Add `"notes"` to `BottomTab` in `modules/library/actions/use-console-store.ts`.
- [x] 3.2 Add `noteDrafts: NoteDraft[]` and `selectedNoteId: string | null` to the store, plus `createNote`, `updateNote`, `deleteNote`, and `selectNote` mutators. Appending keeps creation order; deleting the selected draft clears the selection.
- [x] 3.3 Verify drafts and selection survive a bottom-tab round-trip and a navigation to the template editor route and back, and that a reload clears them (the documented, intended behavior).

## 4. Notes tab UI

- [x] 4.1 Add `modules/notes/components/note-editor-dialog.tsx` — full-screen modal (`h-[92vh] w-[92vw]`, matching the song editor's sizing) with an optional heading `Input`, a body `Textarea`, and a live `SlideFrame` preview of the resulting slide in the passed-in template. Disable save on empty/whitespace body and state the reason. No auto-format and no slide-count column.
- [x] 4.2 Add `modules/notes/components/note-list.tsx` — the draft list with single selection, a "New note" button, per-row Edit and Delete, and an empty state that invites writing one and states notes are not saved between sessions.
- [x] 4.3 Add `modules/notes/views/notes-picker-panel.tsx` — the two-column grid (draft list / preview), the template `Select` defaulting to the app-active template exactly as `SongsPickerPanel` does, and the three actions: **Add slide**, **Add as folder** (labelled with the slide count when the list holds more than one), and **Present**. Wire the disabled conditions from the spec.
- [x] 4.4 Add `modules/notes/index.ts` exporting the panel view and the module's public types.
- [ ] 4.5 Verify the panel against its spec scenarios: columns render, selecting a draft previews without adding, no draft selected disables the selection actions and shows the hint, template selection applies to the preview and to added slides without changing the app-active template.

## 5. Drawer and console wiring

- [x] 5.1 Add an `notes` entry to the tab list in `modules/library/components/bottom-drawer.tsx`, ordered between Songs and Media, and render `NotesPickerPanel` for it. Add `onAddNote`, `onAddNotesAsFolder`, and `onPresentNote` props, and read the draft state from `useConsoleStore` in the drawer the way the Songs tab's state is already read there.
- [x] 5.2 Rename `songFolderParentId` in `modules/library/views/console-view.tsx` to a type-neutral name (e.g. `newContentFolderParentId`) and reuse it for both songs and notes rather than duplicating the depth rule.
- [x] 5.3 Wire `onAddNote` in `console-view.tsx`: `addItemToFolder(openFolderId, { type: "note", templateId, data })` when a folder is open, otherwise `createFolder(t("library.newFolder"), null, "start", [item])` followed by opening it — mirroring the existing `onAddVerse` fallback exactly.
- [x] 5.4 Wire `onAddNotesAsFolder`: one `createFolder(name, parentId, "end", initialItems)` call carrying every draft as an `note` item in list order, then open the created folder. Name it after the sole draft's label when there is exactly one, otherwise `t("notes.defaultFolderName")`.
- [x] 5.5 Wire `onPresentNote` to `setLiveSlide` + `window.open("/present", …)`, matching `onPresentSong`, and confirm it neither creates a folder nor mutates the draft list.
- [ ] 5.6 Verify end to end: five drafts become a folder of five ordered slides in one write; "Add slide" with no folder open creates a root folder containing that slide and opens it; adding at the depth cap creates a sibling; adding the same draft twice yields two independent slides.

## 6. Localization

- [x] 6.1 Add `sidebar.notes` and every `notes.*` key — panel headings, list empty state and not-saved notice, New/Edit/Delete, editor title/placeholders/validation messages, preview hint, Add slide, Add as folder (singular and counted forms), Present, open-folder hint, and `notes.defaultFolderName` — to `core/i18n/dictionaries/en.ts`, `es.ts`, and `pt.ts`.
- [x] 6.2 Audit the new module for hardcoded strings, cross-module component imports, deep (non-barrel) imports, and relative paths crossing folders, per the frontend module rules.

## 7. Finish and verify

- [x] 7.1 Run typecheck, lint, and build across the workspace; confirm the new `FolderItem` arm surfaced no unhandled `switch` beyond `resolveFolderItemContent` and `folderItemLabel`, and fix any it did.
- [x] 7.2 Reconcile the `console-shell-navigation` delta with `add-media-tab` if that change lands first — its version of "Sidebar content is contextual to the active tab" replaces the Media placeholder scenario and asserts a five-tab set; the merged requirement must keep the Notes scenario and read as six tabs.
- [ ] 7.3 Manual pass in the Electron shell: write a heading-less reminder and present it without filing it; write three notes and add them as a folder; add one to an already-open folder; drag-reorder note slides among Bible and song slides; apply a template in bulk; export the project, reopen it, and confirm the note slides render unchanged.
- [ ] 7.4 Manual pass in the web build: confirm the tab is fully functional with no desktop-only state, and that a reload clears the draft list while folder slides survive.
