## Context

`folder-tree.tsx` currently hand-rolls everything a tree UI needs: `buildFolderTree`/`flattenVisible` (nested-tree construction and visible-row flattening), expand/collapse (derived from `openFolderId` plus an ancestor walk), and drag-and-drop (`FolderRow`/`ItemRow` each with their own `useSortable`, a hand-computed 35/30/35 vertical-zone hit-test in `resolveDropZone`, and manual `moveFolder`/`moveFolderItem` calls in `handleDragEnd`). Every one of these has needed a correctness fix already this session: a missing `collisionDetection` that made sibling reordering nearly impossible, a toggle-close bug from conflating "expanded" with "the literal open folder," and a discoverability problem with a too-subtle drag handle. None of this is specific to our domain — it's generic tree-UI plumbing we happen to have built by hand.

`shadcn-treeview` (registry at `https://ggoggam.github.io/shadcn-treeview/r/tree-view.json`, confirmed via fetch) vendors ~2,000 lines across `tree-view.tsx`, `tree-node.tsx`, `tree-drop-indicator.tsx`, and `hooks/`/`lib/` support files, with exactly one new dependency: `@dnd-kit/react` — a distinct package from the `@dnd-kit/core`/`sortable`/`utilities` already used by `slide-console.tsx`'s own (unrelated, untouched) slide-reordering. Its actual exported types (fetched from the registry, not just the pasted README):

```ts
interface TreeNodeNested<T> { id: string; data: T; isGroup?: boolean; children?: TreeNodeNested<T>[] }
interface FlatTreeNode<T> { id: string; data: T; isGroup: boolean; childrenLoaded: boolean; parentId: string | null; depth: number; index: number }
type DropPosition = "before" | "after" | "inside"
interface TreeDragEvent<T> { source: FlatTreeNode<T>; sourceTreeId: string; target: FlatTreeNode<T>; targetTreeId: string; position: DropPosition; projectedDepth: number }
```

`onItemsChange(items: TreeNodeNested<T>[])` fires with the **entire new nested tree already reordered/reparented** — not an incremental delta — and `canDrop(event: TreeDragEvent<T>): boolean` is evaluated synchronously per hovered target, receiving `projectedDepth` (the library's own depth calculation) directly, which replaces our hand-computed zone math entirely.

Our domain model is two-level in a way the library's tree is not: a `Folder` has both a `parentId`/`position` (its place among sibling *folders*) and a separate `items: FolderItem[]` array (its slides, a different kind of node entirely, never nested further). The library models one homogeneous tree of nodes; we need a discriminated node-data shape (`{ kind: "folder"; folder: Folder } | { kind: "item"; item: FolderItem }`) and, critically, a reconciliation step that splits each returned folder node's `children` back into "the subfolders among them" and "the items among them" — see Decision 3.

## Goals / Non-Goals

**Goals:**
- Replace `folder-tree.tsx`'s hand-rolled rendering, expand/collapse, and drag-and-drop with a thin wrapper around `TreeView`.
- Preserve every existing user-visible rule exactly: 3-level nesting cap, cycle prevention, cascading delete, "New subfolder" from the context menu, clicking an open folder to close it, dragging slides within/across folders.
- Gain keyboard navigation and ARIA tree semantics "for free" — not re-implemented by hand.
- Remove the now-superseded `moveFolder`/`moveFolderItem` actions and their zone-math call sites rather than leaving two parallel drag-and-drop code paths in the codebase.

**Non-Goals:**
- Enabling `selectionMode="multiple"` (Ctrl/Shift-click, range-select, Ctrl+A) — the library supports it, but the sidebar tree only ever needs single "open folder" semantics today; multi-select bulk folder operations would be a separate, later change if ever wanted.
- Lazy loading (`loadChildren`) — every folder's full contents are already in memory via `useLibrary`; nothing here is fetched on demand.
- Cross-tree drag-and-drop (`TreeViewDndContext`) — there is exactly one tree (the sidebar); this is irrelevant here.
- Changing `slide-console.tsx`/`SlideCard`'s own `@dnd-kit/core`-based drag-and-drop — untouched, a separate surface.
- Changing any nesting/depth/cycle/cascade *rules* — only the mechanism that enforces and drives them changes.

## Decisions

**1. Install into `packages/ui`, not `apps/bibletime`.**
`apps/bibletime/components.json` points its `components` alias at `@/modules/core/components`, a directory that doesn't exist — every other shadcn-sourced primitive in this codebase (`Button`, `DropdownMenu`, `Collapsible`, etc.) actually lives in `packages/ui/src/components`, installed via `packages/ui/components.json`. Following that established convention, `shadcn-treeview` installs there too, exposed as `@workspace/ui/components/tree-view`, with `@dnd-kit/react` added to `packages/ui/package.json` (a package that previously had zero drag-and-drop dependencies — worth noting, but not a blocker: it's exactly the kind of generic, reusable primitive `packages/ui` exists for).

