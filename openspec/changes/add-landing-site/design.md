## Context

Everything this change needs already exists in the app; almost nothing has to be invented.

- **The root route is one line of redirect.** `apps/bibletime/src/routes/index.tsx` throws `redirect({ to: "/library" })` in `beforeLoad`. Replacing it with a component is the whole routing change.
- **The shell already wraps every route** — `__root.tsx` mounts `AppQueryProvider`, `LocaleProvider`, `ThemeProvider`, `AspectRatioProvider`, `TooltipProvider`, and the pre-paint theme script. A landing route inherits locale and theme for free and needs no provider of its own.
- **The palette is already the reference's palette.** `packages/ui/src/styles/globals.css` defines a neutral grayscale plus one accent, `--signal` (`oklch(0.6 0.16 152)` light / `oklch(0.75 0.17 152)` dark) — a green in the same family as the reference site's. There is no reason to add a color.
- **Type is already set**: `--font-sans: 'Essential Sans Display'`, and a radius scale up to `--radius-4xl` (`0.625rem × 2.6`) that gives bento-sized corners without new values.
- **i18n is dictionary-typed**: `en.ts` is the source of truth and `es`/`pt` are typed against `keyof typeof en`, so a missing translation fails `tsc` rather than falling back silently.
- **The desktop shell loads the site root.** `apps/desktop/src/main.ts:1423` does `win.loadURL(resolvedWebUrl)`, where `resolvedWebUrl` is `http://localhost:3000` in dev and the bundled Nitro server's origin when packaged. Today that root redirects into the console; after this change it would land on a marketing page. This is the one place outside the app where the change has teeth.

The architectural constraint is the repo's screaming-architecture rule: one module per domain under `src/modules/<entity>`, views compose that module's own components, no cross-module component imports, alias imports only. The landing is a domain, so it gets a module.

## Goals / Non-Goals

**Goals:**

- A first-time visitor understands what BibleTime is and gets to a download in one screen and one click.
- The page looks like the app — same tokens, same type, same restraint — not like a template someone bought.
- The bento cards expand in place, and do so accessibly: keyboard, screen reader, reduced motion.
- Screenshots are a file drop away. Adding one is adding a file and editing one string.
- Zero new dependencies, zero new design-system components, zero change to the console.
- The packaged desktop app never sees the landing page.

**Non-Goals:**

- A second site, a static-site generator, or a separate deploy. This is a route.
- Per-locale URLs, hreflang, sitemaps, structured data, analytics.
- Direct per-platform release asset URLs. (Decision 6.)
- A language or theme switcher on the landing. (Decision 7.)
- Video, parallax, scroll-jacking, or a hero animation budget the console doesn't spend.

## Decisions

### 1. The landing is a module, not a fat route file

New `apps/bibletime/src/modules/landing/`:

```
landing/
├── views/landing-view.tsx          # the page: hero cell + grid + footer
├── components/
│   ├── bento-grid.tsx              # owns which card is expanded + Escape
│   ├── bento-card.tsx              # one expandable feature card
│   ├── landing-hero.tsx            # icon, wordmark, tagline, the two CTAs
│   ├── download-actions.tsx        # the CTA pair + platform line
│   ├── screenshot-frame.tsx        # aspect-ratio box: image or placeholder
│   └── landing-footer.tsx          # GitHub, "free and open", console link
├── lib/landing-content.ts          # the card manifest
├── interfaces/index.ts             # LandingCard, LandingCardId
└── index.ts                        # exports LandingView only
```

`routes/index.tsx` becomes a component route plus a `head` for the meta, importing `LandingView` from `@/modules/landing`. This is the same shape as `routes/library/index.tsx` → `ConsoleView`. The alternative — writing the page inline in the route file — would put ~400 lines of UI in the routing layer and break the rule that every other screen in this app follows.

The landing module imports nothing from `library`, `bible`, `songs`, or any other feature module. Its only outside imports are `@workspace/ui` primitives, `@/modules/core/i18n`, and `@tanstack/react-router`'s `Link`.

### 2. One content manifest drives the grid

`lib/landing-content.ts` exports an ordered array of card descriptors:

```ts
{ id: "bible", titleKey: "landing.card.bible.title",
  blurbKey: "landing.card.bible.blurb", detailKey: "landing.card.bible.detail",
  image: null, aspect: "phone" | "wide", span: "sm" | "md" }
```

