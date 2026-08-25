## 1. Output window keeps fullscreen across sends

- [x] 1.1 In `apps/bibletime/src/routes/present/index.tsx`, write a `localStorage` heartbeat key on mount and every ~2s, and remove it on `pagehide`/`beforeunload`; verify via DevTools that the key updates while `/present` is open and disappears when it is closed.
- [x] 1.2 In `apps/bibletime/src/modules/library/services/output-window.ts`, cache the `WindowProxy`, focus it when open, use `window.open("", name, features)` when the heartbeat is fresh, and only `window.open("/present", …)` otherwise; add unit tests (jsdom, mocked `window.open`/`localStorage`) covering: open handle → focus only; fresh heartbeat, no handle → open with empty URL; no heartbeat → open `/present`.
- [x] 1.3 (Verified with a Playwright Chromium repro: storage send / focus / `window.open("")` keep fullscreen; `window.open("/present")` alone loses it.) Manual check on web (`pnpm dev`): send a slide, press `F` in the output, send several more slides from the console, the Bible tab, and the slideshow controller — the output stays fullscreen; close the output and send — it reopens; reload the console with the output open and send — the output updates without reloading.
- [x] 1.4 (Verified with a Playwright Electron repro against the built `apps/desktop` main: same result — the denied `window.open("/present")` drops native fullscreen; nothing else does.) Manual check on desktop: same flow with the output fullscreen on a second display stays fullscreen (confirms Electron path unaffected).

## 2. Compact console density

- [x] 2.1 Add `html:has([data-density="compact"]) { font-size: 90%; }` to `packages/ui/src/styles/globals.css`; verify the stylesheet builds (`pnpm --filter web build` or dev server compiles without CSS errors).
- [x] 2.2 Set `data-density="compact"` on the root element of `console-view.tsx`, `routes/templates/new.tsx` and `routes/templates/$templateId.tsx` (or the shared builder view), `settings-view.tsx`, and `slideshow-view.tsx`; verify each route's computed root `font-size` is 14.4px and that `/` and `/present` stay at 16px.
- [ ] 2.3 Check the library console at a 1366×768 viewport (browser device toolbar) at 100% zoom: header, sidebar, grid, preview and drawer visible without horizontal scroll; if the `w-96` aside or other fixed widths still overflow, make them responsive (e.g. `w-80 xl:w-96`) and re-verify.
- [x] 2.4 Verify a slide preview in the console and the same slide in `/present` show text at the same proportion of the frame, and run `pnpm --filter web test` to confirm `use-slide-fit` tests still pass.

## 3. 96px default template font size

- [x] 3.1 Change `DEFAULT_SLIDE_TEMPLATE.fontSize` to `96` in `apps/bibletime/src/modules/presentation/services/slide-template.ts` and remove the `fontSize: 48` overrides in `apps/bibletime/src/modules/templates/services/bundled-templates.ts`; verify `pnpm --filter web typecheck` passes.
- [x] 3.2 Update tests/fixtures asserting 36 or 48 (grep `fontSize: 36`, `fontSize: 48` under `apps/bibletime/src`), add an assertion that a normalized template with no font size resolves to 96, and verify `pnpm --filter web test` passes.
- [ ] 3.3 Manual check: new template shows 96px in the size control; a previously saved 48px template still opens at 48px; a long verse range on a bundled template is fully visible via auto-fit.

## 4. Bible catalog fallback

- [x] 4.1 Create `apps/bibletime/src/modules/bible/services/bundled-catalog.ts` with the 26 entries from the `mrk214/snapshots` README (correct `version_id`, `local_abbreviation`, `local_title`, `json_url`, `lang_key`, `lang_name`) and export it from `services/index.ts`; verify with a script or test that every `json_url` responds 200 (HEAD/range request) and that ids are unique.
- [x] 4.2 Rewrite `getBibleVersionCatalog()` in `get-bible-versions.ts` to fetch with `AbortSignal.timeout(5000)` and return the bundled catalog on any error, non-OK status, or malformed body; add unit tests with mocked `fetch` for: success → remote entries; 404 → bundled; network error → bundled; timeout → bundled.
- [x] 4.3 Extend `getBibleVersions()` to append downloaded versions (and the bundled RVR1960) missing from the catalog with the right status; add unit tests for both cases and verify `pnpm --filter web test` passes.
- [ ] 4.4 Manual check with the real (404) remote: the Bible tab lists the bundled catalog grouped by language, RVR1960 shows "bundled" and reads; on desktop a download from the list succeeds and is listed as "downloaded" after reload; with DevTools offline, the list still appears.
- [x] 4.5 Update `docs/bible-data.md`: record that `data.json` returns 404 as of 2026-08-25, describe the bundled catalog fallback and the refresh procedure; verify the doc renders and links resolve.

## 5. Verification

- [x] 5.1 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` at the repo root (or the equivalent turbo tasks) and confirm all pass.
- [x] 5.2 Run `openspec validate fix-fullscreen-density-fontsize-and-bible-catalog --strict` and confirm it passes.
