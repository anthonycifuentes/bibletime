## Why

Songs are the other half of a worship service, and today the Songs tab is a dead end: `BottomDrawer` renders a `PlaceholderPicker`, `SongItemData` is a one-field stub (`{ title }`), and `resolveFolderItemContent` renders any `song` item as a hardcoded "contenido de canciones próximamente" placeholder. Every verse can already be browsed, previewed, converted to a slide, and presented — a song can't even be typed in. Making Songs real is the single largest remaining gap between this app and the ProPresenter/OpenLP workflow it's modeled on.

Unlike Bible verses, songs have no bundled corpus to read from — the user has to supply them. So this change has to deliver three things at once: a way to **write** a song (paste lyrics, get slides), a place to **keep** it (a real library on disk, in a documented JSON format), and a way to **use** it (browse, preview, drop a whole song into a Library folder as an ordered set of slides).

## What Changes

### Song library and storage

- Add a real `songs` module (today `apps/bibletime/src/modules/songs/` contains only an empty `index.ts`) owning song CRUD, the lyric→slide parser, and the Songs tab UI.
- Persist songs as **one JSON file per song** in a dedicated `songs/` directory, mirroring how `templates/` and `bible-versions/` already work in the Electron main process. Songs live under `userData` (not under the relocatable `projectsDataDir`), because a song library is reusable across every project and service, exactly like the template library.
- Define a documented, versioned song JSON schema (`schemaVersion: 1`) whose vocabulary follows **OpenLyrics** — the de-facto interchange format for church presentation software (OpenLP, OpenSong) — so songs can round-trip to and from other tools later without a migration. Sections carry OpenLyrics-style type codes (`v` verse, `c` chorus, `p` pre-chorus, `b` bridge, `e` ending, `t` tag), and metadata carries `authors`, `copyright`, `ccliNumber`, `key`, and `source`.
- Add a `SongStorageDriver` with desktop (filesystem via IPC) and web (localStorage) implementations, following the existing `LibraryStorageDriver` / `TemplateStorageDriver` split. The web build stays functional; only the on-disk folder is desktop-only.

### Full-screen song editor

- Add a full-screen modal editor: a title field, an optional artist/author field, and one large lyrics textarea. Deliberately minimal — no rich text, no per-slide forms, no section-by-section UI.
- **A blank line separates slides.** A single Enter is a line break *within* a slide; an empty line starts the next one. This is the OpenLP/ProPresenter convention and it makes pasted lyrics work with zero editing in the common case.
- Add an **auto-format** button for the "pasted a wall of text" case: it breaks long paragraphs at sentence and clause boundaries into lyric-length lines, then inserts a blank line every N lines (default 4) so the wall becomes properly separated slides. It rewrites the textarea's contents in place, so the result is visible and hand-editable rather than hidden behind a parser.
- Show a live slide count and a compact slide-boundary preview beside the textarea, so the user can see what they're about to get before saving.
- Section labels are inferred, not required: consecutive blocks are labelled Verse 1, Verse 2, … and a repeated identical block is labelled Chorus. The user never has to tag anything to get a usable result.

### Songs tab — three columns

- Replace the Songs `PlaceholderPicker` with a real three-column browser, modeled on `BiblePickerPanel` but shorter:
  1. **List + search** — a search box filtering the song library by title/author/lyric text, the song list, a "New song" button, and a "Search the web" button.
  2. **Lyrics** — the selected song's slides as an ordered, selectable list (one entry per parsed section), plus Edit and Delete for the song.
  3. **Preview** — the existing `SlideFrame` preview with the template selector, plus the actions.
- Actions in the preview column: **Add to library** (the whole song), **Add slide** (just the selected section), and **Present** (the selected section). No split-count control — a song's sections already define its slides, so the Bible tab's "Split into slides" control has nothing to do here.

### A song is a folder of slides

