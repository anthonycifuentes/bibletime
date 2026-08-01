## Context

`apps/bibletime` is a TanStack Start + React app shared with the `apps/desktop` Electron shell (the shell just loads the web app in a window). The app is currently English-only with all copy hardcoded inline, and has no runtime theme switching — `packages/ui/src/styles/globals.css` already defines a `.dark` Tailwind variant block, but nothing ever adds/removes `.dark` on `<html>`. There is no i18n or theme-provider dependency installed anywhere in the repo (`root`, `apps/bibletime`, `packages/ui`).

The existing `modules/bible/` module is the reference for screaming architecture in this app: `interfaces/`, `services/`, `actions/`, `components/`, `views/`, an `index.ts` barrel, plus ad-hoc `lib/` for pure helpers. `modules/core/` today is a thin cross-cutting module holding only `layout/` (sidebar/nav) and `providers/` (a single `AppQueryProvider` wrapping `@tanstack/react-query`, wired in `routes/__root.tsx`). `packages/ui/src/components/` has `select.tsx` but no `switch`/`radio-group`/`tabs` primitive.

`apps/desktop/src/preload.ts` already bridges `window.bibletime.versions` (Electron/Chrome/Node versions via `process.versions`) but does not yet expose the app's own package version.

## Goals / Non-Goals

**Goals:**
- Let a user switch the whole app's UI language between English, Spanish, and Portuguese, with the choice persisted across restarts.
- Let a user switch between light, dark, and system theme, with the choice persisted across restarts, using the `.dark` CSS support that already exists.
- Ship a new `settings` module, following the same screaming-architecture conventions as `modules/bible/`, exposing language, theme, system info, and a donate placeholder on one `/settings` screen.
- Keep the implementation dependency-free (no `i18next`, `next-themes`, etc.) — this app has a small, static string set and only 3 locales / 3 theme values, which a small hand-rolled context/hook covers with far less surface area than a general-purpose library.

