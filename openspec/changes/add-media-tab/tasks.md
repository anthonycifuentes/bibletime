## 1. Foundations: types, formats, and references

- [x] 1.1 Add `pdfjs-dist` to `apps/bibletime/package.json` and confirm its worker resolves under Vite (`?url` import or `pdfjs-dist/build/pdf.worker.min.mjs`), then `pnpm install`.
- [x] 1.2 Create `modules/media/interfaces/index.ts` with `MediaRoot`, `MediaEntry`, `MediaKind`, `MediaDocument`, `MediaThumbnail`, and `MediaSourcesFile` (`schemaVersion: 1`), following the `interfaces/` conventions used by `library` and `templates`.
- [x] 1.3 Create `modules/media/lib/supported-formats.ts`: the image/video/document extension allowlists, a `kindForExtension` resolver, and the "recognized but not decodable" list (HEIC, `.avi`, `.wmv`, HEVC-in-`.mov`) used to render the unsupported note.
- [x] 1.4 Create `modules/media/lib/content-key.ts`: `contentKey(rootId, relativePath, size, mtimeMs)` → a short stable hash, used for every cache directory name.
- [x] 1.5 Create `modules/media/services/media-reference.ts`: build and parse `bibletime-file://<rootId>/<relative-path>` and `bibletime-file://cache/<contentKey>/<name>`, with unit-testable pure functions and no Electron import.
- [x] 1.6 Widen `MediaItemData` in `modules/library/interfaces/index.ts` per design Decision 8 (`mediaType` union, `src`, `width`/`height`, `fit`, `loop`/`muted`/`durationMs`, `documentId`/`pageIndex`/`pageCount`), and add an optional `media` payload to `LiveSlidePayload`.

## 2. Electron main: filesystem, protocol, and IPC

- [x] 2.1 Register `bibletime-file` in the existing `protocol.registerSchemesAsPrivileged` call in `apps/desktop/src/main.ts` (must stay at module load, before `app.whenReady()`), alongside `bibletime-media`.
- [x] 2.2 Add `mediaSourcesPath` (`<userData>/media-sources.json`) with read/write helpers and lazy creation, mirroring `readAppSettings`/`writeAppSettings`.
- [x] 2.3 Add `mediaCacheDir` (`<userData>/media-cache/`) with `ensureMediaCacheDir`, plus size-of-directory and recursive-clear helpers for the Settings actions.
- [x] 2.4 Implement `resolveMediaFilePath(reference)`: resolve `rootId` against the registered roots (or the reserved `cache` host against `mediaCacheDir`), join, `fs.realpath`, and throw unless the result is still inside that root — generalizing `templateMediaPath`'s containment guard from flat-directory to subtree.
- [x] 2.5 Implement `protocol.handle(MEDIA_FILE_SCHEME)` using 2.4, returning 404 on any guard failure, unregistered root id, or missing file — never an error page leaking a path.
- [x] 2.6 Add `media:{listRoots,addRoot,removeRoot}` handlers; `addRoot` uses `dialog.showOpenDialog({ properties: ["openDirectory"] })` and de-duplicates by resolved path.
- [x] 2.7 Add `media:listDirectory(rootId, relativePath)` returning `{ directories, files }` with name, relative path, size, mtimeMs, and extension for each entry — path-guarded through 2.4, and skipping unreadable entries rather than failing the whole listing (the pattern `library:list` uses).
- [x] 2.8 Add `media:statFile` and `media:revealInFolder` (`shell.showItemInFolder`).
- [x] 2.9 Add `media-cache:{read,write,clear,size}` handlers writing under `mediaCacheDir/<contentKey>/`, using the write-to-temp-then-rename pattern from `bible-version-downloads:download` so a killed render never leaves a partial page image.
- [x] 2.10 Add `media-convert:probeLibreOffice`: probe PATH plus the per-platform standard install locations from design Decision 5, cache the result for the process lifetime, return `{ available, path }`.
- [x] 2.11 Add `media-convert:toPdf`: spawn `soffice --headless --convert-to pdf --outdir <cacheDir> <absolutePath>` with an argument array (no shell), a timeout, cancellation, and progress/failure reporting; the input path must come through the 2.4 guard.
- [x] 2.12 Add `google-slides:export(url)`: extract the deck id, `fetch` the `export/pdf` endpoint following redirects, verify `Content-Type` **and** the `%PDF-` magic bytes, write into the cache, and return typed failures (`not-a-slides-url`, `not-shared`, `network`) distinguishable by the UI.
- [x] 2.13 Expose all of the above in `apps/desktop/src/preload.ts` as `window.bibletime.media` / `.mediaCache` / `.mediaConvert` / `.googleSlides`, and type them in `apps/bibletime/src/types/electron.d.ts`.

