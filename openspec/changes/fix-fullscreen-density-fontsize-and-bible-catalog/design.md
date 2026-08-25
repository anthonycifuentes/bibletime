## Context

See proposal.md for motivation. What shapes the approach:

- **Output window (web).** `openOutputWindow()` in `modules/library/services/output-window.ts` is the single entry point and runs `window.open("/present", "bibletime-present", features)` on *every* send (console, Bible tab, preview panel, slideshow `reopenOutput`, and `startSlideshow`). Per the HTML spec, `window.open(url, name)` with a non-empty `url` and an existing browsing context of that `name` **navigates** that context — a full reload of `/present`, which exits HTML fullscreen. `window.open("", name)` with an existing target returns it *without* navigating; with no existing target it opens an `about:blank` popup. The content itself already travels through `localStorage` + `storage` events (`live-slide.ts`), so the `window.open` on a later send is only there to focus/reopen. On desktop, `setWindowOpenHandler` in `apps/desktop/src/main.ts` already denies a second `/present` open and focuses the existing `BrowserWindow`, so the desktop build is unaffected.
- **Density.** Tailwind v4 sizes everything in `rem`, so root `font-size` is the one knob that scales the whole console consistently — it is exactly what browser zoom does. `/present` and slide previews size text in `px` from the template and then scale with the frame (`use-slide-fit.ts`), so they are immune to a root-font-size change. The landing page (`/`) and `/present` share the same `__root.tsx` document and `globals.css`, so the scale must be scoped, not global.
- **Font size.** `DEFAULT_SLIDE_TEMPLATE.fontSize` is 36 (`slide-template.ts`); the four bundled templates override it to 48. `normalize-slide-template.ts` falls back to the default for a missing size. `MIN_FONT_SIZE`/`MAX_FONT_SIZE` are 16/800, so 96 needs no limit change. Auto-fit (`use-slide-fit.ts`) already shrinks overflowing text.
- **Catalog.** Only `snapshots/data.json` is gone (404 on Pages, raw.githubusercontent and jsDelivr). The `snapshots` repo still exists and every per-version file (`https://mrk214.github.io/snapshots/<lang_key>/<ABBR>_vid_<id>.json`) still serves; its README lists all 26 translations across five `lang_key` folders (`en___eng___eng`, `es___spa___spa`, `es___spa___spa_es`, `pt___por___por`, `pt___por___por_pt`). `useGetBibleVersions` builds the whole list from the catalog request, so a catalog failure hides even the bundled RVR1960 and any downloaded versions — including when offline, which contradicts the offline-first promise.

## Goals / Non-Goals

**Goals:**
- Never navigate an output window that is already showing `/present`.
- One scoped scale factor for console chrome; zero effect on projected output.
- Change only *defaults* for font size — no rewrite of stored data.
- Bible tab fully usable offline and while the upstream catalog is down, with no code change needed when upstream comes back.

**Non-Goals:**
- Making one window fullscreen another (not possible in browsers).
- A user-facing density/zoom setting (a fixed compact density is the ask; a setting can come later without changing this design).
- Rewriting existing saved templates to 96px.
- Mirroring the version JSON files themselves — only the catalog is bundled; texts still come from upstream or the user's own downloads.

## Decisions

### D1. Output window: never re-target an open window; heartbeat for liveness

