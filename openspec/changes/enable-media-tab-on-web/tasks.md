## 1. Introduce the media access port (desktop behavior unchanged)

- [x] 1.1 Add `MediaAccessDriver` and `MediaCapabilities` to `modules/media/interfaces/index.ts`: `capabilities`, `readRoots`/`addDirectoryRoot`/`addFilesRoot`/`removeRoot`/`relocateRoot`/`reconnectRoot`, `readFavorites`/`setFavorite`, `listDirectory` (raw), `statFile`, `resolveUrl`, `readBlob`, `revealInFolder`, and a `cache` sub-interface (`read`/`write`/`list`/`clear`/`size`).
- [x] 1.2 Create `modules/media/services/access/desktop-media-access.ts` by moving the four existing `bridge()`/`cacheBridge()` helpers behind the port — pure relocation, no behavior change; `resolveUrl` returns the reference unchanged, since the privileged protocol serves it directly.
- [x] 1.3 Create `modules/media/services/access/index.ts` with `getMediaAccess()`, picking once at module load the way `getLibraryStorage()` does.
- [x] 1.4 Rewrite `services/media-sources.ts`, `services/list-directory.ts`, `services/generate-thumbnail.ts`, and `services/render-pdf-pages.ts` to call `getMediaAccess()` instead of reading `window.bibletime`. No `window.bibletime` reference may remain outside `access/desktop-media-access.ts`.
- [x] 1.5 Replace `isMediaAvailable()` with `mediaCapabilities()` and update every call site (`use-media-roots.ts`, `use-media-availability.ts`, the explorer/grid/preview components) to read the specific flag it needs.
- [x] 1.6 Change `MediaRootStatus.isAvailable` to `status: "ready" | "needs-permission" | "unavailable"`, keeping `isAvailable` as a derived value so existing call sites compile.
- [ ] 1.7 Verify the desktop build is unchanged: roots, browsing, thumbnails, PDF/PowerPoint/Google Slides, favorites, reveal-in-folder, and relink all behave as before. This gate must pass before any web work starts.

## 2. Web storage layer

- [x] 2.1 Create `modules/media/services/access/web-media-db.ts`: open the `bibletime-media` IndexedDB with object stores `sources`, `files`, `favorites`, and `cache`, including version-1 schema creation and a typed wrapper over each store.
- [x] 2.2 Implement the `cache` store's LRU budget (256 MB): `lastUsedAt` touch on read, eviction pass on write, `QuotaExceededError` caught → evict → retry once → degrade to no-cache.
- [x] 2.3 Implement `requestPersistentStorage()` calling `navigator.storage.persist()` once, on first root registration, and expose the reported quota/usage for the Settings storage panel.
- [ ] 2.4 Add unit tests for the reference→store routing and for LRU eviction ordering (pure logic, no DOM).

## 3. Web media access driver

- [x] 3.1 Create `modules/media/services/access/web-media-access.ts` implementing `MediaAccessDriver` against the stores from section 2, with capabilities derived by feature detection (`showDirectoryPicker` present → `canBrowseDirectories`).
- [x] 3.2 Implement `addDirectoryRoot()`: `showDirectoryPicker()`, mint a `root-<hex>` id the same way the main process does, persist the handle in `sources`, and de-duplicate by `isSameEntry` against existing handles.
- [x] 3.3 Implement `addFilesRoot()` and appending to an existing stash: persist each `File` in `files` under `${rootId}/${name}`, deduplicating names with a numeric suffix.
- [x] 3.4 Implement `listDirectory()` for both root kinds — `handle.entries()` for a directory root, a flat listing for a stash — returning the same `RawMediaDirectoryListing` shape the desktop bridge returns, with `size`/`lastModified` from each `File`.
- [x] 3.5 Implement `statFile()` and `readBlob()`, including the "handle resolves but permission lapsed" case surfacing as `needs-permission` rather than a throw.
- [x] 3.6 Implement `resolveUrl()`: reference → `File` → `URL.createObjectURL`, behind a per-window LRU of ~64 entries that revokes on eviction; add a `releaseAll()` for teardown.
- [x] 3.7 Implement permission handling: `queryPermission` on load to compute root status, and `reconnectRoot()` calling `requestPermission()` from a user gesture.
- [x] 3.8 Implement the `cache` sub-interface over the `cache` store, matching the desktop cache's `read`/`write`/`list`/`clear`/`size` semantics.
- [x] 3.9 Implement `removeRoot()` so it deletes the root's handle, stashed files, favorites, and cached artifacts in one transaction.
- [x] 3.10 Register the web driver in `getMediaAccess()` and delete the desktop-only early return from `useMediaRoots` and `useMediaAvailability`.

## 4. Media tab in the browser