## 3. Renderer services and actions

- [x] 3.1 `services/read-media-roots.ts` + `save-media-roots.ts` + `services/index.ts` barrel, feature-detecting `window.bibletime?.media` and reporting desktop-unavailable rather than throwing.
- [x] 3.2 `services/list-directory.ts` — wraps `media:listDirectory`, filters through `supported-formats`, and returns typed `MediaEntry`s.
- [x] 3.3 `services/generate-thumbnail.ts` — image thumbnails via `createImageBitmap` + canvas, video thumbnails via a detached `<video>` seeked to ~1s + `drawImage`; both persist through `media-cache:write` and return a `bibletime-file://cache/...` reference.
- [x] 3.4 `services/render-pdf-pages.ts` — `pdfjs-dist` page rasterization to PNG, yielding between pages, writing each page to the cache, and reporting progress; typed failures for corrupt and password-protected files.
- [x] 3.5 `services/convert-document.ts` — probe + convert through `media-convert:*`, returning the produced PDF's cache reference or a typed `libreoffice-missing` / `conversion-failed` / `timeout` result.
- [x] 3.6 `services/import-google-slides.ts` — wraps `google-slides:export` and hands the resulting PDF to 3.4.
- [x] 3.7 `lib/sort-media-entries.ts` — name/date/size sorting and the accent-insensitive name filter (promote `bible/lib/normalize-text.ts` to `core/lib` if it is needed verbatim, updating the Bible module's import — never a cross-module import or a copy).
- [x] 3.8 `actions/use-media-roots.ts` — the root list, add/remove, unavailable-root detection, and the desktop/web capability flag.
- [x] 3.9 `actions/use-media-directory.ts` — current directory, entries, refresh, sort/filter/search/thumbnail-size view state.
- [x] 3.10 `actions/use-media-thumbnail.ts` — the `IntersectionObserver`-driven lazy request with a fixed-concurrency (4) queue that drops requests for tiles scrolled past before starting.
- [x] 3.11 `actions/use-document-pages.ts` — selection-triggered conversion/rasterization state machine (`idle → converting → rendering → ready | failed`), cache hit short-circuit, and cancellation when the selection changes.

## 4. Media tab UI

- [x] 4.1 `components/media-explorer-tree.tsx` — roots, their subdirectory tree, All and Favorites, an "Add folder" action, a root context menu (remove, relocate), and a folder drop target that registers a dropped OS folder as a root. Built on `@workspace/ui` `tree-view`, as `folder-tree.tsx` already is.
- [x] 4.2 `components/media-file-tile.tsx` — thumbnail, name, kind badge, page count for documents, star toggle, unsupported/unplayable note, and a context menu with "Reveal in Finder/Explorer".
- [x] 4.3 `components/media-file-grid.tsx` — the windowed grid, selection model (single / shift-range / cmd-toggle / select-all), arrow-key navigation with Enter-to-add, double-click behavior (drill into documents, add+present for images and videos), and the empty state.
- [x] 4.4 Grid toolbar — sort control, kind filter, name search, and thumbnail-size slider (`@workspace/ui` `slider`), wired to `use-media-directory`'s persisted view state.
- [x] 4.5 Document page view — the drill-in grid of rendered pages with a back affordance that restores the containing directory and its selection.
- [x] 4.6 `components/media-preview-column.tsx` — `SlideFrame` preview of the selected file or page, the template `Select` (matching `BiblePickerPanel`), the contain/cover toggle, per-item loop/mute for video, multi-selection count, the per-state messages (converting, LibreOffice missing, deck not shared, unreadable file, unplayable codec), and the **Add** / **Add all** / **Add as folder** / **Present** actions.
- [x] 4.7 `components/google-slides-import-dialog.tsx` — URL field, fetch state, error states from 2.12, imported-at timestamp, and a Re-import action.
- [x] 4.8 `views/media-picker-panel.tsx` — the three-column composition, plus the web-build "requires the desktop app" state; export it from `modules/media/index.ts`.
- [x] 4.9 Make the grid a `@dnd-kit` drag source so files can be dropped onto the folder tree and the slide console, reusing the existing drag setup.

## 5. Wiring media into the console and the output

- [x] 5.1 Replace the Media `PlaceholderPicker` in `bottom-drawer.tsx` with `MediaPickerPanel`; add `onAddMedia` and `onAddMediaFolder` props. Delete `placeholder-picker.tsx` once `add-songs-tab` has removed its other call site (whichever change lands second does the deletion).
- [x] 5.2 Implement `onAddMedia` in `console-view.tsx` using `addItemsToFolder`, falling back to a root folder when none is open (matching the existing `onAddVerse` fallback).
- [x] 5.3 Implement `onAddMediaFolder` using `createFolder(name, parentId, insertAt, initialItems)` for the single atomic write, parenting under the open folder (or its sibling at the nesting cap) and opening the created folder.
- [x] 5.4 Replace the `media` placeholder branch in `resolve-folder-item-content.ts` with a real media payload; add `media` to `ResolvedFolderItemContent`, and resolve the missing state when the reference doesn't resolve.
- [x] 5.5 Add the media layer to `slide-preview.tsx` — an `<img>`/`<video>` between the template background and the text layer, `object-fit` from the item's `fit` — and extend `SlidePreviewProps` with `media`.
- [x] 5.6 Thread `media` through `preview-panel.tsx`, `slide-card.tsx`, and `setLiveSlide`, then render it in `routes/present/index.tsx`.
- [x] 5.7 Implement output-window video behavior: restart from zero on each send, honor `loop`, muted unless explicitly unmuted.
- [x] 5.8 Implement the missing-media slide state and its **Relink** action (native file picker, rewrite the item's `src`) in the preview panel and slide console.

## 6. Settings, i18n, and cleanup

- [x] 6.1 Add a media section to the settings view: PowerPoint-conversion availability (from `media-convert:probeLibreOffice`), media cache size, and a "Clear media cache" action, following `project-storage-panel.tsx`'s shape.
- [x] 6.2 Add all `media.*` keys to `core/i18n/dictionaries/{en,es,pt}.ts` — every state string from section 4.6 included — and remove the now-unused `library.mediaPlaceholder*` keys.
- [x] 6.3 Run `pnpm typecheck` and `pnpm lint` across the workspace and fix fallout, particularly in `apps/desktop`.

## 7. Verification

- [x] 7.1 Unit-test the pure `lib/` helpers: `supported-formats`, `content-key`, `media-reference` parse/build round-trip, and `sort-media-entries`.
- [ ] 7.2 Verify the protocol guard rejects `..` traversal, symlinks escaping a root, unregistered root ids, and absolute paths — each returning 404 with nothing served.
- [ ] 7.3 Verify the deck pipeline end to end on all three sources: a PDF, a `.pptx` with LibreOffice installed, and a shared Google Slides URL — each producing the same downstream slides.
- [ ] 7.4 Verify each failure state renders its specific message: LibreOffice absent, deck not shared, offline, corrupt PDF, password-protected PDF, unplayable video codec.
- [ ] 7.5 Verify the cache: a second selection of an unmodified file hits the cache; a file modified on disk re-renders; clearing the cache leaves every source file and every folder's slides intact.
- [ ] 7.6 Verify the missing/relink path: add a slide, move its file, confirm the missing state keeps its position and metadata, relink it, confirm it renders again — and that repointing a whole root fixes every slide inside it at once.
- [ ] 7.7 Verify grid performance in a directory of at least 1000 files: scrolling stays smooth, concurrent thumbnail generation stays capped, and selection responds immediately.
- [ ] 7.8 Verify the Media tab's directory, selection, and view settings survive a bottom-tab round-trip.
- [ ] 7.9 Verify a media slide renders identically in the console, the preview panel, and `/present`, letterboxed to the configured aspect ratio, in both contain and cover fits.
- [ ] 7.10 Verify the web build shows the desktop-required state and that a project with media slides opens there with those slides in the missing state rather than breaking the folder.
