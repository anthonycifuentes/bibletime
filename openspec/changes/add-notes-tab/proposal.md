## Why

Not everything on a service's screen is a verse, a song, or a file. "Youth meeting Friday 7 PM", "Fasting this Saturday", a three-line outline of the sermon's main point — these are one-off blocks of text, written minutes before or during the service, used once, and never wanted again. Today there is no way to put arbitrary text on a slide: the Bible tab reads from a fixed corpus, the Songs tab requires authoring and *storing* a song in a permanent repertoire, and the Media tab wants a file that already exists. The operator's only recourse is to invent a throwaway "song" called "Notes" and pollute the repertoire with it — the exact workaround this change removes.

The gap is narrow and so is the fix: a tab whose entire job is *type a paragraph, see the slide, put it in the folder*. It is deliberately the smallest content tab in the app, and the only one with no library behind it.

## What Changes

### A fourth content tab, with no storage behind it

- Add an **Notes** tab to the bottom drawer's tab strip, between Songs and Media. It is the console's first content source that is purely authored in the moment: nothing it produces is filed anywhere except the Library folder the user puts it in.
- **No note library, no storage driver, no IPC, no localStorage twin.** Unlike `songs/`, `templates/`, and `bible-versions/`, notes get no directory under `userData`. An note that matters is one that has been added to a folder — and folders are already persisted, exported, and re-openable. Behavior is therefore identical on desktop and web, and the change adds zero surface to `apps/desktop`.
- The tab holds a **session draft list**: the notes written since the app started, kept in the existing `useConsoleStore` so they survive bottom-tab switches and navigating to the template editor and back, exactly as the Songs tab's selection already does. They do not survive a reload — see the trade-off in `design.md`.

### One note is exactly one slide

- The full-screen editor modal is an optional heading field and one body textarea. That is the whole editor.
- **No blank-line splitting and no auto-format button.** The Songs tab's blank-line rule exists because a song has verses; an note is one thought on one screen. A blank line inside an note is a blank line *on the slide*, rendered as typed. Long text is handled by the template's existing auto-fit (`useSlideFit`), which is what shrinks a long verse today.
- The editor previews the actual slide live, in the selected template, so what the user is about to add is never a guess.
- An note can be reopened and edited as long as it is a draft. Once added to a folder, the slide is a normal Library slide and is edited (or removed) there — the draft and the slide are independent from the moment of adding.

### Two ways to add, matching the Songs tab's grammar

- **Add slide** appends the selected draft to the currently open Library folder as one `note` item. With no folder open it creates one at the root with the slide already inside, exactly as "Convert to slide" does for a verse.
- **Add as folder** creates a Library folder holding *every* draft in the list, in order, in a single write — the "here are this Sunday's five notes" case. It is named after the sole draft when there is one, and carries a default "Notes" name otherwise, renameable in the tree like any folder. Nesting follows the same rule as a song's folder: a child of the open folder, a sibling when that would exceed the 3-level cap, root when nothing is open.
- **Present** sends the selected draft straight to the presentation output without adding it anywhere — the "put this reminder up right now" case, and the reason the tab is useful even when nothing is being filed.

### Notes are real folder items

- Add an `note` arm to the `FolderItem` union with `NoteItemData` (`heading?`, `text`, `label`). Like `BiblePassageItemData` and `SongItemData`, it is fully denormalized: the slide carries its own text, so it renders in the console, the preview panel, and `/present` with no lookup, and an exported project stays self-contained. This is *additive* to the union — no stored folder changes shape, and no migration is needed.
- The slide renders `text` as its body and `heading` as its reference line; an note with no heading renders body-only, which is the right look for a bare reminder.
- `label` is a never-empty list label computed at add-time (the heading, or the body's first words truncated), so the folder tree and slide console always have something to show — `folderItemLabel` currently assumes every non-verse item has a `title`.

## Capabilities

### New Capabilities

- `note-authoring`: writing an note — the full-screen heading + body editor, the one-note-is-one-slide rule, live template preview, what makes a draft saveable, and how the session draft list behaves (create, edit, reorder-free ordering, delete, and its lifetime across tab switches, route changes, and reload).
- `notes-picker-panel`: the Notes tab itself — the draft-list / preview layout, the template selector, and the three actions (Add slide, Add as folder, Present) including their enabled/disabled conditions, folder-creation and nesting rules, and what happens with no folder open.
- `note-slide-items`: notes as folder content — the denormalized item shape, how a heading-less note renders, list labelling in the folder tree and slide console, and the guarantee that an added slide is independent of the draft it came from.

### Modified Capabilities

- `console-shell-navigation`: the bottom-nav tab set gains Notes, and the requirement that tab state survives a round-trip extends to the Notes tab's drafts and selection. (The Media placeholder scenario is untouched.)
- `library-folders`: the folder-item contract gains a fourth type, plus the requirement that every item type has a non-empty list label. `note` items are real content from the start — the existing "unresolvable item types render as placeholders" requirement is left untouched and continues to describe `media` only.

## Impact

**New — `apps/bibletime/src/modules/notes/`** (following the module convention used by `songs`):
- `interfaces/index.ts` — `NoteDraft` and the editor's value type. No storage-driver interface: there is no storage.
- `lib/note-label.ts` — the pure heading-or-truncated-body label derivation, unit-testable without React.
- `components/note-editor-dialog.tsx` — the full-screen modal (heading, body, live `SlideFrame` preview).
- `components/note-list.tsx` — the draft list with selection, New / Edit / Delete.
- `views/notes-picker-panel.tsx` — the tab: draft list, preview column with template `Select`, and the three actions.
- `index.ts` — public surface (the panel view plus the payload type the drawer passes up).

**Modified:**
- `apps/bibletime/src/modules/library/interfaces/index.ts` — `NoteItemData` plus a fourth `FolderItem` arm and a fourth `FolderItemType`. Additive; folder storage, drag-and-drop, template application, and project export are untouched.
- `apps/bibletime/src/modules/library/lib/resolve-folder-item-content.ts` — a real `note` case (never a placeholder).
- `apps/bibletime/src/modules/library/components/folder-tree.tsx` — `folderItemLabel` handles `note` via its `label` field; the switch stops being exhaustive-by-`title` accident.
- `apps/bibletime/src/modules/library/components/bottom-drawer.tsx` — a fifth content branch and `onAddNote` / `onAddNotesAsFolder` / `onPresentNote` props.
- `apps/bibletime/src/modules/library/views/console-view.tsx` — wires those three, reusing `addItemToFolder` and `createFolder(name, parentId, "end", initialItems)` and the existing depth rule already written for songs.
- `apps/bibletime/src/modules/library/actions/use-console-store.ts` — `BottomTab` gains `"notes"`; the store gains the draft list and the selected draft id, plus their mutators.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — new `notes.*` keys and a `sidebar.notes` label, in all three shipped locales.

**Dependencies:** none added. No `apps/desktop` changes at all. The UI reuses `@workspace/ui` primitives (`dialog`, `input`, `textarea`, `button`, `select`) and the existing `SlideFrame`.

**Out of scope:** persisting notes between app launches or across machines; rich text, lists, or per-line styling; multi-slide notes and any splitting rule; scheduling or auto-advancing note loops; importing notes from a bulletin file; and reusing an note across projects (copy the slide, or re-type it — it is two lines).
