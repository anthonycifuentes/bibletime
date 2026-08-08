## Context

The console shell (`ConsoleView`) is a fixed four-region layout: header, folder-tree sidebar, slide console, preview panel, and a bottom drawer whose tab strip switches content-source browsers. The Bible tab (`BiblePickerPanel`) is the reference implementation — columns, a `SlideFrame` preview, a template `Select`, and explicit "Convert to slide" / "Present" actions that append items to the currently open Library folder. `add-songs-tab` builds the Songs tab on the same grammar. Media is the last `PlaceholderPicker`.

Five existing facts constrain this design:

1. **`FolderItem` is a tagged union with a `media` arm already in it.** `MediaItemData` is a `{ title, mediaType }` stub and `resolveFolderItemContent` returns a hardcoded placeholder for it. Folders, drag-and-drop reordering, template application, and project export already handle `media` items generically — only the *data* and the *resolution* are missing. Folder storage does not change.
2. **Persistence is one-JSON-file-per-entity via Electron IPC, with a localStorage twin for the web build.** Templates, library folders, projects, and Bible versions all follow this: a `*StorageDriver` interface in the module's `interfaces/`, a `desktop-*`/`web-*` pair, and a `get*Storage()` platform pick. There is no database and no index file — the directory listing *is* the index.
3. **Slide content is denormalized at add-time.** `BiblePassageItemData` stores `text`/`reference`/`versionAbbreviation` on the item so a slide renders without re-querying, and an exported `ProjectFile` is self-contained. `add-songs-tab` does the same for lyrics.
4. **A privileged custom scheme already exists.** `bibletime-media:///<file>` serves template video backgrounds out of a managed `template-media/` directory, registered via `protocol.registerSchemesAsPrivileged` at module load and guarded by `templateMediaPath`, which resolves a reference and rejects anything whose parent isn't exactly that directory.
5. **`SlidePreview` renders text over a template-derived background** — a color, gradient, image, video element, or animated shader. It has no concept of foreground content that isn't text.

Media breaks fact 3 in a way songs and verses do not: the content is a file that already exists on the user's disk, often measured in gigabytes. Denormalizing it into the folder record is not an option. That single asymmetry drives most of what follows.

## Goals / Non-Goals

**Goals:**

- Browsing the user's existing photo/video/deck folders feels like a file browser, not an import wizard — nothing is copied, nothing is uploaded, and adding a 4 GB video is instant.
- A sermon deck (PDF, PowerPoint, or Google Slides) becomes an ordered set of slides in one action, with a folder to hold them.
- A media slide renders identically in the slide console, the preview panel, and the `/present` output window, through the same `SlidePreview` every other slide type uses.
- The Media tab reuses the Bible/Songs interaction grammar — browse → select → preview → explicit add — so there is one thing to learn.
- The grid stays responsive on a directory holding a thousand photos.
- Every failure the user can hit (LibreOffice missing, deck not shared, file moved, codec unsupported) has a named, actionable state — never a spinner that never resolves or a broken image.

**Non-Goals:**

- Online media providers (YouTube, Vimeo, Pixabay, Unsplash), screen capture, and camera input — visible in the reference UI, each a separate change.
- Live-embedded Google Slides. Imports are snapshots.
- Audio files. Audio is its own tab in the target design.
- Video transport controls, trimming, in/out points, or playback scrubbing on the output window.
- Image editing, cropping, or color adjustment.
- Filesystem watching. Directory contents refresh on navigation and on an explicit Refresh.
- Any web-build support (see Decision 9).

## Decisions

### 1. Every non-image, non-video file becomes a PDF; every PDF becomes page images

This is the load-bearing decision. Three superficially different formats collapse into one pipeline:

```
.pptx / .ppt / .odp ──(LibreOffice)──┐
Google Slides URL ───(export/pdf)────┼──► PDF ──(pdf.js)──► page-0001.png … page-NNNN.png
.pdf ────────────────────────────────┘
```

