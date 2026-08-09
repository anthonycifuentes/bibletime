## 1. Font-size range

- [x] 1.1 Add `MIN_FONT_SIZE = 16` and `MAX_FONT_SIZE = 800` to `apps/bibletime/src/modules/presentation/services/slide-template.ts` and export them from `modules/presentation/services/index.ts` and `modules/presentation/index.ts`.
- [x] 1.2 Replace the literal `min={16}` / `max={96}` on the "Tamaño" slider in `apps/bibletime/src/modules/presentation/components/template-editor.tsx` with the new constants, keeping `step={2}`.
- [x] 1.3 Clamp `fontSize` into `[MIN_FONT_SIZE, MAX_FONT_SIZE]` in `normalizeSlideTemplate` (`modules/presentation/services/normalize-slide-template.ts`), so a template read from storage or an imported file can't carry an out-of-range size.

## 2. Data model and merge

- [x] 2.1 Add `templateOverride?: Partial<SlideTemplate>` to `FolderItemOf` in `apps/bibletime/src/modules/library/interfaces/index.ts`, documented as "layered over `templateId`'s template; only fields the user changed are present; absent means follow the template exactly".
- [x] 2.2 Add `normalizeSlideTemplateOverride(value: unknown): Partial<SlideTemplate>` to `modules/presentation/services/normalize-slide-template.ts` — drops unknown keys, `undefined` values, a `fontFamily` failing `isKnownFontId`, and a `background` failing the same renderability checks `normalizeBackground` applies (unregistered animated preset, gradient with no usable `value`/`spec`); clamps `fontSize` to `[MIN_FONT_SIZE, MAX_FONT_SIZE]`. It subtracts fields, never fills defaults. Export it through both barrels.
- [x] 2.3 Merge in `apps/bibletime/src/modules/library/lib/resolve-folder-item-content.ts`: resolve the base template as today, then spread `normalizeSlideTemplateOverride(item.templateOverride)` over it when the field is present. No caller changes — `SlideCard`, `PreviewPanel`, and `console-view.tsx`'s `presentFolderItem` all inherit it.
- [x] 2.4 Verify the merge behaves as specified. Done programmatically (25 assertions, all passing) rather than by hand-editing storage: no-override slides are untouched, a one-field override changes only that field, a later template edit still reaches an overridden slide, an override naming a removed font/dead animated preset falls back to the template for just that field, and unknown/undefined keys are dropped.

## 3. Write path

- [x] 3.1 Add `applyStyleOverrideToItems(folderId, itemIds, override: Partial<SlideTemplate> | null)` to `apps/bibletime/src/modules/library/actions/use-library.ts`, mirroring `applyTemplateToItems`: one `storage.save` for the folder, setting `templateOverride` on targeted items — and **deleting the key** (not storing `{}`) when `override` is `null` or has no keys. Return it from the hook.
- [x] 3.2 Confirm `applyTemplateToItems` is left as-is (sets `templateId`, does not touch `templateOverride`) — per the design's decision that an override outlives a template swap.

## 4. The style dialog

- [x] 4.1 Create `apps/bibletime/src/modules/library/components/slide-style-dialog.tsx`: props `{ open, onOpenChange, item, templates, canUseVideoBackground, onSave(override: Partial<SlideTemplate> | null) }`.
- [x] 4.2 Draft state: `useState<Partial<SlideTemplate>>(item.templateOverride ?? {})`, re-seeded whenever the dialog opens or the target item id changes; `onChange` accumulates patches (`(patch) => setDraft((d) => ({ ...d, ...patch }))`) so the draft stays minimal by construction.
- [x] 4.3 Layout: a `Dialog` (`max-w-4xl`, matching `TemplatePickerDialog`) with a live `SlidePreview` of the slide's *own* resolved content (text/reference/versionLabel/media via `resolveFolderItemContent`, with the draft merged in) beside a scrolling `TemplateEditor` column.
- [x] 4.4 Pass `TemplateEditor` the merged template (base + draft) as its `template`, so every control shows the slide's effective style and no control is hidden based on what is currently overridden. `TemplateEditor` itself stays unmodified.
- [x] 4.5 Wire `TemplateEditor`'s `onReset` to "clear this slide's override" (`setDraft({})`) and relabel it for this context (it must not read as "Restablecer plantilla" here) — reset never touches `templateId`.
- [x] 4.6 Footer: **Guardar** (calls `onSave(draft)` — passing `null` when the draft is empty — then closes), **Cancelar** (closes, discarding). No navigation guard is needed; dismissing the dialog *is* the discard affordance.
- [x] 4.7 Thread `canUseVideoBackground` from `useTemplates().supportsVideoBackground` so a desktop build can set a per-slide video background and the web build hides the control, exactly as `/templates/$templateId.tsx` does.

