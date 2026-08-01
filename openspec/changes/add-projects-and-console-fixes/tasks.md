## 1. `Project` data model and storage

- [x] 1.1 Add `Project { id, name, createdAt, updatedAt }` and `ProjectStorageDriver` to `apps/bibletime/src/modules/library/interfaces/index.ts`; add required `projectId: string` to `Folder`
- [x] 1.2 Add `web-project-storage.ts` (mirrors `web-library-storage.ts`, `localStorage` key `bibletime.library.projects`) under `apps/bibletime/src/modules/library/services/storage/`
- [x] 1.3 Add `project:list/save/remove` IPC handlers in `apps/desktop/src/main.ts` (mirrors `registerLibraryHandlers`, storing one JSON file per project under `<userData>/projects/`) and expose them via `apps/desktop/src/preload.ts`'s `window.bibletime.project` bridge
- [x] 1.4 Add `desktop-project-storage.ts` (mirrors `desktop-library-storage.ts`, calling `window.bibletime.project.*`) and a `getProjectStorage()` picker alongside `getLibraryStorage()` in `apps/bibletime/src/modules/library/services/storage/index.ts`

## 2. Project actions and orphan-folder migration

- [x] 2.1 Add `useProjects()` hook (list/create/rename/delete, active project id persisted to `localStorage` key `bibletime.activeProjectId`) in `apps/bibletime/src/modules/library/actions/`, mirroring `useTemplates()`'s shape
- [x] 2.2 Detect folders with no `projectId`; if any exist and no project exists yet, create one default project and patch every such folder's `projectId` via `storage.save` — implemented inside `useProjects()`'s init path (`ensureMigratedProjects`) rather than `useLibrary()`'s, since `useProjects` is what guarantees an active project id exists before `useLibrary` is even called with one
- [x] 2.3 Scope `useLibrary()`'s folder list to the active project id (passed in as a parameter); `createFolder` requires a non-null active project id and stamps the new folder's `projectId`
- [x] 2.4 Manually verify: fresh install with pre-existing (pre-change) folder data loads without error and all folders appear under the auto-created default project — verified in a real browser (Playwright): seeded a legacy folder with no `projectId`, reloaded, confirmed it appears under an auto-created "My Project" with zero console errors. Found and fixed a real bug in the process: `useLibrary`'s fetch effect had `[refresh]` as its only dependency, so it never re-ran once `activeProjectId` flipped from `null` to the migrated project's real id, leaving folders stuck on a pre-migration snapshot — fixed by adding `activeProjectId` to the effect's dependency array

## 3. Project switcher UI

- [x] 3.1 Replace `FolderTree`'s static `t("nav.library")` header with a new `ProjectSwitcher` control (`apps/bibletime/src/modules/library/components/project-switcher.tsx`) showing the active project's name
- [x] 3.2 Wire create/rename/delete project actions from the switcher to `useProjects()`; creating a project requires a non-empty name (mirrors the existing folder create/rename form pattern); deleting the active project cascades to its folders
- [x] 3.3 Add a first-run empty state ("Create your first project," new `library.createProjectTitle`/`library.createProjectDescription` copy — kept distinct from `library.startProjectTitle`, which still means "create your first folder" within an existing project) shown when no project exists yet, gating the whole console shell until one does
- [x] 3.4 Wire `console-view.tsx` to pass the active project's folders (not all folders) into `FolderTree` and `SlideConsole` — `useLibrary` is now called with `projects.activeId`, so `library.folders` is already scoped
- [x] 3.5 (mid-implementation revision, per user feedback) Replace the plain "Create your first project" empty state with a `ProjectLauncher` component (`apps/bibletime/src/modules/library/components/project-launcher.tsx`): shows a platform badge ("Desktop project" vs "Web project", detected the same way `SystemInfoPanel` does) and up to 5 most-recently-updated existing projects as one-click "reopen" rows. Reused inside `ProjectSwitcher`'s "New project" action (now a `Dialog`) so the recent-projects list stays reachable any time, not just on a fresh install
- [x] 3.6 (second revision, per user feedback) Removed `ProjectSwitcher` and the "FOLDERS" label from the sidebar entirely — `FolderTree`'s header is now just the active project's plain-text name with the "add folder" `+` at the end, not interactive (no switch/rename/delete here). Renamed the bottom nav's "Library" tab to "Projects" (`nav.projects`, replacing the now-unused `nav.library`) and replaced its `FolderQuickSwitch` content with a new `ProjectList` component (`apps/bibletime/src/modules/library/components/project-list.tsx`): create/rename/switch/delete every project from there, with a confirmation `Dialog` before deleting (since it cascades to every folder inside). Deleted the now-unused `project-switcher.tsx` and `folder-quick-switch.tsx`. Added `useLibrary().deleteFoldersInProject(projectId)` so cascade-delete works for *any* project, not just the currently active one — verified via Playwright: deleting a non-active project removed its folders from storage correctly

