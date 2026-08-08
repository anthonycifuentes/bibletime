## 1. Shared serialization and the project↔file binding

- [x] 1.1 In `apps/bibletime/src/modules/library/services/project-file.ts`, extract `serializeProjectFile(project, folders): string` (`JSON.stringify(toProjectFile(...), null, 2)`) and rewrite `downloadProjectFile` to call it, so both platforms emit byte-identical bytes. Export `projectFileName(project)` for the slugified `<name>.bibletime-project.json` default so the native dialog and the web download share one naming rule.
- [x] 1.2 In `apps/bibletime/src/modules/library/interfaces/index.ts`, add `filePath?: string` to `Project`, documenting that it is desktop-only, renderer-owned, and deliberately excluded from `ProjectFile` (`toProjectFile` already spreads only `{ name }` — confirmed, no change needed there; task 7.3 asserts the exclusion rather than trusting it).

## 2. Desktop IPC: native save

- [x] 2.1 In `apps/desktop/src/main.ts`, add a `writeFileAtomic(filePath, contents)` helper: write to `<filePath>.tmp` then `fs.rename` into place, falling back to a direct write if `rename` fails with `EXDEV` — mirroring `bible-version-downloads:download` / `media-cache:write`. The temp file is cleaned up on every failure path.
- [x] 2.2 Add `ipcMain.handle("project:saveFileDialog", ...)`: `dialog.showSaveDialog` (attached to `BrowserWindow.getFocusedWindow()` when available, `defaultPath`, filter `{ name: "BibleTime Project", extensions: ["json"] }`), returns `{ canceled: true }` when dismissed, otherwise writes via 2.1 and returns `{ canceled: false, ok, path | error }`.
- [x] 2.3 Add `ipcMain.handle("project:saveToPath", ...)`: writes via 2.1, returns `{ ok: true, path }` or `{ ok: false, error }` — never throws across IPC, so the renderer can offer the Save-As fallback instead of surfacing a raw errno.
- [x] 2.4 Change `project:openFileDialog` to return `{ path, contents }` instead of the bare contents string (still `null` on cancel).
- [x] 2.5 In `apps/desktop/src/preload.ts`, expose `project.saveFileDialog` and `project.saveToPath`, and update `project.openFileDialog`'s cast to the new shape.
- [x] 2.6 In `apps/bibletime/src/types/electron.d.ts`, declare the two new methods and the changed `openFileDialog` return type.

## 3. Renderer save/open flows

- [x] 3.1 In `apps/bibletime/src/modules/library/actions/use-projects.ts`, add `saveProjectAs(id)`: serializes via 1.1, calls `saveFileDialog` on desktop (falling back to `downloadProjectFile` when the bridge is absent), and on a non-canceled result persists `filePath` onto the project record and refreshes. Extracted `foldersOf(projectId)` and `bindFilePath(project, path)` helpers, since both save paths need them.
- [x] 3.2 Add `saveProject(id)`: when the project has a `filePath` and the desktop bridge is present, call `saveToPath`; with no `filePath` (or no bridge) it falls through to `saveProjectAs`. On web it delegates to the existing download path unchanged.
- [x] 3.3 Rework `exportProject` to delegate to `saveProject`, so the existing menu item and the new one share one save path rather than diverging.
- [x] 3.4 `openProjectFile(contents, filePath?)` now takes the path from the desktop dialog and stores it as the created project's `filePath`; the web file-input path passes contents only and leaves `filePath` undefined.
- [x] 3.5 Added `ProjectSaveResult` (`{ status: "saved", path? } | { status: "canceled" } | { status: "failed", error, retryWithDialog? }`) in `interfaces/index.ts`; every save path returns it rather than throwing, so the UI can tell a cancel from a failure. `retryWithDialog` marks the one recoverable failure (a stale binding).

## 4. Save UI and feedback

