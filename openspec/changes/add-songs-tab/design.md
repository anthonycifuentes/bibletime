## Context

The console shell (`ConsoleView`) is a fixed four-region layout: header, folder-tree sidebar, slide console, preview panel, and a bottom drawer whose tab strip switches content-source browsers. The Bible tab (`BiblePickerPanel`) is the only fully-built browser: five columns, a `SlideFrame` preview, a template `Select`, and explicit "Convert to slide" / "Present" actions that append `bible-passage` items to the currently open Library folder. Songs and Media both render `PlaceholderPicker`.

Three existing facts constrain this design:

1. **`FolderItem` is a tagged union with a `song` arm already in it.** `SongItemData` is a `{ title }` stub and `resolveFolderItemContent` returns a hardcoded placeholder string for it. Folders, drag-and-drop reordering, template application, and project export all already handle `song` items generically — only the *data* and the *resolution* are missing. Nothing about folder storage needs to change.
2. **Persistence is one-JSON-file-per-entity via Electron IPC, with a localStorage twin for the web build.** Templates, library folders, projects, and Bible versions all follow this. Each has a `*StorageDriver` interface in the module's `interfaces/`, a `desktop-*`/`web-*` pair, and a `get*Storage()` platform pick. There is no database and no index file — the directory listing *is* the index.
3. **Bible slides denormalize their content at add-time.** `BiblePassageItemData` stores `text`, `reference`, and `versionAbbreviation` on the item, not just a verse pointer, so a slide renders without re-querying the translation and an exported `ProjectFile` is self-contained.

Songs differ from Bible verses in one structural way that drives most of what follows: there is no bundled corpus. The user authors or imports every song, so the change must ship an editor and a storage format, not just a browser over existing data.

## Goals / Non-Goals

**Goals:**

- A song is authored by pasting lyrics into one textarea, with no per-slide UI, and becomes a correct set of slides with zero further editing in the common case.
- A song lives on disk as a single readable JSON file in a documented, versioned format that another tool could consume.
- Adding a song to a project produces a Library **folder** whose ordered items are that song's slides.
- The Songs tab reuses the Bible tab's interaction grammar (browse → select → preview → explicit add/present) so there is one thing to learn, not two.
- Everything works offline; the web search is strictly additive and its absence never blocks authoring.

**Non-Goals:**

- ChordPro / chord charts, transposition, capo, or a per-section tagging UI.
- OpenLyrics XML import/export in this change (the JSON vocabulary is aligned with it so this stays additive later).
- Synced-lyric playback. LRCLIB's `syncedLyrics` field is fetched but discarded.
- Re-syncing already-added song slides when the source song is later edited (see Decision 3).
- The Media tab, which keeps its placeholder.

## Decisions

### 1. Songs are a global library under `userData`, not project-scoped

Song files go in `<userData>/songs/<id>.json`, alongside `templates/` and `bible-versions/` — **not** under `projectsDataDir`.

A congregation's song repertoire is reused across every service; scoping songs to a project would mean re-entering "Sublime Gracia" for each Sunday. Templates already made exactly this call and sit outside `projectsDataDir` for the same reason. `projectsDataDir` is user-relocatable precisely because a *project* is a self-contained movable unit; a library is not.

*Alternative considered:* store songs under `projectsDataDir` so they move with the project. Rejected — it would make the repertoire vanish when the user relocates their projects folder, and it conflates "my songs" with "this Sunday's service".

*Consequence:* a `ProjectFile` exported to another machine does not carry the song library. This is acceptable because slide content is denormalized (Decision 3) — the exported slides still render correctly; only the ability to re-edit the source song is lost. This is the same trade-off Bible verses already make.

### 2. Store parsed sections, not raw lyric text; parse at save time

The song file's source of truth is `sections: SongSection[]`. The editor's textarea is serialized *into* sections when the user saves, and reconstructed *from* sections (joined with blank lines) when the user re-opens the editor.

The alternative — store the raw lyric string and re-parse on every read — couples every saved song to the current parser. Changing the label-inference heuristic later would silently re-shape songs the user had already reviewed and approved. Storing sections makes the parser a one-time input transformation, and makes the file directly meaningful to any other consumer without reimplementing the blank-line rule.

Round-tripping is lossless by construction: `parse(serialize(sections)) === sections`, because serialization joins section bodies with exactly one blank line and parsing splits on runs of blank lines. Section *labels* are preserved on the sections themselves rather than re-inferred.

### 3. Song slides denormalize their text at add-time, but keep `songId`

`SongItemData` becomes:

```ts
interface SongItemData {
  /** The source `Song`'s id — retained for provenance; the slide never reads through it to render. */
  songId: string
  title: string
  /** Inferred or user-set label for this section, e.g. "Verso 1", "Coro". */
  sectionLabel: string
  /** This section's lines, newline-joined — the slide's actual body text. */
  text: string
  /** 0-based position among the song's sections at add-time. */
  sectionIndex: number
}
```

This mirrors `BiblePassageItemData` exactly: the slide carries what it needs to render. Deleting or editing the source song leaves already-added slides intact and rendering, and an exported project stays self-contained.

*Trade-off:* editing a song does not update slides already added to folders. This is the intended behavior — a service order that has been built and reviewed should not silently change under the user. `songId` is retained so a future "refresh this folder from its song" action is possible without a schema change.

### 4. Blank line separates slides; single newline is a line break within one

`parseLyrics(text)` splits on runs of one-or-more empty (whitespace-only) lines, trims each block, and drops empties. Every remaining block is one section — one slide.

This is the OpenLP/ProPresenter/OpenSong convention, so lyrics copied from any of those, or from most lyric sites, already split correctly with no editing. It also gives the auto-format button (Decision 5) something concrete to produce.

*Alternative considered:* every newline is a slide. Rejected — it makes multi-line slides impossible, and worship slides are nearly always 2–4 lines.

**Label inference** (`Verso N` / `Coro`, localized): sections are numbered as verses in order; any section whose normalized text (case-folded, punctuation- and whitespace-collapsed) exactly repeats an earlier section is labelled as a chorus and does not consume a verse number. This gets the common verse/chorus/verse/chorus shape right without asking the user to tag anything, and is wrong only in ways the user can fix by editing the label.

### 5. Auto-format rewrites the textarea, and is never automatic

`autoFormatLyrics(text, linesPerSlide = 4)` runs two passes:

1. **Reflow** — any line longer than a lyric-line threshold is broken at sentence terminators (`.`/`?`/`!`), then at clause boundaries (`,`/`;`/`:`), preferring breaks nearest the midpoint of an over-long run, so a pasted paragraph becomes lyric-length lines.
2. **Group** — a blank line is inserted every `linesPerSlide` lines within each existing block, so the reflowed text becomes slide-sized sections. Blocks already separated by blank lines are grouped independently; existing separations are never merged away.

It writes its result back into the textarea rather than transforming at save time. The user sees exactly what they'll get, can hand-edit it, and can undo it with the browser's native textarea undo. Running it on already-well-formatted lyrics is close to a no-op because pass 1 finds no over-long lines and pass 2 respects existing blank lines.

*Alternative considered:* auto-format silently at parse time. Rejected — a parser that reshapes the user's text without showing it is unpredictable, and there is no good default that is right for both a pasted paragraph and hand-typed lyrics.

### 6. LRCLIB, called from the Electron main process

`song-search:query` is a new IPC handler that `fetch`es `https://lrclib.net/api/search?q=<query>` from the main process and returns the parsed results.