**Non-Goals:**
- Translating the bundled Bible text itself (RVR1960 stays Spanish-only Bible content; that's a data/version concern unrelated to UI locale, already out of scope per the proposal).
- Pluralization/ICU message formatting — the app's copy is short, static UI labels, not sentences requiring plural rules.
- Real donation/payment integration — placeholder content only.
- New design-system primitives (switch, radio-group) — the existing `select.tsx` covers both pickers (3 options each).
- Auto-detecting and translating third-party/system strings (e.g. OS-level dialogs).

## Decisions

### i18n: hand-rolled context + dictionaries, not a library
`modules/core/i18n/`:
- `dictionaries/en.ts`, `dictionaries/es.ts`, `dictionaries/pt.ts` — flat key → string objects (e.g. `"sidebar.bible": "Bible"`). `en.ts` is the source of truth; `es.ts`/`pt.ts` are typed as `Record<keyof typeof en, string>` so a missing key in either translation is a **compile error**, not a silent fallback.
- `locale-context.tsx` — `LocaleProvider` + `useTranslation()` hook returning `{ t, locale, setLocale }`. `t(key)` looks up the active dictionary.
- Persisted to `localStorage` (`bibletime:locale`); on first run, falls back to matching `navigator.language`'s language prefix against `en`/`es`/`pt`, else `en`.
- **Alternative considered**: `react-i18next`. Rejected — brings namespace loading, interpolation/pluralization machinery, and a backend-plugin model this app doesn't need for ~a few dozen static UI strings; the codebase already favors small hand-rolled solutions over libraries for scoped problems (e.g. `parse-reference.ts`, the single-file `AppQueryProvider`).
- **Alternative considered**: per-route/per-module dictionaries (like i18next namespaces). Rejected for v1 — the string set is small enough that one flat dictionary per locale is easier to keep in sync (one file to diff for completeness) than several.

### Theme: hand-rolled context toggling the existing `.dark` class
`modules/core/theme/`:
- `theme-context.tsx` — `ThemeProvider` + `useTheme()` hook returning `{ theme, setTheme }` where `theme` is `"light" | "dark" | "system"`.
- Resolves `"system"` via `matchMedia("(prefers-color-scheme: dark)")` and subscribes to its `change` event so the app follows OS changes live.
- Adds/removes the `dark` class on `document.documentElement` as a side effect; persists the raw `theme` value (not the resolved one) to `localStorage` (`bibletime:theme`).
- A small inline blocking script in `routes/__root.tsx`'s `<head>` reads `localStorage` synchronously and sets the class before paint, to avoid a flash of the wrong theme on load — same pattern used by every theme-toggle implementation that doesn't control SSR output.
- **Alternative considered**: `next-themes`. Rejected — it's one `useEffect` + one class toggle + one `matchMedia` listener; a dependency isn't justified for something this small, and this repo has no existing theme-library usage to extend.

### Settings module structure (mirrors `modules/bible/`)
```
modules/settings/
├── components/
│   ├── language-picker.tsx    # <Select> over the 3 locales, calls useTranslation().setLocale
│   ├── theme-picker.tsx       # <Select> over light/dark/system, calls useTheme().setTheme
│   ├── system-info-panel.tsx  # app version + platform + (desktop-only) Electron/Chrome/Node versions
│   └── donate-panel.tsx       # static placeholder support/donate content
├── views/
│   └── settings-view.tsx      # composes the 4 sections on one screen
└── index.ts                   # exports the view
```
No `services/`/`actions/` layer — nothing here fetches data; `system-info-panel` reads synchronous values (`window.bibletime?.versions`, a build-time app-version constant, `navigator.platform`/`process.platform`). No `interfaces/` — `Locale`/`ThemeMode` types live with their providers in `modules/core/`, since they're cross-cutting, not settings-specific.

The i18n and theme providers live in `modules/core/` (not `modules/settings/`) because every module's copy needs translating and every screen needs the theme applied — the settings module is only where the user *changes* these, not where the mechanism lives. This mirrors how `AppQueryProvider` already lives in `core/providers/` rather than inside whichever module first used a query.

### System info: version needs a new preload field
`window.bibletime.versions` (Electron/Chrome/Node) already exists but the app's own package version isn't bridged. Add `appVersion: app.getVersion()` to the object exposed in `preload.ts` (reads from `apps/desktop/package.json` via Electron's `app.getVersion()`, which already reflects that file). For the web-only build (no Electron), `window.bibletime` is `undefined`; the panel falls back to a build-time constant injected via Vite's `define` (`__APP_VERSION__` sourced from `apps/bibletime/package.json`) and shows only "Platform: Web" (no Electron/Chrome/Node rows).

### UI: reuse `select.tsx`, no new design-system primitives
Both pickers are 3-option choices — `@workspace/ui`'s existing `Select` component covers this. No new `Switch`/`RadioGroup` primitive is added in this change.

### Routing and nav
- New `routes/settings/index.tsx`, one screen, no sub-routes (consistent with the single-screen pattern already used for `/bible`).
- `app-sidebar.tsx`: replace the "Settings" entry's placeholder `url: "#"` (if one already exists) or add one, with a gear-style Hugeicons icon, `url: "/settings"`.

## Risks / Trade-offs

- **Flash of wrong theme on load** → Mitigated with the small blocking inline script in `__root.tsx`'s head (reads `localStorage`, sets the class before first paint).
- **Translation drift as new UI copy is added after this change** → Mitigated structurally: `es`/`pt` dictionaries are typed against `en`'s keys, so any new key added to `en.ts` without a matching translation fails `tsc`, not silently falling back to English at runtime.
- **Electron vs. web divergence for system info** → Mitigated with feature detection (`window.bibletime?.versions` optional chaining); the panel degrades gracefully to app-version + "Web" on the browser build.
- **Retrofitting every existing hardcoded string to use `t()`** is the largest mechanical risk (easy to miss a string) → Mitigated by scoping translation to the currently-shipped screens only (sidebar nav, Bible console, templates list) per the tasks breakdown, not a global grep-and-replace in one shot; anything missed surfaces as an obviously-English string in a non-English locale during manual verification.

## Migration Plan

Purely additive — no existing data/state to migrate. Default locale resolves from `navigator.language` (falling back to `en`); default theme is `system` (falling back to the app's current always-light appearance if the OS itself has no dark-mode preference signal). No rollback concerns beyond reverting the change; nothing this change touches is a breaking API.

## Open Questions

- Exact donate placeholder copy/links — proposal explicitly defers real payment info to a later change; this design assumes a single obviously-placeholder string (e.g. a "buy me a coffee"-style placeholder URL) that's trivial to swap out.
- Whether locale should be independently overridable from theme in the URL (e.g. `?lang=es`) for shareable links — not requested, treated as a non-goal unless raised later.