- [x] 4.1 In `project-list.tsx`, the project dropdown gains "Save" and "Save as…". **Deviation from the task as written:** the task said to add them *alongside* the existing "Export project", but on desktop "Export" would then behave identically to "Save as…" — three items where two do the same thing. The menu now branches on `canSaveToFile` (the presence of the `saveToPath` bridge): desktop shows Save + Save as…, web keeps the single "Export project" item with its existing label and behavior. This matches the proposal's "web behavior unchanged" and design decision 5; it is the placement question flagged in design.md's Open Questions, now resolved.
- [x] 4.2 A transient "Saved to <path>" line appears in the projects panel on `status: "saved"` (auto-clearing after 5s via `useEffect`); `window.alert` on `status: "failed"`, matching existing error handling; nothing on `status: "canceled"`. A `retryWithDialog` failure alerts the reason *first*, then opens the Save-As dialog — the order the spec's "bound path is no longer writable" scenario requires.
- [x] 4.3 Added `library.saveProject`, `library.saveProjectAs`, `library.projectSaved`, `library.projectSavedTo`, and `library.saveProjectError` to the en/es/pt dictionaries, using the existing `{{param}}` interpolation.
- [x] 4.4 (Not in the original plan, required by 3.4/4.1.) Threaded the new props through `bottom-drawer.tsx` and `console-view.tsx`, and updated `project-launcher.tsx` for `openFileDialog`'s new `{ path, contents }` shape — it has its own copy of the open flow.

## 5. Output window: main-process window management

- [x] 5.1 Extended `AppSettings` with `outputWindow?: { x, y, width, height, isFullScreen }`. **Fixed the gotcha this task was written to catch:** `readAppSettings` picked only known keys and `writeAppSettings` replaced the file wholesale, so relocating the projects folder would have erased the saved bounds. `readAppSettings` now returns the whole object and `writeAppSettings` takes a `Partial<AppSettings>` and merges over what is on disk. `changeProjectsDataDir`'s reset-to-default still clears `projectsDataDir` correctly (an explicit `undefined` is dropped by `JSON.stringify`).
- [x] 5.2 `loadOutputWindowBounds()` runs in `app.whenReady()` next to `applyStoredProjectsDataDir()`, into a module-level `outputWindowBounds` — `overrideBrowserWindowOptions` is computed synchronously and cannot await a read.
- [x] 5.3 `resolveOutputWindowBounds()` returns saved bounds when they intersect a display from `screen.getAllDisplays()`, otherwise a centered 16:9 box at ~70% of the primary display's `workArea`, replacing the hard-coded `1280×720`.
- [x] 5.4 Rewrote the `/present` branch of `setWindowOpenHandler`: `frame: false` replaced by `titleBarStyle: "hiddenInset"` on darwin and a normal frame with `autoHideMenuBar: true` elsewhere; `resizable`/`movable`/`maximizable`/`fullscreenable` set explicitly; 5.3's bounds applied.
- [x] 5.5 The output window is tracked in a module-level `outputWindow`, captured in `webContents.on("did-create-window")` and cleared on `closed`. A second open focuses (and un-minimizes) the existing window and returns `{ action: "deny" }`, so no duplicate is created and no position/fullscreen state is reset.
- [x] 5.6 Bounds persist from `moved`/`resized`/`enter-full-screen`/`leave-full-screen`/`close`, debounced 400ms, writing `getNormalBounds()` so a maximized or fullscreen window never overwrites the restore size. Listeners are registered individually rather than in a loop — `BrowserWindow.on` is typed with one overload per event name and a loop has no overload to match.

## 6. Output window: renderer

- [x] 6.1 In `apps/bibletime/src/routes/present/index.tsx`, `F` / `F11` (window `keydown`) and double-click on the slide background toggle `requestFullscreen()` / `exitFullscreen()`. `Esc` needs no handler — the browser exits fullscreen natively.
- [x] 6.2 Confirmed the toggle is pure HTML Fullscreen API with no `window.bibletime` reference, so `/present` stays platform-agnostic and works the same in the web build's popup. Both calls `.catch()` their rejection (they reject outside a user gesture) so a keystroke can never produce an unhandled rejection mid-presentation.
- [x] 6.3 Verified by inspection, no code needed: `SlideFrame` sizes from a `useSlideFit` measurement driven by a `ResizeObserver` on its container (and deliberately not CSS `aspect-ratio`), so window resize and fullscreen enter/exit both re-letterbox on their own.

## 7. Verification — automatable

