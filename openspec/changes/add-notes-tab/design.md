## Context

The console shell (`ConsoleView`) is a fixed layout — header, folder-tree sidebar, slide console, preview panel, and a bottom drawer whose tab strip switches content-source browsers. Two browsers are real today: the Bible tab (`BiblePickerPanel`, five columns over a bundled corpus) and the Songs tab (`SongsPickerPanel`, three columns over a stored repertoire). Media is still a `PlaceholderPicker`.

Four existing facts constrain this design:

1. **`FolderItem` is a tagged union, and adding an arm is cheap.** Folders, drag-and-drop reordering, multi-select, template application, and project export all handle items generically through `resolveFolderItemContent`. Adding a `note` arm touches the union, that resolver, and `folderItemLabel` in `folder-tree.tsx` — nothing else. No stored folder changes shape, so there is no migration.
2. **Every existing content type denormalizes its text onto the item at add-time.** `BiblePassageItemData` carries `text`/`reference`/`versionAbbreviation`; `SongItemData` carries the section's lines. Nothing renders by reading back through a source library.
3. **Every other entity in the app has a `*StorageDriver` with a desktop/web pair.** Templates, folders, projects, songs, and Bible versions all follow it. Notes will be the first content type that deliberately does not — which is the single decision this design most needs to justify.
4. **`useConsoleStore` is a module-level zustand store, not component state.** It already holds `bottomTab`, `openFolderId`, the slide selection, and the Songs tab's query/song/section precisely so they survive remounting the console shell (e.g. navigating to the template editor route and back). It is *not* persisted to disk.

The functional gap this fills is narrow: put arbitrary typed text on a slide. The design's whole job is to keep it that narrow.

## Goals / Non-Goals

**Goals:**

- Writing an note and getting it onto the screen takes one modal, two fields, and one click.
- One note is one slide, always — no rule for the user to learn, no format to get wrong.
- What is previewed in the editor is exactly what lands in the folder and exactly what `/present` renders.
- The tab reuses the Bible/Songs interaction grammar (browse → select → preview → explicit add / present), so it teaches nothing new.
- The change adds nothing to `apps/desktop`, no dependency, and no persistence format that would later need versioning or migration.
- Desktop and web behave identically.

**Non-Goals:**

- An note library, or any persistence beyond the Library folder the slide is added to.
- Rich text, lists, alignment, per-line styling, or anything the template does not already do.
- Multi-slide notes, blank-line splitting, or an auto-format pass. (See Decision 2.)
- Editing a folder's note slide from this tab after it has been added. (See Decision 5.)
- Scheduling, looping, or auto-advancing notes during a service.
- The Media tab, which keeps its placeholder.

## Decisions

### 1. No storage layer: drafts live in `useConsoleStore` and die with the session

Notes get no `NoteStorageDriver`, no `notes/` directory under `userData`, no `notes:*` IPC handlers, and no localStorage twin. The tab's state is three new fields on `useConsoleStore`: the draft list, the selected draft id, and their mutators.

The content this tab exists for is single-use by construction — "Youth meeting Friday 7 PM" is worthless the following Friday. A stored library of one-off text would accumulate stale entries the user must then curate, which is strictly worse than re-typing two lines. And the app already has a durable home for anything worth keeping: the moment a draft is added to a folder, it is a persisted, exportable, re-openable Library slide. Persistence exists — it just lives at the folder, not at the draft.

Using the existing console store (rather than component state in the panel) buys the same thing it buys the Songs tab: drafts survive switching bottom tabs and navigating to the template editor route and back, both of which remount the panel's component tree.

