## Context

The console shell landed in `redesign-console-layout`: a `library` module owns `Folder { id, name, items, createdAt, updatedAt }`, persisted per-platform (`localStorage` on web, one JSON file per folder under `<userData>/library-folders/` on desktop via Electron IPC `library:*`). The Bible tab's picker (`BiblePickerPanel`) previews a pending verse using whatever template `useTemplates()` reports as globally "active," and only turns it into a `FolderItem` via an explicit "Convert to slide" click that does not carry a `templateId` — items pick up a template later only through the slide console's bulk "Apply template" dialog. The preview panel's "Send to output" button (`setLiveSlide`) writes a resolved slide payload to a `bibletime.liveSlide` `localStorage` key that the `/present` route reads and subscribes to via the `storage` event; nothing in the app ever opens that `/present` window (`window.open` never appears in `apps/bibletime/src`), even though `apps/desktop/src/main.ts`'s `setWindowOpenHandler` is already built to special-case it. Finally, folders are a flat top-level list — there is no grouping entity above them, and the sidebar's section header is the static, uppercased translation `t("nav.library")` ("Library"), unrelated to whichever folder is open (the open folder's own name already renders correctly inside the main slide console, per `slide-console.tsx`).

## Goals / Non-Goals

**Goals:**
- Let a template be chosen for a verse before it becomes a slide, so the folder item is created with the right template already applied.
- Make "Send to output" actually reach the output screen: open (or refocus) the `/present` window and deliver the current slide in one action, on both web and desktop builds.
- Introduce `Project` as the real grouping entity folders live under, replace the static "LIBRARY" sidebar header with the active project's name, and require a name when a project is created.
- Migrate today's flat folders into a default project automatically, with no data loss, since this is a **BREAKING** data-model change (`Folder` gains a required `projectId`).

**Non-Goals:**
- Multi-project real-time sync or sharing a project across devices — projects use the exact same per-platform storage pattern folders already use (`localStorage` web / JSON-file desktop), which is inherently per-browser or per-machine.
- Changing how `/present` renders or the `localStorage` + `storage`-event sync mechanism itself — only what triggers the window to open changes.
- A full "recent/favorite template" system for the Bible tab selector — it lists the same templates the Templates tab already manages, nothing new is added to the template data model.
- Nested folders-within-folders, or projects-within-projects — one flat level of folders per project, matching today's one flat level of items per folder.

## Decisions

**1. `Project` is a new top-level entity; `Folder` gains a required `projectId`.**
```ts
interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}
```
`Folder` adds `projectId: string`. A `ProjectStorageDriver` mirrors `LibraryStorageDriver` exactly (`canWrite`, `list/save/remove`), with `web-project-storage.ts` (`localStorage` key `bibletime.library.projects`) and `desktop-project-storage.ts` (→ new `project:list/save/remove` IPC, one JSON file per project under `<userData>/projects/`) — the same dual-driver shape already used by both `templates` and `library`, so `getProjectStorage()` slots in next to `getLibraryStorage()`/`getTemplateStorage()`.

*Alternative considered*: model a project as "just a folder with children folders" (reuse `Folder` recursively). Rejected — folders already have a well-established shape (an ordered list of content items) and overloading that same type to also mean "a group of folders" would make every folder-consumer (slide console, preview panel) have to branch on whether a folder holds items or sub-folders.

**2. Exactly one active project at a time, selected the same way the active template is.**
`useProjects()` (new hook, same shape as `useTemplates()`) tracks `activeId`, persisted to `localStorage`/`electron-store`-equivalent key `bibletime.activeProjectId`. `useLibrary()`'s folder list/creation is scoped to `activeProjectId` — `createFolder` now requires an active project and stamps the new folder's `projectId`; folders belonging to a different project are simply not shown in the tree. Switching projects is a dropdown (project name + "New project" + rename/delete) that replaces the static header in `FolderTree`.

*Alternative considered*: show all projects' folders in one flat tree, grouped visually by project. Rejected — the ask is specifically to replace "LIBRARY" with a single project's name, implying one project is "open" at a time, consistent with how one folder is "open" at a time today.

**3. First-run migration: orphan folders (no `projectId`) are assigned to an auto-created default project, lazily, on first read.**
`getProjectStorage().list()` combined with `getLibraryStorage().list()` at `useLibrary`/`useProjects` init: if any folder lacks `projectId` and no project exists yet, create one project (name: the existing `library.startProjectTitle` copy, e.g. "My Project") and patch every orphan folder's `projectId` in place via `storage.save`. This runs once — after the patch, every folder has a `projectId` and the check is a no-op on subsequent loads.

