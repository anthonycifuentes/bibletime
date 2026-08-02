## Context

`FolderTree` (`apps/bibletime/src/modules/library/components/folder-tree.tsx`) renders folders via the generic `TreeView` component from `packages/ui` (`packages/ui/src/components/tree-view.tsx`), adopted by the sibling `adopt-shadcn-treeview-for-library` change. `TreeView` already fully supports independent per-node expand/collapse as a **controlled** prop pair: `expandedIds?: string[]` plus `onExpandedIdsChange?: (ids: string[]) => void` (`tree-view.tsx:88,90`), backed by `use-tree-state.ts`'s `toggleExpand(id)`, which reads the *current* full expanded-ids set, flips membership for `id`, and calls `onExpandedIdsChange` with the complete resulting array (`use-tree-state.ts:100-115`) — not just the single toggled id. Each rendered node is also handed a ready-made `toggle: () => void` closure in `TreeNodeRenderProps` (`packages/ui/src/lib/tree-types.ts:89`) that calls this for that specific node. So the underlying tree component is not the bug.

The bug is entirely in how `FolderTree` uses it:
- `expandedIds` is computed at `folder-tree.tsx:110` as `openFolderId ? [openFolderId, ...getAncestorIds(folders, openFolderId)] : []` — a value derived *solely* from the single global `openFolderId` (from `use-console-store.ts`), never from `TreeView`'s own `toggle`/`onExpandedIdsChange` mechanism. `onExpandedIdsChange` is never passed to `TreeView` at all (`folder-tree.tsx:359-384`).
- The folder row's icon button — the natural expand/collapse control — calls `select(event)` (`folder-tree.tsx:252-263`), not `toggle()`. So clicking it selects/opens the folder in the console (which recomputes the single-branch `expandedIds` above) rather than toggling that folder's own expansion independent of anything else.

Net effect: expansion has no memory of its own; it's a pure function of "which one folder is open," so opening folder B always collapses folder A's branch, and closing the only-ever-open folder collapses everything — exactly the reported bug.

## Goals / Non-Goals

**Goals:**
- Each folder's expanded/collapsed state is tracked independently, persists across changes to which folder is open in the console, and survives any combination of other folders being expanded or collapsed.
- Opening a folder in the console still auto-reveals it (auto-expands it and its ancestor chain) — this convenience is kept, just made additive instead of exclusive.
- Any number of folders, including all of them, can be expanded at once.

**Non-Goals:**
- No change to single-selection semantics for "which folder is open in the console" (`openFolderId` stays a single id) — only tree *expansion* becomes independent, not console selection.
- No persistence of expanded state across app restarts or project switches — this is ephemeral UI state, matching how expansion works today (not currently persisted either).
- No change to drag-and-drop, subfolder creation, or any other `add-nested-folders-drag-drop` behavior — only the expand/collapse wiring changes.

## Decisions

**1. Expanded-folder-ids state lives as local component state in `FolderTree` (`useState<string[]>` or `Set<string>`), not in `use-console-store.ts`.**
It's pure presentation state with no other consumer today (nothing else reads "which folders are expanded"), so it doesn't need to be global. If `FolderTree` unmounts (e.g. on project switch, if the sidebar remounts), expansion resetting is reasonable — matching how a fresh tree naturally starts collapsed, not a regression from any behavior that exists today.

**2. `TreeView` becomes fully controlled for expansion: pass both `expandedIds` and a new `onExpandedIdsChange` that writes straight into local state.**
Since `use-tree-state.ts` already computes the full next array (previous state with the toggled id flipped) before calling `onExpandedIdsChange`, `FolderTree`'s handler is a direct `setExpandedFolderIds(ids)` — no manual set-membership math needed on our side.

**3. Revised during implementation: auto-reveal is a one-time effect on `openFolderId` change, folded additively into local state — not a continuous forced union recomputed every render.**
The originally written version of this decision computed `expandedIds` every render as `Array.from(new Set([...expandedFolderIds, ...(openFolderId ? [openFolderId, ...getAncestorIds(folders, openFolderId)] : [])]))`. Building this exactly as written surfaced a bug during manual verification (task 3.5): since `openFolderId` itself was unconditionally forced into the union on every render, clicking the open folder's own collapse icon had no visible effect — `toggleExpand` would remove it from local state, but the very next render's union recomputation added it straight back in, because it was still the open folder. That directly broke the spec scenario "Collapsing the currently open folder does not close it" (its *row* is supposed to visibly collapse).

The fix: a `useEffect` keyed on `openFolderId` that runs once per folder-open (not every render), merging `[openFolderId, ...getAncestorIds(folders, openFolderId)]` into `expandedFolderIds` via `setExpandedFolderIds` (union, additive, no-op if already present):
```
useEffect(() => {
  if (!openFolderId) return
  const idsToReveal = [openFolderId, ...getAncestorIds(folders, openFolderId)]
  setExpandedFolderIds((current) => {
    const next = new Set(current)
    let changed = false
    for (const id of idsToReveal) {
      if (!next.has(id)) { next.add(id); changed = true }
    }
    return changed ? Array.from(next) : current
  })
}, [openFolderId])
```
`expandedIds` passed to `TreeView` is then simply `expandedFolderIds` — local state alone, no per-render union. This still satisfies "opening a folder reveals its path" (the effect fires exactly when `openFolderId` changes, folding the reveal into local state once), but afterward the user is free to independently collapse the open folder's own row — nothing re-adds it on the next render, since there's no continuous forcing. Verified manually: collapsing the open folder's row hides its children while the console still shows its contents; re-expanding a previously-collapsed ancestor does not resurrect a nested descendant's own expand flag if that descendant's id was dropped by the tree engine's "collapsing a node also collapses its descendants" behavior (`use-tree-state.ts`'s `toggleExpand`) — expected, standard tree-UI behavior, not something this change's spec requires to survive.

**4. The folder icon button's `onClick` changes from `select(event)` to `toggle()`; the folder name button keeps `select(event)` unchanged.**
This is the actual behavioral split the request calls for: clicking the icon expands/collapses that row only; clicking the name opens it in the console (auto-expanding its path per Decision 3), matching the existing click targets pixel-for-pixel — no new UI element, no layout change, just which handler each existing button calls.

**5. Collapsing a folder never changes `openFolderId`.**
Today, closing "the" open folder is the *only* way collapse happens, so it's conflated with clearing selection (`onOpenFolder(null)`). After this change, `toggle()` only ever affects the expansion set — `onSelectedIdsChange`/`onOpenFolder` are untouched by expand/collapse clicks. A folder can be collapsed while still being the open folder in the console (its slides still show in the main area; its row just no longer shows its children in the sidebar) — consistent with typical file-tree UX (collapsing a folder doesn't close a file open from it).

## Risks / Trade-offs

- [Collapsing the currently-open folder's row no longer implicitly closes it in the console, which is a behavior change from today (where collapse and close were the same action)] → Mitigation: this is the intended fix — the request explicitly asks for expand/collapse to stop being tied to open/close; the console's own content still reflects `openFolderId` regardless of the row's expanded state.
- [Auto-expanded ancestors (Decision 3) are visually indistinguishable from manually-expanded ones, so a user can't tell "this is open because I expanded it" vs. "this is open because it's on the path to the open folder"] → Mitigation: matches today's behavior already (todays' single-branch expansion also doesn't distinguish these); not a regression, and not something the request asks to change.

## Migration Plan

No data migration — this is component-local UI state. Ships as a behavior change in `folder-tree.tsx` only; verified by manual testing (see tasks.md), not a staged rollout.
