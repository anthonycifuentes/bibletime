## 1. Desktop: local storage + IPC bridge

- [x] 1.1 In `apps/desktop/src`, add a small module that resolves the local downloads folder (`app.getPath("userData")/bible-versions/`) and reads/writes `manifest.json` (`{ manifestVersion, downloads: [{ versionId, localAbbreviation, localTitle, jsonUrl, downloadedAt, bytes }] }`), creating the folder/manifest on first use.
- [x] 1.2 Implement `list()`: read the manifest and return the array of downloaded-version metadata.
- [x] 1.3 Implement `download({ versionId, jsonUrl, localAbbreviation, localTitle })`: `fetch(jsonUrl)`, write the response to a temp file in the same folder, rename it to `<versionId>.json` on success, then append/update the manifest entry only after the rename succeeds; surface a typed error on network or write failure without touching the manifest.
- [x] 1.4 Implement `read(versionId)`: read and parse `<versionId>.json`, throwing a typed "not downloaded" error if the file or manifest entry is missing.
- [x] 1.5 Implement `remove(versionId)`: delete `<versionId>.json` and its manifest entry; no-op (or typed error) if it wasn't downloaded.
- [x] 1.6 Register `ipcMain.handle` for `bible-version-downloads:list|download|read|remove` in `apps/desktop/src/main.ts`, delegating to the module above.
- [x] 1.7 Replace the placeholder `contextBridge.exposeInMainWorld("bibletime", { versions: process.versions })` in `apps/desktop/src/preload.ts` with the `bibleVersionDownloads` namespace (`list`, `download`, `read`, `remove`) wrapping `ipcRenderer.invoke`. (Kept the existing `templates` namespace alongside it, added by other in-flight work.)

## 2. Renderer: interfaces and catalog service

- [x] 2.1 Extend `apps/bibletime/src/modules/bible/interfaces/index.ts`: add catalog fields (`BibleVersionCatalogEntry`) and a `BibleVersionStatus` union (`"bundled" | "downloaded" | "available" | "downloading" | "error"`) to `BibleVersionSummary`, plus `json_url` for downloading.
- [x] 2.2 Replace the stub body of `services/get-bible-versions.ts` with a fetch against `https://mrk214.github.io/snapshots/data.json`, mapped to the extended `BibleVersionSummary[]`, marking the bundled RVR1960 entry (`version_id: 149`) as `"bundled"`.
- [x] 2.3 Confirm `actions/queries/use-get-bible-versions.ts` still fits the new service return shape; adjust its query key/typing if needed (no behavior change otherwise).

## 3. Renderer: download bridge service

- [x] 3.1 Add `services/downloads/` (desktop/web driver pair + factory), matching the existing `templates` module's `TemplateStorageDriver` pattern exactly rather than inventing a new one — `getBibleVersionDownloads()` picks the Electron-backed driver when `window.bibletime?.bibleVersionDownloads` is present, else a web driver with `canDownload: false` that throws descriptive errors on write.
- [x] 3.2 Add `actions/use-bible-version-downloads.ts`: a `useState`/`useCallback` hook (mirroring `use-templates.ts`, not react-query, since this is local/driver-backed state) exposing `downloaded`, `canDownload`, `downloadingIds`, `errorIds`, `download`, `remove`.
- [x] 3.3 Update `services/index.ts` to re-export the new `downloads` folder per the one-file-per-service convention.

## 4. Renderer: version-aware data loading

- [x] 4.1 Update `services/get-bible-data.ts` to accept a `BibleDataSource` (`bundled` / `downloaded` / `network`) and branch accordingly; added `resolveBibleDataSource(version?)` to derive it from a `BibleVersionSummary`.
- [x] 4.2 Changed the in-memory cache from a single unkeyed singleton to a `Map` keyed by source (`bundled` / `downloaded:<id>` / `network:<id>`).
- [x] 4.3 Threaded the active version through `use-get-books.ts`, `use-get-book.ts`, `use-get-chapter.ts`, and `bible-console-view.tsx`; added a `version` search param on the `/bible` route (absent = bundled RVR1960), preserved across book/chapter/verse navigation.

## 5. Renderer: version list + download UI

- [x] 5.1 Reworked `components/bible-version-selector.tsx` into a per-language `Accordion` (grouped by `lang_name`) with `Pill`-style status text (Incluida / Descargada / Disponible en línea / Descargando… / Error al descargar), sourced from `useGetBibleVersions` with the live downloading/error state overlaid by the view.
- [x] 5.2 Wired Download (`Descargar`) and Remove (`Quitar`) actions to `useBibleVersionDownloads`'s `download`/`remove`; downloading disables the "Usar" button, failed downloads show a "Reintentar" action.
- [x] 5.3 Download/remove actions are hidden whenever `canDownload` is false (plain web build) — verified live (see 6.3).
- [x] 5.4 Folded the old compact `Select`-based picker into the new status list rather than keeping both — one control shows status and lets the user switch, avoiding two redundant version pickers on screen.

## 6. Verification

- [ ] 6.1 Manual test in `apps/desktop` (dev mode): download a non-bundled version, quit and restart the app, confirm it still shows as downloaded and loads with network disabled. **Not yet run** — needs a real Electron session; the IPC code typechecks and mirrors the already-working `templates:*` channels exactly.
- [ ] 6.2 Manual test: remove a downloaded version, confirm it reverts to "available" and its local file/manifest entry is gone. **Not yet run**, same reason as 6.1.
- [x] 6.3 Manual test in the plain web build: confirmed live via a headless-browser check of `http://localhost:3000/bible` — the version list renders all 26 catalog entries grouped by language with no download/remove controls, and clicking "Usar" on a catalog-only version (ESV) fetched it over the network and rendered its books/chapter/verse correctly, with no console errors.
- [ ] 6.4 Manual test: simulate a catalog fetch failure (e.g. block the host) and confirm the bundled translation remains usable. **Not yet run.**
