## Context

BibleTime ships as an Electron app (`apps/desktop`) wrapping a TanStack Start renderer (`apps/bibletime`), plus the same renderer deployed to the web. Relevant current state:

- The main process already exposes its version over `ipcRenderer.sendSync("app:get-version")`, surfaced as `window.bibletime.appVersion` and rendered by `SystemInfoPanel`. The web build falls back to the build-time `__APP_VERSION__` constant.
- `apps/desktop/electron-builder.yml` sets `identity: null` (no Developer ID) and repairs the resulting unsealed bundle with an ad-hoc signature in `scripts/adhoc-sign.cjs`. Windows builds are unsigned too. `publish: null` — the release workflow attaches installers to a **draft** GitHub Release by hand.
- There is a working precedent for network downloads in the main process: `bible-version-downloads:download` fetches over HTTP, writes to `<final>.tmp`, and renames into place only on success.
- Renderer↔main features follow a driver pattern: an interface, a `desktop-*.ts` adapter over `window.bibletime`, a `web-*.ts` no-op adapter, and a `get*()` factory that feature-detects the bridge (see `modules/bible/services/downloads/`).
- There is no login. "When they log in" is read as "when they launch the app".
- There is currently **no main→renderer push channel** — every existing IPC call is renderer-initiated `invoke`/`sendSync`.

The constraint that shapes everything below: **the app is unsigned.** `electron-updater`'s macOS path is Squirrel.Mac, which validates the signature of the downloaded update and refuses ad-hoc-signed bundles. Shipping it today would produce an update button that silently does nothing for the majority of users.

## Goals / Non-Goals

**Goals:**

- A user who launches an outdated BibleTime learns about the new version without going looking for it.
- Getting the update is one click plus running the downloaded installer — no hunting through GitHub for the right file for their platform and CPU.
- Settings is the durable home for version information: what you're running, whether it's current, and what's available.
- Zero degradation when offline, rate-limited, or running the web build.
- The download step is isolated behind one interface, so swapping in real auto-install later touches one adapter, not the UI.

**Non-Goals:**

- In-place/silent auto-update, `electron-updater`, delta updates, or a self-hosted update feed.
- Code signing, notarization, or changes to the release workflow.
- Background polling while the app runs, update channels (beta/stable), or forced updates.
- Any update behavior in the web build.

## Decisions

### 1. Assisted download over `electron-updater`

**Chosen:** check the GitHub Releases API, download the matching installer to `~/Downloads` with progress, reveal it, and let the user run it.

**Why:** it works today, with the unsigned builds and the manual draft-then-publish release flow that already exist. `electron-updater` would require an Apple Developer ID plus notarization, a Windows certificate to avoid SmartScreen blocking the silent installer, flipping releases from draft to published automatically, and emitting `latest.yml`/`latest-mac.yml`. That is a separate project with a recurring cost, and until it is done, the "Restart to update" button would be a lie on macOS.

**Alternatives considered:**

- *Notify-only, link to GitHub* — smaller, but leaves the user to identify arm64 vs x64 vs Intel on the releases page, which is exactly where non-technical church volunteers get stuck.
- *`electron-updater` for Windows/Linux only, assisted download on macOS* — two update mechanisms and two sets of failure modes for one feature. Not worth it before signing exists.

**Forward path:** `UpdateDownloadDriver` (below) is the seam. When signing lands, a new adapter can implement "download → verify → install on quit" behind the same interface and the same UI states, with `completed` meaning "restart to apply" instead of "open the file".

### 2. GitHub Releases API as the source of truth, called from the main process

`GET https://api.github.com/repos/anthonycifuentes/bibletime/releases/latest` returns the newest published non-draft, non-prerelease release — exactly the semantics the spec wants, with no client-side filtering. The call lives in the main process, using Electron's `net.fetch` (already used in `waitForServer` and the media protocol handler), so it inherits the app's proxy configuration and keeps the renderer free of network permissions.

`User-Agent: BibleTime v<version> (https://github.com/anthonycifuentes/bibletime)` matches the header convention already used for the LRCLIB song search.

Unauthenticated, so 60 requests/hour/IP. One check per launch plus manual checks stays far under that; a shared church IP would too.

**Alternative considered:** listing `/releases` and filtering locally. Rejected — more data, more parsing, and `/latest` already applies the draft/prerelease rules.

