## Why

Today, whether a folder's children are shown in the sidebar tree is driven entirely by which single folder is "open" in the console (`openFolderId` in `use-console-store.ts`). Opening any folder collapses whatever was previously expanded, and closing the currently-open folder collapses everything, since there's only ever one expanded branch at a time. Users want to browse the folder structure the way most file/tree UIs work: expand or collapse any individual folder independently, with any combination — including all of them — staying open at once, regardless of which single folder (if any) is actively selected in the console.

**Note**: This supersedes Decision 4 in `openspec/changes/add-nested-folders-drag-drop/design.md` ("Expand/collapse stays keyed off `openFolderId`... this design does not reintroduce separate expand state"), which documented the opposite choice as deliberate after an earlier revert. That change's own docs are left as written per the historical record; this proposal is the new decision going forward.

## What Changes

- Folder expand/collapse state becomes independent per folder — a new state (e.g. a set of expanded folder ids) tracked separately from `openFolderId` (which folder's slides are shown in the console).
- Clicking a folder's expand/collapse control (or the folder row itself, matching today's click target) toggles **only that folder's** expanded state — it no longer affects any other folder's expanded/collapsed state.
- Any number of folders — including all of them — can be expanded simultaneously.
- Opening a folder in the console (selecting it to view/edit its slides) auto-expands that folder and its ancestor chain (so its contents are visible), but no longer collapses folders that were already expanded elsewhere in the tree.
- Collapsing a folder does not change which folder is open in the console — the two become independent concerns (expand/collapse vs. "open in console").
- **BREAKING** (behavioral, not API): removes the implicit single-open-folder tree invariant described in `add-nested-folders-drag-drop`'s design — any future work on that tree's expand behavior should treat this change as authoritative.

## Capabilities

### New Capabilities
- `folder-tree-independent-expansion`: Each folder's expanded/collapsed state in the sidebar tree is tracked independently of the others and independently of which folder (if any) is open in the console; any subset of folders — including all — can be expanded at once.

### Modified Capabilities
- none (no existing `openspec/specs/` capabilities predate this change — `add-nested-folders-drag-drop`'s spec has not been archived yet, so there is no prior archived spec to write a delta against)

## Impact

- `apps/bibletime/src/modules/library/components/folder-tree.tsx` — `expandedIds` (currently `openFolderId ? [openFolderId, ...ancestors] : []`) is replaced by an independent expanded-ids collection, unioned with the open folder's ancestor chain; the toggle click handler for expand/collapse is decoupled from `onSelectedIdsChange`/`onOpenFolder`.
- `apps/bibletime/src/modules/library/actions/use-console-store.ts` (or local component state, to be decided in design) — potentially gains expanded-folder-ids state if it needs to persist across re-renders/navigation rather than living purely in `FolderTree` local state.
- No storage/data-model changes — this is purely UI state, not persisted per folder.