- [x] 7.1 `pnpm --filter web typecheck`, `pnpm --filter desktop typecheck`, and `eslint` over every touched `apps/bibletime` file all pass clean. (`apps/desktop` has no lint script in this repo.) `pnpm --filter web build` also succeeds — client and SSR bundles.
- [~] 7.2 **Not run as a browser test — no driver available.** This repo has no test runner and no Playwright installed, and this session had no browser automation tool, so the click-through of export → reopen could not be performed. What *was* verified: the web path is now structurally the same bytes as before (`downloadProjectFile` calls `serializeProjectFile`, asserted in 7.3), the web branch is selected by the absence of `window.bibletime.project.saveFileDialog`, the web menu item keeps its original label and handler (4.1), and the whole app typechecks, lints, and builds. Item 8.14 covers the click-through by hand.
- [x] 7.3 Ran a standalone assertion script (`tsx`) over the real `project-file.ts`. All pass: (1) `serializeProjectFile` → `parseProjectFile` round trips to exactly `toProjectFile`'s output; (2) **`filePath` never reaches the bundle** — neither the path string nor the key appears in the serialized file or the parsed project, and `project` carries `name` and nothing else; (3) `projectFileName` stays filesystem-safe through accents and em dashes (`Culto Domingo — Ñandú` → `culto-domingo-nandu.bibletime-project.json`); (4) a pre-change fixture (`schemaVersion: 1`, hand-written) still opens; (5) a zero-folder project round trips; (6) invalid JSON, a foreign object, and `schemaVersion: 2` all still throw.
- [~] 7.4 **Partially verified.** `/present` builds and its route is served (HTTP 200). Full SSR render could not be confirmed on this machine for a **pre-existing, unrelated reason**: `pdfjs-dist` references the `Iterator` global, which needs Node 22+, and this machine runs Node 20.19.0 — SSR of routes pulling that dependency fails on `main` regardless of this change (the stack trace touches none of the files here). The fullscreen handlers are guarded for the no-`document` case; the keydown listener is registered in `useEffect`, so it is client-only by construction. Behavior in a real window is covered by 8.8.
- [x] 7.5 (Added.) Static IPC parity check between `main.ts` and `preload.ts` — something typecheck cannot catch, since channel names are plain strings. All six `project:*` channels the preload invokes are handled in main, including the two new ones.

## 8. Verification — manual, against a live Electron build

**None of these have been run.** They need a running Electron GUI and a human to drive native OS dialogs — modal windows outside the renderer's DOM that no DOM driver can reach, the same wall `add-project-open-export` hit at its task 5.2. They are left unchecked deliberately rather than marked done by inference. Record the actual result of each.

- [ ] 8.1 Save a new project: dialog opens, filename is pre-filled from the project name, chosen location receives the file, success status appears.
- [ ] 8.2 Cancel the save dialog: nothing is written, no error, project unchanged.
- [ ] 8.3 Save an already-bound project: no dialog, file overwritten in place, success status appears.
- [ ] 8.4 Save as… on a bound project: dialog pre-filled with the current path, new file written, project rebound, original file left as it was.
- [ ] 8.5 Bound path made unwritable (delete the containing folder, or point at an unmounted volume): the error is reported with a reason *first*, then the Save-As dialog is offered; managed storage still holds the project.
- [ ] 8.6 Full round trip: open a project file → edit it → save → reopen the file → the edits are present.
- [ ] 8.7 Output window: drag it to a second display, resize by an edge, maximize — all three work.
- [ ] 8.8 Output window fullscreen: `F` / `F11` / double-click enters, `Esc` leaves and restores the previous windowed bounds; sending a new slide while fullscreen updates content without leaving fullscreen.
- [ ] 8.9 Output window reuse: with the window already open, moved, and fullscreen on a second display, send another slide — same window updates in place, no duplicate window, no reset.
- [ ] 8.10 Bounds persistence: move/resize, close the output window, send again → reopens where it was; quit and relaunch the app → still reopens where it was.
- [ ] 8.11 Disconnected-display fallback: save bounds on a second display, disconnect it, send to output → the window opens fully on-screen on the primary display.
- [ ] 8.12 Opening on a small display: the window opens fully inside that display's work area with nothing off-screen.
- [ ] 8.13 Settings interaction: relocate the projects data directory (Settings), then reopen the output window → the saved output bounds survived the `app-settings.json` write (guards task 5.1's gotcha).
- [ ] 8.14 Web click-through, covering what 7.2 could not drive: export a project with a folder + slide from the browser build, reopen the downloaded file in a fresh context, and confirm the single "Export project" menu item still reads and behaves as it did before.