**Operational consequence, worth stating plainly:** `/latest` does not see drafts. Today's workflow leaves the release as a draft until the maintainer publishes it. Update checks only start reporting a version once that publish happens — which is the correct behavior (unverified builds should not be advertised), but it does mean the release checklist now has a user-visible step.

### 3. Version comparison: a local semver compare, no dependency

Tags are `vMAJOR.MINOR.PATCH`. A ~20-line comparator that strips a leading `v`, splits on `.`, compares numeric segments numerically, and treats any suffix (`-beta.1`) as lower than the plain release covers every tag this project will produce. Adding `semver` (and its transitive weight) to the main process for this is not justified.

Strictly-greater-than only, so a maintainer running a locally built `0.3.0-dev` against a published `0.2.0` is never told to "update" downward.

### 4. IPC surface

New handlers in `apps/desktop/src/main.ts`, registered by a `registerUpdateHandlers()` function following the existing `register*Handlers()` shape:

| Channel | Direction | Purpose |
| --- | --- | --- |
| `updates:get-state` | invoke | Persisted state + current version, for first paint before any check settles |
| `updates:check` | invoke | Run a check now; resolves to a result object, never rejects |
| `updates:download` | invoke | Start downloading the selected asset; resolves on completion/cancel |
| `updates:cancel-download` | invoke | Abort an in-flight download |
| `updates:reveal-download` | invoke | `shell.showItemInFolder` on the completed file |
| `updates:dismiss` | invoke | Record a dismissed version |
| `updates:download-progress` | **main → renderer** | Progress ticks |

`updates:download-progress` introduces the first push channel in this codebase. The preload exposes it as `onDownloadProgress(callback) => unsubscribe`, wrapping `ipcRenderer.on`/`removeListener` so the renderer never touches `ipcRenderer` directly and React effects can clean up properly. The callback receives only a plain `{ receivedBytes, totalBytes | null }` payload — the raw `IpcRendererEvent` is not forwarded across the context bridge.

**Result shape** — checks resolve, they do not throw:

```ts
type UpdateCheckResult =
  | { status: "up-to-date"; currentVersion: string; checkedAt: number }
  | { status: "available"; currentVersion: string; availableVersion: string
      releaseUrl: string; releaseNotes: string; asset: UpdateAsset | null; checkedAt: number }
  | { status: "failed"; currentVersion: string; reason: "offline" | "rate-limited" | "unexpected" }
```

Rejecting an `invoke` surfaces as an unhandled renderer error for something the user did not ask for. A discriminated union makes "failed" a state the UI must render, not an exception it might forget to catch.

### 5. Asset matching

`electron-builder.yml` sets `artifactName: ${productName}-${version}-${arch}.${ext}`, so asset names are predictable: `BibleTime-0.2.0-arm64.dmg`, `BibleTime-0.2.0-x64.exe`, `BibleTime-0.2.0-x86_64.AppImage`.

Matching is by extension plus, on macOS, `process.arch`:

- `darwin` + `arm64` → `.dmg` containing `arm64`
- `darwin` + `x64` → `.dmg` containing `x64`
- `win32` → `.exe`
- `linux` → `.AppImage`

Matching on the **shape** of the name (extension + arch token) rather than a full template keeps this working if `productName` or the artifact template ever changes. No match → the download action is hidden and the panel offers the release page instead, which is the honest fallback rather than downloading something that won't run.

macOS `.dmg` over `.zip`: double-clicking a dmg is the flow the install docs already describe, and the zip variant exists for `electron-updater`, which this change does not use.

### 6. Download safety

Reuses and tightens the existing Bible-version pattern:

- Destination is `app.getPath("downloads")`, filename is `path.basename(asset.name)` with any name containing `/`, `\`, or `..` rejected outright — the asset name is remote input and must not be able to steer the write.
- Only HTTPS URLs on GitHub-owned hosts (`api.github.com`, `objects.githubusercontent.com`, `github.com`) are fetched, and only URLs that came from the API response for this repository.
- Write to `<name>.part`, `fs.rename` into place only after the stream ends cleanly. Cancel and error paths both `fs.rm` the partial file.
- One download at a time, tracked by a module-level `AbortController`; a second start is refused rather than queued.
- The file is **revealed, never executed**. `shell.showItemInFolder` only. The app does not `shell.openPath` an installer it just downloaded — that is one keystroke away from executing remote content on the user's behalf, and it is not needed to make the flow work.

### 7. Renderer structure

A new `apps/bibletime/src/modules/updates/` module, following the screaming-architecture layout the other modules use:

```
modules/updates/
  interfaces/index.ts          UpdateCheckResult, UpdateAsset, UpdateDownloadState, UpdateDriver
  services/
    desktop-updates.ts         talks to window.bibletime.updates
    web-updates.ts             canCheck: false, everything else a no-op
    index.ts                   getUpdates() — feature-detects the bridge
  actions/
    use-update-check.ts        launch + manual check, dismissal
    use-update-download.ts     progress subscription, cancel, reveal
  components/
    update-banner.tsx
    updates-panel.tsx
  index.ts
