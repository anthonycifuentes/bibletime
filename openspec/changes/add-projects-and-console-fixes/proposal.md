## Why

Testing the new console shell (from `redesign-console-layout`) surfaced three gaps that block actually running a service with it: the Bible tab's preview always bakes in whatever template happens to be globally "active" with no way to pick a different one before the verse is added to a folder; the "Send to output" button only ever writes the live-slide payload to `localStorage` and never opens the `/present` window itself, so there's no way to reach the output screen at all through the UI; and the sidebar's folder list sits under a static "LIBRARY" label with no concept of a named project, even though the app's own copy already talks about folders belonging to "your project."

## What Changes

- Add a template selector to the Bible tab's preview column (`BiblePickerPanel`) so a template can be chosen before "Convert to slide" — the chosen template is baked onto the new folder item at creation time instead of needing a separate bulk "Apply template" pass afterward.
- Fix the "Send to output" action so it actually opens (or focuses, if already open) the `/present` output window and writes the live slide payload in the same click, instead of only writing to `localStorage` and silently doing nothing if no output window happens to be open yet.
- **BREAKING**: Introduce a `Project` entity that owns folders. Creating a project prompts for a name; folders are created under whichever project is active; the sidebar's static "LIBRARY" section header is replaced with the active project's name. Existing folders (which predate this concept) are migrated into an auto-created default project on first load so no data is lost.

## Capabilities

### New Capabilities
- `projects`: A named `Project` entity — create/rename/delete, one active project at a time, folders scoped to and created under the active project, and the console's Library sidebar header showing the active project's name instead of a static "Library" label.
- `bible-template-selection`: A template selector in the Bible tab's preview column that lets the user choose which template a verse is converted with, applied at the moment it's added to a folder rather than left unset.
- `present-window-launch`: An explicit action that opens (or refocuses) the `/present` output window and hands it the current slide in one step, closing the gap where "Send to output" wrote a payload nothing was there to read.

### Modified Capabilities
(none — `openspec/specs/` has no archived capabilities yet; this change only touches the in-flight `library` module before it has a published spec)

## Impact

- `apps/bibletime/src/modules/library/interfaces/index.ts` — new `Project` interface; `Folder` gains a required `projectId`; new `ProjectStorageDriver` mirroring `LibraryStorageDriver`.
- `apps/bibletime/src/modules/library/services/storage/*` — new web (`localStorage`) and desktop (per-file JSON via new `project:*` IPC) project storage drivers, plus a one-time migration that assigns orphan folders (no `projectId`) to an auto-created default project.
- `apps/bibletime/src/modules/library/actions/use-library.ts` — gains project CRUD and active-project selection; folder listing/creation scoped to the active project.
- `apps/bibletime/src/modules/library/components/folder-tree.tsx` — static `t("nav.library")` header replaced with a project switcher showing the active project's name (create/rename/switch), and an empty/first-run state prompting to name a project before any folder can be created.
- `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx` — add a template selector to the preview column, defaulting to the currently active template; thread the chosen `templateId` through `onAddVerse` → `addItemToFolder` so it lands on the new `FolderItem` directly.
- `apps/bibletime/src/modules/library/components/preview-panel.tsx` — "Send to output" handler additionally calls `window.open("/present", "bibletime-present")` (reusing the same named window on repeat clicks) before/while writing the live slide payload.
- `apps/desktop/src/main.ts` / `apps/desktop/src/preload.ts` — new `project:list/save/remove` IPC handlers and preload bridge, mirroring the existing `library:*` pattern; no changes needed for the present-window fix since `setWindowOpenHandler` already special-cases `/present`, it's just never been called.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — remove the orphaned, unreferenced `bible.present` key; add project-management and template-selector copy.