Downstream of the PNGs there is exactly one code path: a `document-page` media item is an image slide that happens to know which document and page it came from. The slide console, preview panel, `/present` output, project export, and drag-and-drop reordering need no knowledge of PDF, OOXML, or Google.

Animations, slide transitions, embedded video, and speaker notes are lost. The user explicitly accepted this. The compensating property is worth stating plainly: **what the operator previewed is bit-for-bit what gets projected**, with no runtime renderer that can behave differently on the output display than it did in the preview — which is precisely how live presentation goes wrong with an embedded deck.

*Alternative considered:* render decks live in an embedded browser view or a PPTX-to-HTML renderer. Rejected — fidelity is unpredictable, it introduces a second rendering surface that can fail on stage, and per-page slides in the running order become impossible.

### 2. Rasterizing happens in the renderer; the main process only touches the filesystem, spawns, and the network

A single rule that avoids every native module this change would otherwise need:

- **PDF pages** — `pdfjs-dist` in the renderer, rendered to a canvas. In the main process it would need `@napi-rs/canvas` or `node-canvas`: a native build, per-platform prebuilds, and a rebuild step in the Electron packaging pipeline.
- **Image thumbnails** — `createImageBitmap` + canvas `drawImage` + `toBlob`. No `sharp`, no `jimp`.
- **Video thumbnails** — a detached `<video>` element seeked to ~1s, drawn to a canvas. No `ffmpeg` binary to bundle, license, or codesign.

The renderer hands the resulting bytes to `media-cache:write` for persistence. The main process keeps the three jobs only it can do: reading directories, resolving and serving files through the custom protocol, spawning LibreOffice, and fetching the Google Slides export (which must bypass CORS).

*Trade-off:* rasterizing on the renderer thread can jank the UI. Mitigated by capped concurrency (Decision 7) and by doing image/video thumbnailing through `createImageBitmap`, which decodes off the main thread.

### 3. Files are referenced root-relative through one new privileged scheme

References are `bibletime-file://<rootId>/<relative-path>`, not absolute paths.

Registered roots live in `<userData>/media-sources.json` as `{ id, label, path, addedAt }`. The protocol handler resolves `rootId` to its *current* absolute path, joins the relative path, and rejects the request unless the resolved path is still inside that root — the same containment check `templateMediaPath` performs, generalized from "exactly this directory" to "anywhere under this root". A `..` sequence, a symlink escape, or an unregistered root id all yield a 404, so a saved folder file can never be used to read arbitrary disk.

Root-relative references buy one concrete property: when the user moves their `Media/` folder to an external drive and repoints the root, every slide that referenced it keeps working with no rewrite of any folder JSON. Absolute references would need a migration pass over every folder file in every project.

Derived artifacts use the reserved host `cache`: `bibletime-file://cache/<contentKey>/page-0007.png`, resolved against `<userData>/media-cache/` under the same guard. Root ids are generated as `root-<random>`, so `cache` cannot collide with one.

*Alternative considered:* extend the existing `bibletime-media` scheme. Rejected — its guard is deliberately flat-directory-only and serves template assets the app itself wrote; widening it to arbitrary user paths would weaken an existing security boundary to save one scheme registration.

