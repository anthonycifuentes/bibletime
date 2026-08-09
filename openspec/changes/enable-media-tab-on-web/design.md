## Context

`add-media-tab` shipped the Media tab as a desktop-only feature, and its design decision 9 states the reasoning: a media library is a view onto the user's filesystem, the browser has no access to one, and `localStorage` cannot hold gigabytes of video. It explicitly rejected the half-measure of session-scoped `File` objects "that vanish on reload, and slides whose references break the moment the tab closes."

That decision is being amended, not overturned. The objection it raised is still correct and this design answers it directly: the File System Access API gives a *persistent, re-grantable handle to a real folder* rather than a session-scoped `File`, IndexedDB stores handles and blobs rather than JSON strings, and a reference that survives a reload is what makes a media slide honest in the browser. Where a browser genuinely cannot offer that — Safari and Firefox have no directory picker — the feature degrades to a persisted file stash rather than to nothing.

Four facts about the current implementation shape the work:

1. **The Electron bridge is feature-detected, not injected.** `media-sources.ts`, `list-directory.ts`, `generate-thumbnail.ts`, and `render-pdf-pages.ts` each open with a private `bridge()`/`cacheBridge()` helper reading `window.bibletime?.media`. There are four independent seams, all shaped the same way, and each returns an empty/`desktop-required` result when the bridge is absent. That is a driver interface waiting to be named.
2. **The heavy lifting already runs in the renderer.** Design decision 2 put rasterization in the renderer on purpose: `pdfjs-dist`, `createImageBitmap`, and `<canvas>` do the PDF and thumbnail work. The main process only touches the filesystem, spawns LibreOffice, and fetches the Google Slides export. Of those three, only the filesystem part has a browser answer.
3. **References are opaque strings with one parser.** `bibletime-file://<host>/<path>` is built by `buildMediaReference`, read by `parseMediaReference`, and stored in `MediaSlideData.src`. Host ids are minted as `root-<hex>` and the reserved `cache` host holds derived artifacts. Nothing about that format is Electron-specific — only its *resolution* is.
4. **The `/present` output window is a separate browsing context.** On web it receives slides through `localStorage` (`live-slide.ts`), so anything window-local — most importantly an object URL — is meaningless on the other side.

## Goals / Non-Goals

**Goals:**

- The Media tab is a working tab in the web build, with the same three-column browse → select → preview → add grammar as on desktop.
- Images, local videos, and PDFs become slides on web; YouTube links become slides on both builds.
- Nothing is uploaded. No server component is added, no bytes leave the machine, and the app keeps working offline except for YouTube playback itself.
- A web root survives a reload, with at most one click to reconnect it.
- Every capability the web build lacks is *absent* rather than present-and-failing, and says why when the user can act on it.
- The desktop build's behavior is byte-for-byte unchanged apart from the additive YouTube kind.

**Non-Goals:**

- Uploading, syncing, or server-side storage of media. Explicitly out of scope; this is a viewer.
- LibreOffice-equivalent conversion in the browser (a WASM Office renderer). PowerPoint on web is answered with "export as PDF".
- Google Slides import on web — it needs a cross-origin fetch that only a main process or a server proxy can make.
- A polyfilled directory tree on Safari/Firefox via `webkitdirectory`, which yields a one-shot snapshot of `File` objects with no persistence and no re-read. The file stash is the honest version of that.
- Filesystem watching in either build.
- Audio files, camera/screen capture, and other online providers (Vimeo, Unsplash). Unchanged from `add-media-tab`'s non-goals.
- Video transport controls, trimming, or scrubbing on the output window — including for YouTube, which gets a start time and nothing else.

## Decisions

### 1. Replace four ad-hoc `bridge()` helpers with one `MediaAccessDriver` port

Every place that currently asks "is `window.bibletime.media` there?" instead asks a driver selected once, the way `getLibraryStorage()` already picks between `desktop-library-storage` and `web-library-storage`.

```
modules/media/interfaces/  MediaAccessDriver   ← the port: roots, listing, stat, bytes, cache
modules/media/services/access/
  desktop-media-access.ts  ← wraps window.bibletime.media / .mediaCache (today's code, moved)
  web-media-access.ts      ← File System Access + IndexedDB
  index.ts                 ← getMediaAccess(): picks once, at module load
```

