## 1. Project file format

- [x] 1.1 Create `apps/bibletime/src/modules/library/services/project-file.ts`: a `ProjectFile { schemaVersion: 1; project: { name: string }; folders: Folder[] }` type, `serializeProjectFile(project, folders)`, `downloadProjectFile(project, folders)` (Blob + `<a download>`, mirroring `template-file.ts`'s `downloadTemplateFile`), and `parseProjectFile(raw: string): ProjectFile` (validates JSON/shape/schema version, throws a descriptive error otherwise, mirroring `parseTemplateFile`).

## 2. Desktop native Open dialog

- [x] 2.1 In `apps/desktop/src/main.ts`, import `dialog` from `"electron"` and add `ipcMain.handle("project:openFileDialog", ...)`: shows `dialog.showOpenDialog` (attached to `BrowserWindow.getFocusedWindow()` when available) filtered to `.json`, returns the selected file's contents as a string, or `null` if canceled.
- [x] 2.2 In `apps/desktop/src/preload.ts`, add `project.openFileDialog: () => ipcRenderer.invoke("project:openFileDialog")` to the exposed bridge. Also updated `apps/bibletime/src/types/electron.d.ts` (the renderer-side type declaration for `window.bibletime`, not originally called out in the task but required for the renderer to call this without a type error).

## 3. Library actions

- [x] 3.1 In `apps/bibletime/src/modules/library/actions/use-projects.ts`, add `exportProject(id)`: fetches all folders for that project (a direct `libraryStorage.list()` call filtered by `projectId`, not `useLibrary`'s already-filtered state), and calls `downloadProjectFile`.
- [x] 3.2 In the same file, add `openProjectFile(contents: string)`: calls `parseProjectFile`, creates a new `Project` (fresh id) via `projectStorage.save`, builds an `oldId -> newId` map for every folder in the bundle, saves each folder with its remapped `id`/`parentId`/`projectId` and fresh item ids, refreshes, and switches to the new project — returns the created project (or throws/rejects on invalid input, letting the caller show an error).

## 4. UI

- [x] 4.1 In `apps/bibletime/src/modules/library/components/project-list.tsx`, replace the icon-only "+" with a "Create"/"Open" button pair in the toolbar. "Open" calls `window.bibletime.project.openFileDialog()` directly when present (desktop); otherwise it triggers a hidden `<input type="file" accept="application/json">` (web), mirroring `TemplateLibraryToolbar`'s `fileInputRef` pattern.
- [x] 4.2 Wire the "Open" flow's result (file contents, from either source) through `openProjectFile`, showing an error (`window.alert`, matching `TemplateLibraryToolbar`'s existing error handling) if it throws.
- [x] 4.3 Add an "Export" item to each project's existing dropdown menu (next to Rename/Delete), calling `exportProject(project.id)`.
- [x] 4.4 Threaded `exportProject`/`openProjectFile` from `useProjects()` through `console-view.tsx` into both `bottom-drawer.tsx` → `project-list.tsx` and `project-launcher.tsx` (the very-first-project screen also gets the "Open" affordance, plus matching i18n keys in en/es/pt).

## 5. Verification

- [x] 5.1 Manually verified (web, Playwright against the live Vite dev server): exported a project with a folder + slide, downloaded the JSON, and reopened it via the file-input picker in a *fresh* browser context (empty `localStorage`, simulating a different machine) — the new project appeared with the same folder and slide, and became active.
- [~] 5.2 Not run against a live Electron build. `apps/desktop/src/main.ts`'s `project:openFileDialog` handler typechecks and follows a standard `ipcMain.handle` + `dialog.showOpenDialog` + `fs.readFile` shape with no novel logic, but a native OS file dialog is a modal outside the renderer's DOM — Playwright (or any DOM-based driver) can't click into or assert on it, so a full xvfb+Electron harness would only prove the app launches, not that the dialog itself works. The renderer-side logic it feeds into (`parseProjectFile`/`openProjectFile`) is identical on both platforms and is what 5.1/5.3/5.4/5.5 already exercise.
- [x] 5.3 Manually verified: opening the exported file a second time (same browser session, project already present) created a second, independent "Export Test" project — two separate pills in the Projects tab, distinct ids, no collision.
- [x] 5.4 Manually verified: opening an unrelated JSON file (`{"hello":"world"}`) surfaced the alert "El archivo no tiene el formato de un proyecto de BibleTime." and left the launcher in its empty "Create your first project" state — no project created.
- [~] 5.5 Not separately re-run — 5.1's exported file already contains a real folder/slide; the empty-project path exercises the same `exportProject`/`downloadProjectFile`/`parseProjectFile` code with `folders: []`, already covered by `parseProjectFile`'s validation (`Array.isArray(folders)` accepts an empty array) and `openProjectFile`'s remap loop (a no-op over zero folders).
- [x] 5.6 Typecheck passes for both `apps/bibletime` (`web`) and `apps/desktop`. Lint is clean on every touched `apps/bibletime` file (two `@typescript-eslint/no-unnecessary-condition` fixes and one unnecessary-type-assertion fix applied); `apps/desktop` has no lint script configured in this repo (typecheck-only package), so nothing to run there.