```

The `web-updates` adapter returns `canCheck: false` and a permanent `up-to-date`, so every consumer renders correctly in the browser with no `typeof window` checks scattered through components — the same reason `web-bible-version-downloads` exists.

Local `useState`/`useEffect` in the action hooks rather than React Query: this is push-driven, single-consumer, session-scoped state, matching `use-bible-version-downloads` rather than the server-cache-shaped queries in `modules/bible/actions/queries`.

### 8. Where the UI lives

- **Banner** — rendered by `ConsoleView` just under `HeaderBar`, so it appears across every bottom-nav tab and cannot be missed by a user who never opens Settings. It is dismissible and never blocks interaction. Not a modal: interrupting someone who just opened the app to prepare a service with a dialog is the wrong trade.
- **Settings** — a new "Updates" card in `SettingsView`, placed directly above the existing System information card. It owns the current-version row; `SystemInfoPanel` keeps the platform/Electron/Chrome/Node rows. In the web build the Updates card renders the version alone with no check or download affordances.

### 9. Persisted state

`app.getPath("userData")/updates.json`:

```json
{ "lastCheckedAt": 1234567890, "lastSeenVersion": "0.2.0", "dismissedVersion": "0.2.0" }
```

Read-on-demand, write-after-change, missing-or-corrupt reads as `{}` — the same forgiving treatment `readMediaSources` and `readBibleVersionsManifest` already give their files. A dismissal suppresses the banner only while `lastSeenVersion === dismissedVersion`, so the next release brings it back on its own with no expiry logic.

## Risks / Trade-offs

**The user must still run the installer manually** → Unavoidable while unsigned. Mitigated by removing every other step: right file, downloaded, revealed in Finder/Explorer, with a completion message that says what to do next. Documented as a non-goal so it is not mistaken for an unfinished feature.

**Drafted releases are invisible to `/latest`, so a shipped-but-unpublished release looks like "up to date"** → Correct-by-design (unverified builds must not be advertised), but it becomes a release-checklist step. Mitigated by adding the publish step to the release documentation as part of this change.

**GitHub API rate limit (60/hr/IP) shared across a church's NAT** → One automatic check per launch keeps normal use far under it. A rate-limited response is a `failed` result, which renders as "couldn't check" and changes nothing else.

**macOS Gatekeeper still warns on the downloaded installer** → Out of scope here; the release notes and `docs/install.md` already cover it. The completion message links to that guide so the user isn't stranded at the warning.

**First main→renderer push channel** → Small new surface, but it must not leak `ipcRenderer` through the context bridge. Mitigated by exposing only a `(payload) => void` subscription that returns an unsubscribe function, and forwarding a plain serializable payload.

**Remote-controlled filename and URL** → Both are attacker-controlled if the GitHub account is ever compromised, so both are validated: basename-only filenames, HTTPS-and-GitHub-host-only URLs, and never executing what was downloaded.

**Three more locales to keep in sync** → New keys land in `en`, `es`, and `pt` in the same change; the dictionaries are typed off `en`, so a missing key in another locale is a typecheck failure rather than a runtime gap.

## Migration Plan

No data migration. The feature is additive and inert until a newer release exists.

Rollout: ship it in the next release. Users on that release and later get checks; users on older builds see nothing until they update once by hand — the first update is necessarily manual, which is the nature of adding an updater.

Rollback: the feature is self-contained in `modules/updates` plus one `registerUpdateHandlers()` call; reverting the change removes it entirely with no residue beyond an orphaned `updates.json`, which is ignored.

## Open Questions

- Should the banner also appear on the presentation/output route, or stay confined to the console shell? Leaning toward console-only — nothing should overlay a live service. Current plan: console-only.
- Is `~/Downloads` right on Linux, where an AppImage is often kept somewhere deliberate? `app.getPath("downloads")` is the predictable default; a "choose location" option can follow if anyone asks.
