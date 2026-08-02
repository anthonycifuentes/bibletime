## Why

"Convert to Slide" in the Bible picker panel is disabled whenever no folder is currently open in the console (`hasOpenFolder` gates `canConvert` in `bible-picker-panel.tsx`), even when the user has valid pending verse text and just wants to save it somewhere. This forces an extra manual step — create or open a folder first — before the button the user actually came to use even becomes clickable, for a feature whose whole point is fast capture. A slide always belongs to some folder (there is no folder-less item concept in this app), so the fix is to create one automatically rather than to invent a new kind of ownerless slide.

## What Changes

- When "Convert to Slide" is clicked and no folder is open (`openFolderId === null`), instead of being disabled, it auto-creates a new folder at the root level (`parentId: null`), positioned **before** every existing root-level folder (at the very beginning of the list, not appended at the end), gives it a default name, and adds the converted verse into it as its first slide.
- The newly created folder becomes the open folder (auto-selected in the console), so the user immediately sees the slide land somewhere real and can rename the folder or drag the slide into a different folder afterward — same as any other folder/slide today.
- "Convert to Slide" is enabled purely based on having pending verse text + reference; it no longer depends on `hasOpenFolder` at all.
- **Non-Goal**: "Present" and "Split into slides" keep their current `hasOpenFolder` gating and hint text unchanged — only "Convert to Slide" changes.
- **Non-Goal**: No change to how a slide is added when a folder *is* already open — that path (`addItemToFolder`) is unchanged.

## Capabilities

### New Capabilities
- `convert-to-slide-root-fallback`: When no folder is open, "Convert to Slide" creates a new root-level folder (inserted at the start of the root folder list) with a default name, adds the converted verse to it, and opens it — instead of the button being disabled.

### Modified Capabilities
- none (no existing `openspec/specs/` capabilities predate this change)

## Impact

- `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx` — Convert's enabling condition drops `hasOpenFolder`; Present/Split keep it.
- `apps/bibletime/src/modules/library/views/console-view.tsx` — `onAddVerse`'s existing `if (openFolderId)` guard gains an else-branch: create a root folder at the start position, add the item to it, then open it, instead of silently no-op'ing when there's no target folder.
- `apps/bibletime/src/modules/library/actions/use-library.ts` — `createFolder(name, parentId)` gains an `insertAt: "end" | "start"` option so a new folder can be positioned before its siblings instead of only ever appended.