*Alternatives considered:*
- *A full storage driver mirroring `songs`.* Rejected: it is roughly 60% of the songs module's code (interfaces, desktop driver, web driver, platform pick, file schema, IPC handlers, preload + `electron.d.ts` types, a CRUD hook) to store text whose value expires in a week, and it would introduce a fourth versioned on-disk schema to maintain.
- *Project-scoped notes stored in the `ProjectFile`.* Rejected: it sounds right (a sermon's notes belong to that service) but it duplicates what the folder already is. A project's folder of note slides *is* the project-scoped list, with reordering, templates, and presentation already built.
- *`zustand/persist` to localStorage as a middle ground.* Rejected for this change — it is a library through the back door, and it raises questions this change should not have to answer (per-project scoping, eviction, whether a stale draft list from three weeks ago is a feature or a bug). It remains the obvious additive follow-up if reload loss turns out to hurt in practice; nothing here forecloses it.

### 2. One note is exactly one slide

The editor is a heading field and a body textarea, and the body becomes one slide's text verbatim — newlines included. There is no blank-line separation rule and no "Break into slides" button.

The Songs tab has both because a song genuinely has verses: the structure is in the content, and the blank-line convention (shared with OpenLP and ProPresenter) is how every other tool expresses it. An note has no such structure. Importing the songs rule here would mean a user who presses Enter twice for visual spacing silently gets two slides — a rule that is invisible until it surprises you.

Long text is not a special case: `useSlideFit` already shrinks an over-long Bible verse to fit, and it does the same here. A user who wants two notes writes two notes, which is also how they get to order them independently.

*Alternative considered:* reuse `parseLyrics`/`autoFormatLyrics` from the songs module for consistency. Rejected twice over — cross-module imports of another feature module's internals are forbidden by the frontend module rules, and the promoted-to-`core` version of that logic would still be the wrong behavior here.

### 3. `NoteItemData` carries `heading?`, `text`, and a derived `label`

```ts
export interface NoteItemData {
  /** Optional heading, rendered as the slide's reference line. Absent means a body-only slide. */
  heading?: string
  /** The note body — the slide's text, exactly as typed, newlines included. */
  text: string
  /** Never-empty label for the folder tree and slide console, computed at add-time from the heading, or the body's first words truncated. */
  label: string
}
```

Three fields rather than two, because the two jobs genuinely differ. `heading` is *rendered*, and being absent is meaningful — a bare reminder looks better with no reference line than with one repeating its own text. `label` is *listed*, and must never be empty: `folderItemLabel` in `folder-tree.tsx` currently returns `item.data.title` for both `song` and `media`, and an item that lists as an empty string is a row the user cannot click with confidence.

Deriving `label` at add-time rather than at render time keeps it consistent with how every other field on every other item type is captured, and means the truncation rule can change later without silently re-labelling slides the user has already arranged.

*Alternative considered:* a single required `title` doubling as heading and label, defaulted from the body when blank. Rejected: it makes "no heading" unrepresentable, so every heading-less reminder would render a reference line containing a truncated copy of its own body.

### 4. Two add actions, and `Add as folder` takes the whole list

**Add slide** appends the selected draft to the open folder via `addItemToFolder`; with no folder open it calls `createFolder(t("library.newFolder"), null, "start", [item])` and opens it — byte-for-byte the fallback `onAddVerse` already implements, so the two tabs behave identically when nothing is open.

**Add as folder** creates one folder containing *every* draft in the list, in list order, in a single `createFolder(name, parentId, "end", initialItems)` write. It takes the whole list rather than the selection because, with one note per slide, a folder built from a single selected draft would be a folder with one slide in it — a worse outcome than "Add slide" for the same click. The list is the unit that makes a folder worth creating: "here are this Sunday's five notes."

Naming: the sole draft's `label` when the list has exactly one entry, otherwise a localized default ("Notes"). Folders are renameable in the tree, so this is a starting point rather than a commitment, and the change does not add a naming prompt.

Nesting reuses the rule `console-view.tsx` already applies to a song's folder — child of the open folder, sibling when that would exceed the 3-level cap, root when nothing is open. That helper (`songFolderParentId`) is renamed to something type-neutral rather than duplicated.

### 5. Adding is a copy, not a link

Once added, a folder's note slide has no relationship to the draft it came from. Editing the draft afterwards does not touch the slide; deleting the draft does not touch the slide; editing the slide's template in the console does not touch the draft. The item carries no draft id — there is nothing to point at, since drafts do not outlive the session.

This is the same contract `SongItemData` and `BiblePassageItemData` already have (both keep a source id for provenance only and never read through it), minus the provenance id, which would be a dangling reference the moment the app restarts.

*Consequence:* fixing a typo in an note already added to a folder means fixing it on the slide, not in this tab. That is where the user is looking anyway — the console shows the slide, not the draft.

### 6. The tab sits between Songs and Media

Tab order becomes Projects, Bible, Songs, **Notes**, Media, Templates. Bible and Songs are the two authored/text sources, Media is files, Templates is styling. Notes is text, so it belongs with the text sources, and appending it at the end would separate it from them and shift Templates out of the terminal position it holds today.

## Risks / Trade-offs

- **A reload loses every unwritten draft.** → Accepted, and it is the direct cost of Decision 1. Mitigated three ways: dismissing the editor keeps the draft in the list rather than discarding it (only an explicit Delete removes one), the empty state names the limitation instead of leaving the user to discover it, and adding to a folder — the action the tab is pointed at — makes the content durable immediately. If this hurts in practice, `zustand/persist` is a self-contained follow-up.
- **`Add as folder` adds drafts the user may consider done.** A draft already added via "Add slide" is still in the list, so "Add as folder" will include it again. → Mitigated by making the action's label and confirmation state the count explicitly ("Add 5 slides as a folder"), and by keeping Delete one click away on every row. Tracking a per-draft "already added" flag was rejected as state that lies the moment the user deletes the slide from the folder.
- **A fourth `FolderItem` arm is a fourth case for every exhaustive `switch`.** → This is a benefit as much as a risk: TypeScript's exhaustiveness checking on the union means the compiler names every site that must handle it (`resolveFolderItemContent` and `folderItemLabel` are the only two today). The verification tasks require a clean typecheck across the workspace, which is what surfaces any site this design missed.
- **Very long note text shrinks to unreadable rather than being rejected.** → Same behavior a long Bible verse already has, and the live editor preview shows it happening while the user types, which is the earliest possible feedback. Imposing a character cap would be a new rule to learn, for a case the preview already makes obvious.
- **Two nearly-identical full-screen editor modals now exist (songs and notes).** → Accepted. They diverge on exactly the thing that matters — the songs editor's slide-boundary column and auto-format button have no meaning here — and the frontend module rules forbid importing another feature module's components. A shared primitive would be a `@workspace/ui` change carrying both modules' requirements; not worth it for two consumers.

## Migration Plan

None required. The `FolderItem` union change is purely additive: no existing stored folder contains an `note` item, no existing item's shape changes, and no reader needs a fallback for old data. `BottomTab` gains a value, and the store's default (`"projects"`) is unchanged, so a user mid-session sees nothing move. Rollback is removing the module, the union arm, and the tab entry — with the caveat that folders containing note slides would then hold an item type nothing can resolve, which is why rollback should follow the same path as any other content-type removal rather than being treated as free.

## Open Questions

- Should "Present" on a draft also add it to a folder implicitly? Current answer: no — presenting is deliberately the one action that files nothing, which is what makes the tab useful for a spontaneous mid-service reminder. Worth revisiting only if operators report presenting-then-losing the text.
- Is the default folder name ("Notes") worth a naming prompt on "Add as folder"? Current answer: no — inline rename in the folder tree already exists and a prompt would put a dialog between the user and the thing they just wrote.