**2. Node data shape: a discriminated union mirroring the current `TreeRow` type, not two parallel trees.**
```ts
type NodeData =
  | { kind: "folder"; folder: Folder }
  | { kind: "item"; item: FolderItem }
```
A mapper (`foldersToTreeNodes(folders: Folder[]): TreeNodeNested<NodeData>[]`, replacing `buildFolderTree`) builds the nested `TreeNodeNested<NodeData>[]` the library expects: each folder becomes `{ id: folder.id, data: { kind: "folder", folder }, isGroup: true, children: [...subfolders..., ...items as leaf nodes...] }`, sorted by `position`/array-order exactly as `buildFolderTree` already sorts today. Subfolders are ordered before items within a folder's `children` (folders-before-files, matching the current visual convention) — order within each kind is what round-trips through drag-and-drop; the *boundary* between the two kinds is not something the user drags across (see Decision 4's `canDrop` rules).

**3. `onItemsChange` reconciles the *whole* returned tree into persisted state — replacing `moveFolder`/`moveFolderItem`'s single-item, delta-based writes with one whole-tree-snapshot write via a new `applyFolderTree` action, built on the library's own `flattenTree`.**
The library hands back the entire nested tree after every completed drag, not "this one node moved from X to Y" — trying to reverse-engineer a minimal delta from that snapshot (to keep reusing `moveFolder`/`moveFolderItem`'s narrow signatures) would be more code than just trusting the snapshot directly. `packages/ui/src/lib/tree-utils.ts` (installed alongside the component, not something we wrote) already exports `flattenTree`, which turns a `TreeNodeNested<T>[]` into a flat array with `parentId`/`index` precomputed per node — `applyFolderTree(tree: TreeNodeNested<NodeData>[])` uses it directly instead of hand-walking the nested structure:
1. `flattenTree(tree)`, then group the flat nodes by `(parentId, data.kind)` — folders and items are counted *separately* even when they share a parent, since they're stored as separate concepts (a folder's `parentId`/`position` vs. its own `items` array), and `flattenTree`'s own `index` mixes both kinds together.
2. Each group's position in the flattened order becomes that node's new `position` (folders) or its slot in the reconciled `items` array (items).
3. Persists via `storage.save` for every folder whose `parentId`/`position`/`items` actually changed versus the current in-memory state (a plain equality check per folder — still one `save` per *changed* folder, not per node in the tree, so this isn't a regression from `moveFolder`'s "only write what changed" behavior, just computed from a full snapshot instead of a targeted move).
`moveFolder` and `moveFolderItem` (and their `console-view.tsx` wiring) are deleted — they have no remaining caller once `onItemsChange`/`applyFolderTree` is wired up, and leaving them would mean two ways to persist a reorder that could drift out of sync.

**4. Depth cap, cycle prevention, and folder/item interleaving are all enforced in one `canDrop`, using the library's own `projectedDepth` instead of hand-computed zones.**
```ts
canDrop = (event: TreeDragEvent<NodeData>) => {
  const sourceIsFolder = event.source.data.kind === "folder"
  const targetIsFolder = event.target.data.kind === "folder"

  if (sourceIsFolder) {
    if (!targetIsFolder) return false // a folder only reorders among folders, or nests inside one
    if (event.projectedDepth > MAX_DEPTH) return false // 3-level cap
    if (getDescendantIds(folders, event.source.id).includes(event.target.id)) return false // cycle
    return true
  }

  // A slide: fine relative to another slide; relative to a folder, only "inside" (move into it) is valid.
  if (targetIsFolder && event.position !== "inside") return false
  return true
}
```
Revised once from what's shown above after reading the actual installed `use-tree-dnd.ts` (the registry-fetched README summary wasn't precise enough to design against blind): the hook's `handleDragEnd` **already rejects dropping a node into its own subtree** before `onItemsChange` is ever called (`allIdsToMove.has(currentProjectedParentId)`), so cycle prevention for folders is already enforced internally — the `getDescendantIds` check above is redundant for *correctness* but kept anyway so the drop indicator itself doesn't light up for a move that would silently no-op, which the internal check alone wouldn't prevent (it only guards the actual data write, not what the UI shows during hover). `projectedDepth` is the library's own computed value — no depth math of our own needed. The library also only ever produces `"after"` or `"inside"` positions in practice (never `"before"`, despite the type declaring it) since positioning is depth-projection-driven, not a simple above/below split — the item-branch check above is written against the type contract (`!== "inside"`) rather than assuming which values actually occur, so it stays correct regardless.