## 4. Bible tab template selector

- [x] 4.1 Add a template selector control to `BiblePickerPanel`'s preview column (`apps/bibletime/src/modules/library/components/bible-picker-panel.tsx`), sourced from `useTemplates().templates`, defaulting to `useTemplates().activeId` via a derived `effectiveTemplateId` (local override state layered on top, so the common case needs no interaction)
- [x] 4.2 Re-render the preview `SlideFrame` using the selector's chosen template (`effectiveTemplate`) instead of the unconditional `activeTemplate`
- [x] 4.3 Thread the selected `templateId` through `onAddVerse`/`handleConvert` → `bottom-drawer.tsx` → `console-view.tsx`'s `onAddVerse` → `library.addItemToFolder(openFolderId, { type: "bible-passage", templateId, data })`
- [x] 4.4 Manually verify: picking a non-default template in the Bible tab, then converting to slide, shows that template immediately in the slide console and preview panel with no separate "Apply template" step — verified in a real browser: picked "Blanco" in the selector, clicked "Convert to slide", confirmed the stored `FolderItem` has `templateId: "bundled-1"` (Blanco's id) and the slide card/preview both render its white background immediately

## 5. Fix "Send to output"

- [x] 5.1 Update `PreviewPanel`'s "Send to output" click handler (`apps/bibletime/src/modules/library/components/preview-panel.tsx`) to call `window.open("/present", "bibletime-present")` before/alongside the existing `setLiveSlide(...)` call
- [x] 5.2 Manually verify on desktop (Electron): clicking "Send to output" with no output window open spawns the chrome-less `/present` window (per `main.ts`'s existing `setWindowOpenHandler`) showing the sent slide — verified with a real Electron launch (Playwright `_electron`, built via `pnpm --filter desktop build`): window count went from 2 to 3 on click, new window's URL was `/present`, and its rendered text matched the sent slide exactly
- [x] 5.3 Manually verify: clicking "Send to output" again while the window is already open reuses/refocuses it (no duplicate window) and updates its content — verified in the same Electron run: window count stayed at 3 after a second click (no duplicate spawned)
- [x] 5.4 Manually verify on the web build: clicking "Send to output" opens/reuses a browser tab at `/present` showing the sent slide — verified in a real browser (Playwright): captured the `page` event fired by `window.open`, confirmed its URL and rendered text matched the sent slide

## 6. Cleanup

- [x] 6.1 Remove the orphaned, unreferenced `bible.present` key from `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts`
- [x] 6.2 Add i18n copy for the new project switcher (create/rename/delete/empty-state) and the Bible tab's template selector label
- [x] 6.3 Run `pnpm tsc --noEmit` and `eslint` across `apps/bibletime` and `apps/desktop`; fix any type/lint errors introduced by the `Folder.projectId` and IPC additions — both clean (desktop has no separate lint script, only `tsc`)
