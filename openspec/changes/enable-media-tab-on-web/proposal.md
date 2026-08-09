## Why

The Media tab is the one content tab the web build cannot use. `add-media-tab` made that call deliberately (design decision 9): a media library is a view onto a filesystem, and at the time the browser had no way to reach one. That reasoning has aged — the File System Access API gives Chromium browsers a persistent, user-granted handle to a real folder, and everything downstream of the file (PDF rasterization with `pdfjs-dist`, thumbnail generation on a canvas, image/video playback) already runs in the renderer, not in Electron. What is genuinely desktop-only is the *bridge*, not the *feature*.

The practical cost of the gap is that a web user's console is missing exactly the content most services lead with: the sermon deck, the announcement graphic, the countdown video, the worship-set YouTube clip. They fall back to alt-tabbing into another tab mid-service, which is the failure this app exists to remove.

## What Changes

### The Media tab renders on web instead of a "desktop only" state

The tab, its three columns, its selection grammar, and its add actions are the same code in both builds. What differs is one seam: how a file reference resolves to something an `<img>` or `<video>` can load.

- `isMediaAvailable()` stops meaning "is Electron" and starts meaning "can this build reach media at all" — true in every build, with per-capability flags (`canBrowseDirectories`, `canConvertDocuments`, `canRevealInFolder`, `canImportGoogleSlides`) replacing the single desktop check at each call site.
- The web build gains a `MediaSourcesDriver` twin, so roots and favorites persist the same way library folders already do — the pattern `web-library-storage` established.

### Viewing only: nothing is uploaded, copied, or written to a server

This is the constraint that shapes the whole design, and it costs nothing — the desktop build already never copies a file. On web, a picked folder or file is read through a browser handle that never leaves the machine; there is no upload endpoint, no server-side storage, and no server component added by this change. What persists is a *handle*, not bytes.

### How the browser reaches local files

- **Chromium (File System Access API)** — "Add folder" opens `showDirectoryPicker()`, and the granted directory behaves like a desktop root: browsable subdirectories, an explorer tree, All and Favorites. The handle is stored in IndexedDB, so the root survives a reload; the browser requires a one-click permission re-grant per session, which the explorer surfaces as a "Reconnect" action on the root rather than as an error.
- **Safari / Firefox (no directory picker)** — "Add files" opens a plain multi-file picker, and drag-and-drop from the OS file manager works too. The picked `File` objects are stashed in IndexedDB (files are structured-cloneable, so this is a browser-local stash, not an upload) and appear as a flat, virtual root. These survive a reload without a permission prompt, since the bytes are already held.
- Either way the slide stores the same `bibletime-file://<sourceId>/<path>` reference the desktop build stores. The reference format, `parseMediaReference`, and every stored `MediaSlideData` are unchanged.

### The `/present` window resolves references for itself

On web the output window is a separate browsing context that receives slides through `localStorage`, so a blob URL minted in the console window is meaningless there. Each window resolves references against the shared IndexedDB store and mints its own object URL, which is why the persisted reference — not a URL — is what travels between them.

### Documents on web: PDF yes, PowerPoint no

- **PDF** is rasterized page-by-page with `pdfjs-dist`, exactly as on desktop. Rendered pages are cached in IndexedDB under the same content key instead of on disk, so re-opening a deck is still one cheap lookup.
- **`.pptx` / `.ppt` / `.odp`** need LibreOffice, which cannot run in a browser. They are still **listed** in the grid with an actionable "export this deck as PDF to use it here" note — listing and explaining beats hiding, the same call `add-media-tab` made for HEIC and `.avi`.
- **Google Slides import stays desktop-only.** The export URL is fetched by the Electron main process precisely because a browser cannot fetch it cross-origin, and adding a server proxy would mean sending users' deck URLs through a backend this app does not have. On web the action is absent rather than broken.

### YouTube links become a real slide kind, in both builds

Currently nothing in the codebase handles YouTube. This adds a `youtube` media slide kind in `core`: the user pastes a YouTube URL, the video id is extracted, and the slide renders an embedded player in the console preview and the output window, with per-slide start time, loop, and mute. It needs no filesystem, so it ships to desktop and web alike — the desktop build's CSP and `will-navigate` handling are widened to permit the embed frame and nothing else.

### What the web build does not get

Reveal-in-file-manager (no OS integration), LibreOffice conversion, Google Slides import, and — on Safari and Firefox — a browsable folder tree. Each is a missing *capability flag*, so the affordance is absent rather than present-and-failing.

## Capabilities

### New Capabilities

- `web-media-access`: How the browser build reaches local media without an upload — directory roots via the File System Access API, the session/file-stash fallback for browsers without it, IndexedDB persistence of handles and files, permission re-grant, reference resolution to object URLs per browsing context, and the IndexedDB caches for thumbnails and rendered document pages.
- `media-youtube-slides`: YouTube links as media slides in both builds — accepting and validating a URL, extracting the video id, the slide payload, embedded playback in preview and output, and the offline/unavailable-video states.

### Modified Capabilities

<!-- openspec/specs/ is empty; these capability names come from the not-yet-synced
     `add-media-tab` change, whose requirements this change amends. -->

- `media-library-sources`: Roots are no longer desktop-only. Adds web root registration (directory handle or file stash), the reconnect/permission state, and replaces the single "requires the desktop app" availability requirement with per-capability availability.
- `media-file-browser`: The grid, thumbnails, selection, and sorting are required in both builds; thumbnail caching is specified by behavior rather than by disk location, and the flat-root case (no subdirectories) is specified for browsers without a directory picker.
- `media-document-import`: PDF rasterization is required in both builds; PowerPoint conversion and Google Slides import are specified as desktop-only with defined, actionable web states.
- `media-slide-items`: Media slides gain the `youtube` kind, and the missing-file/relink requirement is extended to cover a web root whose permission has not been re-granted.

## Impact

- **`apps/bibletime/src/modules/media`** — `services/media-sources.ts` (bridge → driver selection), new `services/web-media-*` modules, `services/render-pdf-pages.ts` (cache seam), `services/generate-thumbnail.ts`, `services/list-directory.ts`, `actions/use-media-roots.ts`, `actions/use-media-availability.ts`, `views/media-picker-panel.tsx`, and the explorer/grid/preview components that currently branch on the bridge.
- **`apps/bibletime/src/modules/core/interfaces`** — `MediaSlideKind` gains `"youtube"`; `MediaSlideData` gains the fields that kind needs.
- **`apps/bibletime/src/modules/library`** — `resolve-folder-item-content.ts` and the slide/preview/output rendering path, for the new kind and for reference resolution in the `/present` window.
- **`apps/desktop/src/main.ts`** — CSP and navigation rules widened for the YouTube embed frame only.
- **Dependencies** — none added. `pdfjs-dist` is already a dependency; IndexedDB and the File System Access API are platform APIs.
- **No breaking changes to stored data.** The reference format, `MediaSlideData`'s existing fields, and every desktop behavior are unchanged; `MediaSlideKind` widens, which is additive for readers.
- **Browser support is uneven by design** — the feature degrades from "folder root" to "file list" rather than to "unavailable".