The keys are typed as `TranslationKey`, so a card referencing a string that doesn't exist in `en.ts` fails `tsc`. Cards render by mapping this array; nothing about the grid is hand-written per card.

This is what makes the screenshot promise real: `image: null` today renders the placeholder, `image: "/landing/bible.webp"` tomorrow renders the file, and no component changes either way.

### 3. Expansion is CSS grid span + a View Transition, not a layout-animation library

The grid is a plain CSS grid (`1` column on mobile, `2` on `md`, `4` on `lg`). A collapsed card spans its manifest size; the expanded card takes the **whole row** and lays its content out horizontally — text beside a height-sized screenshot. Toggling that is a class swap.

*(Amended during implementation. The first attempt spanned two columns and two rows, which looked right on paper and wrong on screen: rows here are sized by their content, so a card spanning two of them inherits its neighbours' heights and opens as a ~900px box that is mostly empty. Taking the full row lets the expanded card's own content decide how tall it gets.)*

Grid placement is not an animatable property, so the size change itself is instantaneous by default; the *content* revealed inside the expanded card fades and slides in over ~180ms with `--ease-out-expo`. On top of that, the state update is wrapped in `document.startViewTransition` **when it exists**, which morphs the whole grid smoothly on browsers that support it and is a no-op everywhere else.

Alternatives considered:

- **GSAP Flip** — GSAP is already a dependency, so this was tempting. Rejected because it means measuring DOM before and after every toggle, owning the inverted transforms, and keeping that correct across breakpoints and reflows — a lot of machinery for a card that gets bigger.
- **Framer Motion `layout`** — a new dependency for one interaction.
- **Animating `max-height`** — only works in a single column; the whole point is a grid.

The honest trade-off is recorded in Risks: on a browser without View Transitions, the grid *snaps* to its new layout while the content fades in. That reads as deliberate at this speed, and it is the behavior reduced-motion users get anyway.

### 4. The card is a button, so nothing interactive lives inside it

Each feature card renders as a single `<button type="button" aria-expanded={isOpen} aria-controls={panelId}>` wrapping its title, blurb, image, and — when expanded — its detail text. Nesting a link or button inside a button is invalid HTML and breaks keyboard and screen-reader behavior, so **expanded content contains only text and an image**. Anything actionable belongs to the hero or the footer, which are not buttons.

This is also why the hero is a *cell*, not a card: it holds the two real CTAs and does not expand.

