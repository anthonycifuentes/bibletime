## 1. Data model

- [x] 1.1 Add `parentId: string | null` and `position: number` to `Folder` (`apps/bibletime/src/modules/library/interfaces/index.ts`).
- [x] 1.2 Confirm both storage drivers (`web-library-storage.ts`, desktop's `apps/desktop/src/main.ts` folder handlers) round-trip these new fields unchanged — no driver code should need to change, since both already persist/return whatever fields a `Folder` object has.

## 2. Tree-building helper

- [x] 2.1 Create `apps/bibletime/src/modules/library/lib/build-folder-tree.ts`: a pure `buildFolderTree(folders: Folder[])` that groups by `parentId` (`null` → root), sorts each sibling group by `position` (falling back to original array index when `position` is missing), and returns a nested `{ folder: Folder; children: TreeNode[] }[]` structure.
- [x] 2.2 Add a small helper to compute a folder's depth (0 for root) and its ancestor-id chain by walking `parentId`, for use by both the "New subfolder" disabled state and the auto-expand-ancestors logic.

## 3. Library actions

- [x] 3.1 Extend `createFolder` in `use-library.ts` to accept an optional `parentId` (defaulting to `null`), threading it onto the new `Folder` record alongside a computed `position` (end of its sibling group).
- [x] 3.2 Add `moveFolder(folderId, newParentId, newIndex)`: validate (reject self-parenting, reject moving into one of the folder's own descendants, reject if the resulting depth would exceed the 3-level cap), then recompute and persist sequential `position` values for the destination sibling group (and the origin group too, if the parent changed), saving only the folders whose `parentId`/`position` actually changed.
- [x] 3.3 Update `deleteFolder` (or wrap it) to cascade: collect the target folder plus every descendant (via the same parentId-walk helper), and remove all of them.
- [x] 3.4 Expose `moveFolder` from `use-library.ts`'s returned object alongside the existing actions.

## 4. FolderTree rendering

- [x] 4.1 Replace `folder-tree.tsx`'s flat `folders.map(...)` with a recursive render over `buildFolderTree(folders)`, indenting each level (e.g. `pl-4` per depth) and passing depth down.
- [x] 4.2 Add "New subfolder" to each folder's dropdown menu, calling `createFolder(name, folder.id)` via a small inline create-form (reuse the existing root-level create-folder input pattern), disabled when `depth(folder) >= 2`.
- [x] 4.3 Change the expand/collapse condition from `folder.id === openFolderId` to `folder.id === openFolderId || isAncestorOf(folder.id, openFolderId)`, using the depth/ancestor helper from 2.2.

## 5. Drag-and-drop

- [x] 5.1 Wrap the tree's visible rows in a `DndContext` + `SortableContext` (reusing the same `PointerSensor` activation-distance pattern already used in `slide-console.tsx`), where the sortable items list is exactly the currently-visible folder rows (root folders plus the single expanded branch, per task 4.3).
- [x] 5.2 Implement the zone hit-testing in `onDragOver`/`onDragEnd`: compare the pointer's Y offset within the hovered row's measured rect against thresholds to decide "insert before sibling" / "insert after sibling" / "reparent as child" — rebalanced to 35%/30%/35% after real-world testing showed the initial 25%/50%/25% split made reordering nearly impossible to hit (see 5.5).
- [x] 5.3 On drop, call `moveFolder` with the resolved `newParentId`/`newIndex`; show no drop indicator (or a "not-allowed" cursor) when the hovered target would violate the depth cap or create a cycle, computed client-side before calling `moveFolder` so invalid drops don't even attempt a write.
- [ ] 5.4 Verify dragging a folder onto a collapsed (not-expanded) row's middle zone still reparents correctly, even though that row's children aren't currently rendered.
- [x] 5.5 Fix: add `collisionDetection={closestCenter}` to the `DndContext` — without it, dnd-kit's default `rectIntersection` made sibling reordering unreliable for thin, tightly-packed rows (root folders "couldn't be reordered" while nesting "worked fine," reported after first testing pass).
- [x] 5.6 Fix: remove the separate hover-only grip button (too easy to miss entirely) — the whole row is now the drag handle, relying on `PointerSensor`'s 4px activation distance to distinguish a plain click from an actual drag.
- [x] 5.7 Fix: clicking an already-open folder now closes it — the click handler toggles on the literal `folder.id === openFolderId`, not the ancestor-inclusive `isExpanded` check (which made a second click on an open folder a no-op).
- [x] 5.8 Redesign: the folder icon swaps to a chevron on row hover (toggling expand/collapse) instead of a permanently separate chevron button, per requested compact/Notion-style layout; tightened row/list spacing throughout.

## 6. Slide drag-and-drop (added after initial testing — extends scope beyond the original proposal)

- [x] 6.1 Add `moveFolderItem(itemId, fromFolderId, toFolderId, newIndex)` to `use-library.ts`: same-folder move is a single `save` (like `reorderFolderItems` for one item); cross-folder move is two `save`s (remove from origin, insert into destination).
- [x] 6.2 Expose `moveFolderItem` from `use-library.ts` and wire `onMoveFolderItem` through `console-view.tsx`.
- [x] 6.3 Make slide rows in the sidebar tree sortable (`ItemRow`, its own `useSortable`), sharing the same `SortableContext`/`DndContext` as folders — distinguish dragged/target kind by id membership (`folderIds.has(id)`) rather than a second `DndContext`.
- [x] 6.4 Generalize `resolveDropZone`/`handleDragEnd`: a slide target only splits before/after (no nesting concept); a folder target hovered while dragging a slide always appends to that folder's end regardless of zone; a folder dragged onto a slide row is rejected outright before computing a zone.

## 7. Verification

- [ ] 7.1 Run the app and manually verify: creating a subfolder at each of the 3 levels, disabled "New subfolder" at the deepest level, reordering root and nested siblings by drag, reparenting by drop-onto, a rejected drop at the depth cap, a rejected drop that would create a cycle, cascading delete of a folder with subfolders, clicking an open folder to close it, and dragging slides both within and across folders.
- [ ] 7.2 Verify existing (pre-change) folders with no `parentId`/`position` still render correctly as a flat root-level list before any drag is performed on them.
- [x] 7.3 Run typecheck and lint for the touched packages.
