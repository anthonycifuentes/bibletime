## Why

The Library sidebar's folder tree (`folder-tree.tsx`) is currently a hand-rolled implementation: custom expand/collapse logic, a hand-written three-zone drag-and-drop hit-test, no keyboard navigation, and no multi-select — all built from scratch on top of `@dnd-kit/core`. Every one of those pieces has needed at least one correctness fix already (missing `collisionDetection`, mis-tuned drop zones, a broken toggle-close). Replacing this hand-rolled layer with `shadcn-treeview` — a generic, accessible TreeView component (recursive expand/collapse with full keyboard navigation, built-in drag-and-drop including depth-projection and cycle-safe drop positions, ARIA tree semantics) — moves that whole surface of bugs onto a maintained, purpose-built component instead of code we keep re-debugging by hand.

## What Changes

- Install `shadcn-treeview` (`npx shadcn@latest add https://ggoggam.github.io/shadcn-treeview/r/tree-view.json`) into `packages/ui`, alongside the app's other shadcn-sourced primitives — adds `@dnd-kit/react` as a new dependency (distinct from the `@dnd-kit/core`/`sortable`/`utilities` already used by the slide console's own drag-and-drop, which is untouched).
- `folder-tree.tsx`'s custom rendering and drag-and-drop (`FolderRow`, `ItemRow`, `resolveDropZone`, `handleDragEnd`, the hand-rolled expand/collapse and three-zone hit-testing) is replaced by a thin wrapper around `TreeView`, mapping our `Folder`/`FolderItem` domain model into the component's generic `TreeNodeNested<T>` shape and supplying our own `renderNode` (icon/label/rename-input/context-menu — the parts of the row that are specific to this app, which the library deliberately leaves to the caller).
- Keyboard navigation (arrow keys, Home/End) and full ARIA tree semantics come "for free" from the library — not something we're building ourselves.
- The library's own depth-projection (`projectedDepth` on every drag event) replaces our hand-computed 35/30/35 zone split for the reparent-vs-reorder decision, and its `canDrop` guard replaces our own pre-check before calling `moveFolder`.
- **BREAKING (internal only):** `use-library.ts`'s `moveFolder`/`moveFolderItem` — built for our previous hand-rolled drag-and-drop — are superseded by a single `applyFolderTree` reconciliation action driven by the library's `onItemsChange` callback (see design.md); the old actions and their `console-view.tsx` wiring are removed as dead code, not left alongside the new path.
- Folder nesting rules already in place (3-level cap, cycle prevention, cascading delete, "New subfolder" from the context menu) are preserved exactly — this change replaces the rendering/interaction layer, not the underlying data model or its constraints.

## Capabilities

### New Capabilities
- `folder-tree-interaction`: keyboard navigation (arrow keys, Home/End), ARIA tree semantics, and selection behavior for the Library's folder tree — capabilities the adopted TreeView component provides that the previous hand-rolled tree did not have at all.

### Modified Capabilities
_None declared as a formal delta — `folder-hierarchy` (nesting cap, cycle prevention, cascading delete, drag-and-drop reorder/reparent) was introduced by `add-nested-folders-drag-drop`, which is still an unarchived, in-progress change, not an archived spec this change can delta against. This change reimplements that capability's drag-and-drop mechanism on top of the newly adopted TreeView (library-driven `onItemsChange`/`canDrop` instead of hand-rolled zone math) without changing its user-visible rules; once both changes are archived, `folder-hierarchy`'s spec should read as if it always described this mechanism — see design.md._

## Impact

- `packages/ui/` — new vendored component files under `src/components/tree-view/` (per the registry's file list: `tree-view.tsx`, `tree-node.tsx`, `tree-drop-indicator.tsx`, plus `hooks/`/`lib/` support files) and a new `@dnd-kit/react` dependency in `packages/ui/package.json`.
- `apps/bibletime/src/modules/library/components/folder-tree.tsx` — rewritten as a `TreeView` wrapper; `FolderRow`/`ItemRow`/`resolveDropZone`/`handleDragEnd`/`flattenVisible` and the hand-rolled expand/collapse logic are removed.
- `apps/bibletime/src/modules/library/lib/build-folder-tree.ts` — `buildFolderTree` (nested-tree construction) is replaced by a mapper from `Folder[]` to `TreeNodeNested<NodeData>[]`; `getFolderDepth`/`getAncestorIds`/`getDescendantIds` are reused as-is (still needed for cycle/depth checks and the open-folder ancestor-expansion behavior).
- `apps/bibletime/src/modules/library/actions/use-library.ts` — `moveFolder`/`moveFolderItem` removed; new `applyFolderTree` action added.
- `apps/bibletime/src/modules/library/views/console-view.tsx` — `onMoveFolder`/`onMoveFolderItem` props removed; new `onApplyFolderTree` wiring added.
- No change to `slide-console.tsx`/`slide-card.tsx` or their `@dnd-kit/core`-based drag-and-drop — that surface is intentionally left as-is.
