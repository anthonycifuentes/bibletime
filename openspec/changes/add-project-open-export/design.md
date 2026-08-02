## Context

`Project` (`interfaces/index.ts`) is `{ id, name, createdAt, updatedAt }` — no file-path concept. Both storage drivers (`web-project-storage.ts` via `localStorage`, `desktop-project-storage.ts` via IPC → `apps/desktop/src/main.ts`'s `project:list/save/remove`, one JSON file per project under `app.getPath("userData")/projects/<id>.json`, auto-enumerated via `fs.readdir`) only ever read/write inside storage the app itself owns — there is no concept of a project file living anywhere else on disk, and `grep -n "showOpenDialog\|showSaveDialog\|dialog\." apps/desktop/src/main.ts apps/desktop/src/preload.ts` returns nothing: **Electron's native `dialog` module has never been used in this codebase.**

The closest existing precedent is Templates' "Nueva"/"Importar"/"Exportar" trio (`template-library-toolbar.tsx`, `template-manager.tsx`, `template-file.ts`): "Importar" is a hidden `<input type="file">` (works identically in a browser tab and in Electron's Chromium renderer — no IPC needed), and "Exportar" is a `Blob` + `<a download>` (also plain browser API, silently saves to the OS default downloads location, no save dialog). Neither uses Electron's native dialog API. Since the user specifically wants a **native "Open" file browser on desktop** (not limited to the app's downloads folder or managed directory), this change introduces the first use of `dialog.showOpenDialog` in this codebase — genuinely new ground, not just copying the Templates pattern verbatim.

`use-projects.ts`'s `create(name)` builds `{id, name, createdAt, updatedAt}` and saves via `projectStorage`; `useLibrary`'s `folders` are scoped to `activeProjectId` (folders for other, inactive projects aren't loaded into that hook's state) — exporting a non-active project needs its own direct `libraryStorage.list()` call rather than reading `useLibrary`'s already-filtered `folders`.

## Goals / Non-Goals

