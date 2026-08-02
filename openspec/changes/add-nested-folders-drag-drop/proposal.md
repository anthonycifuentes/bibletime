## Why

The Library sidebar's folder list is flat — every folder lives at the same level with no concept of grouping, and there's no way to reorder folders either (display order today is just whatever order the storage driver happens to return, not something the user controls). As a project's folder count grows (by service, by month, by series), users need to organize related folders together the way Notion's page tree lets you nest pages, and reorder them by dragging instead of renaming things into an artificial alphabetical order.

## What Changes

- Folders can have a parent folder, up to 3 levels deep total (root, and two levels of subfolders) — a small, bounded tree rather than unlimited nesting, matching what a sidebar of a few dozen folders actually needs.
- Folders can be reordered via drag-and-drop within their current sibling group, and reparented by dragging one folder onto another (nesting it inside, as long as the 3-level cap isn't exceeded and the drop doesn't create a cycle).
- A folder's context menu gains "New subfolder" alongside the existing Rename/Delete, disabled once a folder is already at the deepest allowed level.
- Deleting a folder that has subfolders deletes the whole subtree (subfolders and their slides), matching the no-confirmation delete behavior a single folder already has today — not adding a new confirmation step that doesn't exist yet.
- Slides can also be dragged directly in the sidebar tree, not just in the main console grid — reordered within their folder, or moved into a different folder entirely by dropping on one of that folder's slides (for a precise position) or its own row (appended at the end).
- **No new dependency.** The app already ships `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for the slide console's flat drag-and-drop reordering — this reuses the exact same library via its well-documented flattened-tree pattern, rather than adding a second drag-and-drop library (e.g. Atlassian's `pragmatic-drag-and-drop`) for one sidebar. That was evaluated and is not justified purely for a bounded, few-dozen-item tree.

## Capabilities

### New Capabilities
- `folder-hierarchy`: Folders can be nested under a parent folder (up to 3 levels deep), created as subfolders from a folder's context menu, and reordered/reparented via drag-and-drop in the sidebar tree, with depth-limit and cycle prevention enforced on every move. Slides shown in the sidebar tree can also be dragged — reordered within their folder or moved into a different one.

### Modified Capabilities
_None — no existing archived specs cover folder structure or ordering yet._

## Impact

- `apps/bibletime/src/modules/library/interfaces/index.ts` — `Folder` gains `parentId: string | null` and `position: number`.
- `apps/bibletime/src/modules/library/actions/use-library.ts` — new `createFolder(name, parentId)` (extending the existing signature), a new `moveFolder(folderId, newParentId, newIndex)` action, and a new `moveFolderItem(itemId, fromFolderId, toFolderId, newIndex)` action for slide drag-and-drop; `deleteFolder` becomes cascading.
- `apps/bibletime/src/modules/library/components/folder-tree.tsx` — renders a nested tree instead of a flat list, wires up `@dnd-kit` drag-and-drop for folder reorder/reparent and slide reorder/move, adds "New subfolder" to the context menu.
- `apps/bibletime/src/modules/library/services/storage/*` (web + desktop drivers) — no interface change (`list`/`save`/`remove` already handle arbitrary `Folder` fields); existing folders without `parentId`/`position` are treated as root-level, ordered by their current fallback (no migration script needed).
- No new npm dependency.