**5. Expand/collapse and "open folder" stay coupled, per the user's earlier explicit revert of a decoupled version — now driven through the library's controlled `expandedIds`/`onExpandedIdsChange`.**
`expandedIds` is computed as `[openFolderId, ...getAncestorIds(folders, openFolderId)].filter(Boolean)` and passed in as a controlled prop (not `defaultExpandedIds`), so opening a deeply nested folder auto-reveals its ancestors, matching the existing behavior. `onExpandedIdsChange` is intentionally *not* used to freely toggle arbitrary rows open/closed independent of `openFolderId` — instead, the row's `renderNode` wires its own click (via the library's `toggle`/`select` render props) straight to `onOpenFolder`, exactly reproducing "click the open folder to close it; click any other folder (or its chevron) to open it" from the current implementation, rather than letting the library's internal expand state diverge from which folder is actually open in the console.

**6. Selection (`selectionMode="single"`) maps directly onto `openFolderId` — for both folder and item nodes.**
`selectedIds={openFolderId ? [openFolderId] : []}`; `onSelectedIdsChange` resolves the selected id back to whichever folder it belongs to (itself, if a folder; its containing folder, if an item) and calls `onOpenFolder` — reproducing "clicking an item opens its folder" from today's leaf rows.

**7. `renderNode` owns everything app-specific: the folder icon, the rename input, and a right-click context menu (New subfolder / Rename / Delete) — settled after a few rounds of visual iteration.**
The library deliberately leaves rendering to the caller — `renderNode({ node, isExpanded, select, handleRef, ... })` receives enough render props to reproduce the row exactly, without needing to hand-roll `useSortable`/drag attributes ourselves. Each row also renders a small dedicated grip (wired to the new `handleRef` prop) — see Decision 8 for why a separate handle, not the row itself, is required. The row went through a few iterations before landing here: a hover-swapped chevron/folder-icon, then a permanently-visible animated chevron, and finally no chevron at all — just the folder icon (`size={16}`, shrunk once from its original size), clicking it (or the name) calls the same `select` used everywhere in the row (there's no separate "toggle expand without opening" concept — see Decision 5). The folder options menu likewise moved from a hover-revealed "..." `DropdownMenu` button to a `ContextMenu` (right-click or long-press) wrapping the entire row — installed via `shadcn add context-menu`, which resolves to this project's Base UI-based "base-maia" style automatically (matching `DropdownMenu`), not the generic Radix version shown in the public shadcn docs. Slide rows dropped their leading icon too, leaving just the grip and label. `renderDragOverlay` renders a lightweight, non-interactive preview of whatever's being dragged.

**8. `tree-node.tsx` needs an explicit, *dedicated* drag `handle` — a separate element from the row, not the row itself.**
Found after initial testing, in two passes. First pass: `useSortable`'s `ref` alone makes the row *droppable* and *sortable*, but `@dnd-kit/dom`'s `PointerSensor.preventActivation` explicitly blocks drag activation whenever the pointerdown target is inside an interactive element (a button, a link, ...) — unless that target is contained within an explicitly-set `handle`. `TreeNodeRow` never set one, and `renderNode` here is built almost entirely out of buttons (the chevron/icon toggle, the name, the "..." menu), so dragging only ever worked from whatever bare sliver of the row wasn't covered by one of them — read by the user as "only works if I grab it right at the very beginning." The first fix attempt wired `handleRef` to the *same* node as `ref` (the whole row) — this backfired: once a `handle` is set, `@dnd-kit/dom`'s sensor binds its pointerdown listener *only* to that handle (not the row), and for mouse pointers whose target is inside it, `activationConstraints` also returns no constraints at all (normally a 200ms delay + 5px distance, so a stationary click never turns into a drag). With handle === row, *every* plain click on *any* button in the row instantly activated a zero-movement "drag," which suppresses the button's subsequent click event — breaking ordinary select/expand clicks entirely (read by the user as "the tree won't open"). The correct fix, confirmed against the real upstream demo (none of its examples set a handle equal to the row): `renderNode` gets a new `handleRef` render prop (added to `TreeNodeRenderProps`, not present upstream either) and attaches it to its own small, dedicated grip element, separate from the toggle/name/menu buttons. Only that grip activates a drag; every other button in the row stays a normal, protected click. This is the same pattern Notion/Linear/VSCode use, and it's the only way to reconcile "buttons must stay clickable" with "dragging must be reliable" given this library exposes no prop to customize the sensor's own activation rules.

**9. Slide prepare/present/delete: one console-level "present" primitive, generalized to not assume the slide's folder is already open.**
Requested after the tree/console parity became visibly inconsistent: single-clicking a tree slide only opened its folder (never marked it "ready to present" the way a console-grid single-click already does via `selectItem`), and neither surface offered a delete-a-single-slide action outside the console's bulk "Remove selected." The original `onPresentItem` (console grid) resolved its target item from `openedFolder` — a closure over whichever folder happens to be open *at render time* — which is safe for the console grid (a `SlideCard` only ever exists for the currently-open folder) but wrong for the sidebar tree, where a visible slide can belong to an *ancestor* of the open folder (per Decision 5's auto-expand-ancestors rule), not the open folder itself. Fix: extracted `presentFolderItem(folderId, itemId)`, which looks the item up in `library.folders` directly (the full, current list) rather than the open-folder closure — then `onPrepareTreeItem`/`onPresentTreeItem` open the slide's folder and select it (a single, explicit `openFolder`-then-`selectItem` sequence — safe because `selectItem`'s non-additive branch doesn't depend on prior state, so call order only matters for `openFolder` running first) before calling it. The console grid's own `onPresentItem` was simplified to reuse the same primitive. Delete reuses the existing bulk `removeFolderItems`/`onRemove` action with a single-element array on both surfaces — no new deletion primitive needed.

