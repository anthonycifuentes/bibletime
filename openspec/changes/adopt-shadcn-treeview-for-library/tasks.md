## 1. Install the component

- [x] 1.1 From `packages/ui`, run `npx shadcn@latest add https://ggoggam.github.io/shadcn-treeview/r/tree-view.json` (confirm it lands under `packages/ui/src/components/tree-view/` per that package's `components.json` aliases).
- [x] 1.2 Confirm `@dnd-kit/react` is added to `packages/ui/package.json`, and that it installs cleanly alongside the existing `@dnd-kit/core`/`sortable`/`utilities` in `apps/bibletime/package.json` (different packages, no version conflict expected).
- [x] 1.3 Re-export what's needed (`TreeView`, `TreeNodeNested`, `TreeNodeRenderProps`, `FlatTreeNode`, `TreeDragEvent`, `DropPosition`) from `packages/ui`'s public surface so `apps/bibletime` can import them the same way it imports `Button`/`DropdownMenu`/etc. — already satisfied: `packages/ui`'s `exports` map resolves `@workspace/ui/components/tree-view` directly to the installed file, which already re-exports every type consumers need (lines 594-603).

## 2. Data-model mapping

- [x] 2.1 Define `NodeData` (`{ kind: "folder"; folder: Folder } | { kind: "item"; item: FolderItem }`) in `folder-tree.tsx` or a small adjacent file. — added as `FolderTreeNodeData` in `build-folder-tree.ts`.
- [x] 2.2 Replace `buildFolderTree` in `build-folder-tree.ts` with `foldersToTreeNodes(folders: Folder[]): TreeNodeNested<NodeData>[]` — folder nodes (`isGroup: true`) containing their subfolders (sorted by `position`) followed by their items (in array order) as leaf children.
- [x] 2.3 Keep `getFolderDepth`/`getAncestorIds`/`getDescendantIds` as-is — still used for `canDrop`'s cycle/depth checks and for computing `expandedIds`.

## 3. Library actions

- [x] 3.1 Add `applyFolderTree(tree: TreeNodeNested<NodeData>[])` to `use-library.ts` — implemented using the library's own `flattenTree` helper (from `@workspace/ui/lib/tree-utils`) rather than a hand-rolled recursive walk.
- [x] 3.2 Remove `moveFolder` and `moveFolderItem` from `use-library.ts` (superseded by 3.1) and from its returned actions object.
- [x] 3.3 Update `console-view.tsx`: remove the `onMoveFolder`/`onMoveFolderItem` props passed to `FolderTree`, add `onApplyFolderTree` wired to `library.applyFolderTree`.

## 4. Rewrite `folder-tree.tsx` around `TreeView`

- [x] 4.1 Replace the component body with a `TreeView<NodeData>` instance: `items={foldersToTreeNodes(folders)}`, `onItemsChange={onApplyFolderTree}`, `draggable`, `droppable`, `selectionMode="single"`.
- [x] 4.2 Wire `expandedIds`: computed as `[openFolderId, ...getAncestorIds(folders, openFolderId)]`; `onExpandedIdsChange` intentionally omitted — expand state is fully controlled and driven by `openFolderId`, not toggled independently (verified `useTreeState` respects controlled props exactly: internal state never updates when a controlled prop is passed).
- [x] 4.3 Wire `selectedIds={openFolderId ? [openFolderId] : []}` and `onSelectedIdsChange` to resolve the selected node back to its folder (itself if a folder, its containing folder if an item) and call `onOpenFolder` — selecting the literal open folder closes it; selecting anything else (including one of its own slides) opens the right folder.
- [x] 4.4 Implement `canDrop` — revised from the design doc after reading the actual installed hook (`use-tree-dnd.ts`): cycle prevention is already enforced internally by the library before `onItemsChange` ever fires, so `canDrop` only needs the depth cap (via `projectedDepth`) and the folder/item interleaving rule (a folder can't sit among a folder's slides; a slide can't become a sibling of folders, only "inside" one). Cycle check kept anyway so the drop indicator doesn't promise an invalid move.
- [x] 4.5 Implement `renderNode`: ported the row markup (folder icon that swaps to a chevron on hover, rename input, "New subfolder"/Rename/Delete dropdown menu) and the slide leaf row markup, using the render props (`node`, `isExpanded`, `depth`, `select`) instead of the removed `FolderRow`/`ItemRow` components.
- [x] 4.6 Implement `renderDragOverlay` with a lightweight, non-interactive preview of the dragged row (folder or slide).
- [x] 4.7 Delete the now-unused `FolderRow`, `ItemRow`, `flattenVisible`, `resolveDropZone`, `handleDragOver`/`handleDragEnd`/`handleFolderDragEnd`/`handleItemDragEnd`, and the manual `DndContext`/`SortableContext`/`PointerSensor` wiring — the whole file was rewritten from scratch.

## 4b. Fix vendored component bugs found while integrating (not in original task list)

- [x] 4b.1 Fix a real type mismatch between the vendored `use-tree-dnd.ts` and the installed `@dnd-kit/react@0.5.0`: `handleDragStart`/`handleDragOver`/`handleDragEnd` were mistyped as literally *being* the event-payload type (`: DragStartEvent`) instead of functions accepting it (`(event: DragStartEvent) => void`) — a genuine bug surfaced by `tsc`, not a stylistic preference; the registry component was apparently authored against an older `@dnd-kit/react` API shape.
- [x] 4b.2 Fix the resulting lint errors in the vendored files (`use-tree-dnd.ts`, `tree-context.ts`, `tree-utils.ts`, `tree-types.ts`, `tree-view.tsx`): `import()` type annotations replaced with top-level type imports, two now-unnecessary truthy checks removed/fixed (one via `Array.prototype.at()` for a correctly-typed possibly-`undefined` result), and several stale `eslint-disable` comments removed (the rules they suppressed don't fire under this repo's config).
- [x] 4b.3 Fix (two passes) — dragging didn't work when grabbing anything other than a bare sliver of the row, because `tree-node.tsx` never set a drag `handle` at all: `@dnd-kit/dom`'s `PointerSensor` refuses to start a drag from any interactive element (button) unless it's inside an explicit handle. First attempt wired `handleRef` to the *same* node as the row — this broke ordinary clicks instead (every click on any button instantly activated a zero-movement "drag" once handle === row, since the sensor then binds its listener only to the handle and skips the click-vs-drag delay/distance safety net for it — read by the user as "the tree won't open"). Corrected by adding a `handleRef` render prop to `TreeNodeRenderProps` (not present upstream) and attaching it to a dedicated grip element in `folder-tree.tsx`'s `renderNode`, separate from the toggle/name/menu buttons — see design.md Decision 8.
- [x] 4b.4 Visual polish requested after comparing against a different tree example: chevron is now permanently visible (rotates on expand) instead of hover-swapped with the folder icon; hover/selected background uses a `transition-colors duration-200` fade instead of an instant swap; the "..." menu also stays visible whenever that folder is the currently open one, not just on row hover.
- [x] 4b.5 Added a dedicated grip handle (a small icon, always dimly visible, brightening on row hover) to both folder and slide rows, per the fix in 4b.3.
- [x] 4b.6 Reverted 4b.4's chevron: removed entirely per follow-up request (not hover-swapped this time — gone in every state), folder icon shrunk to `size={16}`, and the "..." hover-reveal dropdown replaced with a right-click/long-press `ContextMenu` (installed via `shadcn add context-menu`, which — like `DropdownMenu` — resolves to this project's Base UI-based "base-maia" style, not the generic Radix version shown in the public shadcn docs) wrapping the whole row. The slide-icon (`StarSquareIcon`) was removed from slide rows too, leaving just the grip and label.

## 4c. Slide prepare/present/delete parity between the sidebar tree and the console grid (feature addition, not in original task list)

- [x] 4c.1 Generalized `console-view.tsx`'s present logic: `presentFolderItem(folderId, itemId)` resolves a slide from `library.folders` directly instead of the (possibly stale, if a different folder was just opened in the same handler) `openedFolder` closure — needed because a sidebar-tree slide's folder isn't necessarily the one currently open.
- [x] 4c.2 Added `onPrepareTreeItem`/`onPresentTreeItem` (open the slide's folder, select it, and — for present — immediately send it to output) and wired them into `FolderTree` as new `onPrepareItem`/`onPresentItem` props, alongside `onDeleteItem` (`library.removeFolderItems(folderId, [itemId])`).
- [x] 4c.3 `folder-tree.tsx`: single-click on a slide row now calls `onPrepareItem` (previously just opened the folder without marking the slide "ready"); double-click calls `onPresentItem`; added a `ContextMenu` (Prepare / Present / Delete) to slide rows, mirroring the one already on folder rows.
- [x] 4c.4 Added the same three-action `ContextMenu` to `SlideCard` in the console grid (right-click/long-press), reusing its existing `onSelect`/`onPresent` handlers plus a new `onDelete` prop — wired in `slide-console.tsx` as `onRemove([itemId])`, so no new `console-view.tsx` wiring was needed for the console-grid delete path.
- [x] 4c.5 Added `library.prepareSlide`/`library.deleteSlide` i18n keys (en/es/pt); reused the existing `library.present` key for both surfaces' "Present" action.

## 5. Verification

- [ ] 5.1 Run the app and manually verify every existing behavior still works through the new component: creating a subfolder at each of the 3 levels, disabled "New subfolder" at the deepest level, reordering root and nested folders by drag, reparenting by drop, a rejected drop at the depth cap, a rejected drop that would create a cycle, cascading delete, clicking an open folder to close it, and dragging slides within/across folders.
- [ ] 5.2 Verify keyboard navigation (arrow keys, Home/End) moves focus between visible rows, and that assistive tech (e.g. a browser's accessibility inspector) reports `tree`/`treeitem` roles and `aria-expanded`/`aria-selected` states correctly.
- [ ] 5.3 Verify existing (pre-change) folders with no `parentId`/`position` still render correctly.
- [x] 5.4 Run typecheck and lint for the touched packages (`packages/ui`, `apps/bibletime`) — both clean; remaining lint output in `packages/ui` is pre-existing, unrelated debt (`button.tsx`, `empty.tsx`, `input.tsx`, `pill.tsx`, `sidebar.tsx`, `slider-comfortable.tsx`, `tabs.tsx`, `utils.ts`).