*Alternative considered (and rejected by the user's decision):* copy every added file into managed storage. Self-contained and immune to moves, but duplicates the user's video library and makes adding a large file a progress bar.

### 4. The cache is keyed by content identity, so it invalidates itself

`contentKey = sha256(rootId + relativePath + size + mtimeMs).slice(0, 16)`, and every derived artifact for a file lives in `media-cache/<contentKey>/`. Editing a deck and re-exporting it changes `mtimeMs`, which changes the key, which means the next preview generates fresh pages instead of showing yesterday's. Nothing needs to detect the edit; the old directory simply becomes unreferenced.

Unreferenced cache directories are reclaimed by an explicit "Clear media cache" action in Settings' storage panel — not by a background sweeper, which would have to distinguish "unreferenced" from "referenced by a project that isn't currently open", a question the app cannot answer cheaply.

*Alternative considered:* key by file path alone and store `mtime` in a sidecar to compare. Rejected — same information, one more file to keep in sync, and a stale sidecar produces a wrong render rather than a cache miss.

### 5. Deck conversion is triggered by selection, not by adding

The user asked for files to be converted "when I select the files". Selecting a `.pptx` in the grid starts conversion immediately and the preview column shows a page-count and a first-page render as soon as it lands; adding then costs nothing because the pages already exist.

Conversion runs `soffice --headless --convert-to pdf --outdir <cacheDir> <file>` with the resolved absolute path, discovered at runtime by probing PATH plus the platform's standard install locations (`/Applications/LibreOffice.app/Contents/MacOS/soffice`, `C:\Program Files\LibreOffice\program\soffice.exe`, `/usr/bin/soffice`, `/usr/lib/libreoffice/program/soffice`). The probe result is cached for the session and surfaced in Settings as "PowerPoint conversion: available / not installed".

When LibreOffice is absent, the file is still listed and selectable and the preview column shows an actionable state naming both remedies — install LibreOffice, or export the deck to PDF from PowerPoint. It is never silently hidden from the grid, because a user who can't find their file assumes the app is broken.

*Alternative considered:* bundle LibreOffice, or a headless converter binary. Rejected — hundreds of megabytes, per-platform codesigning and notarization, and LGPL obligations, all to serve a format the user can already export from.

*Alternative considered:* convert on add. Rejected — the user would be adding pages sight-unseen, and a 90-slide deck that turns out to be the wrong file costs a folder full of slides to undo.

### 6. Google Slides is imported through the public export endpoint, as a snapshot

`google-slides:export` extracts the deck id from any Google Slides URL form, fetches `https://docs.google.com/presentation/d/<id>/export/pdf` from the main process, and **verifies the response is actually a PDF** — checking `Content-Type` and the `%PDF-` magic bytes, because a deck without link sharing returns HTTP 200 with a Google login page. That check is the difference between a clear "this deck isn't shared — enable link access, or download it as PDF" and a mystifying corrupt-file error.

The fetch happens in main for two reasons: CORS makes the endpoint unreachable from a renderer, and the redirect chain needs following without a browser's opaque-response rules.

The imported deck is a snapshot in the cache, keyed by deck id plus fetch timestamp, with a **Re-import** action to fetch again. It is not a live link: a deck that changes ten minutes before the service should not change what the operator already reviewed.

*Alternative considered:* OAuth against the Google Slides API to reach private decks. Rejected for this change — a client id, a consent screen, a token store, and a refresh path, all so the user can skip clicking "anyone with the link". Additive later if it's actually wanted.

### 7. The grid is windowed, and thumbnailing is lazy and capped

A thousand-file directory renders as a windowed grid; only visible tiles mount. Each tile requests its thumbnail through an `IntersectionObserver`, and requests go through a small queue with a fixed concurrency (4) so a fast scroll can't launch 300 simultaneous decodes. Requests for tiles scrolled out of view before they start are dropped from the queue rather than completed.

Cached thumbnails are served straight from `bibletime-file://cache/...` by the protocol handler, so a second visit to a directory is a plain image load with no JavaScript in the path.

### 8. `MediaItemData` carries a reference, and that is the honest exception to denormalization

```ts
export type MediaKind = "image" | "video" | "document-page"

export interface MediaItemData {
  title: string
  mediaType: MediaKind
  /** A `bibletime-file://<rootId>/<path>` reference — the file is never copied. */
  src: string
  /** Natural pixel dimensions at add-time, so the console can size a tile before the file loads. */
  width?: number
  height?: number
  /** How the media fills the slide frame. @default "contain" */
  fit: "contain" | "cover"
  /** Video only. */
  loop?: boolean
  muted?: boolean
  durationMs?: number
  /** `document-page` only — the source document's content key, its 0-based page, and the deck's total pages. */
  documentId?: string
  pageIndex?: number
  pageCount?: number
}
```

Every other slide type denormalizes its content onto the item. A media item cannot: the content is the file. What *is* denormalized is everything needed to render the item's chrome without touching disk — title, kind, dimensions, duration, page position — so the slide console draws a correct, correctly-sized tile even when the underlying file is missing.

*Consequence:* an exported `ProjectFile` opened on another machine has media items whose references don't resolve. They render as **missing** with a **Relink** action (point at the file or its new root) rather than vanishing — which is strictly better than the alternative, where a project export silently drops half a service order. Bundling media into the export is a real follow-up change, and a large one; it is out of scope here.

### 9. The Media tab is desktop-only, with no web twin

Songs, templates, projects, and library folders all ship a `web-*` localStorage driver so the web build stays usable. Media does not, and the asymmetry is principled rather than lazy: those drivers store kilobytes of JSON the user authored in-app. A media library is a *view onto the user's filesystem*, which the web build has no access to, and its payload is gigabytes of video, which `localStorage` cannot hold under any design.

On web the tab renders one clear state: this feature needs the desktop app. Half-implementing it — session-scoped `File` objects from a file input that vanish on reload, and slides whose references break the moment the tab closes — would be worse than not shipping it there.

### 10. `SlidePreview` gains a media layer, rather than media getting its own renderer

A media slide goes through the same `SlidePreview` as every other slide, with a new layer stacked above the template background and below the text layer:

```
template background (color / gradient / image / video / shader)
  └─ media layer            ← new: <img> or <video>, object-fit from `fit`
       └─ text layer        ← empty for a plain media slide
