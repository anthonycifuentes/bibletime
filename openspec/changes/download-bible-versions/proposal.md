## Why

The `bible` module currently ships exactly one translation (RVR1960), bundled as a static asset with no way to add more. The product has a real, public catalog of 26 Bible translations across English, Spanish, and Portuguese (`https://mrk214.github.io/snapshots/data.json`, the same source the bundled RVR1960 was drawn from) that the app does not yet expose. Desktop users in particular need to keep reading after they lose their internet connection, which means the app must let them explicitly choose which additional versions to fetch and persist to local disk, and clearly distinguish "downloaded and usable offline" from "available online but not yet downloaded."

## What Changes

- Add a version catalog service that fetches the full list of available translations from the remote snapshots repository (`data.json`), instead of deriving the version list from the single bundled file.
- Add a desktop-only download pipeline: a new Electron IPC bridge (`apps/desktop`) that fetches a chosen version's JSON from its `json_url` and writes it into a persistent local folder (under Electron's `userData` directory), plus handlers to list, read, and delete already-downloaded versions.
- Extend `BibleVersionSummary` and the version selector UI to show each catalog entry's local status (not downloaded / downloading / downloaded / error) and let the user trigger a download or removal.
- Update the Bible data loading path so selecting a downloaded version reads it from the local folder (works fully offline); selecting a not-yet-downloaded version in the desktop app requires a network fetch (live preview) or a download action; the previously-bundled RVR1960 remains the default, always-available-offline translation with no download step required.
- In the plain web build (no Electron bridge present), version browsing/preview still works over the network, but download/offline-storage controls are hidden — this feature's persistence is desktop-only.
- **BREAKING**: none — `local-bible-reader`'s existing single-translation behavior remains the default; this is additive.

## Capabilities

### New Capabilities
- `bible-version-catalog`: fetch and expose the full list of available Bible translations from the remote snapshots repository, independent of which (if any) are downloaded locally.
- `offline-bible-version-downloads`: desktop-only capability to download a chosen translation's data to a persistent local folder, track/list what's downloaded, read a downloaded translation's data fully offline, and delete a downloaded translation.

### Modified Capabilities
(none formally — `local-bible-reader` is not yet an archived spec; this change treats it as a dependency to build on rather than a spec being amended)

## Impact

- `apps/bibletime/src/modules/bible/interfaces/index.ts` — extend `BibleVersionSummary` with catalog + local-download-state fields
- `apps/bibletime/src/modules/bible/services/*` — replace the stubbed `get-bible-versions.ts` with a real catalog fetch; add a new download-bridge service
- `apps/bibletime/src/modules/bible/actions/*` — new/updated hooks for the catalog query and download mutations
- `apps/bibletime/src/modules/bible/components/bible-version-selector.tsx` — status badges (using `packages/ui`'s new `Pill`/`Card`/`Accordion`) and download/remove controls
- `apps/desktop/src/main.ts` — new `ipcMain` handlers for download/list/read/delete against a local Bible-versions folder under `app.getPath("userData")`
- `apps/desktop/src/preload.ts` — new `contextBridge` API replacing the current placeholder `window.bibletime.versions` object
- New runtime dependency on a third-party static site (`mrk214.github.io/snapshots`) for catalog + version data; no new npm packages expected (Node 20+ global `fetch` is available in the Electron main process)
