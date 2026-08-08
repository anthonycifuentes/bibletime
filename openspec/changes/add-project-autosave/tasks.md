## 1. Save state model

- [x] 1.1 Add `ProjectSaveState` to `modules/library/interfaces/index.ts` — a union of `"unbound" | "saved" | "saving" | "unsaved" | "failed"` plus the failure reason and bound path carried alongside it. Document that it is runtime-only and never persisted on `Project`.
- [x] 1.2 Add localized strings for each state to `core/i18n/dictionaries/{en,es,pt}.ts`: saved (with path), saving, unsaved changes, not saved to a file, and save failed (with reason).

## 2. Bind on create

- [x] 2.1 Extend `create` in `modules/library/actions/use-projects.ts`: after the project is written to managed storage, call `saveProjectAs(project.id)` when the desktop bridge is present, so the native dialog opens seeded from the project name.
- [x] 2.2 Treat `{ status: "canceled" }` as success-without-binding — the project stays created, usable, and unbound; no error surfaces. Return the created project either way so existing callers (`ProjectLauncher`, `ProjectList`) are unaffected.
- [x] 2.3 Leave the web path untouched: no bridge means no dialog, exactly as today.
- [ ] 2.4 Verify: creating on desktop opens the dialog and binds; dismissing keeps the project with its typed name and an unbound status; creating on web opens nothing.

## 3. The autosave hook

- [x] 3.1 Add `modules/library/actions/use-project-autosave.ts` taking the active project, its folders, and `saveProject`, and returning the current `ProjectSaveState`. Keep it separate from `useProjects`, which deliberately does not depend on folder data.
- [x] 3.2 Compute the content signature — project name plus each folder's `id:updatedAt`, sorted — and record the first signature per project as a baseline without saving, so loading or switching projects never writes.
- [x] 3.3 Debounce ~2s trailing on signature change, coalescing a burst into one write. Serialize writes per project: a change arriving during an in-flight save re-arms the timer instead of starting a second write.
- [x] 3.4 Skip entirely when the project is unbound or the `project.saveToPath` bridge is absent (the web build), reporting `unbound` rather than an error.
- [x] 3.5 On failure, set `failed` with the reason and stop — no timed retry. Allow the next content change or an explicit save to attempt again.
- [x] 3.6 Flush pending changes on `pagehide`/`beforeunload` as a best-effort, fire-and-forget write; do not claim it as a guarantee.
- [x] 3.7 Verify the hook's rules: a burst of ten reorders writes once; loading the app writes nothing; switching projects back and forth writes nothing; deleting a folder is detected (not just edits); a change mid-write does not produce overlapping writes.

## 4. Wiring and status UI

- [x] 4.1 Mount `useProjectAutosave` in `modules/library/views/console-view.tsx`, where `useProjects` and `useLibrary` are already held, and pass the resulting state down to the drawer.
- [x] 4.2 Add the status indicator to `modules/library/components/project-list.tsx` beside the existing Save / Save as… controls, showing the state and, when bound, the file path. Keep both existing buttons exactly as they are.
- [x] 4.3 Make an explicit Save flush any pending debounce rather than racing it, so pressing Save never leaves a queued write behind it.
- [ ] 4.4 Verify against the spec scenarios: status moves unsaved → saving → saved on an edit; shows the path when bound; reports "not saved to a file" for an unbound project; shows the reason on failure and offers the manual path.

## 5. Failure and recovery

- [ ] 5.1 Verify the deleted-file case end to end: bind a project, delete the file underneath it, make a change, and confirm the status reports the failure with its reason and does not loop.
- [ ] 5.2 Verify recovery: after a failure, Save as… to a reachable location rebinds the project and returns the status to saved.
- [ ] 5.3 Confirm in every failure path that the project's folders and slides remain intact in managed storage and editable.

## 6. Finish and verify

- [x] 6.1 Run typecheck, lint, and build across the workspace.
- [x] 6.2 Audit the new hook and the touched components for hardcoded strings, cross-module imports, and deep (non-barrel) imports, per the frontend module rules.
- [ ] 6.3 Manual pass in a packaged Electron build: create a project and pick a location; add folders and slides; confirm the file on disk updates a couple of seconds later without pressing anything; quit and reopen the file to confirm the content is there.
- [ ] 6.4 Manual pass in the web build: confirm no dialog on create, no file writes, and that the status reads as unbound rather than broken.
