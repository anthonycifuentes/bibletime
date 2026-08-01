## Context

`SlideCard` (`apps/bibletime/src/modules/library/components/slide-card.tsx`) currently renders a bordered card: `SlidePreview` on top, then a footer with index number, reference/type text, and up/down/remove icon buttons. `SlideConsole` lays these out in a responsive CSS grid and drives `onMove`/`onRemove` per card.

The card needs to shrink to just the preview. Reordering moves from per-card up/down buttons to whole-grid drag-and-drop, signaled by a drag-handle icon floating above the card's upper-right corner. Removal, no longer having a per-card button to live on, moves to a bulk action in the existing selection toolbar.

## Goals / Non-Goals

**Goals:**
- `SlideCard` renders the live preview, a selection-state ring, the floating drag handle, and a single-line label below the preview (verse reference for Bible passages, blank otherwise) — no other chrome.
- Reordering works by dragging a card to a new position in the grid; the drag handle icon is the only initiator (clicking the card body still selects, not drags).
- Keep the existing responsive grid (`grid-cols-1 @sm:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4`).
- No new runtime dependency if a dependency already in the workspace can do the job.
- The selection ring must actually be visible when a card is selected.

**Non-Goals:**
- Cross-container drag (e.g. dragging a slide into a different folder). Only within-grid reordering.
- Touch-specific gesture design beyond what the chosen library provides out of the box.
- Keyboard-only reordering (e.g. "move via arrow keys while focused") — out of scope for this change; can be a follow-up if accessibility feedback calls for it.

## Decisions

### Reordering library: `@dnd-kit`, not `motion`'s `Reorder` (revised after implementation)

Originally evaluated three options and picked `motion`'s `Reorder.Group`/`Reorder.Item` for being a zero-new-dependency fit. That choice turned out to be wrong once wired into the actual grid, for two reasons found by reading `motion`'s source (`Reorder/Group.mjs`, `Reorder/utils/check-reorder.mjs`) after observing broken behavior (dragged cards "piling up" at the front instead of landing where dropped):

1. **Axis-locked, single-neighbor swapping.** `Reorder.Group`'s algorithm sorts items by position along one `axis` ("y" here) and, on drag, only ever swaps the dragged item with its immediate neighbor in that sorted order — one hop per detected crossing. It has no concept of a 2D grid; a wrapping multi-column layout has no single axis whose sort order matches the visual grid position, so cross-row/cross-column drops land somewhere unpredictable rather than at the actual drop target.
2. **Sync/async mismatch.** `Reorder.Group` gates further reorder detection behind an `isReordering` flag that only resets on the *next render* of the group. Our `onReorder` handler persists to storage asynchronously (`await storage.save(...)` then `await refresh()`), so the gate stayed set for the full async round-trip; several drag steps queued up and resolved all at once when the save finally completed, which is exactly the "pile up at the front" symptom reported.

Both problems are inherent to `Reorder` being built for a single-axis list, not a wrapping grid — no amount of local tuning fixes them for this layout.

Switched to `@dnd-kit/core` + `@dnd-kit/sortable` (+ `@dnd-kit/utilities`), using `rectSortingStrategy`, which does real 2D closest-center collision detection — designed explicitly for grid layouts, so a card can be dropped at any position (first, middle, last, any row/column) correctly. It also only needs to know the final order once, in `onDragEnd`, so the async persistence path is no longer in the hot path of every drag step — no local-state buffering needed to work around timing.

| Library | Bundle cost | Fit here |
| --- | --- | --- |
| `@dnd-kit` (`core` + `sortable` + `utilities`) | ~10-15kb gzip across 3 packages | **Chosen.** `rectSortingStrategy` does 2D collision detection, correctly supporting a wrapping grid; `onDragEnd` fires once per gesture, matching our async-persistence data flow. |
| `motion` (`Reorder.Group`/`Reorder.Item`) | Zero new dependency (already installed in `@workspace/ui`) | **Rejected** — single-axis only; incompatible with a wrapping multi-column grid (see above). Still a reasonable choice for a true single-column/single-row list. |
| `@atlaskit/pragmatic-drag-and-drop` | Smallest core (~4.7kb), framework-agnostic | No built-in sortable-grid strategy; would require hand-rolling the same 2D collision detection `@dnd-kit/sortable` already provides. |

`motion` was removed from `apps/bibletime/package.json` (it had only been added for this feature); `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` were added instead.

### Drag handle placement and interaction

