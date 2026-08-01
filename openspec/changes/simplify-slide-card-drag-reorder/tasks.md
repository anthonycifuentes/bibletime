## 1. Dependencies

- [x] 1.1 ~~Confirm `motion` version...~~ **Superseded** — `motion`'s `Reorder` turned out to be unsuitable for a wrapping multi-column grid (see design.md's revised Decisions section: single-axis swap algorithm + async/sync timing mismatch caused dragged cards to land in the wrong position). Switched to `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, added to `apps/bibletime/package.json`; `motion` removed from the same file (it had only been added for this feature).

## 2. `SlideCard` — preview-only card with drag handle

- [x] 2.1 In `apps/bibletime/src/modules/library/components/slide-card.tsx`, remove the footer block (index number, reference/type text, up/down/remove buttons) so the card renders only the `SlidePreview`.
- [x] 2.2 ~~Wrap the card root in `Reorder.Item`...~~ **Superseded** — used `@dnd-kit/sortable`'s `useSortable({ id: item.id })` instead: `setNodeRef`/`transform`/`transition` on the card root (via `CSS.Transform.toString`), `attributes`/`listeners` on the drag handle only (the documented "drag handle" pattern).
- [x] 2.3 Add a floating drag-handle icon (`GripVerticalIcon` from `@hugeicons/core-free-icons`) absolutely positioned above the card's upper-right corner; spread `{...attributes} {...listeners}` onto it (`touch-none` to prevent touchscroll interference).
- [x] 2.4 Verify clicking the card body (not the handle) still calls `onSelect` and does not start a drag. (`listeners`/`attributes` are scoped only to the handle button, so the card body never sees drag listeners.)
- [x] 2.5 Remove the now-unused `isFirst`/`isLast`/`onMove`/`onRemove` props from `SlideCardProps` and the component body.

## 3. `SlideConsole` — grid reordering and bulk remove

- [x] 3.1 In `apps/bibletime/src/modules/library/components/slide-console.tsx`, wrap the grid in `DndContext` (`PointerSensor` with `activationConstraint: { distance: 4 }`, `closestCenter` collision detection) and `SortableContext` (`rectSortingStrategy` — correctly handles a wrapping multi-column grid, unlike single-axis `Reorder`).
- [x] 3.2 Replace the `onMove` prop with `onReorder(itemIds: string[])`, called once from `DndContext`'s `onDragEnd` using `arrayMove(folder.items, oldIndex, newIndex)` — not on every intermediate drag step, so the async persistence call is no longer in the drag's hot path.
- [x] 3.3 Add a "Remove selected" button to the header toolbar (next to "Select all" / "Clear selection" / "Apply template"), enabled only when `hasSelection`, calling `onRemove` with the full selected id set.
- [x] 3.4 Update `SlideConsoleProps` to drop `onMove` and change `onRemove`'s signature to accept multiple ids. Chose batching (`onRemove(itemIds: string[])`) for an atomic parent-state update rather than calling a single-id `onRemove` in a loop.

## 4. Parent wiring

- [x] 4.1 In `apps/bibletime/src/modules/library/views/console-view.tsx`, replace the `onMove` handler with an `onReorder(itemIds)` handler that persists the new item order to the folder. Backed by a new `reorderFolderItems(folderId, itemIds)` in `use-library.ts` (replacing the old up/down-only `reorderFolderItem`).
- [x] 4.2 Update the `onRemove` handler to accept and process the selected ids as a batch. Backed by a new `removeFolderItems(folderId, itemIds)` in `use-library.ts` (replacing `removeFolderItem`).

## 5. i18n cleanup

- [x] 5.1 Remove `library.moveUp` / `library.moveDown` keys from `en.ts`, `es.ts`, `pt.ts` in `apps/bibletime/src/modules/core/i18n/dictionaries/`.
- [x] 5.2 Add a `library.removeSelected` key (and translations) to the same three dictionary files, used by the new toolbar button's label. Also renamed the now-unused per-card `library.removeItem` key to `library.removeSelected` (same wording, reused rather than duplicated) and added `library.dragToReorder` for the drag handle's `sr-only` text.

## 6. Verification

- [x] 6.1 Manually test: drag a card by its handle to reorder within the grid at each responsive breakpoint (1/2/3/4 columns), confirming a card can be dropped at the first, a middle, and the last position. **User-confirmed working** after the `@dnd-kit` switch.
- [x] 6.2 Manually test: click a card body (not the handle) still toggles selection without starting a drag. **User-confirmed working.**
- [ ] 6.3 Manually test: select one and multiple slides, use "Remove selected", confirm only selected slides are removed. **Not performed** — no browser automation tool is available in this environment; still needs manual verification.
- [x] 6.4 Run `pnpm --filter web typecheck` and `pnpm --filter web lint` to confirm no type/lint regressions. Both pass (pre-existing, unrelated errors in in-progress multi-project files are not from this change). Also booted the dev server and confirmed `/library` renders with no SSR errors before shutting it down.

## 7. Card polish (follow-up from user feedback after drag-and-drop landed)

- [x] 7.1 Fix the selection ring being invisible: `overflow-hidden` and the `ring`/selection classes were on the same element, and `overflow-hidden` clips that element's own box-shadow (which is how Tailwind's `ring` utility is implemented). Split into an outer wrapper (ring + `rounded-3xl`, no `overflow-hidden`) and an inner wrapper (`overflow-hidden` + `rounded-3xl`, clips the preview only).
- [x] 7.2 Add a label row below the preview, inside the same rounded card: shows `content.reference` (the verse reference, e.g. "Juan 3:16", populated automatically for `bible-passage` items via `resolveFolderItemContent`) and stays blank (a non-breaking space, to keep row height consistent across cards in the grid) for `song`/`media` items, which have no `reference`.
- [x] 7.3 Re-verified `pnpm --filter web typecheck` and `pnpm --filter web lint` pass, and the dev server boots and serves `/library` with no errors.
- [x] 7.4 **Follow-up fix**: the ring was still invisible for cards flush against the grid's scroll-container edge. Root cause: `slide-console.tsx`'s scroll wrapper sets only `overflow-y-auto`; per the CSS overflow spec, if one axis is non-`visible` and the other is `visible`, the `visible` one computes to `auto` too — so the container implicitly clips horizontally, cutting off the outset `ring-offset` ring on edge cards. Fixed by switching from an outset ring (`ring-offset-2 ring-offset-background`) to `ring-inset`.
- [x] 7.5 **Second follow-up fix**: `ring-inset` turned out to make the ring invisible everywhere, not just at edges. Root cause: per the CSS box-shadow spec, an inset shadow paints *underneath* the element's own children — and the preview + label fill the card edge-to-edge with no gap, so they fully covered the ring on every card, not only ones at the grid edge. Replaced the box-shadow-based ring entirely with a real CSS `border` (matching the convention already used by `packages/ui/src/components/button.tsx`/`input.tsx`): a `border` reserves its own space in the box model (`box-sizing: border-box`), so children lay out inside it and structurally cannot paint over it, and it isn't a box-shadow at all, so no ancestor overflow clipping applies either. This also let the two-level wrapper split from 7.1 collapse back into a single element (`overflow-hidden` + `border` + `rounded-3xl` together are safe on the same element — only combining `overflow-hidden` with a box-shadow ring was the problem).
- [ ] 7.6 Manually confirm in a real browser: the selection border is visible for every card position (including the first/last column, flush against the grid edge), on both hover and selected state, and the label shows the verse reference for Bible-passage slides and stays blank for others. **Not performed** — no browser automation tool available in this environment.