```

This is one component change instead of a parallel `MediaFrame`, and it means aspect-ratio letterboxing (`SlideFrame`/`useSlideFit`), the console's thumbnail scaling, and the output window's `/present` route all work on media for free. It also leaves the door open, at zero extra cost, to text over an image — a lower-third or a title over a photo — which is a thing every presentation app eventually needs.

Video on the output window autoplays muted-by-default with per-item `loop`, and restarts from zero each time the slide is sent, so re-sending a countdown restarts the countdown. Muted-by-default is deliberate: an operator who wants sound opts in per item, rather than being surprised by it in a quiet room.

### 11. Adding reuses `createFolder`'s atomic initial-items write

`useLibrary.createFolder(name, parentId, insertAt, initialItems)` already writes a folder and its items in a single `storage.save`, and exists precisely for this class of problem — its own comment notes that adding items afterward would race against the folder not existing in the closed-over snapshot. "Add as folder" is one call: the deck's or directory's name, one `media` item per page or file as `initialItems`.

Parenting matches `add-songs-tab`: child of the open folder if one is open (or a sibling if that folder is already at the 3-level nesting cap), otherwise root. "Add" and "Add all" with no folder open create a root folder holding the items, matching `convert-to-slide-root-fallback`.

### 12. No filesystem watcher in this change

Directory contents load on navigation and on an explicit Refresh. A watcher (`fs.watch`/`chokidar`) over a photo library means recursive watches, per-platform inconsistency, editor temp-file churn, and a debouncing layer — real work, for a payoff of "the grid updates when you add a file in Finder while the app is open". The Refresh button covers it until the annoyance is demonstrated.

## Risks / Trade-offs

- **A referenced file moves, is renamed, or lives on an unmounted drive, and the slide breaks mid-service.** → This is the price of not copying, and it is mitigated rather than eliminated: a missing item renders a labeled missing state with its title, kind, and page position still visible (Decision 8), never a blank slide or a broken-image icon; a **Relink** action repoints it; and because references are root-relative (Decision 3), the common case — the whole folder moved — is fixed once at the root rather than per slide.
- **LibreOffice is absent on the user's machine**, so PowerPoint decks can't be converted. → Named, actionable state offering both remedies, plus a status line in Settings so the user learns this before Sunday rather than during it. PDF and Google Slides paths are unaffected.
- **LibreOffice conversion is slow** — tens of seconds for a large deck — and blocks the preview. → Conversion is kicked off on selection rather than on add (Decision 5), runs in the main process off the UI thread, reports progress, is cancelable by selecting something else, and its output is cached so it happens once per file version.
- **Spawning an external binary is an attack-surface and a reliability risk.** → `soffice` is resolved from a fixed probe list, never from user input; arguments are passed as an array (no shell); the input path is one already resolved through the root-containment guard; the process runs with a timeout and its failure is a normal error state.
- **The custom protocol serves files off the user's disk.** → Every request is resolved root-relative and rejected unless the fully-resolved real path is still inside a registered root or the cache directory, which also stops `..` traversal and symlink escapes. Unregistered root ids 404. The renderer never sees or sends absolute paths.
- **Chromium can't decode every video the user owns** — `.avi`, `.wmv`, HEVC-in-`.mov`, and HEIC images will not play or render. → Supported extensions are an explicit allowlist; a recognized-but-unplayable file is listed with a clear "not supported — convert to MP4/H.264" note instead of appearing to work and then showing black on the output display.
- **Renderer-side rasterization can jank the UI** on a large PDF or a fast scroll through a big directory. → Capped concurrency with a drop-on-scroll-past queue (Decision 7), `createImageBitmap` for off-thread decode, and page rendering that yields between pages rather than looping straight through a 90-page deck.
- **The media cache grows without bound** — a few hundred MB after a season of decks. → Content-keyed so it never double-stores a version, and reclaimable through an explicit "Clear media cache" action with its size shown. No background sweeper, which could not safely distinguish unreferenced from not-currently-open (Decision 4).
- **Project export doesn't carry media**, so a project opened on another machine has unresolvable references. → Documented and visible (missing state + Relink) rather than silent. Bundling media into the export is a clean follow-up change.
- **A Google Slides import is a snapshot and can go stale.** → Intentional (Decision 6); the preview shows the fetch time and a Re-import action is one click.
- **This change depends on `add-songs-tab` landing first** for the `library-folders` delta to apply cleanly, and both changes delete the last call sites of `PlaceholderPicker`. → Called out in the proposal; if the order flips, this change's delta must also drop `song` from the placeholder requirement, and whichever lands second deletes the component.

## Migration Plan

No data migration is required.

- `MediaItemData`'s shape changes, but no real `media` item can exist in anyone's storage: the UI never exposed a way to create one (`BottomDrawer` renders a placeholder for the Media tab and provides no add path). The union arm was forward-declared, not used.
- `Folder`, `Project`, and `ProjectFile` shapes are untouched, so existing library folders, projects, and exported project files load unchanged.
- `media-sources.json` and `media-cache/` are created lazily on first use, matching `ensureTemplatesDir` / `ensureLibraryDir`.
- The `bibletime-file` scheme must be registered via `protocol.registerSchemesAsPrivileged` at module load, before `app.whenReady()` — the same constraint `bibletime-media` already documents in `main.ts`.
- Rollback is reverting the change: no existing file on disk is rewritten, and `media-sources.json` / `media-cache/` are left orphaned and ignored. Any `media` items a user created before a rollback fall back to the placeholder branch they render today.

## Open Questions

- Should "Add as folder" for a deck **open** the created folder immediately? Leaning yes, matching `convert-slide-creates-root-folder` and `add-songs-tab`'s inclination — the user should see the 40 slides they just created.
- Should the default `fit` be `contain` or `cover`? Leaning `contain`, since clipping a sermon slide's text is worse than letterboxing a photo, with a per-item toggle in the preview column either way.
- Should a document's pages be addable **individually** (drill in, pick page 12) as well as wholesale? Planned yes — the drill-in view already exists for preview, so per-page add is nearly free — but it is the first thing to cut if the change gets too large.
- Should Favorites be per-project or global? Leaning global, like the song and template libraries: a favorite background loop is repertoire, not service content.
- Does the missing/relink state deserve a project-level "find all missing media" pass, rather than only surfacing per slide? Probably, and it is a good small follow-up once real projects start moving between machines.
