## Context

Two independent desktop-only gaps, bundled because both live in `apps/desktop/src/main.ts` and both are "the Electron build doesn't behave like a desktop app" complaints.

**Project files.** `add-project-open-export` (in flight, not archived) built the portable `ProjectFile` bundle, a native `project:openFileDialog` for opening, and a `<a download>`-based export. The export half is web-shaped: in Electron a `Blob` + `<a download>` writes silently into the OS downloads folder under an auto-generated name — the user never picks a location and never learns whether it worked. That change's own task 5.2 records that the desktop path was never run against a live Electron build.

**Output window.** `createWindow`'s `setWindowOpenHandler` builds `/present` with `frame: false`, `autoHideMenuBar: true`, and a fixed `1280×720`. A frameless window with no title bar and no `-webkit-app-region: drag` region has, by construction, nothing to grab — it cannot be moved. There is no maximize affordance, no fullscreen entry point (the window has no menu), and the fixed size ignores the display it lands on. The `/present` route itself is a bare `h-screen w-screen` div with no window-level interaction at all.

Constraints that shape everything below:

- The same renderer code serves web and desktop. Every desktop behavior has to be feature-detected off `window.bibletime` and degrade to the current web behavior.
- The repo has **no toast/notification library** — existing user-facing errors go through `window.alert` (`TemplateLibraryToolbar`, `project-list.tsx`).
- Live slide state already flows console → `/present` through `localStorage` + `storage` events (`services/live-slide.ts`). `/present` needs no IPC to receive content.
- `apps/desktop` compiles against its own tsconfig with no path into the web app; shared shapes (`Project`, `Folder`, media reference parsing) are deliberately redeclared there. New shared shapes must follow that precedent.

## Goals / Non-Goals

**Goals:**

- Saving a project on desktop asks where to put it, writes there, says whether it worked, and remembers the file so the next save needs no dialog.
- Opening a project on desktop is verified against a real Electron build, end to end.
- The output window can be dragged to a second display, resized, maximized, and made fullscreen — and stays where it was put, across sessions.
- Byte-identical bundle output on both platforms; existing exported files keep opening.

**Non-Goals:**

- No autosave to file and no live link between managed storage and the on-disk file. Managed storage stays the source of truth.
- No `ProjectFile` schema change, and no new `schemaVersion`.
- No automatic projector detection or auto-fullscreen-on-second-display. The user places the window; the app remembers.
- No new runtime dependency (no toast library, no window-state package).
- No change to web behavior beyond what falls out of shared code.

## Decisions

### 1. `serializeProjectFile` is extracted; the two platforms differ only in where the string goes

`project-file.ts` today has `toProjectFile` (build the object) and `downloadProjectFile` (stringify + `Blob` + `<a download>`). Add `serializeProjectFile(project, folders): string` — `JSON.stringify(toProjectFile(...), null, 2)` — and have `downloadProjectFile` call it. The desktop path passes that same string over IPC.

*Why:* it makes "byte-identical across platforms" structural rather than a thing to remember. *Alternative rejected:* serializing in the main process from a `Project`/`Folder[]` payload — that would fork the format across two codebases that already can't import from each other, which is exactly how the two would drift.

### 2. `Project.filePath` is optional, renderer-owned, and excluded from the bundle

`Project` gains `filePath?: string`. It is written by the save/open flows into the project record in managed storage (both platforms carry the field; only desktop ever populates it). `toProjectFile` already spreads only `{ name }` from the project, so the bundle is untouched — a file never records where a *previous* copy of it lived.

*Why here and not in a separate map:* the binding is per-project and has to survive a restart, and `projectStorage` already persists per-project records on both platforms. A parallel path→id map would need its own storage, its own migration, and its own garbage collection on delete. *Trade-off:* the web build carries a field it never sets; harmless, and it keeps one `Project` type.

### 3. Two IPC handlers, not one: pick-a-path and write-to-a-path

- `project:saveFileDialog(defaultPath, contents)` → `dialog.showSaveDialog` (filtered to `.json`, `defaultPath` seeded from the project name or the current binding) then `fs.writeFile`; returns `{ canceled: true }` or `{ path }`.
- `project:saveToPath(filePath, contents)` → writes directly; returns `{ ok }` or `{ ok: false, error }`.

*Why split:* save-in-place must not open a dialog, and save-as must. Folding both into one handler means passing a "show the dialog?" flag and branching on it in the main process, which hides the two genuinely different user-visible behaviors behind one call. *Note:* `project:saveToPath` writes to an arbitrary path by design — this is a user-chosen destination reached through a dialog, the same trust model as `project:openFileDialog` reading an arbitrary path. It is not reachable from web content; the renderer is the app's own origin.

`project:openFileDialog` changes its return shape from `string | null` to `{ path: string; contents: string } | null` so the open flow can record the binding. This is a breaking change to the preload bridge and `electron.d.ts` — both are in-repo, single-caller, and updated in the same change.

### 4. Writes go through temp-file-then-rename

`fs.writeFile(tmp)` → `fs.rename(tmp, final)`, the pattern `bible-version-downloads:download` and `media-cache:write` already use. A save that dies partway must not leave a truncated file where a valid project used to be — and overwriting the user's only copy of a service's content is the worst case in this app.

*Trade-off:* `rename` fails across filesystems; the fallback is a direct write, which reintroduces the truncation window for that case only. Acceptable — the temp file is created in the destination's own directory, so cross-device is close to unreachable.

### 5. Feedback: `window.alert` for failures, transient inline status for success

Failures reuse the existing `window.alert` pattern (`project-list.tsx` already does this for a bad open). Success shows a short-lived "Saved to <path>" line in the projects panel rather than a modal.

