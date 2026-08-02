## 1. Library action

- [x] 1.1 Extend `createFolder` in `use-library.ts` with an optional third parameter (default `"end"`) selecting `position: siblingCount` (current behavior) vs. a "start" position computed as one less than the current minimum `position` among that parent's siblings (falling back to `-1` when there are no siblings yet).
- [x] 1.2 `createFolder` also gained a fourth `initialItems` parameter so the new folder's first slide is written in the *same* `storage.save` as its creation. Needed because calling `addItemToFolder(newFolder.id, ...)` right after `createFolder` resolves races against a stale `allFolders` closure (the newly created folder isn't in that closure's snapshot yet), which silently no-ops and leaves the folder empty — caught via manual browser testing, not by typecheck/lint.

## 2. Convert flow wiring

- [x] 2.1 In `console-view.tsx`'s `onAddVerse`, add an else-branch for `openFolderId === null`: create a root folder at the start position with the default name and the converted verse as its `initialItems` (one atomic write), then call `openFolder` with the new folder's id.
- [x] 2.2 Split the enabling condition in `bible-picker-panel.tsx` so "Convert to Slide" depends only on having a valid pending verse (`hasPendingVerse`), while "Present"/"Split into slides" keep requiring an open folder (`canPresentOrSplit = hasOpenFolder && hasPendingVerse`).
- [x] 2.3 Reword the "no folder open" hint text (en/es/pt) to reference presenting/splitting specifically, since it no longer applies to "Convert to Slide".

## 3. Verification

- [x] 3.1 Manually verified in a real browser session (Playwright against the Vite dev server): with zero folders, entering a verse and clicking "Convert to Slide" creates one root folder ("New folder") containing that slide and opens it. (First pass surfaced the 1.2 race-condition bug — folder was created but empty; fixed and re-verified.)
- [x] 3.2 Manually verified: with an existing root folder ("Existing Folder", not open), converting a verse creates a new folder that appears before it in the sidebar, and the existing folder's contents/order are untouched.
- [x] 3.3 Manually verified: converting a second verse right after the first (without picking a different folder) adds it to the same newly created folder (both slides nested under it), not a second new folder.
- [x] 3.4 Manually verified: "Present" and "Split into slides" report `disabled=true` with no folder open while "Convert to Slide" reports `disabled=false`, and the reworded hint is visible.
- [x] 3.5 Run typecheck and lint for the touched packages. (Typecheck passes; lint clean on every file touched by this change — `packages/ui` has pre-existing, unrelated lint errors predating this change.)
