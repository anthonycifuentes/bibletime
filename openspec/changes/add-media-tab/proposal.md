## Why

The Media tab is the last placeholder in the console. `BottomDrawer` renders a `PlaceholderPicker` for it, `MediaItemData` is a two-field stub (`{ title, mediaType }`), and `resolveFolderItemContent` renders any `media` item as a hardcoded "contenido multimedia próximamente" placeholder. A service that can show verses and lyrics but can't show the sermon deck, the announcement graphic, or the countdown video is only half a presentation app — in practice the operator falls back to alt-tabbing into Preview, Keynote, or a browser tab mid-service, which is exactly the failure this app exists to remove.

Media is also the first content type where the *file on disk* is the content. Verses come from a bundled corpus and songs are authored in-app; a photo, a video, and a sermon deck already exist somewhere in the user's Documents folder, often gigabytes of them. That makes this change less about authoring and more about **browsing what's already there, turning it into slides, and never copying it** — a desktop-shaped problem, and the reason this tab is explicitly desktop-only.

## What Changes

### One pipeline: everything that isn't an image or a video becomes a PDF, and a PDF becomes page images

The central decision. A PDF is rasterized to one PNG per page; a PowerPoint deck is converted to PDF first; a Google Slides deck is fetched as PDF first. Downstream, all three are identical — an ordered set of page images. Animations, transitions, and embedded video in a deck are deliberately dropped (confirmed acceptable): what gets projected is exactly what the operator previewed.

- **PDF** — rasterized page-by-page with `pdfjs-dist` in the renderer, cached to disk as PNGs.
- **PowerPoint (`.pptx`, `.ppt`, `.odp`)** — converted with a locally installed LibreOffice (`soffice --headless --convert-to pdf`), detected at runtime from PATH and the standard install locations. Conversion starts **when the file is selected**, so the preview column shows real pages before anything is added. With no LibreOffice present the file is still listed and selectable, showing an actionable "install LibreOffice, or export this deck to PDF" state rather than a dead thumbnail.
- **Google Slides** — an "Add from URL" action; the Electron main process fetches `https://docs.google.com/presentation/d/<id>/export/pdf` and the result enters the PDF path. A deck without link sharing returns an HTML login page instead of a PDF; that is detected and reported as "this deck isn't shared — enable link access or download it as PDF". The import is a **snapshot**, re-fetchable on demand, not a live link.

### Files are referenced in place, never copied

The media library is a set of user-registered **root folders** on disk. Files stay exactly where they are — importing a 4 GB video is instant and costs no disk.

- A new privileged Electron scheme, `bibletime-file://<rootId>/<relative-path>`, serves source files, resolving `rootId` to its current absolute path and refusing any path that escapes that root — the same containment guard `templateMediaPath` already uses, generalized. Because references are root-relative, moving or renaming a registered root repoints every slide that uses it without rewriting a single folder file.
- Derived artifacts (thumbnails, rasterized document pages) live under a managed `media-cache/` directory keyed by a content hash of path + size + mtime, and are served through the same scheme under a reserved `cache` host. Editing a file on disk changes its key, so the cache self-invalidates.
- A referenced file that has moved or been deleted renders a **missing** state with a **Relink** action, instead of a broken image.

### Three columns in the Media tab

The tab follows the Bible and Songs tabs' grammar — browse → select → preview → explicit add — so there is one interaction to learn:

1. **Explorer** — a tree of registered roots and their subdirectories, plus **All** (a flat view across every root) and **Favorites** (starred files). Roots are added with a native folder picker or by dropping an OS folder onto the column, and can be removed without touching the files.
2. **Files** — a thumbnail grid of the selected directory's supported files: lazily generated thumbnails, a thumbnail-size slider, sort by name/date/size, filter by kind, and a name filter. Single click selects and previews, cmd/shift-click extends the selection, and double-click on a document drills into its pages.
3. **Preview + actions** — the selected file (or page) in a `SlideFrame`, with **Add**, **Add all**, **Add as folder**, and **Present**.

### Adding: one, all, or a whole deck as a folder

