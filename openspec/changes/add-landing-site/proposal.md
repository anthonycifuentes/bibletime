## Why

BibleTime has no public face. Visiting the deployed site drops you straight into the console at `/library` — the root route is a bare `redirect` — so there is nowhere to send someone who hasn't used it yet, nowhere to explain what it does, and no page that says "this is free, here's the download."

The app is free and it's meant to stay that way, so the missing page isn't a sales page. It's a showcase: enough for a worship leader who was handed a link to understand what the app is, see what it looks like, and get the desktop build or open the web version — in under a minute, in their own language.

## What Changes

### The site root becomes a landing page

- `/` renders a public landing page instead of redirecting to `/library`. The console is unchanged and stays exactly where it is.
- The page is one screen of **bento cards** on a dark-friendly, token-driven canvas — the same neutral palette and `--signal` green accent the console already uses, in both light and dark themes. No new colors, no new fonts, no marketing chrome.

### Cards expand in place

- Each feature card is a button. Clicking (or Enter/Space on) a card **expands it in place** into a larger cell showing a full screenshot and a longer description; clicking again, pressing Escape, or opening another card collapses it. **One card is expanded at a time.**
- The collapsed state carries a corner affordance (the diagonal arrow from the reference) so it reads as expandable before anyone clicks it.
- Expansion is a layout/size transition, disabled under `prefers-reduced-motion`. On narrow screens the grid becomes a single column and expansion is purely vertical.

### Screenshots are placeholders for now

- Every image slot renders a **neutral aspect-ratio placeholder** — no broken images, no layout shift when the real file lands.
- Image paths live in one content manifest keyed by card id, so replacing a placeholder later is dropping a file into `public/` and editing one string. No component changes.

### Downloads point at GitHub Releases

- The primary action is **Download — free**, linking to `https://github.com/anthonycifuentes/bibletime/releases` (macOS, Windows, Linux listed as what's there, not as three separate hard-coded asset URLs that would rot on the next release).
- The secondary action is **Open in the browser** → `/library`, for anyone who doesn't want to install anything.
- Nothing on the page asks for an account, an email, or a payment. There is no signup, because there is no account system.

### It speaks the three languages the app already speaks

- All landing copy goes through the existing `en`/`es`/`pt` dictionaries, resolved by the `LocaleProvider` that's already mounted in the root shell. No per-locale routes, no separate landing translation mechanism.

### The desktop shell stops entering through the root

- The packaged app loads `resolvedWebUrl` — i.e. `/` — which today lands on the console via the redirect. With a landing page there, **the desktop app would boot into a marketing page**. The shell's start URL becomes `/library` so the packaged app goes straight to the console, dev and bundled alike.

## Capabilities

### New Capabilities

- `landing-page`: the public page at `/` — what it shows (hero, feature cards, footer), what its actions do (GitHub Releases download, open-in-browser), that it is free-of-charge messaging with no signup, that images are swappable placeholders, that it is localized in en/es/pt, that it is responsive, and its document title/description.
- `landing-bento-expansion`: the expand-in-place interaction — one card open at a time, pointer and keyboard activation, Escape to collapse, the expandable affordance, focus behavior, reduced-motion, and the single-column mobile fallback.

### Modified Capabilities

- `console-shell-navigation`: gains an entry-point requirement. The console is reached at `/library`, `/` is no longer a redirect into it, and the desktop shell opens the console directly rather than through the site root. Nothing about the tabs, the header, or the sidebar changes.

## Impact

**New:**
- `apps/bibletime/src/modules/landing/` — `views/landing-view.tsx`, `components/` (bento grid, bento card, hero card, download actions, screenshot placeholder, footer), `interfaces/index.ts`, `lib/landing-content.ts` (the card manifest), `index.ts`.

**Modified:**
- `apps/bibletime/src/routes/index.tsx` — renders `LandingView` and its `head` meta instead of throwing a redirect.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — the `landing.*` keys, all three locales.
- `apps/desktop/src/main.ts` — the main window loads the console URL rather than the site root.

**Unchanged deliberately:** every existing route and view, the console shell, the theme and locale providers, `packages/ui` (the landing composes existing primitives; it adds no design-system components), and the deploy setup — the landing is a route in the existing app, not a second site.

**Out of scope:** a blog, docs, changelog, or feature-comparison pages; analytics or tracking; per-locale URLs and hreflang; a language or theme switcher on the landing (locale follows the browser, theme follows the stored preference); direct per-platform release asset links; and producing the actual screenshots — those arrive later as file drops.