*Why:* adding `sonner` for two messages is a dependency the repo has so far done without, and a modal on the happy path of a save the user will do repeatedly during a service is the wrong interruption. *Alternative rejected:* `dialog.showMessageBox` from main — desktop-only, so the web build would silently have no success feedback at all.

### 6. Output window: platform-conditional chrome instead of `frame: false`

- **macOS:** `titleBarStyle: "hiddenInset"` — keeps the chrome-less look, restores the traffic lights and, critically, a system drag region.
- **Windows / Linux:** a normal frame with `autoHideMenuBar: true` (`titleBarStyle` is macOS-only).
- Both: explicit `resizable: true`, `movable: true`, `maximizable: true`, `fullscreenable: true`.

*Why not keep `frame: false` and add a CSS drag region:* `-webkit-app-region: drag` swallows pointer events in the dragged region, which collides directly with double-click-to-fullscreen on the same background, and on macOS a double-click in a drag region triggers the system title-bar action (zoom/minimize, per user preference) rather than ours. Real chrome sidesteps both. And the presentation state that actually matters — fullscreen — has no chrome regardless of this choice.

### 7. Fullscreen is driven from the renderer via the HTML Fullscreen API

`/present` binds `F` / `F11` / double-click on the slide background to `document.documentElement.requestFullscreen()`, and `Esc` exits (the browser handles that natively). Electron maps HTML fullscreen onto the `BrowserWindow`, so this needs no IPC.

*Why:* one implementation that works identically in the web build's popup, and it keeps `/present` free of a `window.bibletime` dependency — the route is currently platform-agnostic and worth keeping that way.

### 8. Duplicate opens are denied in main, not deduplicated by window name

Main tracks `let outputWindow: BrowserWindow | null`. In `setWindowOpenHandler`, if a live output window exists, `outputWindow.focus()` and return `{ action: "deny" }`; otherwise `{ action: "allow", overrideBrowserWindowOptions }` and capture the window in `did-create-window`.

*Why:* the current code relies on `window.open`'s named-window reuse. Whether Chromium reuses that name is not something the app controls, and a second window created on top of the first would land at the *default* bounds — resetting the position and fullscreen state the user just set up, which is precisely the spec's "reusing the existing output window" scenario. Denying is safe because content reaches `/present` through `localStorage` + `storage` events, which the console writes on every send regardless of whether a window was opened.

### 9. Bounds live in `app-settings.json`, and `writeAppSettings` becomes merge-based

`AppSettings` gains `outputWindow?: { x, y, width, height, isFullScreen }`. Loaded once at `whenReady` (alongside `applyStoredProjectsDataDir`) into an in-memory value, because `overrideBrowserWindowOptions` is computed synchronously inside `setWindowOpenHandler` and cannot await a read. Persisted on the window's `moved`/`resized`/`close` events, debounced.

**Gotcha this change must fix:** `readAppSettings` currently returns only `{ schemaVersion, projectsDataDir }` and `changeProjectsDataDir` writes `{ schemaVersion, projectsDataDir }` wholesale. As written, relocating the projects folder would erase the saved output-window bounds. `readAppSettings` must preserve unknown/new fields and `writeAppSettings` must merge over what is on disk rather than replace it.

*Alternative rejected:* `electron-window-state` — a dependency for ~40 lines, against a "no new dependencies" goal, and it would not know about the multi-display validation below.

### 10. Opening bounds are validated against connected displays

On open: if saved bounds exist and intersect some display from `screen.getAllDisplays()`, use them. Otherwise size to the primary display's `workArea` — 16:9, ~70% of the work area, centered — replacing the fixed `1280×720`. This is what makes "the projector was unplugged" open on-screen instead of at coordinates that no longer exist.

## Risks / Trade-offs

- **Denying the second `window.open` changes an observable behavior** (today a second call may focus or recreate a window) → content delivery is unaffected because `setLiveSlide` runs on every send path independently of the `window.open` call; the deny branch still calls `focus()`, so "send to output" still surfaces the window.
- **`titleBarStyle: "hiddenInset"` puts traffic lights over the top-left of the slide area on macOS** → the slide is letterboxed inside a black frame, and the presentation state users actually project is fullscreen, where the controls are gone. Accepted.
- **`Project.filePath` can go stale** (file moved or deleted after binding) → save-in-place failure is caught and falls back to the Save-As dialog rather than surfacing a raw ENOENT (spec: "bound path is no longer writable").
- **Changing `project:openFileDialog`'s return shape breaks the preload contract** → single in-repo caller; `electron.d.ts`, `preload.ts`, and `use-projects.ts` change together, and typecheck catches a miss.
- **Merge-based `writeAppSettings` introduces a read-modify-write race** if two settings writes overlap → writes are user-initiated and seconds apart at minimum; the debounced bounds writer is the only automatic one, and losing one bounds update is invisible.
- **Desktop verification is manual.** A native OS dialog is modal outside the renderer's DOM, so Playwright cannot drive it — the same wall `add-project-open-export` hit. Mitigation: the tasks split verification into what the renderer can assert automatically and an explicit manual checklist run against a dev Electron build, with results recorded rather than assumed.

## Migration Plan

No data migration. `Project.filePath` is optional and absent on every existing record, which reads as "never saved to a file" — exactly right. `app-settings.json` gains an optional key that older builds ignore. Bundle format and `schemaVersion` are untouched, so files move in both directions between builds and platforms.

Rollback is a revert: nothing persisted by this change is required by anything else, and both new fields are ignorable.

## Open Questions

- Should "Save" appear in the project dropdown only, or also as a toolbar button next to Create/Open? Leaning dropdown-only (matching where Export lives today) to avoid crowding the toolbar — worth a look once it is on screen.
- Whether to also bind the output window's fullscreen to a global shortcut from the console window (present without leaving the console). Deferred; out of scope here.