- `SlideCard`'s root wraps in a `position: relative` container so the handle can be positioned with `absolute -top-<n> right-0` (or similar), rendering above the card's top edge, right-aligned, as the proposal specifies ("above the card in the upper right corner").
- Handle icon: `GripVerticalIcon` from `@hugeicons/core-free-icons` — already the icon set used throughout `slide-card.tsx`, no new icon dependency.
- The handle is the exclusive drag trigger: `@dnd-kit/sortable`'s `useSortable()` returns `attributes`/`listeners` (event bindings + ARIA) and `setNodeRef`/`transform`/`transition` (positioning) separately. Per `@dnd-kit`'s documented "drag handle" pattern, `attributes` and `listeners` are spread only onto the handle `<button>`, while `setNodeRef`/`transform`/`transition` apply to the card's root element. This keeps the rest of the card's click-to-select behavior (`onSelect`) working unchanged, and avoids making the whole card a keyboard-focusable "sortable" control.
- The handle needs `touch-action: none` (Tailwind's `touch-none`) so touchscreen dragging doesn't fight the browser's own scroll gesture.

### Removal moves to the selection toolbar

- `SlideCard` drops its per-card remove button entirely (nothing left to attach it to, per the proposal).
- `SlideConsole`'s header toolbar (which already conditionally shows "Clear selection" when `hasSelection`) gains a "Remove selected" button, calling the existing `onRemove` once per selected id (or a new `onRemoveMany(itemIds: string[])` if the parent's removal logic benefits from a single batch call — implementer's choice, but prefer batching to avoid N intermediate state updates).
- Single-item removal is just "select one card, click Remove" — one extra click and a header button vs. today's inline delete icon; consistent with how selection already gates "Apply template".

### Reorder callback shape

- Replace `onMove(itemId, direction: "up" | "down")` with `onReorder(itemIds: string[])`, called once from `DndContext`'s `onDragEnd` with the full new order (computed via `@dnd-kit/sortable`'s `arrayMove(folder.items, oldIndex, newIndex)`), not on every intermediate drag step.
- The caller (parent hook/view supplying these props to `SlideConsole`) persists the new order by writing `itemIds` back to the folder's stored item order — this can safely be async, since it's only called once per completed gesture.
- `DndContext` uses `PointerSensor` with a small `activationConstraint: { distance: 4 }` so a plain click on the handle doesn't briefly register as a zero-distance drag.

### Selection ring visibility, and a reference label (follow-up polish)

Two rounds of user feedback after the drag-and-drop mechanics landed:

- **Selection ring was invisible.** The card's clickable/selectable wrapper had both `overflow-hidden` (to clip the preview to its rounded corners) and the `ring`-based selection classes on the *same* element. Tailwind's `ring` utility is a box-shadow, and `overflow-hidden` clips an element's own box-shadow along with its content — so the ring was rendered but immediately clipped to invisibility. Fixed by splitting the card into two nested wrappers: an outer one carrying the ring/selection classes and `rounded-3xl` (no `overflow-hidden`), and an inner one carrying `overflow-hidden rounded-3xl` around the preview and label. This is a general pattern, not specific to `@dnd-kit` — same fix would apply regardless of the drag library.
- **Reference label reinstated, narrower than before.** The original footer (index, reference, type badge, buttons) was fully removed earlier in this change. User feedback asked for a single label line back, showing the Bible verse reference where available (`content.reference`, populated automatically by `resolveFolderItemContent` for `bible-passage` items) and left blank for `song`/`media` items (which have no `reference`). This directly narrows the "Removing the reference/type text..." risk noted below — the reference half of that concern is now addressed; type/index/buttons remain removed.

## Risks / Trade-offs

- **[Risk, partially mitigated] Removing the reference/type text from the card reduces at-a-glance identification of each slide.** → A reference label was reinstated below the preview per user feedback (see Decisions above), addressing the Bible-verse case. Type/index/buttons remain removed as originally intended.
- **[Risk] `@dnd-kit`'s default sensors don't include a keyboard sensor in this implementation, so reordering is pointer/touch-only.** → Mitigation: accepted as a Non-Goal for this change (`@dnd-kit` does support a `KeyboardSensor` — unlike `motion`'s `Reorder` — so this is a straightforward follow-up if accessibility feedback calls for it, without changing libraries again).
- **[Risk] Batching remove into a toolbar action is one more click for the single-item case (previously a direct icon click on the card).** → Mitigation: accepted trade-off for a cleaner card; consistent with the already-selection-gated "Apply template" flow.
- **[Risk, resolved during implementation] Initial choice of `motion`'s `Reorder` for the grid caused cards to land in the wrong position ("piling up" at the front) instead of the drop target.** → Root-caused to `Reorder`'s single-axis, single-neighbor-swap algorithm combined with an async persistence handler (see Decisions above). Resolved by switching to `@dnd-kit/sortable`'s `rectSortingStrategy`, which does 2D collision detection and only commits the order once, on drop.

## Migration Plan

1. Update `slide-card.tsx`: strip the footer, wire `useSortable()` (from `@dnd-kit/sortable`) with `attributes`/`listeners` on the drag handle and `setNodeRef`/`transform`/`transition` on the card root.
2. Update `slide-console.tsx`: wrap the grid in `DndContext` (`PointerSensor`, `closestCenter`) + `SortableContext` (`rectSortingStrategy`), compute the new order via `arrayMove` in `onDragEnd`, add "Remove selected" to the toolbar, drop the `onMove` prop.
3. Update the parent that supplies these props (e.g. the library/console route or its controlling hook) to implement `onReorder(itemIds)` (persist new order) and adapt `onRemove` usage to the bulk call.
4. Remove now-unused `library.moveUp` / `library.moveDown` i18n keys; add `library.removeSelected` and `library.dragToReorder`.
5. Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to `apps/bibletime/package.json`; remove `motion` (only added for this feature, no longer used once the library switched).
6. No data migration needed — item order is already stored as an ordered array; this only changes how reordering is triggered from the UI.

## Open Questions

- Should "Remove selected" require a confirmation (e.g. for multi-select bulk delete), or match today's no-confirmation per-item delete? Defaulting to no confirmation, consistent with current behavior, unless the user prefers otherwise.
- Exact drag-handle icon (`GripVerticalIcon` vs `DragDropVerticalIcon`) — either works; pick during implementation based on visual review.
