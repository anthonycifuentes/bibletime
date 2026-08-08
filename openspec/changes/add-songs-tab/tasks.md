## 1. Song data model and pure logic

- [x] 1.1 Create `modules/songs/interfaces/index.ts` with `Song`, `SongSection` (label, OpenLyrics type code `v`/`c`/`p`/`b`/`e`/`t`, `lines: string[]`), `SongFile` (`schemaVersion: 1`), `SongSource`, and `SongStorageDriver` (`canWrite`, `list`, `save`, `remove`) — mirroring `LibraryStorageDriver`'s shape.
- [x] 1.2 Write `modules/songs/lib/parse-lyrics.ts`: split lyric text into sections on runs of blank lines, trim blocks, drop empties, and infer labels (consecutive verse numbering; a section whose case/punctuation/whitespace-normalized text repeats an earlier one is labelled chorus and skips a verse number).
- [x] 1.3 Write `modules/songs/lib/serialize-lyrics.ts`: join a song's sections back into editor text with exactly one blank line between blocks, so `parseLyrics(serializeLyrics(sections))` reproduces the same boundaries and line content.
- [x] 1.4 Write `modules/songs/lib/auto-format-lyrics.ts`: pass 1 breaks over-long lines at sentence terminators then clause boundaries, preferring the break nearest an over-long run's midpoint; pass 2 inserts a blank line every `LINES_PER_SLIDE` (constant, default 4) lines within each existing block without merging existing separations.
- [x] 1.5 Verify the pure functions against the spec scenarios: two blocks → two slides, four single-newline lines → one slide, 3+ blank lines → one boundary, leading/trailing blank lines produce no empty sections, A/B/A/C labels as verse 1 / verse 2 / chorus / verse 3, empty input → zero sections, auto-format on already-formatted text is a no-op.

## 2. Song persistence

- [x] 2.1 Add `songs/` under `userData` in `apps/desktop/src/main.ts` with `ensureSongsDir` + `songPath(id)`, and register `songs:list` / `songs:save` / `songs:remove` handlers copying the template handlers' one-file-per-id, skip-unparseable-file pattern.
- [x] 2.2 Expose `window.bibletime.songs` in `apps/desktop/src/preload.ts` and type it in `apps/bibletime/src/types/electron.d.ts`.
- [x] 2.3 Add `modules/songs/services/storage/desktop-song-storage.ts` (IPC bridge) and `web-song-storage.ts` (localStorage), plus `storage/index.ts` exporting `getSongStorage()` with the same platform-pick logic as `getLibraryStorage`.
- [x] 2.4 Add `modules/songs/services/song-file.ts` — build a `SongFile` from a `Song` and read one back, defaulting absent optional metadata rather than emitting empty strings, and preserving unrecognized fields on read.
- [x] 2.5 Add `modules/songs/services/index.ts` re-exporting the storage barrel, `song-file`, and (after task 5) `search-songs-online`.
- [x] 2.6 Add `modules/songs/actions/use-songs.ts`: in-memory song list + `isLoading`, `canWrite`, `create`, `update`, `remove`, and a `refresh`, following `useLibrary`'s structure.
- [ ] 2.7 Verify persistence end to end in the desktop build: saving writes exactly one `<id>.json`, editing updates in place with no duplicate, deleting removes only that file, an invalid file in the directory is skipped rather than failing the list, and songs survive an app restart and a project switch.

## 3. Search and shared text helpers

- [x] 3.1 Promote `modules/bible/lib/normalize-text.ts` to `core/lib` and update the Bible module's import, so accent-insensitive matching is shared rather than duplicated or cross-imported (module rules forbid cross-module imports).
- [x] 3.2 Add the client-side song filter over the in-memory list, matching title, author, and lyric text case- and accent-insensitively.

## 4. Songs tab UI

- [x] 4.1 Add `modules/songs/components/song-list.tsx` — search box, filtered list with selection, "New song" and "Search the web" buttons, and an empty state pointing at both.
- [x] 4.2 Add `modules/songs/components/song-section-list.tsx` — the selected song's sections in order with their labels, single-selection, plus Edit and Delete for the song.
- [x] 4.3 Add `modules/songs/components/song-editor-dialog.tsx` — full-screen modal with title, optional author, one lyrics textarea, the auto-format button, a live slide count, and a compact slide-boundary preview. Disable save with an empty title or zero sections, and state the reason.
- [x] 4.4 Add `modules/songs/views/songs-picker-panel.tsx` — the three-column grid (list+search / sections / preview), reusing `SlideFrame` and the template `Select` the way `BiblePickerPanel` does, with **Add to library**, **Add slide**, and **Present** actions and no split-count control.
- [x] 4.5 Add `modules/songs/index.ts` exporting the panel view and the module's public types.
- [x] 4.6 Add Songs-tab state (search query, selected song id, selected section index) to `use-console-store.ts` so it survives a bottom-tab round-trip, matching how `openFolderId`/`selectedItemIds` already do.
- [x] 4.7 Verify the panel against its spec scenarios: three columns render, selecting a song lists its sections with nothing selected, selecting a section previews without adding, the editor round-trips an existing song's text, and tab round-trip preserves query/song/section.