Two reasons it belongs in main rather than the renderer: it sidesteps CORS entirely (a renderer request depends on the provider's response headers, which are not ours to guarantee), and LRCLIB asks callers to send a `User-Agent` identifying the application — a header browsers forbid scripts from setting. The main process can set it.

The web build calls the endpoint directly from the renderer and, if the request fails for any reason, renders a "search unavailable" state. Authoring by typing or pasting is never gated on the provider.

*Alternatives considered:* **Musixmatch** — its free tier returns roughly a 30% snippet of each lyric, which is useless for projection. **Genius** — its API returns no lyrics at all, only page URLs; obtaining the text means scraping the HTML page, against its terms. **lyrics.ovh** — free and keyless but frequently unavailable and metadata-poor. LRCLIB is the only free, keyless option that returns complete lyrics as structured JSON.

Only `plainLyrics` is used; `syncedLyrics` is discarded. Imported songs record `source: { provider: "lrclib", id }`.

### 7. Search over the library is a client-side filter

`useSongs` holds the full song list in memory (the same shape `useLibrary` uses for folders), and the search box filters it by title, author, and lyric text, case- and accent-insensitively. No index, no incremental search infrastructure.

A congregation's repertoire is tens to low hundreds of songs. `bible/lib/normalize-text.ts` already exists for accent-insensitive matching and is the model to follow, though it lives in the `bible` module — if it is needed verbatim, it gets promoted to `core/lib` rather than imported across modules or duplicated.

### 8. "Add to library" reuses `createFolder`'s atomic initial-items write

`useLibrary.createFolder(name, parentId, insertAt, initialItems)` already writes a folder and its items in a single `storage.save`, and was added for precisely this class of problem (the comment on it notes that adding items afterward would race against the folder not existing in the closed-over snapshot). Creating a song's folder is one call: the song title as `name`, one `song` item per section as `initialItems`.

Parenting: if a folder is open, the song's folder is created as its child (nesting is capped at 3 levels — if the open folder is already at the cap, the song folder is created as a sibling instead); otherwise at the root.

### 9. `caption` (console chrome) is split from `reference` (projected slide)

`ResolvedFolderItemContent` gained a `caption` field distinct from `reference`. `reference` renders *on* the slide and therefore reaches the projected output; `caption` names the slide only in the app's own chrome — the console card's label strip, the sidebar tree row, the Songs tab's section list.

For a Bible verse the two are the same string ("Génesis 1:1"), which is why the distinction didn't exist before. For a song they diverge: the congregation must see lyrics and nothing else, while the operator still needs to tell "Verse 1" from "Chorus" at a glance when both slides carry near-identical text. Collapsing them would force a choice between projecting the word "Chorus" and having a console full of indistinguishable cards.

Section labels are therefore console-only metadata, and are user-editable (see the `songs-picker-panel` spec) because repeat-detection can only guess — it cannot know a block is a pre-chorus rather than another verse.

*Alternative considered:* keep one field and put the song title on the slide as its reference. Rejected on the user's explicit call, and it was the wrong default anyway — a projected song slide conventionally shows lyrics alone.

### 10. The Songs tab has no split-count control

The Bible tab's "Split into slides" exists because a single verse is one indivisible chunk of text that may be too long for one slide. A song is *already* an ordered set of sections, and the user controls that split directly in the editor with blank lines. Adding a split-count control here would be a second, competing way to do the same thing.

## Risks / Trade-offs

- **Copyright.** Projecting copyrighted worship lyrics generally requires a CCLI or equivalent license, and LRCLIB is community-contributed with unclear provenance per track. → The schema carries `ccliNumber`, `copyright`, and `authors` fields; imported songs record their `source`; the web-search UI shows a one-line licensing notice. The app does not host, redistribute, or bundle any lyrics — it stores what the user enters or fetches, locally.
- **LRCLIB may be unavailable, rate-limit, or return poor matches for Spanish worship titles.** → Search failure is a non-blocking empty state, results are previewed before import, and every imported song is a fully editable local song afterward. Manual entry is always available and is the primary path.
- **Edited songs don't propagate to already-added slides.** → Documented and intentional (Decision 3); `songId` is retained so a future explicit refresh action is possible.
- **Auto-format can mangle deliberately-shaped lyrics** (e.g. a one-line refrain that the reflow pass leaves alone but the grouping pass regroups). → It is opt-in per click, writes visibly into the textarea, and is natively undoable. It is never run on load or on save.
- **The song library isn't included in project export.** → Slides are denormalized so exported projects render correctly; only re-editing the source song requires the library. A song-library export/import is a clean follow-up change.
- **The `songs/` directory sits under `userData` while projects can be relocated**, so a user who backs up their relocated projects folder does not thereby back up their songs. → Same as templates today; worth surfacing in Settings as a follow-up, not solved here.
- **`normalize-text.ts` currently lives in the `bible` module** and the module rules forbid cross-module imports. → Promote it to `core/lib` when Songs needs it, updating the Bible module's import, rather than duplicating it.

## Migration Plan

No data migration is required.

- `SongItemData`'s shape changes, but no real `song` items can exist in anyone's storage: the only way to create one was never exposed in the UI (`BottomDrawer` renders a placeholder for the Songs tab and provides no add path). The union arm was forward-declared, not used.
- `Folder`, `Project`, and `ProjectFile` shapes are untouched, so existing library folders, projects, and exported project files load unchanged.
- The `songs/` directory is created lazily on first write, matching `ensureTemplatesDir` / `ensureLibraryDir`.
- Rollback is reverting the change: no existing file on disk is rewritten, and `songs/` is simply left orphaned and ignored.

## Open Questions

- Should a song's folder be created **collapsed or opened** after "Add to library"? Leaning toward opening it, so the user immediately sees the slides they just created — consistent with `convert-slide-creates-root-folder`'s behavior of opening the folder it creates.
- Should the default `linesPerSlide` (4) be a per-song value stored in the file, an app setting, or a fixed constant? Starting as a fixed constant in `lib/`, promotable to a setting later without a schema change.
- Should the Songs tab's Delete action also remove the song's already-created Library folders? Leaning no — those are project content, and deleting a repertoire entry shouldn't silently edit a service order.
