## Why

The Bible module is currently an empty stub (`apps/bibletime/src/modules/bible/index.ts` is just `export {}`), but offline Bible reading is the app's flagship feature per the product README. The user has already sourced a Reina-Valera 1960 (RVR1960) JSON Bible export and a sibling reference project (`reading-json-files`) that demonstrates the source data's shape and how to parse it. Building the local, offline reading path first requires no network dependency and unblocks every downstream feature (send-to-output, service plans) that depends on being able to select Bible text.

## What Changes

- Bundle a trimmed, offline copy of the RVR1960 Bible JSON as a static data asset inside the bibletime app, stripped of the redundant `chapter_html` field so the shipped bundle stays small — the app renders exclusively from the structured `items` array, not pre-rendered HTML.
- Build out the `bible` module (screaming architecture: `interfaces`, `services`, `actions`, `components`, `views`) to load, index, and browse this bundled data: book list → chapter list → verse content.
- Add jump-to-reference lookup (e.g. typing "Juan 3:16" resolves directly to that book/chapter/verse).
- Wire a `/bible` route and activate the existing "Bible" sidebar entry (currently a dead `#` link in `app-sidebar.tsx`).
- Out of scope for this change: remote/online Bible sources, additional translations or languages, "send to output" projection, and favorites/recents — the README lists these as later-phase work built on top of this module.

## Capabilities

### New Capabilities
- `local-bible-reader`: offline browsing of a single bundled Bible translation — book/chapter/verse navigation and reference lookup, rendered entirely from local data with no network calls.

### Modified Capabilities
(none — this is the first capability defined for the `bible` module)

## Impact

- `apps/bibletime/src/modules/bible/*` — full module build-out (currently an empty stub)
- `apps/bibletime/src/modules/core/layout/app-sidebar.tsx` — "Bible" nav item points at a real route instead of `#`
- `apps/bibletime/src/routes/` — new route(s) under `/bible`
- New bundled data asset derived from `RVR1960_vid_149.json` (repo root); the 23MB raw source is a build-time input, not something shipped or committed as-is into the app bundle
- No new runtime dependencies expected — confirm during design whether a lightweight search/index helper is warranted for reference lookup
