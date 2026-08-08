## Why

Two things break the "this is a real desktop app" expectation in the Electron build:

1. **Saving a project on desktop doesn't feel like saving.** The in-flight `add-project-open-export` change gave desktop a *native* Open dialog, but Export still goes through the web path — a `Blob` + `<a download>` (`downloadProjectFile`). In Electron that silently drops a file into the OS downloads folder with an auto-generated name, no "where do you want to save this?" prompt, and no confirmation the write happened. Worse, its desktop half was never verified end-to-end (that change's task 5.2 is explicitly marked "not run against a live Electron build"), so "can I save and open projects in desktop mode?" is currently an open question, not a known-good path.
2. **The presentation output window can't be moved or resized.** `createWindow`'s `setWindowOpenHandler` builds the `/present` window with `frame: false` and nothing else — no title bar to drag, no `-webkit-app-region` drag region in the route, no window controls, no fullscreen affordance, no display targeting, and a hard-coded 1280×720 that ignores whatever the projector/second display actually is. The one window that *must* be draggable onto a second screen and blown up to fill it is the one window the user has no handle on.

## What Changes

### Saving and opening projects on desktop

- Add a native **Save** path on desktop: `exportProject` routes through a new `project:saveFileDialog` IPC handler (`dialog.showSaveDialog` + `fs.writeFile`) when `window.bibletime` is present, so the user picks the folder and filename. Web keeps the existing `<a download>` behavior unchanged.
- Remember the **file a project came from / was last saved to**, so a project opened from disk (or previously saved to disk) can be re-saved in place with no dialog. A project that has never been written to a file falls back to the Save-As dialog on its first save.
- Surface the outcome: a success/failure toast (or inline status) instead of today's silent write, and an explicit "canceled" no-op when the user dismisses the dialog.
- **Verify the desktop open path end-to-end** against a real Electron build — the gap left open by `add-project-open-export` task 5.2 — covering open → edit → save → reopen.
- **Non-goal**: no autosave-to-file, no live two-way link between the app's managed storage and the on-disk file. The app's own storage stays the source of truth; the file is an explicit export/import artifact, exactly as `add-project-open-export` established.
- **Non-goal**: no change to the `ProjectFile` bundle format or its `schemaVersion`. Files written before this change stay openable, and files written after it stay openable by the web build.

### Presentation output window

- Give the `/present` window real window management in `setWindowOpenHandler`: explicitly `resizable: true`, `movable: true`, `maximizable: true`, `fullscreenable: true`, and a frame the user can actually grab. On macOS that means `titleBarStyle: "hiddenInset"` (keeps the chrome-less look, keeps the traffic lights and drag) rather than the current bare `frame: false`.
- Add an in-window **drag region** to the `/present` route so the letterboxed area around the slide can move the window even where the frame is hidden — a frameless window with no drag region is unmovable by construction.
- Add **fullscreen toggle** (double-click / `F` / `F11`, `Esc` to exit) and open the window sized to the display it lands on rather than a fixed 1280×720.
- **Persist the output window's bounds and display** across sessions, so a user who drags it to the projector once doesn't redo it every service.
- **Non-goal**: no automatic "detect the projector and go fullscreen there" logic. The user places the window; the app remembers where.

## Capabilities

### New Capabilities

- `desktop-project-file-io`: On desktop, a project is saved to and opened from a user-chosen location on disk through native OS dialogs, remembers the file it is bound to so subsequent saves need no dialog, and reports success/failure — while the web build keeps its browser download/file-picker behavior.
- `presentation-output-window`: The presentation output window is movable, resizable, maximizable, and fullscreen-capable; it opens sized to its display, offers keyboard/pointer fullscreen control, and remembers its position and size across sessions.

### Modified Capabilities

- none. `openspec/specs/` is empty — every capability in this repo still lives in an unarchived in-flight change. The closest neighbor, `project-file-portability` (from `add-project-open-export`), covers the *portable bundle format and the web/desktop open flow*; `desktop-project-file-io` layers desktop-native saving and file binding on top of it without changing the bundle format or any requirement that change states.

## Impact

- `apps/desktop/src/main.ts` — new `project:saveFileDialog` and `project:saveToPath` IPC handlers (`dialog.showSaveDialog`, `fs.writeFile`); `project:openFileDialog` extended to return the chosen path alongside the contents; `setWindowOpenHandler`'s `/present` branch rewritten for a movable/resizable/fullscreenable window sized from the target display; new output-window bounds persistence (reusing the existing `app-settings.json` / `readAppSettings`+`writeAppSettings` pattern).
- `apps/desktop/src/preload.ts` and `apps/bibletime/src/types/electron.d.ts` — bridge methods and type declarations for the new project-save IPC, plus the changed `openFileDialog` return shape.
- `apps/bibletime/src/modules/library/services/project-file.ts` — `serializeProjectFile` split out from `downloadProjectFile` so the desktop path can write the same bytes without going through a `Blob`/`<a download>`.
- `apps/bibletime/src/modules/library/actions/use-projects.ts` — `exportProject` becomes platform-aware (native save on desktop, download on web); `openProjectFile` records the source path; a new `saveProject`/`saveProjectAs` pair for save-in-place vs. choose-location.
- `apps/bibletime/src/modules/library/interfaces/index.ts` — `Project` gains an optional `filePath` (desktop-only, absent on web; ignored by the `ProjectFile` bundle so exports stay portable).
- `apps/bibletime/src/modules/library/components/project-list.tsx`, `project-launcher.tsx`, `views/console-view.tsx` — menu/toolbar wiring for Save vs. Save As, and result feedback.
- `apps/bibletime/src/routes/present/index.tsx` — drag region and fullscreen keyboard/double-click handling.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — keys for Save / Save as… / save-succeeded / save-failed.
- No change to the `ProjectFile` bundle schema, to the storage drivers under `services/storage/`, or to the web build's existing export/open behavior.