*Alternative considered*: a one-time explicit "migration" script/CLI step. Rejected — there's no build/deploy pipeline step to hook into (this is a local-storage/local-file app), so a lazy runtime check on first read is simpler and self-healing if a user's data somehow reverts.

**4. Bible tab template selector is local, per-conversion state — it does not change the app-wide "active template."**
`BiblePickerPanel` adds a `templateId` selector (a simple `<select>`/dropdown sourced from `useTemplates().templates`) next to the preview column, initialized to `useTemplates().activeId` but held as its own local state from then on. `handleConvert` passes the selected `templateId` into `onAddVerse`, which now accepts it and forwards it through `addItemToFolder(folderId, { type: "bible-passage", templateId, data })` so the `FolderItem` is created with the template already set — no separate "Apply template" pass needed afterward (that bulk action still exists for changing templates on already-added items).

*Alternative considered*: selecting a template here also calls `setActive(templateId)`, i.e., treat the Bible tab's choice as changing the global active template. Rejected — the "active template" is also used as the default for the Templates tab's own editing context; conflating the two would mean browsing the Bible tab with a one-off template choice silently changes what the Templates tab shows as active.

**5. "Send to output" both opens/focuses the `/present` window and writes the live slide, in one click.**
The handler becomes: `window.open("/present", "bibletime-present")` (a fixed second argument — the window name — means a second click reuses/refocuses the same window instead of spawning duplicates, in both a plain browser and Electron, since Electron's `setWindowOpenHandler` sees the same URL each time) followed by `setLiveSlide(...)` so the window's first paint already has the right content regardless of open-order. No Electron IPC changes are needed — `main.ts`'s existing `setWindowOpenHandler` for `/present` already produces the correctly sized, chrome-less window; it has simply never been invoked.

*Alternative considered*: add a dedicated Electron IPC channel (`present:open`) that asks the main process to create/focus the output `BrowserWindow` directly, instead of using `window.open`. Rejected — `window.open` already does exactly this via the existing handler, on both web (a normal second tab/window, which also works because `localStorage` + `storage` events are same-origin) and desktop; a new IPC channel would duplicate a mechanism that already exists and works, for no added capability.

## Risks / Trade-offs

- [Existing folders need a `projectId` retroactively] → Mitigate via the lazy first-read migration in Decision 3; nothing is deleted, and the migration is idempotent.
- [`window.open("/present", "bibletime-present")` on the web build opens a plain browser tab the user could accidentally close or navigate away from, with no "reopen" affordance beyond clicking "Send to output" again] → Acceptable for now: clicking the button again reuses the named window if still open, or reopens it if closed; a more polished "output window status" indicator is a reasonable follow-up but not required to fix the reported bug.
- [Requiring an active project before any folder can be created adds a step for a brand-new install] → Mitigate with an explicit first-run empty state ("Create your first project") in `FolderTree`, consistent with the existing "Start your project" copy that already anticipates this.
- [Local per-conversion template selection in the Bible tab could confuse users who expect it to behave like the global "active template"] → Mitigate with the selector defaulting to the current active template every time (so the common case needs no interaction) and only diverging when the user deliberately picks something else.

## Migration Plan

1. Add `Project` interfaces, `ProjectStorageDriver`, both storage drivers, and the `project:*` Electron IPC + preload bridge — additive, nothing depends on it yet.
2. Add `useProjects()` and wire the lazy orphan-folder migration into `useLibrary()`'s init path; verify existing folders still list correctly with a synthesized default project.
3. Replace `FolderTree`'s static header with the project switcher; scope folder listing/creation to the active project.
4. Add the Bible tab's template selector and thread `templateId` through `onAddVerse` → `addItemToFolder`.
5. Fix the "Send to output" handler to call `window.open` before/alongside `setLiveSlide`.
6. Remove the orphaned `bible.present` i18n key once confirmed unused.
7. Rollback strategy: steps 1-2 are additive and safe to revert independently; step 3 is the only one touching existing data shape (via the migration) — reverting it after folders have been migrated is still safe since `projectId` is simply ignored by the pre-change UI, not removed from the stored JSON.

## Open Questions

- Should deleting a project delete its folders, or orphan them back into "no project" (requiring re-assignment)? Leaning toward cascade-delete with a confirmation, matching how deleting a folder today cascades to its items with no separate recovery step — confirm during implementation if this feels too destructive.