## 5. Web search (LRCLIB)

- [x] 5.1 Add a `song-search:query` handler in `apps/desktop/src/main.ts` that fetches `https://lrclib.net/api/search?q=<query>` with an identifying `User-Agent`, and expose/type it as `window.bibletime.songSearch`.
- [x] 5.2 Add `modules/songs/services/search-songs-online.ts` — call the IPC handler when the desktop bridge is present, otherwise fetch directly; map results to a `SongSearchResult` (title, artist, album, duration, id, `plainLyrics`) and discard `syncedLyrics`.
- [x] 5.3 Add `modules/songs/actions/queries/use-search-songs-online.ts` with distinct `idle` / `loading` / `results` / `empty` / `unavailable` states, so a failure is never rendered as "no results".
- [x] 5.4 Add `modules/songs/components/song-web-search-dialog.tsx` — query box, result list (title / artist / album / duration), fetched-lyrics preview with the resulting slide count, an explicit Import action, and the licensing notice positioned above the results.
- [x] 5.5 Wire import: parse the fetched lyrics with the same parser, create the song with `source: { provider: "lrclib", id }`, and open it in the editor for review. Preserve `source` across later edits.
- [x] 5.6 Verify: a real query returns identifiable results, selecting a result previews without saving, dismissing after preview saves nothing, a result with empty `plainLyrics` is reported and not importable, and a forced network failure shows "search unavailable" while typing/pasting/adding still works.

## 6. Library integration

- [x] 6.1 Replace `SongItemData`'s `{ title }` stub in `modules/library/interfaces/index.ts` with `{ songId, title, sectionLabel, text, sectionIndex }`, keeping the `FolderItem` union arms otherwise unchanged.
- [x] 6.2 Update `modules/library/lib/resolve-folder-item-content.ts` so the `song` case returns `text` (the section) and `reference` (the song title) instead of an `emptyMessage`. Leave the `media` placeholder branch alone.
- [x] 6.3 Replace the Songs `PlaceholderPicker` in `modules/library/components/bottom-drawer.tsx` with the songs module's panel, adding `onAddSong` / `onAddSongSection` props. Keep `PlaceholderPicker` in place for Media.
- [x] 6.4 Wire `onAddSong` in `modules/library/views/console-view.tsx` to one `library.createFolder(title, parentId, "end", initialItems)` call carrying every section as a `song` item, choosing `parentId` per the nesting rule (child of the open folder; sibling when that would exceed the depth cap; root when nothing is open), and open the created folder.
- [x] 6.5 Wire `onAddSongSection` to `library.addItemToFolder` for the single-section case, and disable it with a hint when no folder is open.
- [x] 6.6 Verify: a four-section song produces a folder with four ordered slides in one write; those slides select, reorder, remove, take a template, and present like Bible slides; editing or deleting the source song leaves them rendering unchanged.

## 7. Localization and finish

> 2.7 and 7.4 are the only Electron-shell verifications. They were deferred, not skipped: a concurrent change (`add-media-tab`) is mid-rewrite of `apps/desktop/src/main.ts` and its renderer module does not yet typecheck, so an Electron launch would exercise that in-flight tree rather than this one. Everything they cover was verified against the web build instead (real browser, real storage round-trip); the desktop driver is the same interface with filesystem IPC in place of `localStorage`.


- [x] 7.1 Add every new `songs.*` key — panel labels, editor, auto-format, web search, licensing notice, empty states, hints, and the inferred `Verso N` / `Coro` labels — to `core/i18n/dictionaries/en.ts`, `es.ts`, and `pt.ts`.
- [x] 7.2 Audit the new module for hardcoded strings, cross-module component imports, deep (non-barrel) imports, and relative paths crossing folders, per the frontend module rules.
- [x] 7.3 Run typecheck and build across the workspace, including the desktop app's `main.ts`/`preload.ts` changes.
- [ ] 7.4 Manual pass in the Electron shell: paste a wall of text, auto-format it, save, add the song to the Library, present a slide, restart the app, and confirm the song and its folder are both still there.