- [x] 4.1 Remove the desktop-only gating from `views/media-picker-panel.tsx` and the explorer, and drive every affordance from `MediaCapabilities`.
- [x] 4.2 Add the explorer's web root actions: "Add folder" where `canBrowseDirectories`, "Add files" otherwise (and alongside it on Chromium), plus drag-and-drop of files onto the column.
- [x] 4.3 Render the `needs-permission` root state with a "Reconnect" action in the explorer and in the grid area, visually distinct from the `unavailable` state.
- [x] 4.4 Add the browser-limitation empty state explaining that this browser cannot open a whole folder, shown only where `canBrowseDirectories` is false.
- [x] 4.5 Hide the Google Slides import action and the "Reveal in Finder/Explorer" context-menu entry where their capabilities are absent.
- [x] 4.6 Show a stash root's total stored size in the explorer, so a growing stash is visible.
- [x] 4.7 Add a concurrency cap (8 directories in flight) to `listAllRoots`, keeping the existing depth-3 limit, and short-circuit stash roots to their flat list.

## 5. Documents on the web

- [x] 5.1 Wire `render-pdf-pages.ts` to the driver: source URL from `resolveUrl`, page writes to `access.cache`. Confirm the rendered output is identical in both builds.
- [x] 5.2 Add `unsupportedReason: "desktop-only"` to `MediaEntry` and return it from `supported-formats` for `.pptx`/`.ppt`/`.odp` when `canConvertDocuments` is false.
- [x] 5.3 Render the `desktop-only` note on the tile and in the preview column ("Export this deck as a PDF to use it here"), and make the add actions refuse such an entry.
- [x] 5.4 Wire `generate-thumbnail.ts` to the driver cache, and confirm a thumbnail survives a page reload in the browser build.
- [x] 5.5 Report the media cache's size and offer "Clear cache" in the Settings storage panel for the web build, alongside the existing desktop entry.

## 6. Rendering media in the browser's output window

- [x] 6.1 Add a `useResolvedMediaUrl(reference)` action that resolves through the driver and revokes on unmount, and use it in every surface that renders a media slide (console tile, preview panel, `/present`).
- [ ] 6.2 Verify no resolved URL is ever written into `MediaSlideData` or the live-slide payload — add a test asserting the payload's `src` still matches the `bibletime-file://` form after a send.
- [x] 6.3 Handle the output window's unresolvable case: render the missing-media state naming reconnection (not relinking) as the remedy, with no permission prompt on the output display.
- [x] 6.4 Extend `useMediaAvailability` to distinguish "file missing" from "root needs reconnecting" and surface the matching remedy in the console.

## 7. YouTube slides

- [x] 7.1 Widen `MediaSlideKind` in `modules/core/interfaces` with `"youtube"` and add `startSeconds?` to `MediaSlideData`.
- [~] 7.2 Create `modules/media/lib/youtube-url.ts`: extract a video id from the `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, and `/live/` forms, reject everything else, and build the canonical watch URL and the `youtube-nocookie` embed URL with `mute`, `loop`+`playlist`, and `start` parameters. Unit-test both directions.
- [x] 7.3 Add `services/probe-youtube.ts` using the oEmbed endpoint to fetch a title and detect an undeleted, embeddable video; a network failure returns "unknown", never "invalid".
- [x] 7.4 Add the "Add from YouTube link" dialog to the preview column (URL field, validation message, title preview, start time, loop, mute), modeled on `google-slides-import-dialog.tsx`.
- [x] 7.5 Add `buildYouTubeSlide()` to `lib/build-media-slide.ts`.
- [x] 7.6 Render the `youtube` kind in the media layer of `SlidePreview` as an `<iframe>`, honoring fit-to-aspect-ratio, start time, loop, and mute; restart from the start time on each send to output.
- [x] 7.7 Add the autoplay-blocked play affordance for an unmuted slide on the output window, and the named unavailable/not-embeddable/offline states.
- [~] 7.8 Widen the desktop CSP `frame-src` to `https://www.youtube-nocookie.com` in `apps/desktop/src/main.ts`, and confirm `will-navigate`/`setWindowOpenHandler` still refuse navigation from inside the embed.
- [x] 7.9 Add the new user-facing strings to the `en`, `es`, and `pt` dictionaries in `modules/core/i18n`.

## 8. Verification

- [x] 8.1 Add the i18n strings for every new web-build state (reconnect, browser limitation, deck-needs-desktop, output-window reconnect) across all three dictionaries.
- [ ] 8.2 Desktop regression pass: every `add-media-tab` behavior, with particular attention to LibreOffice conversion, Google Slides import, the cache, and relink.
- [ ] 8.3 Chromium web pass: add a folder, browse subdirectories, thumbnails, PDF drill-in, add and present, reload, reconnect, remove a root.
- [ ] 8.4 Safari/Firefox web pass: add files, flat root, thumbnails, PDF, add and present, reload with no prompt, and the browser-limitation copy.
- [ ] 8.5 Output-window pass in both browsers: image, local video, PDF page, and YouTube slide, including the window-opened-after-adding case.
- [ ] 8.6 Offline pass: everything except YouTube works with the network disconnected, and confirm via devtools that no request carries media bytes or paths.
- [ ] 8.7 Storage pass: exceed the cache budget and confirm LRU eviction, then simulate a quota failure and confirm previews still render.
- [x] 8.8 Run `pnpm lint` and `pnpm typecheck` across the workspace, and build both the web and desktop targets.
