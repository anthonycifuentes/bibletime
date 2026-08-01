## Why

Bibletime is currently English-only and has no place for app-level configuration — there's no way to switch language, switch theme, see what version/platform you're running, or find out how to support the project. The user wants Spanish, English, and Portuguese support (the app's primary audience spans all three), plus a single `Settings` module to house language, theme, system info, and donation info so these concerns aren't scattered across the app.

## What Changes

- Add a lightweight, custom i18n layer (React context + plain JSON dictionaries, no new runtime dependency) supporting `en`, `es`, and `pt`, with the selected locale persisted to `localStorage` and applied to all existing user-facing UI copy (sidebar nav, Bible console, templates, etc.).
- Add a lightweight theme layer (React context that toggles the `.dark` class already defined in `packages/ui/src/styles/globals.css`) supporting `light`, `dark`, and `system`, persisted to `localStorage` — this class-toggle mechanism doesn't exist yet even though the dark-mode CSS does.
- Add a new `settings` module (screaming architecture, mirroring `modules/bible/`) with a single `/settings` screen containing:
  - **Language**: a picker to switch between English, Español, and Português.
  - **Theme**: a picker to switch between Light, Dark, and System.
  - **System information**: app version, platform, and (on desktop) Electron/Chrome/Node versions read from the existing `window.bibletime.versions` preload bridge.
  - **Support / Donate**: a static section with placeholder donation info (e.g. a placeholder link/handle) — real payment details are explicitly out of scope for this change and will be swapped in later.
- Add a "Settings" entry to the sidebar nav (`app-sidebar.tsx`), replacing its current `#` placeholder, pointing at `/settings`.
- Out of scope: translating any Bible text content itself (the bundled RVR1960 data stays Spanish-only text, unrelated to UI locale), adding new theme values beyond light/dark/system, wiring real donation/payment processing, and per-module settings (e.g. a Bible-specific reading preference) beyond what's listed above.

## Capabilities

### New Capabilities
- `multilingual-ui`: locale infrastructure (context/provider, persisted selection, translation dictionaries) and translated UI copy across the app for English, Spanish, and Portuguese.
- `app-settings`: the new Settings module — language switcher, theme switcher (with its own light/dark/system infrastructure), system information display, and a placeholder donation/support section, reachable via a sidebar nav entry and `/settings` route.

### Modified Capabilities
(none — `openspec/specs/` has no existing capabilities yet; this is one of the first changes to define any)

## Impact

- New `apps/bibletime/src/modules/core/i18n/` (or similar): locale context/provider, dictionaries, `useTranslation` hook — consumed app-wide, not just by the settings module.
- New `apps/bibletime/src/modules/core/theme/` (or similar): theme context/provider, `useTheme` hook — consumed app-wide.
- New `apps/bibletime/src/modules/settings/*`: full module build-out (interfaces, components, views).
- New route `apps/bibletime/src/routes/settings/index.tsx`.
- `apps/bibletime/src/modules/core/layout/app-sidebar.tsx` — "Settings" nav item points at a real route instead of `#`.
- `apps/bibletime/src/routes/__root.tsx` — wire the new locale/theme providers alongside the existing `AppQueryProvider`.
- Existing UI copy across `modules/bible`, `modules/core/layout`, and other routed screens — replaced with translated strings via the new i18n hook.
- `apps/desktop/src/preload.ts` / `main.ts` — may need a small addition to expose app version (currently only `process.versions` is bridged, not the app's own package version) for the system-information panel.
- No new runtime dependencies expected (custom i18n/theme layers instead of `i18next`/`next-themes`) — confirmed during design.
