## Why

A project is the operator's whole service — folders, slides, running order — and right now keeping it on disk is entirely manual. `fix-desktop-project-files-and-output-window` gave desktop real Save and Save as… with a `filePath` binding, but it deliberately stopped there: *"no autosave-to-file, no live two-way link"*. The consequence is that a project's file is only ever as current as the last time someone remembered to press Save, and a project created in the app has no file at all until someone thinks to make one.

That's the wrong default for the actual usage: the app is driven live, mid-service, by someone whose attention is on the screen and not on a Save button. The failure mode isn't losing the app's data — managed storage already persists every folder mutation — it's that the *file the user believes is their project* silently falls behind, and they only discover it when they open it somewhere else.

This change makes the file keep up on its own, and — because auto-save is exactly the kind of thing you can't tell is working — makes its state visible.

## What Changes

### A new project asks where it lives

- Creating a project on desktop immediately opens the native save dialog, seeded with `<name>.bibletime-project.json`, and binds the project to whatever location is chosen. The project is file-backed from its first moment rather than from whenever someone remembers.
- **Dismissing the dialog still creates the project.** It lives in managed storage exactly as projects do today, simply unbound, and the first successful Save binds it. Starting work is never blocked by a modal, which matters because projects get created under time pressure.
- Web is unchanged: there is no filesystem to pick from, so creation stays dialog-free.

### The bound file keeps itself current

- Once a project is bound to a file, changes to it — folders added or renamed or reordered, slides added, removed, reordered, retemplated, the project renamed — write through to that file automatically, **debounced ~2s after the last change**, coalescing a burst of edits into one write.
- A final flush is attempted when the window is closing, so the last edit before quitting isn't the one that's lost.
- Auto-save writes the **same bytes as Save** — one `serializeProjectFile` of the project and every folder in it. There is no partial or incremental file format.
- Auto-save is **desktop-only**, gated on the `project.saveToPath` bridge. The web build keeps its managed-storage-plus-explicit-download behavior.

### Managed storage stays the source of truth

The file is a **mirror**, not the live document. Managed storage remains what the app reads and writes; auto-save projects that state onto disk. Opening a file still creates an independent copy, unchanged from today. This keeps the change additive — no reader, no migration, and no new failure mode where an externally-edited file and the app disagree about who's right.

### Save state becomes visible

- Add a status indicator alongside the existing Save / Save as… controls: **Saved** (with the bound path), **Saving…**, **Unsaved changes**, **Not saved to a file**, or **Save failed** with the reason.
- The existing Save button is kept exactly as the manual fallback it already is — it writes the entire project, and it is what recovers a project whose auto-save is failing (a deleted file, a disconnected volume, a permissions change).
- A failed auto-save does **not** silently retry forever: it surfaces the error and leaves the manual path available, matching how `saveProject` already reports a stale binding as recoverable rather than reopening a dialog on its own.

## Capabilities

### New Capabilities

- `project-autosave`: keeping a bound project file current without user action — what counts as a change, the debounce and coalescing rule, the close-time flush, the desktop-only gating, and the guarantee that an auto-save writes the same complete bundle a manual Save does.
- `project-save-status`: the user-visible save state — the saved/saving/unsaved/unbound/failed states, when each is shown, the bound path, and the rule that a failure is surfaced rather than retried silently.

### Modified Capabilities

- `desktop-project-file-io`: two of its stated behaviors change. Its non-goal *"no autosave-to-file"* is reversed for bound projects, and project creation now opens the save dialog instead of producing an unbound project. Its file format, its binding semantics, its open-as-a-copy behavior, and its web fallback are all unchanged.

## Impact

**Modified:**
- `apps/bibletime/src/modules/library/actions/use-projects.ts` — `create` gains the bind-on-create flow (desktop only, cancel-tolerant); a `saveState` per project and a `flushPendingSave` for the close path.
- `apps/bibletime/src/modules/library/actions/use-project-autosave.ts` *(new)* — the debounce + change-detection hook. Kept separate from `useProjects` because it needs the *folders* (`useLibrary`), and `useProjects` deliberately doesn't depend on them.
- `apps/bibletime/src/modules/library/views/console-view.tsx` — mounts the autosave hook, where both `useProjects` and `useLibrary` are already held.
- `apps/bibletime/src/modules/library/components/project-list.tsx` — the status indicator and bound path beside the existing Save controls.
- `apps/bibletime/src/modules/library/interfaces/index.ts` — a `ProjectSaveState` union. `Project` itself is unchanged; save state is runtime state, not persisted.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — status and error strings in all three locales.

**Unchanged deliberately:** the `ProjectFile` format and its `schemaVersion`, `serializeProjectFile`/`parseProjectFile`, every existing IPC handler (`project:saveToPath` already does exactly what auto-save needs), and the entire web path.

**Out of scope:** watching the file for external edits and reloading; conflict resolution between the app and an externally-changed file; versioning, history, or backup copies of the file; auto-save on web; and auto-binding projects that already exist unbound (their first manual Save binds them, as it does today).
