## Why

The app currently has one flat sidebar of top-level module links (Bible, Songs, Sermons, Announcements, Media, Service Plan, Templates, Settings) and each module owns its own full-screen layout — e.g. the Bible module's four-column console bakes book/chapter/verse browsing and its preview into one screen that only Bible content can ever use. That shape doesn't scale to the app's actual goal: building a running order that mixes Bible passages, songs, announcements, and media, then presenting it live. A ProPresenter/FreeShow-style console — a small fixed set of bottom-level tabs, a contextual sidebar, an ordered main slide list, and an always-present preview panel — is the layout every capability needs to converge on before Songs, Media, and Service Plan are built out.

## What Changes

- **BREAKING**: Replace the flat sidebar nav (`AppSidebar`/`NavMain`) with a bottom navigation bar limited to exactly five tabs: Library, Bible, Songs, Media, Templates. Settings moves out of primary nav (e.g. a corner/menu affordance) since it's not a content tab.
- **BREAKING**: Introduce a `library` module owning folders — user-created groups that hold an ordered list of mixed-type items (a Bible verse/range, a song, an announcement slide, an image, a video). Folders can be created, renamed, deleted, and reordered; items within a folder can be reordered, removed, and multi-selected.
- Add a persistent three-pane console shell: contextual sidebar (left) + ordered slide list (center) + live preview panel (right), replacing per-module full-page layouts. The sidebar's content depends on the active bottom tab:
  - **Library** tab → the folder tree (per the provided `CollapsibleFileTree` reference: collapsible, nested, `Collapsible`/`Button` primitives from `@workspace/ui`).
  - **Bible** tab → the existing book/chapter/verse picker, repurposed as a content source that adds a verse/range into the currently open Library folder instead of rendering its own preview column.
  - **Songs** / **Media** tabs → placeholder browsers (both modules are still empty stubs) wired to the same "add to folder" flow, so the console shell doesn't need to change again once those modules gain real content.
- **BREAKING**: Retire the Bible module's standalone four-column console (`BibleConsoleView`) in favor of the Bible tab feeding items into a Library folder; the folder's slide list and preview now live in the shared console shell, not inside the `bible` module.
- Add multi-select in the main slide list (single, range/multiple, select-all) and an "apply template" action that assigns a template to the current selection, reusing the existing `templates` module's template picking/manager instead of duplicating it.
- Add a live preview panel: always visible on the right, shows the selected slide rendered with its assigned template, and drives the existing `/present` output window (reusing the existing broadcast-live-output mechanism rather than replacing it).

## Capabilities

### New Capabilities
- `console-shell-navigation`: the bottom nav bar (Library, Bible, Songs, Media, Templates) as the app's sole top-level navigation, and the rule that the sidebar's contents are contextual to whichever tab is active.
- `library-folders`: folders as the unit of organization in the Library tab — create/rename/delete/reorder folders, and add/remove/reorder mixed-type items inside a folder.
- `slide-console`: the main container rendering an open folder's items as an ordered slide list, single/multi/select-all selection over that list, and applying a template to the current selection.
- `live-preview-panel`: the persistent right-hand panel — previewing the selected slide with its assigned template and sending it to the live `/present` output window.

### Modified Capabilities
(none — `openspec/specs/` has no archived capabilities yet; the existing Bible four-column console and its book/chapter/verse picker components are reused as building blocks, described under Impact below rather than as a formal spec amendment)

## Impact

- `apps/bibletime/src/modules/core/layout/*` — `AppSidebar`/`NavMain` rebuilt as the bottom nav + contextual sidebar shell; `__root.tsx` updates the non-`/present` shell wrapper accordingly.
- New `apps/bibletime/src/modules/library/*` module (screaming architecture: `interfaces`, `services`, `actions`, `components`, `views`) owning folders, folder items, and their persistence (localStorage/desktop file, matching the existing pattern in `templates/services/storage`).
- `apps/bibletime/src/modules/bible/*` — `BibleConsoleView` and its four-column layout are removed; `BookSearchList`/`ChapterNav`/`VersePickerList` are reused inside the Bible tab's sidebar picker; `OutputPreview` is superseded by the shared preview panel.
- `apps/bibletime/src/modules/presentation/*` — `slide-preview.tsx` becomes the renderer inside the shared preview panel instead of being embedded ad hoc.
- `apps/bibletime/src/modules/templates/*` — template selection UI is reused (not duplicated) for the "apply template to selection" action.
- `apps/bibletime/src/routes/*` — route tree reshaped around `/library` (with the console shell) as the primary route; `/bible`, `/songs`, `/media`, `/templates` become tab-scoped views inside the same shell rather than standalone pages; `/present` is unaffected.
- Songs and Media remain data-stub modules; this change only wires their tabs into the shared "add item to folder" flow, not full song/media libraries.