## 5. Entry points

- [x] 5.1 `slide-card.tsx`: add an `onEditStyle(itemId)` prop and an "Editar estilo" `ContextMenuItem` between Renombrar and Eliminar (a pencil/paint icon from `@hugeicons/core-free-icons`).
- [x] 5.2 `folder-tree.tsx`: add an `onEditItemStyle(itemId, folderId)` prop and the same context-menu item on a slide row, alongside the existing prepare/present/delete items.
- [x] 5.3 `slide-console.tsx`: add an `edit-style` entry to the `bulkActions` `OverflowActions` list, `disabled: !hasSelection` (matching `apply-template`), handled in `runBulkAction` by opening the dialog for `[...selectedItemIds]`.
- [x] 5.4 `slide-console.tsx`: own the dialog's open state as `{ itemIds }` beside the existing `TemplatePickerDialog`, seeded from the last-selected slide for a multi-slide selection; wire `onSave` to a new `onEditStyle(itemIds, override)` prop.
- [x] 5.5 `console-view.tsx`: wire `SlideConsole`'s new `onEditStyle` to `library.applyStyleOverrideToItems(openFolderId, itemIds, override)`, and wire `FolderTree`'s `onEditItemStyle` to open the slide's folder (as `onPrepareTreeItem` does) and then select it so the console's dialog can target it.
- [x] 5.6 Add i18n strings to `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts`: the menu item ("Editar estilo"), the dialog title and a one-line description, and the reset/save/cancel labels.

## 6. Verify

- [ ] 6.1 Run the app: right-click a slide card → "Editar estilo", change only the font size, save. Confirm that slide's card, the preview panel, and `/present` all show the new size, and that the template gallery gained no new template and the slide's own template is unchanged.
- [ ] 6.2 Confirm another slide using the same template is completely unaffected by 6.1.
- [ ] 6.3 Open the dialog again, change the font family and text color, then Cancelar — confirm the slide is unchanged and nothing was written.
- [ ] 6.4 Save an override, reload the app, and confirm it survives; then confirm a project bound to a file gets autosaved after a style save (the save-state indicator moves).
- [x] 6.5 Verified programmatically: with a `fontSize` override in place, editing the template's background changes the slide's background while the overridden size persists.
- [ ] 6.6 Apply a *different* template to the overridden slide and confirm the override still applies on top of the new template.
- [ ] 6.7 Reopen the dialog, use reset, save — confirm the slide returns exactly to its template's look and the item no longer carries a `templateOverride` key in stored data.
- [ ] 6.8 Select three slides, open "Editar estilo" from the three-dot menu, change the text color, save — confirm all three change; with nothing selected, confirm the entry is disabled.
- [ ] 6.9 Open the dialog from a folder-tree slide belonging to a folder that isn't the open one, and confirm that folder opens and the dialog targets the right slide.
- [ ] 6.10 Drag the font size past 96 up to 800 in both the template editor and the per-slide dialog; confirm a short line renders at the chosen size and a long verse auto-fits without clipping in the preview and in `/present`.
- [x] 6.11 Verified structurally: `toProjectFile` passes `folders` through wholesale and `parseProjectFile` strips nothing, so `templateOverride` (living inside `Folder.items`) round-trips by construction — no schema-version bump needed.
- [x] 6.12 Run `pnpm typecheck` and `pnpm lint`. Typecheck clean; `eslint src` clean (exit 0). The 15 remaining repo-wide lint errors are all in the stale `.output/` build directory and pre-date this change; `packages/ui`'s 13 are pre-existing and untouched here.