- **Add** appends the selected files to the open Library folder as `media` items, in grid order. With no folder open it creates one at the root, matching what "Convert to slide" already does for a verse.
- **Add all** does the same for every supported file in the current directory.
- **Add as folder** creates a Library folder and puts the slides inside it in one atomic write (reusing `createFolder`'s `initialItems`): for a document, a folder named after the deck holding one slide per page; for a multi-file selection, a folder named after the containing directory.

### Media items are real slides

- `MediaItemData` grows from its stub into a real shape: an in-place `src` reference, `mediaType` widened to `"image" | "video" | "document-page"`, natural dimensions, a `contain`/`cover` fit, per-item `loop`/`muted` for video, and `documentId`/`pageIndex`/`pageCount` for a deck page. **BREAKING** as a type, but no migration exists to run — the UI never had a path to create a `media` item, so no such item can exist in anyone's storage.
- `SlidePreview` gains a media layer between the template background and the text layer, so a media slide renders identically in the slide console, the preview panel, and the `/present` output window. Video on the output window autoplays, honors per-item loop and mute, and starts from the beginning each time the slide is sent.
- `resolveFolderItemContent`'s `media` placeholder branch is removed.

### Desktop affordances

Arrow-key navigation and Enter-to-add in the grid, Cmd/Ctrl+A to select all, drag from the grid onto the folder tree or slide console (reusing the `@dnd-kit` setup already in the app), "Reveal in Finder/Explorer" on a file's context menu, and a grid that stays responsive at 1000+ files through windowing and capped-concurrency lazy thumbnailing.

### Desktop-only, deliberately

Unlike songs and templates, the Media tab ships **no web fallback**. A media library is a filesystem feature; `localStorage` cannot hold a video library, and the web build has no path to the user's disk. On web the tab renders a clear "available in the desktop app" state rather than a half-working browser.

## Capabilities

### New Capabilities

- `media-library-sources`: the media library's roots and explorer — registering and removing root folders on disk, browsing their directory tree, the All and Favorites views, which file types are recognized as supported, manual refresh, and persistence of the root list across restarts.
- `media-file-browser`: the file grid — thumbnail generation and disk caching, lazy loading, selection (single, range, multi), sorting/filtering/name search, thumbnail sizing, drilling into a document's pages, and remaining responsive on large directories.
- `media-document-import`: turning a document into page images — PDF rasterization, PowerPoint conversion through a locally installed LibreOffice, Google Slides import via the export URL, cache keying and invalidation, and the actionable failure states for each (LibreOffice absent, deck not shared, corrupt file).
- `media-slide-items`: media as folder content — the in-place reference format and its path-containment guard, the add actions (one, all, as a folder), rendering a media slide in the console/preview/output, video playback behavior on the output window, and the missing-file/relink state.

### Modified Capabilities

- `library-folders`: the requirement "Unresolvable item types render as placeholders, not omissions" loses its last remaining member. `add-songs-tab` already narrows it from `song`/`media` to `media` only; with this change no folder item type renders a placeholder, so the requirement is removed and replaced by one stating that a `media` item carries its own reference and renders real content. **This change assumes `add-songs-tab` lands first**; if it does not, this delta must also drop `song` from that requirement.
- `console-shell-navigation`: the scenario "Media tab shows a placeholder browser" is no longer true — the Media tab shows a real three-column browser. Adds the tab-round-trip state-preservation guarantee (current directory, selection, and view settings survive switching tabs) that the Library and Songs tabs already have.

## Impact

**New — `apps/bibletime/src/modules/media/`** (currently a bare `index.ts`):

- `interfaces/index.ts` — `MediaRoot`, `MediaEntry`, `MediaKind`, `MediaDocument`, `MediaSourcesDriver`.
- `services/` — one file per concern: `list-directory.ts`, `read-media-roots.ts`/`save-media-roots.ts`, `render-pdf-pages.ts` (pdf.js), `generate-thumbnail.ts` (canvas/`<video>` frame capture), `convert-document.ts` (LibreOffice IPC), `import-google-slides.ts`, `media-reference.ts` (build/parse `bibletime-file://` references), plus an `index.ts` barrel.
- `actions/` — `use-media-roots.ts`, `use-media-directory.ts`, `use-media-thumbnail.ts`, `use-document-pages.ts`.
- `lib/` — `supported-formats.ts`, `content-key.ts`, `sort-media-entries.ts`. Pure and unit-testable.
- `components/` — `media-explorer-tree.tsx`, `media-file-grid.tsx`, `media-file-tile.tsx`, `media-preview-column.tsx`, `google-slides-import-dialog.tsx`.
- `views/media-picker-panel.tsx` — the three-column tab, and the module's public surface via `index.ts`.

**Modified:**

- `apps/bibletime/src/modules/library/interfaces/index.ts` — `MediaItemData` gains real fields; `LiveSlidePayload` gains an optional `media` payload. The `FolderItem` union arms are otherwise unchanged, so folder storage, reordering, drag-and-drop, and project export need no migration.
- `apps/bibletime/src/modules/library/lib/resolve-folder-item-content.ts` — the `media` case returns a real media payload instead of an `emptyMessage`; `ResolvedFolderItemContent` gains a `media` field.
- `apps/bibletime/src/modules/library/components/bottom-drawer.tsx` — the Media tab renders the media module's panel instead of `PlaceholderPicker`, and the drawer gains `onAddMedia` / `onAddMediaFolder` callbacks. `PlaceholderPicker` becomes unused and is deleted (`add-songs-tab` removes its other call site).
- `apps/bibletime/src/modules/library/views/console-view.tsx` — wires the new callbacks, reusing `addItemsToFolder` and `createFolder(name, parentId, insertAt, initialItems)`.
- `apps/bibletime/src/modules/library/components/preview-panel.tsx` and `.../slide-card.tsx` — pass the resolved media payload through.
- `apps/bibletime/src/modules/presentation/components/slide-preview.tsx` — a media layer above the background and below the text; `SlidePreviewProps` gains `media`.
- `apps/bibletime/src/routes/present/index.tsx` — forwards `slide.media` to `SlideFrame`.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — new `media.*` keys in all three dictionaries; the `library.mediaPlaceholder*` keys are removed.
- `apps/desktop/src/main.ts` — registers the `bibletime-file` privileged scheme and its protocol handler with a root-containment guard; a `media-sources.json` under `userData` and a `media-cache/` directory; `media:{listRoots,addRoot,removeRoot,listDirectory,statFile,revealInFolder}`, `media-cache:{read,write,clear}`, `media-convert:{probeLibreOffice,toPdf}`, and `google-slides:export` handlers.
- `apps/desktop/src/preload.ts` and `apps/bibletime/src/types/electron.d.ts` — expose and type `window.bibletime.media`, `.mediaCache`, `.mediaConvert`, and `.googleSlides`.

**Dependencies:** one added — `pdfjs-dist` in `apps/bibletime`. LibreOffice is an optional *external* program, detected at runtime, never bundled or installed by the app. Thumbnailing uses only browser APIs (`createImageBitmap`, canvas, `<video>` seek) so no native image/video module is introduced.

**Out of scope:** the reference UI's Online providers (YouTube, Vimeo, Pixabay, Unsplash), Screens and Cameras capture, live-embedded Google Slides, audio files (Audio is its own tab), video transport controls/trimming/looping ranges, image editing or cropping, filesystem watching for live directory updates (manual Refresh in this change), and any web-build media support.
