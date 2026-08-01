## Context

The `bible` module currently loads exactly one bundled translation. `services/get-bible-data.ts` does a single hardcoded `fetch('/bible-data/rvr1960.json')` and caches the result in a module-level singleton; there is no notion of "which version" anywhere in the data-loading path. `services/get-bible-versions.ts` and `use-get-bible-versions.ts` already exist but are stubs that just wrap the one loaded translation into a `BibleVersionSummary[]` of length 1. `bible-version-selector.tsx` already renders a real `Select` dropdown wired to this hook, defaulting to `versions[0]`.

The real, public catalog this app was built against is `https://mrk214.github.io/snapshots/data.json` — confirmed live this session: `{ available_versions: [{ version_id, local_abbreviation, local_title, json_url, book_count, lang_name, lang_key, lang_info, source_repo_url, source_repo_name }] }`, currently 26 entries (7 English, 12 Spanish, 7 Portuguese). The bundled `rvr1960.json` is verified to be `version_id: 149` from this exact catalog (`json_url: https://mrk214.github.io/snapshots/es___spa___spa/RVR1960_vid_149.json`), pre-fetched and stripped of `chapter_html` at build time by the existing `build-bible-data.ts` script. Every other catalog entry's `json_url` serves a `BibleVersion`-shaped JSON with `chapter_html` still present (uncompressed, larger than the bundled file).

`apps/bibletime` (the renderer) is dual-shipped: as a plain web app, and as the view loaded into `apps/desktop`'s Electron `BrowserWindow` (`contextIsolation: true`, `nodeIntegration: false`). Today `apps/desktop/src/preload.ts` exposes only a placeholder (`window.bibletime = { versions: process.versions }`); there are no `ipcMain`/`ipcRenderer` channels anywhere in the repo. The renderer therefore has zero filesystem access — any real "write this to a persistent local folder" capability must live in the Electron main process and be exposed through new IPC.

## Goals / Non-Goals

**Goals:**
- Let the user browse the full 26-version remote catalog from within the app, grouped by language, independent of what (if anything) is downloaded.
- In the desktop app, let the user download a chosen version's full data to a persistent local folder and read it back with no network access required afterward.
- Clearly distinguish, per version, "bundled/always offline" (RVR1960), "downloaded" (fetched once, on disk), "available" (in the catalog, not yet fetched), and transient "downloading" / "error" states.
- Let the user delete a downloaded version to reclaim disk space.
- Degrade gracefully to catalog-browse-only (no persistence) when there is no Electron bridge (plain web build).

**Non-Goals:**
- Web-build offline persistence (e.g. IndexedDB/Cache API) — explicitly desktop-only per this change's scope; a future change can add a browser-side offline store using the same catalog/download service abstractions if needed.
- Electron packaging/distribution (electron-builder, auto-update) — out of scope; this change only adds IPC + a userData folder, assuming the app is already runnable via `apps/desktop`'s existing `dev`/`start` scripts.
- Background/automatic downloads, download queuing, or partial/resumable downloads — a version download is a single foreground fetch-then-write; if it fails, the user retries.
- Changing how the bundled RVR1960 loads — it keeps working exactly as `view-local-bible` built it, with no download step.
- Search/filter across catalog versions beyond grouping by language — not requested.

## Decisions

### Catalog fetch: replace the stub, don't extend it
`services/get-bible-versions.ts` currently derives its list from the one loaded `BibleVersion`. Replace its implementation with a fetch against `https://mrk214.github.io/snapshots/data.json`, mapped to an extended `BibleVersionSummary`. The existing `use-get-bible-versions.ts` query hook keeps its shape (`useQuery(["bible","versions"])`) — only the service body changes, per the one-file-per-service convention.
- **Alternative considered**: keep deriving the list from bundled/downloaded data only, and treat "browse the catalog" as a separate capability/hook. Rejected — the whole point is to show *available-but-not-downloaded* versions in the same list as downloaded ones, so a single summary list with a status field is simpler for the UI than reconciling two lists.
- **Alternative considered**: bundle a static copy of `data.json` at build time (like the RVR1960 data) instead of fetching it live. Rejected — the catalog is expected to gain versions over time and is small (a few KB), unlike the multi-MB per-version data; fetching it live costs one small request and always reflects the real remote repo. If offline catalog browsing turns out to matter, cache the last-fetched catalog response (see Open Questions).

