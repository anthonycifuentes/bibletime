## 1. Expansion state

- [x] 1.1 Add local `expandedFolderIds` state (`useState<string[]>` or a `Set<string>`, initialized empty) in `folder-tree.tsx`.
- [x] 1.2 Replace the `expandedIds` computation at `folder-tree.tsx:110` with the union of `expandedFolderIds` and the open folder's ancestor chain (`openFolderId ? [openFolderId, ...getAncestorIds(folders, openFolderId)] : []`), deduplicated.
- [x] 1.3 Pass `onExpandedIdsChange` to `TreeView`, writing the callback's array directly into `expandedFolderIds`.

## 2. Click wiring

- [x] 2.1 Change the folder icon button's `onClick` (currently `select(event)`, `folder-tree.tsx:252-263`) to call the render prop's `toggle()` instead.
- [x] 2.2 Leave the folder name button's `onClick` as `select(event)` (opens/closes the folder in the console, unchanged).
- [x] 2.3 Confirm `onSelectedIdsChange` (`folder-tree.tsx:364-378`) no longer needs to touch expansion at all — it should only ever update `openFolderId`.

## 3. Verification

- [x] 3.1 Manually verify: expanding folder A, then expanding folder B, leaves both A and B expanded.
- [x] 3.2 Manually verify: with A and B both expanded, collapsing A leaves B expanded.
- [x] 3.3 Manually verify: expanding every folder in the tree leaves all of them expanded at once.
- [x] 3.4 Manually verify: opening folder A in the console (clicking its name) auto-expands it and its ancestors without collapsing any other independently-expanded folder.
- [x] 3.5 Manually verify: collapsing the currently-open folder's row (clicking its icon) hides its children but the folder remains open in the console (its slides still show in the main area).
- [x] 3.6 Manually verify: opening a subfolder nested two levels deep reveals both ancestor levels.
- [x] 3.7 Run typecheck and lint for the touched packages.