- "Add to library" creates a **Library folder named after the song**, containing one `song` slide per parsed section, in order — the "song = folder" model the Bible tab has no equivalent of. If a folder is already open, the song's folder is created as a child of it; otherwise it is created at the root.
- Give `SongItemData` real fields (song id, title, section label, the section's text, and its index) so a song slide renders its own lyrics, and drop the placeholder branch for `song` in `resolveFolderItemContent`. Text is **denormalized onto the item at add-time**, exactly like `BiblePassageItemData` already does for verses, so a slide keeps rendering after the source song is edited or deleted and exported project files stay self-contained.

### Web search (LRCLIB)

- Add "Search the web" to the Songs tab: a query box, a result list (title / artist / album / duration), and a preview of the fetched lyrics before importing. Importing runs the same blank-line parser and lands the song in the local library as a normal editable song.
- Use **LRCLIB** (`https://lrclib.net/api/search`) as the provider: no API key, no signup, no quota, and it returns *full* plain lyrics as JSON — the deciding factor. The obvious alternatives don't work for this: Musixmatch's free tier returns only a ~30% snippet of each lyric, and the Genius API returns no lyrics at all (only page URLs). Coverage of Spanish-language worship music is good.
- On desktop the request goes through a new `song-search:*` IPC pair so it runs in the Electron main process — no CORS surface, and LRCLIB's requested identifying `User-Agent` can actually be set. The web build calls the endpoint directly and degrades to a "search unavailable" message if the browser blocks it; typing and pasting a song is never blocked.
- Imported songs record `source: { provider: "lrclib", id }` in their JSON. Add a one-line notice in the search UI that imported lyrics are third-party content and that public performance of copyrighted worship lyrics generally requires a CCLI (or equivalent) license — the app stores a `ccliNumber` field for exactly this reason.

## Capabilities

### New Capabilities

- `song-library`: songs as first-class stored entities — the versioned, OpenLyrics-aligned JSON schema, one-file-per-song persistence in a dedicated songs directory shared across all projects, and create/read/update/delete/search over that library, with a web fallback that keeps the feature usable outside the desktop shell.
- `song-lyric-parsing`: turning free-form pasted lyrics into an ordered set of slide-sized sections — the blank-line separation rule, the auto-format transformation for unbroken paragraphs, section-label inference (Verse N / Chorus), and the guarantee that parsing is lossless and reversible against the stored lyric text.
- `songs-picker-panel`: the Songs tab itself — the three-column list/lyrics/preview layout, search over the library, the full-screen editor modal, template selection and live preview, and the "song becomes a Library folder of slides" add action.
- `song-web-search`: importing a song from the internet — querying LRCLIB, presenting results, previewing fetched lyrics before committing, recording provenance on the imported song, and failing gracefully when the provider is unreachable or the platform blocks the request.

### Modified Capabilities

- `library-folders`: the requirement "Unresolvable item types render as placeholders, not omissions" currently names `song` as an example of a type with no data yet, and its scenario asserts a `song` item renders a "not yet available" placeholder. That is no longer true — a `song` item now carries real section text and renders it. The requirement narrows to `media` only; `song` moves from placeholder-rendered to fully-rendered.
- `console-shell-navigation`: the scenario "Songs and Media tabs show placeholder browsers" asserts the Songs tab shows a placeholder browser. Songs now shows a real three-column browser; the placeholder requirement narrows to Media.

## Impact

**New — `apps/bibletime/src/modules/songs/`** (the module is currently an empty `index.ts`):
- `interfaces/index.ts` — `Song`, `SongSection`, `SongFile`, `SongStorageDriver`, `SongSearchResult`.
- `services/` — one file per concern per the module convention: `storage/{desktop,web}-song-storage.ts` + `storage/index.ts` (platform pick, mirroring `getLibraryStorage`), `song-file.ts` (parse/serialize the JSON schema), `search-songs-online.ts` (LRCLIB), and an `index.ts` re-export barrel.
- `actions/` — `use-songs.ts` (library CRUD, mirroring `useLibrary`'s shape) and `queries/use-search-songs-online.ts`.
- `lib/` — `parse-lyrics.ts` (blank-line → sections + label inference) and `auto-format-lyrics.ts` (the paragraph-breaking transformation). Both pure and unit-testable without React.
- `components/` — `song-list.tsx`, `song-section-list.tsx`, `song-editor-dialog.tsx`, `song-web-search-dialog.tsx`.
- `index.ts` — public surface.

**Modified:**
- `apps/bibletime/src/modules/library/interfaces/index.ts` — `SongItemData` replaces its `{ title }` stub with real fields; the `FolderItem` union is otherwise unchanged, so folder storage, reordering, drag-and-drop, and project export need no migration.
- `apps/bibletime/src/modules/library/lib/resolve-folder-item-content.ts` — the `song` case returns real `text`/`reference` instead of an `emptyMessage`.
- `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx` — untouched, but its column/preview/action structure is the reference the Songs panel is modeled on.
- `apps/bibletime/src/modules/library/components/bottom-drawer.tsx` — the Songs tab renders the songs module's panel instead of `PlaceholderPicker`; the drawer gains an `onAddSong` callback. `PlaceholderPicker` stays, still used by Media.
- `apps/bibletime/src/modules/library/views/console-view.tsx` — wires `onAddSong` to create a folder from a song's sections, reusing `createFolder(name, parentId, insertAt, initialItems)`, which already writes a folder and its items in one atomic save.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — new `songs.*` keys across all three dictionaries (the app ships en/es/pt).
- `apps/desktop/src/main.ts` — a `songs/` directory under `userData` with `songs:{list,save,remove}` handlers (copying the template handlers' one-file-per-id, skip-unparseable-files pattern), plus a `song-search:query` handler for LRCLIB.
- `apps/desktop/src/preload.ts` and `apps/bibletime/src/types/electron.d.ts` — expose and type `window.bibletime.songs` and `window.bibletime.songSearch`.

**Dependencies:** none added. LRCLIB needs no SDK or key; parsing is plain string work; the UI reuses `@workspace/ui` primitives (`dialog`, `input`, `textarea`, `button`, `select`) and the existing `SlideFrame`.

**Out of scope:** chord/ChordPro support, per-section manual tagging UI, OpenLyrics XML import/export (the JSON schema is aligned with it so this stays a later additive change), synced-lyrics playback (LRCLIB's `syncedLyrics` is fetched but ignored), and the Media tab.
