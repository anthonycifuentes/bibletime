## 1. Shared types and version comparison

- [x] 1.1 Add `apps/bibletime/src/modules/updates/interfaces/index.ts` defining `UpdateAsset`, `UpdateCheckResult` (the `up-to-date` / `available` / `failed` union from design §4), `UpdateDownloadState`, `UpdatePersistedState`, and the `UpdateDriver` interface
- [x] 1.2 Add a `compareVersions(a, b)` helper in the desktop main process: strip a leading `v`, split on `.`, compare numeric segments numerically, treat a `-suffix` build as lower than the plain release
- [x] 1.3 Sanity-check the comparator against `0.1.1 < 0.2.0`, `0.9.0 < 0.10.0`, `0.2.0 === 0.2.0`, `0.2.0-beta.1 < 0.2.0`, and `v0.2.0 === 0.2.0`

## 2. Desktop main process — check

- [x] 2.1 Add `updates.json` read/write helpers over `app.getPath("userData")`, treating a missing or unparseable file as `{}` (mirroring `readMediaSources`)
- [x] 2.2 Add `registerUpdateHandlers()` alongside the other `register*Handlers()` functions and call it where they are called
- [x] 2.3 Implement `updates:get-state` returning the persisted state plus `app.getVersion()`, for first paint before any check settles
- [x] 2.4 Implement `updates:check`: `net.fetch` `https://api.github.com/repos/anthonycifuentes/bibletime/releases/latest` with the `BibleTime v<version> (...)` User-Agent, parse `tag_name`, `html_url`, `body`, `assets`
- [x] 2.5 Map every failure (network error, non-OK status, unparseable body, missing tag) to a `failed` result with a `reason` — the handler must never reject
- [x] 2.6 Compare against `app.getVersion()` and resolve to `up-to-date` or `available`; persist `lastCheckedAt` and `lastSeenVersion` on every successful check
- [x] 2.7 Implement `updates:dismiss(version)` writing `dismissedVersion`

## 3. Desktop main process — asset selection and download

- [x] 3.1 Implement asset matching by extension plus, on `darwin`, `process.arch` (`arm64`/`x64` `.dmg`, `.exe` on win32, `.AppImage` on linux); resolve to `null` when nothing matches
- [x] 3.2 Validate the asset URL before fetching: HTTPS only, host must be `api.github.com`, `github.com`, or `objects.githubusercontent.com`
- [x] 3.3 Validate the asset filename: `path.basename` only, refuse any name containing `/`, `\`, or `..`
- [x] 3.4 Implement `updates:download` streaming into `app.getPath("downloads")` as `<name>.part`, renaming into place only after the stream completes
- [x] 3.5 Emit `updates:download-progress` to the requesting `webContents` with `{ receivedBytes, totalBytes | null }`, sending `totalBytes: null` when the response has no content length
- [x] 3.6 Track the in-flight download with a module-level `AbortController`; refuse a second concurrent start
- [x] 3.7 Implement `updates:cancel-download`, deleting the `.part` file; ensure the error path deletes it too
- [x] 3.8 Implement `updates:reveal-download` calling `shell.showItemInFolder` on the completed file — never `shell.openPath`

## 4. Preload bridge and renderer typings

- [x] 4.1 Add the `updates` namespace to `apps/desktop/src/preload.ts`: `getState`, `check`, `download`, `cancelDownload`, `revealDownload`, `dismiss`
- [x] 4.2 Add `onDownloadProgress(callback)` wrapping `ipcRenderer.on`/`removeListener`, returning an unsubscribe function and forwarding only the plain payload (never the `IpcRendererEvent`)
- [x] 4.3 Mirror the whole `updates` namespace in `apps/bibletime/src/types/electron.d.ts` under the optional `window.bibletime` shape

## 5. Renderer services and hooks

- [x] 5.1 Add `modules/updates/services/desktop-updates.ts` implementing `UpdateDriver` over `window.bibletime.updates` with `canCheck: true`
- [x] 5.2 Add `modules/updates/services/web-updates.ts` with `canCheck: false`, a permanent `up-to-date` result, and no-op download actions
- [x] 5.3 Add `modules/updates/services/index.ts` exporting `getUpdates()` that feature-detects `window.bibletime?.updates` (mirroring `getBibleVersionDownloads`)
- [x] 5.4 Add `actions/use-update-check.ts`: load persisted state on mount, run the launch check exactly once per session, expose `checkNow`, `dismiss`, and the current result/checking flag
- [x] 5.5 Add `actions/use-update-download.ts`: subscribe to progress on mount and unsubscribe on unmount, expose `start`, `cancel`, `reveal`, and the idle/downloading/completed/cancelled/failed state
- [x] 5.6 Add `modules/updates/index.ts` exporting the components the rest of the app consumes

## 6. UI

- [x] 6.1 Build `components/update-banner.tsx`: names the available version, offers a link to Settings and a dismiss action; renders nothing when up to date, when the check failed, or when the available version is already dismissed
- [x] 6.2 Mount the banner in `modules/library/views/console-view.tsx` directly under `HeaderBar`, in both places `HeaderBar` is rendered
- [x] 6.3 Build `components/updates-panel.tsx` covering all check states (checking / up to date with last-checked time / available with version, release notes link, download action / failed with retry) and all download states (idle, progress with cancel, completed with filename and reveal, failed with retry)
- [x] 6.4 Show the current version in the panel, from the bridge on desktop and `__APP_VERSION__` on web; hide every check and download affordance when `canCheck` is false
- [x] 6.5 Fall back to a release-page link instead of the download action when the release has no matching asset for this platform
- [x] 6.6 Add an "Updates" `Card` to `SettingsView` directly above the System information card
- [x] 6.7 Remove the now-duplicated app-version row from `SystemInfoPanel`, leaving platform/Electron/Chrome/Node

## 7. Localization

- [x] 7.1 Add `settings.updates.*` and banner keys to `modules/core/i18n/dictionaries/en.ts`
- [x] 7.2 Add the same keys to `es.ts` and `pt.ts`
- [x] 7.3 Run `pnpm typecheck` to confirm no locale is missing a key

## 8. Verification and docs

- [x] 8.1 Verify the web build: Settings shows the version, no update UI, no banner, no network call to the GitHub API
- [x] 8.2 Verify desktop up-to-date: launch against the current published release, confirm no banner and an "up to date" panel with a last-checked time
- [x] 8.3 Verify desktop update-available: temporarily lower `apps/desktop/package.json` version, launch, confirm the banner appears and the panel names the published version
- [x] 8.4 Verify the download end to end on this machine: correct asset for the platform/arch, live progress, file lands in Downloads, Finder reveals it, no `.part` left behind
- [x] 8.5 Verify cancel mid-download leaves no `.part` file and returns the panel to the download action
- [x] 8.6 Verify offline behavior: disable networking, launch, confirm no banner, no dialog, and a "couldn't check" panel state
- [x] 8.7 Verify dismissal persists across a restart for the same version
- [x] 8.8 Document in `docs/` (and the release checklist) that a GitHub Release must be **published**, not left as a draft, before update checks can see it
- [x] 8.9 Run `pnpm lint`, `pnpm typecheck`, and `pnpm format`
