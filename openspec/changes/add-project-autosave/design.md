## Context

`fix-desktop-project-files-and-output-window` already built the machinery this change needs:

- `Project.filePath` — the binding, persisted in managed storage, absent on web.
- `project:saveFileDialog` (pick a location, write, return the path) and `project:saveToPath` (write to a known path) IPC handlers.
- `saveProjectAs(id)` — dialog, write, bind. `saveProject(id)` — write to the binding, falling back to `saveProjectAs` when unbound, and reporting a stale binding as `{ status: "failed", retryWithDialog: true }`.
- `serializeProjectFile(project, folders)` — the whole bundle as a string.

So the write path exists and is correct. What's missing is *when* it gets called: only on an explicit click, and never at creation.

Two existing facts shape the design:

1. **Managed storage already autosaves.** Every folder mutation in `useLibrary` ends in `storage.save(folder)` followed by `refresh()`. Nothing is ever lost from the app's own storage. The gap is strictly between managed storage and the bound file.
2. **`useProjects` deliberately doesn't know about folders.** It reaches for them only inside `foldersOf(id)`, a one-shot read at save time. Change detection needs to *watch* folders continuously, which is `useLibrary`'s data — so the watcher can't live inside `useProjects` without inverting that dependency.

## Goals / Non-Goals

**Goals:**

- A project created on desktop is bound to a file before the user does anything else with it.
- A bound project's file is never more than a couple of seconds behind managed storage.
- The user can tell, at a glance, whether that's actually true.
- A burst of edits (dragging ten slides into order) costs one write, not ten.
- Nothing about this blocks the user, and nothing about it can lose data that managed storage holds.

**Non-Goals:**

- Making the file the source of truth, or watching it for external edits. (Decision 1.)
- Incremental or partial file writes. Auto-save writes the same complete bundle Save does.
- Auto-save on web, or auto-binding projects that are already unbound.
- Retrying a failing auto-save on a schedule. (Decision 5.)
- Backups, history, or versioning of the file.

## Decisions

### 1. The file is a mirror; managed storage stays the source of truth

Auto-save projects managed storage onto disk. It never reads the file back, never watches it, and never reconciles it.

The alternative — making the file the live document — sounds tidier but breaks things that currently work. `openProjectFile` deliberately creates a *copy* with fresh ids so opening the same file twice can't collide; the web build has no filesystem at all; and a live two-way link introduces a conflict case (app and file both changed) that has no good silent answer. Mirroring keeps this change purely additive: no format change, no migration, no new reader.

*Consequence:* editing the file in another program while the app has it open is a losing race — the next auto-save overwrites it. That's the same contract Save already has today, so this doesn't make anything worse, and "watch the file for external edits" is explicitly out of scope rather than half-done.

### 2. Change detection is a content signature, not array identity

The watcher derives a signature from the active project and its folders:

```
`${project.name}|${folders.map(f => `${f.id}:${f.updatedAt}`).sort().join(",")}`
```

and saves when it changes.

Watching `library.folders` by identity would be simpler but wrong: `refresh()` replaces that array on every read, including on mount and on project switch, so a project would rewrite its file just for being opened. Every folder write already stamps `updatedAt`, so the signature moves exactly when real content moves — and it catches a folder being *deleted*, which a max-of-`updatedAt` would miss.

The signature is also cheap in the way that matters: it's ids and numbers, not slide text. Serialization only happens when a save actually fires.

*Baseline rule:* the first signature a project is observed with is recorded, not saved. Otherwise opening the app would immediately rewrite every bound project's file.

### 3. Debounce ~2s after the last change, plus a flush on close

A 2s trailing debounce per project. Dragging slides into order produces one write when the dragging stops, not one per drop.

A 2s window also bounds the loss: the worst case is the last two seconds of work, and only if the app dies. Managed storage still has everything, so even then the file is recoverable with one manual Save.

*Close-time flush:* `pagehide`/`beforeunload` fire synchronously and can't await an async IPC round-trip, so the flush is **best-effort, fire-and-forget** — the write is issued and usually completes, but this is not a guarantee, and the design does not pretend otherwise. The debounce is what actually keeps the file current; the flush just narrows the last gap.

*Alternative considered:* saving on every change with no debounce. Rejected — a service-sized project rewrites its entire bundle, and the reorder interaction produces a write per frame of a drag.

### 4. Creation binds, but cancelling doesn't block

`create(name)` writes the project to managed storage first, then — on desktop only — calls the existing `saveProjectAs(id)`. Bound on success; on `{ status: "canceled" }` the project simply stays unbound, and its status reads "Not saved to a file" until the user saves it.

Creating first and binding second (rather than dialog-then-create) means a dismissed dialog can't destroy the name the user just typed, and it reuses `saveProjectAs` wholesale instead of duplicating dialog handling.

### 5. A failed auto-save surfaces and stops; it does not retry

On failure — file deleted, volume unmounted, permissions changed — the status becomes **Save failed** with the reason, and auto-save stops for that project until the next change or an explicit Save.

Silent retry loops are the wrong behavior for a live tool: a projector operator does not need a background process hammering a disconnected network share mid-service, and a retry that keeps failing is indistinguishable from one that never ran. `saveProject` already models this — it reports a stale binding as `retryWithDialog` rather than reopening a dialog on its own — and this follows that precedent.

### 6. Save state is runtime state, not persisted

`ProjectSaveState` (`unbound | saved | saving | unsaved | failed`) lives in the hook, not on `Project`, and is not written to managed storage. It describes the relationship between two things *right now*; persisting it would just create a fifth thing that can be stale, and "saved" restored from disk at startup would be a claim the app hasn't verified.

## Risks / Trade-offs

- **The close-time flush can miss.** → Bounded by design: at most the final debounce window, and managed storage still holds it. The status indicator means the user can see an unsaved state before quitting rather than assuming.
- **Auto-save silently overwrites external edits to the file.** → Accepted and documented as the same contract Save already has (Decision 1). Watching for external changes is scoped out rather than approximated.
- **A large project on a slow or network volume could make writes overlap.** → Saves are serialized per project: a save in flight sets `saving`, and a change arriving during it re-arms the debounce rather than starting a second concurrent write.
- **Auto-save turns every edit into disk I/O on the user's chosen location** — including removable or network drives. → The debounce keeps it to one write per burst, and a failure surfaces rather than looping (Decision 5).
- **Reversing another change's stated non-goal.** `fix-desktop-project-files-and-output-window` is unarchived, so its spec still says autosave is out of scope. → Handled as an explicit `MODIFIED` delta against `desktop-project-file-io` rather than a contradiction left for a future reader to trip on.

## Migration Plan

None. No persisted shape changes: `Project` is untouched, the `ProjectFile` bundle and its `schemaVersion` are untouched, and no IPC handler changes signature. Existing projects — bound or not — behave exactly as they do today until their first change after this ships; unbound ones stay unbound until manually saved. Rollback is removing the hook and the indicator; nothing on disk needs undoing.

## Open Questions

- Should an unbound project nag toward being saved (a subtle prompt after N changes), or is the persistent "Not saved to a file" status enough? Current answer: the status is enough — the app's own storage is not at risk, so a nag would be pure noise.
- Should auto-save be user-disableable in Settings? Current answer: not until someone wants it off. The manual Save path already covers the "I don't want this file touched right now" case by leaving the project unbound.