## Risks / Trade-offs

- [Two drag-and-drop paradigms now coexist in the app: `@dnd-kit/core`/`sortable` (slide console grid) and `@dnd-kit/react` (sidebar tree)] → Mitigation: this is an explicit, direct choice (adopting a specific, named library), not something to relitigate against "reuse what's already installed" — the two surfaces are independent (different files, different `DndContext`s) and neither shares code with the other today regardless.
- [`onItemsChange`'s whole-tree reconciliation (Decision 3) does more computation per drag than a targeted `moveFolder` call] → Mitigation: folder/item counts here are small (a sidebar tree, not a virtualized file explorer with thousands of rows) — a full walk-and-diff on drag-end is imperceptible at this scale.
- [Removing `moveFolder`/`moveFolderItem` is a breaking change to `use-library.ts`'s public surface, even though nothing outside this module calls them] → Mitigation: confirmed via search that `console-view.tsx` is their only caller; removing them alongside their one call site is a clean, atomic change, not a dangling API break.
- [The vendored ~2,000-line component becomes code this codebase now owns and must keep patched/updated manually — shadcn registry components are copied in, not npm-versioned] → Mitigation: same trade-off every other shadcn-sourced primitive in `packages/ui` already carries; consistent with established project convention, not a new category of risk. Two real bugs surfaced immediately on install and integration, both fixed as part of this change, both worth knowing about for a future `shadcn add` re-run (which would reintroduce them): (1) `use-tree-dnd.ts` mistyped its three drag handlers as literally *being* the `@dnd-kit/react` event-payload type instead of functions accepting it — a genuine `tsc` error against the installed `@dnd-kit/react@0.5.0`, meaning the registry component was authored against an incompatible earlier version of that library's API; (2) `tree-node.tsx` never set a drag `handle` at all, and no `handleRef` render prop existed for a caller to provide one — see Decision 8 for the two-pass fix (a naive same-node handle broke ordinary clicks; a dedicated grip element is the correct fix).
- [`canDrop`'s folder/item interleaving rules (Decision 4) reject some drops a user might reasonably attempt (e.g. dragging a folder to sit directly above a slide, intending to reorder relative to it)] → Mitigation: matches the current implementation's behavior exactly (a folder dragged onto an item row was already a guarded no-op) — not a regression, just carried forward.

## Migration Plan

No data migration: `Folder.parentId`/`position`/`items` are unchanged fields, already introduced by `add-nested-folders-drag-drop`. This change only replaces which code reads/writes them (the whole-tree `applyFolderTree` reconciliation instead of the targeted `moveFolder`/`moveFolderItem`) and how the tree renders/responds to interaction. No feature flag — verified by running the app and confirming existing folders, nesting, and drag behavior all still work through the new component before considering this change complete.

## Open Questions

- Exact `renderNode` markup for matching the current compact/hover-chevron row styling pixel-for-pixel — resolved during implementation by porting the existing `FolderRow`/`ItemRow` JSX into the new `renderNode` callback rather than specified here line-by-line.
