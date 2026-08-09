## Why

BibleTime desktop installs are one-way: a user downloads a `.dmg`, `.exe`, or `.AppImage` once and never hears about a newer release again. Bug fixes and new features only reach people who happen to revisit the GitHub releases page, so most installs drift permanently behind. The app already knows its own version (`app.getVersion()`, exposed as `window.bibletime.appVersion`) and the release workflow already publishes every installer under a predictable name — nothing surfaces that to the user.

## What Changes

- On desktop launch, the app checks GitHub's Releases API for the newest published release and compares it against the running version.
- When a newer version exists, a dismissible banner appears in the app shell announcing it, with actions to download or to open the release notes.
- Settings gains an **Updates** panel showing the current version, the last-checked time, and either "You're up to date" or the available version with its release notes and a download action. A manual "Check now" button is always available.
- Choosing to download fetches the installer asset matching the user's platform and architecture into the OS Downloads folder, with live progress and a cancel action. On completion the app reveals the file in the file manager and tells the user to run it — installation stays manual.
- The check is best-effort and silent on failure: no network, rate limiting, or an unreachable API leaves the app exactly as it behaves today.
- The web build is unaffected beyond what it already does — it keeps showing its build version in Settings and performs no update checks, because the browser always serves the latest deploy.

Non-goals for this change:

- **No in-place / silent auto-update.** `electron-updater` refuses to install unsigned updates on macOS, and BibleTime ships deliberately unsigned (`identity: null` in `electron-builder.yml`). Adding it now would produce updates that silently fail for most users. The design keeps the download step isolated so a future signed build can swap in real auto-install without reworking the UI.
- No changes to code signing, notarization, or the release workflow's draft-then-publish flow.
- No background polling while the app is running — one check per launch, plus manual checks.

## Capabilities

### New Capabilities

- `update-checker`: Discovering whether a newer BibleTime release exists, on launch and on demand, and reporting the result (up to date / update available / check failed) to the app.
- `update-download`: Fetching the installer asset that matches the running platform and architecture, with progress, cancellation, and reveal-on-completion.
- `update-notification-ui`: How an available update is surfaced to the user — the launch banner and the Settings updates panel, including the version display that exists today.

### Modified Capabilities

<!-- openspec/specs/ is empty; no previously specified capability changes. The existing
     version display in SystemInfoPanel is folded into the new update-notification-ui spec. -->

## Impact

**Desktop main process** — `apps/desktop/src/main.ts`, `apps/desktop/src/preload.ts`
New IPC surface (`updates:*`) for checking, downloading, cancelling, and revealing. Reuses the existing `net.fetch` + temp-file-then-rename download pattern already used by `bible-version-downloads:download`.

**Web renderer** — `apps/bibletime/src`
New `modules/updates` module (interfaces, services, actions, components) plus a new Settings card and a banner mounted in the app shell. `types/electron.d.ts` gains the `updates` bridge typing. `modules/settings/components/system-info-panel.tsx` may shed its version row once the Updates panel owns it.

**i18n** — `modules/core/i18n/dictionaries/{en,es,pt}.ts`
New `settings.updates.*` and banner strings across all three locales.

**Persisted state** — a small JSON file in `app.getPath("userData")` holding the last check time, last seen version, and dismissed-version marker so a dismissed banner stays dismissed until the next release.

**External dependency** — the public GitHub Releases API for `anthonycifuentes/bibletime` (unauthenticated, 60 requests/hour/IP). Requires releases to be **published**, not left as drafts; drafts are invisible to unauthenticated callers. This is a process note for the maintainer, not a code change.

**No new npm dependencies.** Version comparison is a small local semver compare; fetching uses Electron's built-in `net`.