The port is deliberately narrow — it exposes *bytes and metadata*, not features. `readFile(reference): Promise<Blob>`, `resolveUrl(reference): Promise<string>`, `listDirectory`, `statFile`, `readRoots`/`addRoot`/`removeRoot`, and a `cache` sub-interface with `read`/`write`/`list`. Everything above it (`listDirectory`'s allowlist filtering, `generate-thumbnail`'s canvas work, `render-pdf-pages`' pdf.js loop, the whole `views/` layer) becomes build-agnostic and stops mentioning Electron.

**Alternative considered:** keep the per-module feature detection and add a `?? webFallback()` to each. Rejected — four seams means four places to get the web path subtly wrong, and the components above them would still branch on the bridge. One port makes "which build am I in?" a question asked exactly once.

### 2. Capabilities are a record of flags, not one boolean

`isMediaAvailable()` currently answers two different questions at once: "can I read files?" and "is this Electron?". Splitting it is what lets the tab render on web at all:

```ts
interface MediaCapabilities {
  canBrowseDirectories: boolean   // false on Safari/Firefox — flat stash root instead of a tree
  canConvertDocuments: boolean    // false on web — LibreOffice
  canImportGoogleSlides: boolean  // false on web — cross-origin fetch
  canRevealInFolder: boolean      // false on web — no OS integration
  canPersistAcrossReload: boolean // true on web via IndexedDB; drives the copy in the empty state
}
```

Each affordance reads the flag it needs. `useMediaAvailability`'s "web build → everything is missing" branch (`add-media-tab` decision 9) is deleted; a media slide on web is missing when its *file* is missing, which is the same rule as on desktop.

### 3. Web roots come in two kinds, behind the existing `MediaRoot` shape

`MediaRoot` gains `kind: "directory" | "stash"` and web-only handle storage. Desktop roots are always `directory`.

- **`directory`** — a `FileSystemDirectoryHandle` from `showDirectoryPicker()`. Browsable subtree, real explorer tree, `listDirectory` walks it with `handle.entries()`.
- **`stash`** — a flat set of `File` objects from `<input type="file" multiple>` or a drop. It reports zero subdirectories and lists its files at the root. Used when `showDirectoryPicker` is undefined, and also available on Chromium for the "just these three photos" case.

Root ids stay `root-<lowercase hex>`, minted the same way, so `parseMediaReference`'s invariants (the reserved lowercase `cache` host can never collide) and every stored reference are untouched. A `stash` root's `relativePath` is the file's `name`, deduplicated with a numeric suffix on collision.

**Alternative considered:** a separate `WebMediaSource` type alongside `MediaRoot`. Rejected — the explorer, grid, favorites, and reference builder all key off `MediaRoot`, and forking the type would fork all four.

### 4. IndexedDB holds handles, stashed files, and derived artifacts — in that order of importance

One database, `bibletime-media`, with four object stores:

| Store | Key | Value | Why |
| --- | --- | --- | --- |
| `sources` | `rootId` | `MediaRoot` + `FileSystemDirectoryHandle?` | Handles are structured-cloneable; this is the only way a root survives a reload |
| `files` | `${rootId}/${name}` | `File` | The stash. A `File` is a `Blob` — the browser keeps it on disk, not in JS heap |
| `favorites` | `reference` | `{ addedAt }` | Mirrors the desktop `media-sources.json` favorites list |
| `cache` | `${contentKey}/${fileName}` | `{ blob, bytes, lastUsedAt }` | Thumbnails and rendered PDF pages — the browser twin of `media-cache/` |

`localStorage` is not used for any of this: it is string-only and capped at ~5 MB. The `sources` and `favorites` stores could live there, but keeping all four together means one transaction boundary and one place to clear.

The `cache` store is the only one with a budget — see decision 8.

### 5. `bibletime-file://` stays the stored format; only resolution differs

A slide's `src` is the same string in both builds. Resolution is per-driver:

```
desktop:  bibletime-file://root-a1b2/deck/page.png  ──► privileged protocol ──► <img src>
web:      bibletime-file://root-a1b2/deck/page.png  ──► IndexedDB → handle → File → URL.createObjectURL ──► <img src>
```

This keeps `MediaSlideData` build-agnostic and makes a project file portable in the weak sense it already is: opening a web-authored project on desktop shows missing media with the existing Relink action, exactly as opening a colleague's desktop project does today. It is not new breakage — it is the same breakage, unchanged.

The web resolver keeps a per-window LRU of live object URLs (~64 entries) and revokes on eviction, because `createObjectURL` leaks until revoked and a thousand-photo grid would otherwise pin every one.

**Alternative considered:** a distinct `bibletime-web://` scheme. Rejected — it would double every parse site and buy nothing, since the host id already tells the resolver which store to look in.

### 6. The `/present` window resolves references itself; object URLs never cross windows

The live-slide payload stays exactly what it is today: JSON in `localStorage` holding a `bibletime-file://` reference. The output window opens its own IndexedDB connection and mints its own object URLs. This falls out of decision 5 for free and is the reason a resolved URL must never be written into `MediaSlideData` or the live payload — a rule worth stating because writing one there would appear to work in the console window and fail only on stage.

One consequence to handle explicitly: a `directory` root's permission is granted per browsing context, so a freshly-opened `/present` window may need its own re-grant. Since that window has no UI to click, the console window requests permission at reconnect time and the output window falls back to the missing-media state with a message pointing back at the console — not a permission prompt on the projector.

**Alternative considered:** passing bytes to the output window over `BroadcastChannel`. Rejected — a 4 GB video cannot be posted, and structured-cloning a `File` per slide send would stutter exactly when it must not.

### 7. Documents on web: PDF renders, PowerPoint is listed and explained

`render-pdf-pages` already streams by URL through pdf.js and needs only two changes: get its URL from the driver, and write pages into the driver's cache instead of `window.bibletime.mediaCache`. The rest of the file — `PAGE_MAX_EDGE`, the white-fill, the yield-between-pages — is untouched, so a deck renders identically in both builds.

`.pptx`/`.ppt`/`.odp` get a new `unsupportedReason: "desktop-only"` on their `MediaEntry`, alongside the existing `"codec"`. The grid lists them greyed with "Export this deck as a PDF to use it here", and the add actions refuse them. This mirrors the HEIC/`.avi` handling `add-media-tab` chose on the grounds that "a user who cannot find the file they came for concludes the app is broken."

The Google Slides import action is hidden on web via `canImportGoogleSlides` rather than shown-and-failing. The proposal explains why a server proxy is not the answer.

### 8. Cached artifacts are quota-aware; the source files are not cached at all

The desktop cache is bounded only by disk. IndexedDB is bounded by an origin quota the browser may enforce or evict wholesale, so the `cache` store carries a soft budget (256 MB) with LRU eviction by `lastUsedAt` on write, and every read treats a miss as "render it again" — which it already does, since the cache is derived data. A `QuotaExceededError` on write is caught, triggers an eviction pass, and retries once; a second failure degrades to rendering without caching rather than failing the preview.

Source files are never copied into IndexedDB — except for `stash` roots, where the `File` *is* the only handle to the bytes. That is the one place web storage grows with the user's media, and it is the direct consequence of Safari and Firefox having no directory picker.

`contentKey(rootId, relativePath, size, mtimeMs)` works unchanged: `File.lastModified` supplies `mtimeMs` and `File.size` supplies `size`, so an edited file re-keys itself in the browser exactly as it does on disk.

### 9. Permission re-grant is a root state, not an error

A `directory` root reloads with its handle intact but its permission in `"prompt"`. `requestPermission()` requires a user gesture, so the root is shown in a `needs-permission` state with a **Reconnect** action — distinct from the existing `unavailable` state, which means the folder is gone. Selecting a `needs-permission` root shows the reconnect prompt in the grid area rather than an empty directory.

`MediaRootStatus` therefore grows from `isAvailable: boolean` to `status: "ready" | "needs-permission" | "unavailable"`, with `isAvailable` retained as a derived getter so existing call sites keep compiling.

### 10. The "All" view keeps its depth cap, and gains a concurrency cap on web

`listAllRoots` walks breadth-first to depth 3. On desktop each level is one IPC call per directory; on web it is an async iterator per directory, which is slower and unbounded in fan-out. The walk gains a concurrency limit (8 directories in flight) on both builds — it is a pure improvement on desktop too — and `stash` roots short-circuit to their flat file list.

### 11. YouTube is a slide kind, not a media entry

A YouTube link has no file, no thumbnail to rasterize, and no directory to live in, so it does not enter the browser/grid model at all. `MediaSlideKind` gains `"youtube"`, `MediaSlideData` gains `startSeconds?`, and the preview column gains an "Add from YouTube link" action next to the existing Google Slides import.

- **Parsing** accepts `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, and `/live/` forms, extracts the 11-character id, and rejects anything else with a message rather than storing a URL that will fail on stage. `src` stores the canonical `https://www.youtube.com/watch?v=<id>` and the id is derived at render time, so the stored value is the thing a user recognizes if they inspect a project file.
- **Rendering** is an `<iframe>` to `https://www.youtube-nocookie.com/embed/<id>` in the same media layer `SlidePreview` gained in `add-media-tab` decision 10 — nocookie because a presentation console has no reason to set advertising cookies on the operator's machine.
- **Playback** honors the same per-slide `loop` and `muted` fields as a local video, plus `startSeconds`. Browser autoplay policy means an unmuted embed will not autoplay; the slide starts muted-and-playing by default, matching the local-video default, and an unmuted slide shows a one-click play affordance on the output window instead of silently not starting. Loop uses the embed's `loop=1&playlist=<id>` form, which is the only way a single-video embed loops.
- **Failure states**: an embed the uploader has disabled, a removed video, and no network each surface as a named state on the slide rather than a blank frame. The console preview probes the oEmbed endpoint when the link is added so the operator learns at add-time, not on stage; a probe failure is a warning, not a rejection, since it may just be a temporary offline moment.
- **Desktop CSP and navigation** widen by exactly what the embed needs: `frame-src` for `https://www.youtube-nocookie.com`, and the `will-navigate`/`setWindowOpenHandler` guards continue to refuse everything else, so a click inside the embed cannot navigate the app window.

**Alternative considered:** downloading the video for offline playback. Rejected — it violates YouTube's terms, and this change is a viewer.

### 12. No feature flag, no migration

Feature detection is the gate: a build with the Electron bridge gets the desktop driver, a browser with `showDirectoryPicker` gets directory roots, and a browser without it gets the stash. There is no stored state to migrate, because there is no existing web media state — the tab was inert.

## Risks / Trade-offs

- **Browser quota eviction wipes a web user's roots and stash** → Handles and favorites are tiny and stored separately from the budgeted `cache` store, so the common eviction path costs only derived data. The app requests `navigator.storage.persist()` once, when the first root is added, which on Chromium is granted silently for an installed/engaged origin. If the `sources` store is nevertheless empty on load, the explorer shows its normal empty state — data loss here is annoying, never corrupting, since no file on disk is touched.
- **The reconnect click is friction on every reload for `directory` roots** → It is one click for all roots at once, requested at the first media interaction rather than on app load, so a user who never opens the Media tab never sees it. `navigator.storage.persist()` and Chromium's per-origin permission memory reduce how often it appears; it cannot be eliminated, and pretending otherwise would mean a silently-broken tab.
- **Safari and Firefox users get a materially weaker feature** → Stated in the UI, not hidden: the stash root's empty state says "your browser can't open a whole folder — add files instead", so the limit reads as a browser fact, not an app defect. The alternative, gating the tab to Chromium, was rejected as strictly worse for the "view a PDF and a couple of photos" case, which the stash handles well.
- **A big stash grows browser storage without the user realizing** → The explorer shows a stash root's total size, and removing a root deletes its stashed files. Directory roots — the recommended path where available — store nothing.
- **A thousand-photo grid leaks object URLs** → Bounded LRU with explicit revocation (decision 5), and the existing windowing means only visible tiles resolve.
- **YouTube embeds break offline, and this app is used in buildings with bad Wi-Fi** → The add-time oEmbed probe warns early, the slide states are named rather than blank, and a local video remains the recommended path for anything that must play. Nothing else in the app gains a network dependency.
- **The driver refactor touches every media service, and the desktop path is the one people already rely on** → The desktop adapter is the existing bridge code moved behind the interface with no logic change, which keeps the diff mechanical and reviewable; the migration plan below verifies desktop before web.
- **`showDirectoryPicker` requires a secure context** → Localhost and HTTPS both qualify, so this affects only a plain-HTTP deployment, which the app should not have anyway. The capability flags degrade it to the stash if it happens.

## Migration Plan

1. **Introduce the port with only the desktop adapter.** Move the four `bridge()` helpers behind `MediaAccessDriver`, keep behavior identical, and confirm the desktop build is unchanged. This is the riskiest step for existing users and the only one that touches code they already depend on.
2. **Add capability flags** and replace the `isMediaAvailable()` boolean at each call site — still desktop-only in effect, since the web driver does not exist yet.
3. **Add the web adapter** (IndexedDB stores, directory roots, stash roots, reference resolution) and let the tab render on web. The desktop path is untouched from here on.
4. **Wire PDF rendering and thumbnails to the driver cache**, and mark `.pptx`/`.ppt`/`.odp` `desktop-only` on web.
5. **Add the YouTube kind** — core interfaces, URL parsing, the preview-column action, the render layer, and the desktop CSP widening.

**Rollback:** each step is independently revertable. Reverting step 3 alone restores the "requires the desktop app" state without disturbing the refactor; the YouTube kind in step 5 is additive and independent of everything before it. No stored data is written in a new format at any step, so a rollback strands nothing.

## Open Questions

- Should a `stash` root's files count against a visible storage budget with a warning before the browser complains, or is showing the total size enough? Deferring: the answer depends on how large real stashes get, and the size display is enough to learn that from.
- Is `startSeconds` alone the right YouTube control, or do operators need an end time to cut a clip? An end time needs a player-API polling loop rather than an embed parameter, so it is deliberately deferred to its own change.
- Should the web build offer "Add as folder" for a stash of loose files, the way a directory selection does today? Currently it does, named after nothing in particular; a better name may be worth asking the user for at add-time.
