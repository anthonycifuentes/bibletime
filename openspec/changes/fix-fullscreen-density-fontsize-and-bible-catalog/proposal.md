## Why

Four defects reported from live use are getting in the way of running a service: the projected output window drops out of fullscreen as soon as the operator sends the second slide (on web); the console is too large for a small laptop screen (the operator has to zoom the browser to 90% to see everything); new and bundled templates start at a font size (36px / 48px) that is too small for a projector, so every template has to be bumped by hand to ~96px; and the Bible version list is empty everywhere because the remote catalog `https://mrk214.github.io/snapshots/data.json` now returns 404 — which also hides the bundled RVR1960 and any downloaded versions, since the whole list is derived from that one request.

## What Changes

- **Output window keeps its fullscreen across sends.** On web, `openOutputWindow()` calls `window.open("/present", "bibletime-present", features)` on every send; when the named window already exists the browser *navigates* it to `/present` again, which reloads the page and exits HTML fullscreen. The console will detect an already-open, already-live output window and only focus it, never re-navigate it. Desktop (Electron) already denies the re-open and is unaffected.
- **Compact console density.** The console shell (library, templates, settings, slideshow controller) renders at a compact scale — equivalent to the 90% browser zoom the operator applies by hand today — so more of the UI fits on 13″/1366px-class screens. The projected `/present` output and the public landing page are not scaled.
- **96px default slide font size.** New templates and the bundled templates default to `fontSize: 96` instead of 36 / 48. Templates the user has already saved keep whatever size they have; the existing auto-fit still shrinks long passages to fit the frame.
- **Bible version catalog never leaves the list empty.** The app ships a bundled copy of the catalog (the 26 translations currently listed across `mrk214/snapshots`, whose per-version JSON files are still served — only `data.json` disappeared). The remote catalog is still tried first so upstream additions keep appearing; on any failure (404, offline, timeout) the bundled catalog is used instead, so the bundled RVR1960 and downloaded versions are always listed and selectable.
- Docs: `docs/bible-data.md` records the catalog situation and how to refresh the bundled catalog.

## Capabilities

### New Capabilities
- `presentation-output-window`: the projected output window's behaviour when the console sends to an output that is already open — fullscreen and placement must survive subsequent sends.
- `console-ui-density`: the console shell renders at a compact density on every screen size, while the projected output and the landing page keep their natural scale.
- `slide-template-defaults`: the starting font size for new and bundled slide templates.
- `bible-version-catalog`: how the list of available Bible translations is assembled — remote catalog first, bundled catalog as fallback, bundled/downloaded versions always present.

### Modified Capabilities
<!-- openspec/specs/ is empty in this repository (no change has been synced yet), so every capability above is declared as new. -->

## Impact

- `apps/bibletime/src/modules/library/services/output-window.ts` (reuse-without-navigate), `apps/bibletime/src/routes/present/index.tsx` (liveness signal for the console).
- `packages/ui/src/styles/globals.css` plus the root element of the console shell views (`console-view`, template builder routes, `settings-view`, `slideshow-view`) for density; possibly a couple of fixed sidebar widths in `console-view.tsx`.
- `apps/bibletime/src/modules/presentation/services/slide-template.ts` (`DEFAULT_SLIDE_TEMPLATE.fontSize`), `apps/bibletime/src/modules/templates/services/bundled-templates.ts`, and any tests asserting 36/48.
- `apps/bibletime/src/modules/bible/services/get-bible-versions.ts`, a new bundled catalog module under `modules/bible/services/`, `docs/bible-data.md`.
- No new dependencies. No data migration: saved templates and downloaded versions are untouched.
