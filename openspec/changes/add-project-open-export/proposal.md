## Why

The Projects tab only lets a user create a project by name and switch between whatever happens to already be listed from the app's own managed storage — there's no way to hand someone a project file, or to reopen one on a different machine/install, the way a real desktop app's "Open" and "Save"/"Export" would work. Since BibleTime also ships as a desktop app (Electron), a project should be able to live as a portable file the user can save, share, and later open — not only as an entry auto-enumerated from a fixed app-data folder.

## What Changes

- Add an explicit **"Create"** and **"Open"** button pair to the Projects tab, mirroring the Templates tab's create/import layout, replacing today's small icon-only "+" affordance with a more discoverable pair of primary actions.
- **"Open"** loads a previously-exported project file (a single JSON bundle containing the project plus all of its folders and their slides) and adds it as a new project in the app, switching to it immediately.
  - **Desktop**: uses Electron's native `dialog.showOpenDialog` so the user can browse to a project file saved anywhere on disk — not limited to the app's own managed project directory. This is new ground for this codebase (no existing feature uses Electron's native file dialogs today; templates/library/projects all currently read/write only inside the app's own managed storage directory).
  - **Web**: falls back to a standard `<input type="file">` picker (browsers have no filesystem access), reading and validating the same bundle format — mirroring exactly how the Templates tab's "Importar" already works.
- Add an **"Export"** action per project (in its existing dropdown menu, alongside Rename/Delete) that bundles the project and its folders into one downloadable JSON file — the counterpart that makes "Open" meaningful, mirroring the Templates tab's per-card "Exportar" (plain browser download, no native save dialog, on both platforms, for consistency with how templates already export).
- **Non-Goal**: "Open" does not create a live link back to the opened file — once opened, the project is copied into the app's own managed storage (fresh ids, like every other create/import flow in this app) and behaves exactly like any other project from then on. Editing it does not write back to the original file.
- **Non-Goal**: No change to how "Create" works today (name-prompt, saved into the app's managed storage) — it's kept as-is, just given equal visual billing next to "Open".

## Capabilities

### New Capabilities
- `project-file-portability`: A project (and its folders/slides) can be exported to a single JSON file and later opened back in as a new project — via a native file dialog on desktop or a browser file picker on web — independent of the app's own managed project storage.

### Modified Capabilities
- none (no existing `openspec/specs/` capabilities predate this change; the in-flight `projects` capability from `add-projects-and-console-fixes` has not been archived yet)

## Impact

- `apps/bibletime/src/modules/library/services/project-file.ts` (new) — bundle schema (`{ schemaVersion, project: { name }, folders: Folder[] }`), `serializeProjectFile`/`downloadProjectFile` (export), `parseProjectFile` (validate + normalize on import), mirroring `apps/bibletime/src/modules/templates/services/template-file.ts`'s pattern.
- `apps/bibletime/src/modules/library/actions/use-projects.ts` — gains `exportProject(id)` (reads the project's folders and triggers a download) and `openProjectFile(contents)` (parses a bundle, creates a new project + remapped folders with fresh ids, switches to it).
- `apps/bibletime/src/modules/library/components/project-list.tsx` — toolbar gains an "Open" button next to the existing create control; each project's dropdown menu gains an "Export" item.
- `apps/desktop/src/main.ts` / `apps/desktop/src/preload.ts` — new `project:openFileDialog` IPC handler using Electron's `dialog.showOpenDialog`, reading the chosen file's contents and returning them to the renderer for parsing; new preload bridge method.
- No change to `apps/bibletime/src/modules/library/services/storage/*` (project/library storage drivers) — opened projects are saved through the exact same drivers as any other create, just seeded with imported data instead of a blank folder list.
