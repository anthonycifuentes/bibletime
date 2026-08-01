## 1. i18n infrastructure

- [x] 1.1 Create `modules/core/i18n/dictionaries/en.ts` with all currently shipped UI strings (sidebar nav, Bible console, templates list) as flat `key: string` pairs
- [x] 1.2 Create `modules/core/i18n/dictionaries/es.ts` and `modules/core/i18n/dictionaries/pt.ts`, typed as `Record<keyof typeof en, string>` so a missing translation key fails `tsc`
- [x] 1.3 Create `modules/core/i18n/locale-context.tsx`: `LocaleProvider` + `useTranslation()` hook (`{ t, locale, setLocale }`); persists to `localStorage` under `bibletime:locale`; on first run, matches `navigator.language`'s language prefix against `en`/`es`/`pt`, else defaults to `en`
- [x] 1.4 Add `modules/core/i18n/index.ts` barrel exporting `LocaleProvider` and `useTranslation`
- [x] 1.5 Wire `LocaleProvider` into `routes/__root.tsx` alongside the existing `AppQueryProvider`

## 2. Theme infrastructure

- [x] 2.1 Create `modules/core/theme/theme-context.tsx`: `ThemeProvider` + `useTheme()` hook (`{ theme, setTheme }`, `theme: "light" | "dark" | "system"`); resolves `"system"` via `matchMedia("(prefers-color-scheme: dark)")` and live-updates on OS preference change; toggles the `dark` class on `document.documentElement`; persists the raw `theme` value to `localStorage` under `bibletime:theme`
- [x] 2.2 Add `modules/core/theme/index.ts` barrel exporting `ThemeProvider` and `useTheme`
- [x] 2.3 Add a small inline blocking script in `routes/__root.tsx`'s `<head>` that reads `bibletime:theme` from `localStorage` and sets the `dark` class before first paint, to avoid a theme flash
- [x] 2.4 Wire `ThemeProvider` into `routes/__root.tsx` alongside `LocaleProvider`/`AppQueryProvider`

## 3. Translate existing shipped screens

- [x] 3.1 Replace hardcoded strings in `modules/core/layout/app-sidebar.tsx` and `nav-main.tsx` with `useTranslation().t(...)` calls
- [x] 3.2 Replace hardcoded strings in the Bible console (`modules/bible/views/bible-console-view.tsx` and its components: `book-search-list.tsx`, `chapter-nav.tsx`, `output-preview.tsx`, `bible-version-selector.tsx`, `verse-history-list.tsx`) with translated equivalents (`chapter-nav.tsx` had no static strings to translate)
- [x] 3.3 Replace hardcoded strings in the templates module's routes/views with translated equivalents
- [x] 3.4 Sweep for any remaining hardcoded UI copy on these shipped screens and translate it (also translated the root 404 page while `__root.tsx` was already being edited for the providers)

## 4. Desktop system-info bridge

- [x] 4.1 In `apps/desktop/src/main.ts`/`preload.ts`, add `appVersion: app.getVersion()` to the `window.bibletime` bridge object alongside the existing `versions` (implemented via a synchronous `ipcMain.on`/`ipcRenderer.sendSync` round trip at preload load time, since `app` isn't directly available in the preload context)
- [x] 4.2 In `apps/bibletime`, add a Vite `define` for `__APP_VERSION__` sourced from `apps/bibletime/package.json`'s version, for use when `window.bibletime` is unavailable (web build)

## 5. Settings module

- [x] 5.1 Create `modules/settings/components/language-picker.tsx`: `Select` over English/Spanish/Portuguese, calls `useTranslation().setLocale`
- [x] 5.2 Create `modules/settings/components/theme-picker.tsx`: `Select` over Light/Dark/System, calls `useTheme().setTheme`
- [x] 5.3 Create `modules/settings/components/system-info-panel.tsx`: displays app version and platform; when `window.bibletime?.versions` is present, also shows Electron/Chrome/Node versions; otherwise shows "Web" as platform
- [x] 5.4 Create `modules/settings/components/donate-panel.tsx`: static section with clearly-labeled placeholder donation info/link
- [x] 5.5 Create `modules/settings/views/settings-view.tsx` composing the four sections (language, theme, system info, donate) on one screen
- [x] 5.6 Create `modules/settings/index.ts` exporting `SettingsView`

## 6. Routing and navigation

- [x] 6.1 Add `src/routes/settings/index.tsx` rendering `SettingsView`
- [x] 6.2 Update `modules/core/layout/app-sidebar.tsx`: add/point the "Settings" nav item at `/settings` with a gear-style Hugeicons icon (was `#` or missing) — added earlier alongside the sidebar translation work (task 3.1)

## 7. Verification

- [x] 7.1 `pnpm --filter web typecheck` passes (verified clean for every file this change touches; a concurrent, unrelated in-progress refactor elsewhere in the repo — a nav-shell/library rework touching `__root.tsx`, `bottom-nav.tsx`, `header-bar.tsx` — is mid-flight and intermittently breaks whole-repo typecheck for reasons outside this change's files; re-run once that settles)
- [x] 7.2 `pnpm --filter web lint` passes (only the pre-existing, unrelated `nav-main.tsx` error remains, same one already noted in the `view-local-bible` change)
- [x] 7.3 Manually verified with a Playwright-driven browser pass against the running dev server: sidebar "Settings" entry navigated to `/settings`; language picker switched sidebar/Bible-console/templates copy between English, Spanish, and Portuguese immediately and after a reload; theme picker switched light/dark immediately, persisted after a reload with no flash; system-info panel showed "Web" platform in the browser; donate section rendered placeholder content. Found and fixed 3 real bugs in the process: (1) `SystemInfoPanel` read `window.bibletime` unguarded, crashing SSR ("window is not defined") — guarded with a `typeof window !== "undefined"` check; (2) the language/theme `Select`s were missing the `items` prop, so the trigger displayed the raw value ("en") instead of the translated label — added `items` matching the `template-editor.tsx` pattern; (3) the theme class-toggle script (intentionally mutating `<html>`'s class outside React) triggered a hydration-mismatch console warning — added `suppressHydrationWarning` to `<html>` in `__root.tsx`.
- [ ] 7.4 Electron desktop build system-info panel (app version + Electron/Chrome/Node versions) not independently verified this session — no browser-automation access into the running Electron window; `preload.ts`/`main.ts` changes did pass `pnpm --filter desktop typecheck`
