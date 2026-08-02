## Context

`BiblePickerPanel` gates "Convert to Slide" (and "Present"/"Split into slides") behind `hasOpenFolder && hasPendingVerse`. `hasOpenFolder` is computed in `bottom-drawer.tsx` as `openFolderId !== null`, from the Zustand store `use-console-store.ts` (a single global "currently open folder" id).

`console-view.tsx`'s `onAddVerse` is only ever called while a folder is open today: `if (openFolderId) void library.addItemToFolder(openFolderId, {...})` — no else-branch exists because the button couldn't be clicked when `openFolderId` was null.

`createFolder(name, parentId)` (`use-library.ts`) always appends a new folder at the end of its sibling group: `position: siblingCount`. Folders are sorted for display by `position` ascending (via `build-folder-tree.ts`), so appending at the end is the wrong direction for "insert at the beginning of the root list" — a position lower than every existing root folder's is needed, not a renumbering pass across all of them.

Every slide (`FolderItem`) lives inside some `Folder.items` array — there is no folder-less item concept in this app, so the fallback must create a real folder, not a bare item floating outside one.

## Goals / Non-Goals

**Goals:**
- Clicking "Convert to Slide" with no folder open creates one new root-level folder, positioned before every existing root folder, adds the converted verse to it, and opens it — all as a single user action, no dialog or extra step.
- Works identically whether there are zero folders yet or many existing root folders.

**Non-Goals:**
- No change to "Present" or "Split into slides" gating — they keep requiring an already-open folder.
- No renumbering of existing folders' `position` values — inserting at the start must not require touching every other root folder's stored record.
- No folder-name prompt/dialog — the folder gets a plain default name (`t("library.newFolder")`, "New folder"), renamable afterward exactly like any manually created folder.

## Decisions

**1. Insert-at-start via a position below the current minimum, not a renumbering pass.**
`createFolder` gained a third parameter, `insertAt: "end" | "start"` (default `"end"`, preserving all existing call sites). When `"start"`, the new folder's `position` is `Math.min(0, ...siblingPositions) - 1` instead of `siblingCount`. This is a single `storage.save` for the one new folder — no other folder record is read or written, treating `position` as a sparse sort key rather than a dense index that must stay contiguous.

**2. The default folder name is a plain, non-unique literal, not a generated/counted name.**
Reuses the existing `t("library.newFolder")` string ("New folder") as the folder's actual name. No "New folder (2)" disambiguation — manual folder creation already allows duplicate names today (no uniqueness check in `createFolder`), so this doesn't introduce an inconsistency; the user renames it same as they'd rename any folder.

**3. The compose-and-open sequence lives in `console-view.tsx`'s `onAddVerse`, not inside `use-library.ts` or `bible-picker-panel.tsx`.**
`onAddVerse` already owns the decision of which folder to target (today: "the open one"); it's the natural place to add the branch "no folder open → create one at root start, then target that." Sequence in the new else-branch:
1. `const folder = await library.createFolder(t("library.newFolder"), null, "start")`
2. `await library.addItemToFolder(folder.id, { type: "bible-passage", templateId, data })`
3. `openFolder(folder.id)` so the console immediately shows the new folder open with its one slide.

## Risks / Trade-offs

- [A user who repeatedly clicks "Convert to Slide" with no folder open creates a new root folder each time, rather than reusing the first auto-created one] → Mitigation: after the first click, `openFolderId` is no longer null (it now points at the freshly created folder), so the *next* click goes through the normal "add to the open folder" path, not the auto-create branch — this only happens once per "no folder open" state.
- [Sparse/negative `position` values could in principle drift oddly over many "insert at start" operations] → Mitigation: this only happens on the "no folder open" fallback path, which self-limits per the point above; values never need to be contiguous since sorting is purely by relative order.

## Migration Plan

No data migration. Existing folders and their `position` values are untouched; this only affects what happens on the specific "Convert to Slide, no folder open" action going forward.