Escape is handled by an `onKeyDown` on the grid container, not a `window` listener — the expanded card always holds focus (it's the button that was activated), so the event reaches the container by bubbling, and there's nothing to add or remove on mount.

`prefers-reduced-motion` is honored twice: the content transition is behind Tailwind's `motion-safe:` variant, and `startViewTransition` is skipped when the media query matches.

### 5. Placeholders reserve the box, and never 404

`screenshot-frame.tsx` takes `src: string | null` and an aspect ratio, and renders either an `<img>` or a neutral placeholder — a muted surface with a subtle border and the app glyph at low opacity — inside a box whose aspect ratio is fixed by CSS in both cases. Nothing is decided by a load error, because an `onError` fallback would still hit the network, still log a 404, and can't run during SSR.

Real images later go in `apps/bibletime/public/landing/`, `.webp`, `loading="lazy"` for everything below the hero, with `alt` text from the same dictionary as the card title.

### 6. Downloads point at the Releases index, not at asset URLs

The primary CTA is an `<a href="https://github.com/anthonycifuentes/bibletime/releases">` with `target="_blank" rel="noreferrer"`; "macOS · Windows · Linux" sits under it as text.

Per-platform direct links would need the version in the URL (`.../download/v1.2.3/BibleTime-1.2.3-arm64.dmg`) and would silently 404 on the next release unless someone edits the landing page in lockstep. `electron-builder.yml` has no `publish` block today — the mac target is even `dir` — so there is no stable asset naming to link to yet. The Releases index is correct now and stays correct; direct links are a later change once publishing is set up.

### 7. Locale and theme follow the app; the landing adds no switcher

`LocaleProvider` already resolves the browser language against `en`/`es`/`pt`, and the pre-paint script already applies the stored theme. A visitor with a Spanish browser gets Spanish; a visitor whose OS is dark gets dark.

No pickers on the landing: `LanguagePicker` and `ThemePicker` live in `modules/settings`, and importing them would violate the no-cross-module-components rule. Promoting them to `core` for a marketing page is not worth it, and a minimalist page is better without them.

One known consequence, inherited from the existing design: `LocaleProvider` renders `"en"` on the server and on first client paint, then resolves the real locale in an effect. Non-English visitors see a brief flash of English. This is the same trade-off the console already accepts, documented in `add-settings-module`, and this change does not re-litigate it.

### 8. The desktop shell loads the console URL

`main.ts` gains a single helper — `new URL("/library", resolvedWebUrl).toString()` — used at `win.loadURL`. It works for both origins (`http://localhost:3000` in dev, the bundled Nitro origin when packaged) and it is a one-line change at the single call site.

Rejected alternative: detecting Electron inside the root route and redirecting. That puts the desktop's concerns in the web app's routing layer, keeps a redirect on the hot path for every web visitor, and would still flash the landing page before the redirect fires. Also considered and rejected: giving the desktop its own bundled route — the shell already serves the whole app, so there's nothing to fork.

The `setWindowOpenHandler` that routes `/present` to a second window is untouched.

### 9. The tokens do the styling; the page adds no CSS

Surfaces are `bg-card` on a `bg-background` page, `border-border` hairlines, `rounded-3xl`/`rounded-4xl` corners from the existing radius scale, `text-muted-foreground` for blurbs, and `bg-signal`/`text-signal` for the single accent — the primary CTA and the expand affordance. No new custom properties, no `globals.css` edit, no arbitrary hex values.

The dark theme is the one the reference evokes and the one most visitors will see (the app defaults to system), but the page is written token-first so light renders correctly rather than as an afterthought.

## Risks / Trade-offs

- **The grid snaps instead of morphing on browsers without View Transitions** → The revealed content still animates, and the snap is a single frame at a size change the user just asked for. Recorded rather than solved; a Flip implementation can be added later without changing the component API.
- **Expanding a card reflows the cards after it, so the page height changes under the visitor** → The expanded card keeps its own position (it grows down and right, and the grid's auto-flow keeps it anchored), and on the single-column layout the card is scrolled into view with `block: "nearest"`. The activated card is never the one that moves off-screen.
- **The root route now ships the landing page's JS to every visitor, including ones who only want the console** → The landing module is small (no query client use, no heavy primitives), and TanStack Router code-splits per route, so console visitors don't pay for it and vice versa.
- **A desktop build that misses the `/library` change boots into the marketing page** → It's a one-line change in a file this proposal already touches, and it is called out as its own task with a manual verification step (launch the packaged app, confirm the console).
- **Screenshots may never arrive, leaving a page of gray boxes** → The placeholder is designed to look intentional (a labeled, tokened surface), and the page's copy carries the meaning on its own. Cards are readable without their images.
- **Three locales × ~30 keys is real translation surface** → `es.ts`/`pt.ts` are typed against `en.ts`, so an untranslated key can't ship silently; it fails `pnpm typecheck`.
- **"Free" is a claim on the page** → It matches reality: no accounts, no server-side anything, GitHub Releases. If that ever changes, the copy is one dictionary key.

## Migration Plan

1. Land the landing module and the route swap together — `/` must never be a dead route.
2. Land the desktop `loadURL` change in the same commit; a packaged build from an intermediate commit would boot into the landing page.
3. Verify in this order: `/` in a browser (dark and light, phone and desktop widths), `/library` unchanged, keyboard round-trip through the cards, then a packaged desktop launch.
4. Rollback is restoring the four-line `beforeLoad` redirect in `routes/index.tsx` and the plain `loadURL(resolvedWebUrl)`. The landing module can stay on disk, unreferenced.

## Open Questions

- Final card copy per locale — the implementation ships accurate, plain descriptions of what each capability does; a native-speaker pass on `es`/`pt` phrasing can follow.
- Whether to add an `og:image` (and therefore a social preview asset) once real screenshots exist. Deferred with the screenshots.
- Whether a per-platform download row replaces the Releases link once `electron-builder` gains a `publish` target and stable asset names.