**Goals:**
- "Create" and "Open" are two equally prominent buttons in the Projects tab toolbar, replacing today's single small icon-only "+".
- "Open" on desktop uses a real native file-open dialog, letting the user browse anywhere on disk — not just the app's managed project directory.
- "Open" on web falls back to a standard `<input type="file">` picker (browsers can't show a native OS dialog outside one triggered by a file input).
- A project can be exported as one self-contained JSON file (its metadata + all its folders + their slides), so there's something meaningful to open later or hand to someone else.
- Opening a file creates a brand-new project in the app's own managed storage (fresh ids throughout) — it becomes a normal project from then on, editable and re-savable like any other.

**Non-Goals:**
- No live link back to the opened file — no "Save" that writes back to the original path, no file-watching, no "recently opened files" list. Opening is a one-time import.
- No native `dialog.showSaveDialog` for "Export" — it stays a plain browser download (`Blob` + `<a download>`), matching Templates' existing export behavior exactly, so desktop and web behave identically for export and only "Open" diverges by platform.
- No change to the "Create" flow itself (name-prompt → blank project) — only its button's visual prominence changes.
- No versioned/incremental sync between the opened file and future exports of the same project — each export is a fresh, independent snapshot.

## Decisions

**1. New `project-file.ts` bundle format, mirroring `template-file.ts`'s shape: `{ schemaVersion: 1, project: { name: string }, folders: Folder[] }`.**
Folders are included as-is (their original `id`/`parentId` values kept internally consistent within the file) — no stripping needed at export time, since remapping happens once, at import time (Decision 2). `project.createdAt`/`updatedAt`/`id` are deliberately omitted from the bundle (they're regenerated on import, same as every other create flow in this app); only `name` carries over.

**2. Import remaps every folder id to a fresh one via a single `Map<oldId, newId>`, so `parentId` chains stay internally consistent without colliding with any existing data.**
`openProjectFile(contents)` in `use-projects.ts`: `parseProjectFile(contents)` validates the bundle (schema version, shape — throws a descriptive error otherwise, same contract as `parseTemplateFile`), creates a new `Project` with a fresh id, builds an id map for every folder in the bundle, then saves each folder with its own fresh id, `projectId` set to the new project, `parentId` resolved through the map (or `null` if it was a root folder), and every one of its `items` also given a fresh id (cheap, and avoids any theoretical id collision if the same file is opened twice). Refreshes and switches to the new project on success, mirroring `create()`'s existing shape.

**3. Desktop "Open" adds one new IPC round-trip, `project:openFileDialog`, that both shows the dialog and reads the file — no separate "give me a path" call.**
`main.ts` gains `ipcMain.handle("project:openFileDialog", async () => { const win = BrowserWindow.getFocusedWindow() ?? undefined; const result = await dialog.showOpenDialog(win, { properties: ["openFile"], filters: [{ name: "BibleTime Project", extensions: ["json"] }] }); if (result.canceled || !result.filePaths[0]) return null; return fs.readFile(result.filePaths[0], "utf8") })` — no module-level window reference exists today (`createWindow()`'s `win` is local), so `BrowserWindow.getFocusedWindow()` is used to attach the dialog as a sheet/modal on the active window when there is one, falling back to a non-modal dialog otherwise. Returns the raw file contents (or `null` if canceled) directly, so the renderer only ever deals with "I have contents, or I don't," never a filesystem path. Parsing/validation (`parseProjectFile`) stays in the renderer, same division of responsibility as template import. `preload.ts` exposes `project.openFileDialog: () => ipcRenderer.invoke("project:openFileDialog")`.

**4. `ProjectList`'s UI branches on driver capability, not a separate "am I on desktop" flag.**
`getProjectStorage()` already distinguishes desktop vs. web (`window.bibletime?.project` presence); the "Open" button reuses that same signal (exposed via a `canOpenNatively`-style check, or simply: if `window.bibletime?.project?.openFileDialog` exists, call it directly; otherwise fall back to triggering a hidden `<input type="file">`, exactly like `TemplateLibraryToolbar`'s existing `fileInputRef` pattern). No new platform-detection utility is introduced — this is the same check the storage-driver selector already makes, applied to one more capability.

**5. "Export" is a per-project dropdown action (next to Rename/Delete), not a toolbar button — matching Templates' per-card "Exportar" rather than inventing a new toolbar layout.**
Keeps the toolbar itself limited to exactly two buttons ("Create"/"Open"), matching the Templates toolbar's two-button shape; export is inherently per-item (which project's data to bundle), same as Templates' export already being a per-card action rather than a toolbar-level one.

## Risks / Trade-offs

- [A malformed or hand-edited project file could reference a `parentId` that doesn't resolve, or create a folder cycle] → Mitigation: `parseProjectFile` validates shape/schema version up front (same contract as templates); the id-remap in Decision 2 only ever resolves through the map built from the file's own contents, so an unresolvable `parentId` degrades to `null` (root-level) rather than crashing — no cycle can be introduced this way since the map is built once, before any writes happen, from the flat list in the file (a folder can't reference a `parentId` that doesn't exist somewhere in that same map without the reference simply not resolving).
- [Introducing Electron's `dialog` module is new surface area with no existing precedent to lean on in this codebase] → Mitigation: scoped to exactly one call (`showOpenDialog`, read-only), no `showSaveDialog`/`showMessageBox`/etc. — the smallest possible slice needed for this feature.
- [Exporting a very large project (many folders/slides) produces one large JSON download] → Mitigation: consistent with how templates already export (no size cap today); folders/slides in this app are text-based (Bible passages, simple metadata), not embedding media, so file sizes stay small in practice.

## Migration Plan

No data migration — this is purely additive (new IPC handler, new file format, new UI actions). Existing projects and their storage are untouched; opening a file only ever adds a new project alongside whatever already exists.