Root cause, reproduced with Playwright on both Chromium (web) and Electron (desktop): `window.open("/present", name)` aimed at an existing fullscreen window drops its fullscreen — on web because the window is navigated (reloaded), on desktop *even though* `setWindowOpenHandler` denies the call (the denied call alone flips native fullscreen off; the handler's `focus()`/`restore()` are innocent). A `localStorage` write, a renderer-side `popup.focus()`, and `window.open("", name)` all leave fullscreen intact.

`openOutputWindow({ focus? })` therefore becomes:

1. Cached `WindowProxy` handle exists and `!closed` → do nothing (focus only if `focus: true`). The slide already travels via `storage` events; a send is not a reason to pull keyboard focus onto the projector.
2. No handle, but the output is **alive** per heartbeat (console reloaded) → do nothing. With `focus: true` on web only, `window.open("", name)` reaches the window without navigating it; on desktop nothing is called, because any `/present` open would drop fullscreen and `""` would become a stray `about:blank` window.
3. Otherwise → `window.open("/present", name, features)` and cache the handle.

Only the slideshow's explicit "Reopen output" passes `focus: true`.

**Liveness signal.** `/present` writes a heartbeat timestamp to `localStorage` (`bibletime.presentHeartbeat`) on mount and every 2s, and removes it on `pagehide`. The console treats a heartbeat younger than 5s as "alive".

*Alternatives:* (a) Drop `window.open` from later sends entirely — loses "reopen after the operator closed it". (b) `BroadcastChannel` ping/pong — asynchronous, so the `window.open` would fall outside the user gesture and be popup-blocked. (c) Cached handle only, no heartbeat — a console reload would re-open (and un-fullscreen) the output once.

`apps/desktop/src/main.ts` is unchanged: its deny-and-focus path is now only reached when the renderer believes no output is open.

### D2. Density via root font-size, scoped with `:has()`

Add to `globals.css`:

```css
html:has([data-density="compact"]) { font-size: 90%; }
```

and put `data-density="compact"` on the root element of each console shell view (`console-view.tsx`, both template routes, `settings-view.tsx`, `slideshow-view.tsx`). Pure CSS, no effect-driven attribute flip (no flash on load / SSR), and `/present` and the landing page never carry the attribute. `:has()` on `html` is supported by every browser BibleTime targets (Chromium/Electron, Safari 15.4+, Firefox 121+).

Slide previews and `/present` render text in `px` scaled by the frame, so their proportions are untouched (spec "Slide previews stay proportional"). The `SlideFrame` container itself shrinks with the layout, which is intended.

After the scale lands, audit fixed-width regions in `console-view.tsx` (e.g. the `w-96` right aside) at 1366px; reduce or make them responsive only if the compact scale alone still overflows.

*Alternatives:* CSS `zoom: 0.9` on the shell — reproduces browser zoom most literally, but portalled dialogs/popovers render outside the zoomed subtree and come out at the wrong scale. A global `html { font-size: 90% }` — would also shrink the landing page. A JS-set attribute on `<html>` — flashes on load.

### D3. 96px default by changing the constants only

`DEFAULT_SLIDE_TEMPLATE.fontSize: 36 → 96`; remove the `fontSize: 48` overrides in `bundled-templates.ts` so they inherit the default. `normalize-slide-template.ts` already falls back to `DEFAULT_SLIDE_TEMPLATE.fontSize`, which gives the "missing font size → 96" scenario for free. Stored templates carry their own `fontSize`, so nothing is migrated. Update any tests/fixtures that assert 36/48.

### D4. Catalog: remote-with-timeout, bundled fallback, local versions merged in

- New `modules/bible/services/bundled-catalog.ts` exporting `BUNDLED_BIBLE_VERSION_CATALOG: BibleVersionCatalogEntry[]` — the 26 entries from the `snapshots` README, `json_url` pointing at the still-live `https://mrk214.github.io/snapshots/<lang_key>/<file>`, `lang_key` as the folder name, `lang_name` per language (`English`, `Español`, `Português`). Kept as TypeScript (not `public/*.json`) so it is type-checked and tree-shaken into the bundle with no extra request.
- `getBibleVersionCatalog()` fetches the remote URL with an `AbortSignal.timeout(~5000)`; on any throw or non-OK/malformed response it returns the bundled catalog. It never rejects.
- `getBibleVersions(catalog, downloaded)` additionally appends any downloaded version (and the bundled RVR1960, if somehow absent) that the catalog does not list, so local content is never hidden by the catalog that happened to load.
- `useGetBibleVersions` is unchanged in shape; because the service no longer throws, the Bible tab never shows an empty list for a catalog failure.
- `docs/bible-data.md`: note that `data.json` is gone as of 2026-08-25, that the app carries a bundled catalog, and how to refresh it (copy the README table).

*Alternatives:* Scrape the snapshots README at runtime — fragile, still a network dependency. Point at the GitHub contents API — rate-limited and unauthenticated. Drop the remote fetch and ship only the bundled catalog — loses upstream additions with no app update, which the docs promise.

## Risks / Trade-offs

- [Heartbeat race: output closed <5s before a send] → the send is a no-op for up to 5s (the key is cleared on `pagehide`, so in practice immediately); the operator's next send or "Reopen output" opens the window.
- [`:has()` unsupported in an old browser] → the rule is simply ignored and the console renders at 100% as today; no breakage.
- [Users who liked 36/48 defaults] → only new/bundled templates change; a template can still be set to any size 16–800.
- [Bundled catalog goes stale] → remote is still tried first; the doc records a one-step refresh. If upstream also moves the version files, downloads break regardless of this change — out of scope.
- [Compact density still overflows on some screens] → follow-up audit task on fixed widths (2.3) is part of this change.

## Open Questions

None that affect specs or tasks. Whether to expose density as a user setting can be decided later without touching this design.
