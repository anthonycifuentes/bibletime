## 1. `library` module scaffolding

- [x] 1.1 Create `apps/bibletime/src/modules/library/` following screaming architecture (`interfaces`, `services`, `actions`, `components`, `views`)
- [x] 1.2 Define `Folder` and `FolderItem` interfaces in `library/interfaces` — `FolderItem` as a discriminated union on `type` (`"bible-passage" | "song" | "media"`), each variant nesting its type-specific fields under `data`, with shared `id`/`templateId`
- [x] 1.3 Implement folder storage in `library/services` (create/rename/delete folder; add/remove/reorder item), following the per-platform storage pattern used in `templates/services/storage` (web/localStorage + desktop/file, incl. new `library:*` Electron IPC handlers in `apps/desktop`)
- [x] 1.4 Implement `library/actions`: a single `useLibrary` hook (folder/item CRUD, mirroring `useTemplates`'s shape) plus `useConsoleStore` (zustand: open folder + slide selection) and `useLiveSlide`/`setLiveSlide` (broadcast)
- [ ] 1.5 Unit-test folder/item persistence — **not done**: this repo has no test runner configured anywhere (no vitest/jest dependency or existing `*.test.ts` files); adding one is a bigger call than this task implies. Verified manually instead (browser session: create → add → reorder → delete all persisted correctly via the same storage pattern `templates` already uses in production)

## 2. Console shell — navigation and layout

- [x] 2.1 Build a bottom navigation bar component in `core/layout` with exactly five tabs: Library, Bible, Songs, Media, Templates
- [x] 2.2 Build a persistent header bar component in `core/layout`, rendered above the sidebar/slides/preview row and unchanged across tab switches, hosting app branding and the Settings entry point
- [x] 2.3 Add shell-level selection state via `useConsoleStore` (zustand). Simplified from the original plan: `activeTab` is derived directly from the route path (each tab is its own route rendering the same `ConsoleView`) rather than duplicated into the store; `openFolderId` lives in the store only and is **not** mirrored to a URL search param, so deep-linking directly to an open folder isn't supported yet (follow-up if needed)
- [x] 2.4 Build the full shell layout per the wireframe: full-width Header on top, full-width Navigation (bottom nav) on bottom, and a middle row split into Sidebar (left) / Slides (center) / Preview (right)
- [x] 2.5 Wire the sidebar to switch on `activeTab`: `FolderTree` (Library), Bible picker (Bible), placeholder browser (Songs), placeholder browser (Media), `TemplateManager` (Templates)
- [x] 2.6 Verified in-browser: switching tabs preserves the open folder, slide selection, and preview panel state, and the header stays unchanged

## 3. Library folder tree (sidebar)

- [x] 3.1 Build `FolderTree` sidebar component per the provided `CollapsibleFileTree` reference, using `@workspace/ui`'s `Collapsible`/`Button`/`DropdownMenu` primitives
- [x] 3.2 Wire create/rename/delete folder actions from the folder tree UI to `library/actions`
- [x] 3.3 Selecting a folder in the tree sets `openFolderId` in shell state and loads its items into the slide console

## 4. Bible tab as a content picker

- [x] 4.1 Move `BookSearchList`, `ChapterNav`, `VersePickerList`, `BibleVersionSelector`, `VerseHistoryList` usage out of `BibleConsoleView` into a new `BiblePickerPanel` in `library/components`, composed from `bible`'s expanded public exports (kept the dependency direction library → bible, not the reverse)
- [x] 4.2 Replace the picker's on-select preview behavior with a call to `addItemToFolder`, appending a `bible-passage` `FolderItem` (with its verse text/reference snapshotted at add-time) to the currently open folder
- [x] 4.3 Handle "no folder open" in the Bible tab: clicking a verse with no folder open shows an inline warning instead of adding

## 5. Slide console (main container)

- [x] 5.1 Build the main container component rendering the open folder's items as an ordered vertical slide list, reading order from `library` storage
- [x] 5.2 Implement empty state when no folder is open
- [x] 5.3 Implement single-select, modifier-click (Cmd/Ctrl/Shift) multi-select, and select-all over the rendered slide list
- [x] 5.4 Add reorder controls (move up/move down) per slide, calling `reorderFolderItem`
- [x] 5.5 Add remove-item control per slide, calling `removeFolderItem`
- [x] 5.6 Add "apply template" action that opens a `TemplatePickerDialog` (wrapping the existing `TemplateManager`) and, on confirm, calls `applyTemplateToItems` for the current selection (one, several, or all)
- [x] 5.7 Render `song`/`media` items with a "not yet available" placeholder slide (selectable, orderable, template-assignable) since those modules have no real content yet

## 6. Live preview panel

- [x] 6.1 Adapted rather than extended `SlidePreview`'s own API: added `resolveFolderItemContent` in `library/lib` to normalize any `FolderItem` + the template library into the `{ text, reference, template }` shape `SlidePreview` already accepted, so `presentation` itself needed no changes
- [x] 6.2 Render the preview panel persistently in the shell's right pane, showing an empty state when nothing is selected and the most-recently-selected slide otherwise
- [x] 6.3 Replaced the old Bible-only broadcast (`useBroadcastLiveOutput`/`useLiveOutputPointer`, deleted) with a generalized one in `library/services/live-slide.ts` + `useLiveSlide`: an explicit "Send to output" button in the preview panel writes a fully-resolved `{ text, reference, template }` payload, so `/present` no longer needs its own Bible/template data fetching at all
- [x] 6.4 Verified in-browser (Playwright): `/present` renders the sent slide correctly in a second tab sharing the same origin's storage; previewing/sending behaves normally with no `/present` window open

## 7. Routing cutover

- [x] 7.1 Add `/library` route rendering the new console shell as the default screen (`/` now redirects to `/library`)
- [x] 7.2 `/bible`, `/songs`, `/media`, `/templates` all render the same `ConsoleView` with their tab pre-selected — done as a permanent structure (each tab genuinely is the shell now), not a temporary redirect
- [x] 7.3 Confirmed `/present` is unaffected by the routing changes

## 8. Cleanup

- [x] 8.1 Deleted `BibleConsoleView`, `OutputPreview`, and the old Bible-only broadcast files (`use-broadcast-live-output.ts`, `use-live-output-pointer.ts`, `services/live-output.ts`, `LiveOutputPointer` interface); also deleted the now-unused standalone `TemplatesView` page (superseded by the Templates tab)
- [x] 8.2 Removed the old flat `AppSidebar`/`NavMain` top-level module list and the `SidebarProvider`/`SidebarInset` wrapper in `__root.tsx`
- [x] 8.3 Updated all remaining references/imports (`bible/index.ts`, `templates/index.ts`, `bible/services/index.ts`, `/present` route, Electron `main.ts`/`preload.ts`/`electron.d.ts` for the new `library` IPC channel); `pnpm tsc --noEmit` and `eslint` both pass clean on `apps/bibletime` and `apps/desktop`
- [x] 8.4 Manually verified the full flow in-app via a headless-browser session: created a folder → added a Bible passage from the Bible tab → selected it (preview updated) → selected all → applied a template via the dialog → sent to output → confirmed `/present` mirrored it exactly, with zero console errors throughout
