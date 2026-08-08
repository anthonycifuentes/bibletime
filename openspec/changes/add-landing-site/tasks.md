## 1. Module scaffold and content model

- [x] 1.1 Create `apps/bibletime/src/modules/landing/` with `views/`, `components/`, `lib/`, `interfaces/`, and `index.ts` (exporting `LandingView` only), following the app's module layout.
- [x] 1.2 Define `LandingCardId` and `LandingCard` in `modules/landing/interfaces/index.ts` — `id`, `titleKey`/`blurbKey`/`detailKey` typed as `TranslationKey`, `image: string | null`, `aspect: "phone" | "wide"`, `span: "sm" | "md"`.
- [x] 1.3 Write `modules/landing/lib/landing-content.ts` — the ordered card manifest covering Bible, Songs, Media & Notes, Templates & backgrounds, Presentation output, and Offline & free, every `image` set to `null` for now.
- [x] 1.4 Add the GitHub Releases URL and the `/library` target as named constants in `lib/landing-content.ts` so no URL is inlined in a component.

## 2. Copy in three locales

- [x] 2.1 Add the `landing.*` keys to `dictionaries/en.ts` — tagline, download CTA + "free" line, platform line, open-in-browser CTA, per-card title/blurb/detail, image alt strings, expand affordance label, footer strings.
- [x] 2.2 Translate the same keys in `dictionaries/es.ts`.
- [x] 2.3 Translate the same keys in `dictionaries/pt.ts`.
- [x] 2.4 Run `pnpm --filter web typecheck` and confirm no missing-key errors in `es`/`pt`.

## 3. Presentational components

- [x] 3.1 Build `components/screenshot-frame.tsx` — fixed aspect-ratio box rendering either an `<img>` (`loading="lazy"`, dictionary `alt`) or a neutral tokened placeholder when `src` is `null`, with identical box geometry in both cases.
- [x] 3.2 Build `components/download-actions.tsx` — primary `<a>` to GitHub Releases (`target="_blank" rel="noreferrer"`, `bg-signal`), secondary `Link` to `/library`, and the "macOS · Windows · Linux" line plus the free-of-charge statement.
- [x] 3.3 Build `components/landing-hero.tsx` — app icon, "BibleTime" wordmark, one-sentence tagline, and `DownloadActions`. Not a button and not expandable.
- [x] 3.4 Build `components/landing-footer.tsx` — GitHub link, free/open statement, and a link into the console. Keep it to one row.

## 4. Bento grid and expansion

- [x] 4.1 Build `components/bento-card.tsx` as a single `<button type="button">` with `aria-expanded` and `aria-controls`, rendering title, blurb, `ScreenshotFrame`, the corner expand affordance, and the detail text only when expanded. No interactive element inside it.
- [x] 4.2 Build `components/bento-grid.tsx` — responsive grid (1 / 2 / 4 columns), hero cell plus mapped cards, holding the `expandedId: LandingCardId | null` state so at most one card is open.
- [x] 4.3 Apply expanded sizing by class swap (the expanded card takes the full row at `lg` — see design.md decision 3 — and full width in the single-column layout) and animate the revealed detail content with `motion-safe:` transitions using `--ease-out-expo`.
- [x] 4.4 Wrap the expand/collapse state update in `document.startViewTransition` when it exists and reduced motion is not requested; fall back to a plain state update otherwise.
- [x] 4.5 Handle Escape via `onKeyDown` on the grid container to collapse the open card, leaving focus on the card's button.
- [x] 4.6 On the single-column layout, scroll the newly expanded card into view with `block: "nearest"`.

## 5. Route and metadata

- [x] 5.1 Replace the `beforeLoad` redirect in `apps/bibletime/src/routes/index.tsx` with `component: LandingView`.
- [x] 5.2 Add a route-level `head` with a landing-specific `title` and `description` distinct from the console's defaults.
- [x] 5.3 Compose `views/landing-view.tsx` — page shell (`bg-background`, centered max-width, page padding), `BentoGrid`, `LandingFooter` — and confirm no console module is imported anywhere in `modules/landing`.

## 6. Desktop entry point

- [x] 6.1 In `apps/desktop/src/main.ts`, load `new URL("/library", resolvedWebUrl).toString()` at the `win.loadURL` call in `createWindow`, leaving `setWindowOpenHandler` and the `/present` path untouched.
- [x] 6.2 Verify the dev shell (`BIBLETIME_WEB_URL` / `localhost:3000`) opens the console, not the landing page.

## 7. Verification

- [x] 7.1 Check `/` at phone, tablet, and desktop widths — no horizontal scrolling, grid collapses to one column, CTAs reachable without scrolling on desktop.
- [x] 7.2 Check `/` in both dark and light themes — every surface, border, and text pair renders legibly with no hard-coded color.
- [x] 7.3 Keyboard pass: Tab to each card, Enter/Space expands, a second card collapses the first, Escape collapses and keeps focus, and both CTAs are reachable without expanding anything.
- [x] 7.4 Run with reduced motion enabled and confirm the expansion applies with no transition and the detail content is fully visible.
- [x] 7.5 Confirm `/library` and the rest of the console are unchanged, and that no landing image request 404s.
- [x] 7.6 Launch a packaged desktop build and confirm the main window opens the console.
- [x] 7.7 Run `pnpm --filter web typecheck` and `pnpm --filter web lint` clean.