### Local storage layout (desktop): one folder, one file per version + a manifest
All downloaded version data lives under `app.getPath("userData")/bible-versions/`:
```
bible-versions/
├── manifest.json           # { downloads: [{ versionId, localAbbreviation, localTitle, jsonUrl, downloadedAt, bytes }] }
└── <versionId>.json        # the full BibleVersion payload for that version, as downloaded
```
The manifest is the source of truth for "what's downloaded" (cheap to read for a list/status check); the per-version files are only read in full when that version is actually selected for reading. `versionId` (the catalog's numeric `version_id`) is the filename key since it's stable and unique across the whole catalog (unlike `local_abbreviation`, which repeats — e.g. two different `NVI` entries for Spanish and Portuguese).
- **Alternative considered**: infer "downloaded" purely from `fs.readdir` + filename parsing, no manifest. Rejected — a manifest lets the list/status view avoid touching the filesystem's directory listing on every render and stores metadata (title, download timestamp) that isn't recoverable from a bare `<versionId>.json` filename alone.
- **Alternative considered**: one SQLite/LevelDB store instead of loose files. Rejected — adds a new dependency for a handful of large, rarely-updated JSON blobs; plain files match the existing bundled-asset precedent (`rvr1960.json`) and need no migration tooling.

### IPC surface: a small, explicit channel set behind one `contextBridge` namespace
Replace `apps/desktop/src/preload.ts`'s placeholder with:
```ts
contextBridge.exposeInMainWorld("bibletime", {
  bibleVersionDownloads: {
    list(): Promise<DownloadedVersionMeta[]>
    download(input: { versionId: number; jsonUrl: string; localAbbreviation: string; localTitle: string }): Promise<DownloadedVersionMeta>
    read(versionId: number): Promise<BibleVersion>
    remove(versionId: number): Promise<void>
  }
})
```
backed by `ipcMain.handle("bible-version-downloads:list" | ":download" | ":read" | ":remove", ...)` in `main.ts`. The main process does the actual `fetch(jsonUrl)` (Node 20+ global `fetch`) and `fs.promises.writeFile`/`readFile`/`unlink`, plus manifest read/update, so the renderer never needs Node APIs directly — consistent with `contextIsolation: true`/`nodeIntegration: false`.
- **Alternative considered**: fetch the version JSON in the renderer (it already has network access) and pass the parsed object over IPC just to be written to disk. Rejected — these payloads can be several MB; serializing them across the IPC boundary twice (renderer fetch → structured-clone to main → write) is wasteful compared to fetching directly in the main process, which also keeps the "network use" and "disk use" concerns in one place.
- **Alternative considered**: one generic `invoke("fs:*", ...)` passthrough channel. Rejected — an unscoped filesystem bridge from renderer to main is a real sandbox-escape risk; explicit, narrow channels (only Bible-version download operations, only under one dedicated folder) keep the attack surface small.

### Renderer-side feature detection: one small bridge service, not scattered `window.bibletime` checks
Add `services/bible-version-downloads.ts` exporting functions that check `typeof window !== "undefined" && window.bibletime?.bibleVersionDownloads` once and either delegate to the bridge or return a "not supported here" result (e.g. `{ supported: false }` / throwing a typed `DownloadsUnsupportedError` that calling code treats as "hide the button"). All call sites (the selector component, the data-loading service) go through this one service instead of touching `window.bibletime` directly.
- **Alternative considered**: a global `isElectron()` flag checked ad hoc wherever needed. Rejected — centralizing the capability check in the service layer matches the existing screaming-architecture rule (services own external-boundary access) and gives one place to update if the bridge shape changes.

### Data loading: version-aware, downloaded-first
`get-bible-data.ts` changes from a hardcoded fetch to accepting a `BibleVersionSummary`-like selection:
- If it's the bundled default (RVR1960, `version_id: 149`) → existing static-asset fetch, unchanged, always works offline.
- If it's downloaded locally (per the manifest) → read via `bible-version-downloads` service (`read(versionId)`), fully offline.
- Otherwise (catalog-only, not downloaded) → fetch `json_url` directly over the network for on-the-spot viewing, without persisting; only available when online, and only surfaced as an option where it makes sense (desktop: "preview without downloading"; web: this is the only mode available for non-bundled versions).
The in-memory per-session cache (module-level singleton) becomes keyed by `version_id` instead of a single unkeyed value, so switching between versions during a session doesn't re-fetch/re-read repeatedly.
- **Alternative considered**: always require downloading before a version can be viewed at all (desktop) and disable non-bundled versions entirely on web. Rejected — needlessly restrictive; browsing a translation once online, without committing to permanent local storage, is a reasonable and cheap capability to keep, and it's exactly what happens today implicitly (a `fetch` per read) before this change adds explicit persistence on top.

### UI: status-aware version list, not just a dropdown
`bible-version-selector.tsx` grows from a flat `Select` into a per-language `Accordion` of `Card`s (using the newly-added `packages/ui` primitives), each showing a `Pill` for its status (`Bundled`, `Downloaded`, `Available`, `Downloading…`, `Error`) and a contextual action (Download / Remove / Use). The existing `Select`-based compact picker can remain as the "currently active version" control elsewhere in the console; the new status list is where download/remove actions live. Exact layout is left to implementation as long as it uses these primitives and both views end up sourced from the one `useGetBibleVersions` query plus per-version local download status.

## Risks / Trade-offs

- **[Risk]** The catalog and every non-bundled version's data live on a third-party GitHub Pages site (`mrk214.github.io`) with no SLA → **Mitigation**: catalog fetch and download both fail closed with a visible error state per version; the bundled RVR1960 never depends on this site, so the app's core offline promise is unaffected if it's ever unreachable.
- **[Risk]** Non-bundled version JSON files still include `chapter_html` (unlike the trimmed bundled asset), so downloads are larger than they need to be → **Mitigation**: acceptable for v1 since it's a one-time per-version download the user opts into; revisit stripping `chapter_html` post-download (write only the trimmed shape to disk) if download size/storage becomes a real complaint.
- **[Trade-off]** Manifest + per-file layout has no schema migration story if the format changes later → accepted for v1 (small, greenfield data); a version field on the manifest (`manifestVersion`) is cheap insurance, add it during implementation.
- **[Risk]** A version download failing partway through (process killed mid-write) could leave a corrupt `<versionId>.json` that the manifest still lists as downloaded → **Mitigation**: write to a temp file in the same folder and rename into place only on success (atomic on the same filesystem), and only add the manifest entry after the rename succeeds.

## Open Questions

- Should the remote catalog response be cached to disk (desktop) so the version *list* itself is browsable offline, even before any individual version is downloaded? Deferred — start with a live fetch; revisit if users hit the "no catalog when offline" case in practice.
- Should downloaded, non-bundled versions get the same `chapter_html`-stripping treatment as the bundled asset to save disk space? Deferred per the Risks section above — implement plain-passthrough first, measure real file sizes, revisit if needed.
- Does the web (non-Electron) build need any UI affordance beyond simply hiding download controls (e.g. an explicit "offline downloads require the desktop app" note)? Left to implementation/UX judgment; not a technical blocker.
