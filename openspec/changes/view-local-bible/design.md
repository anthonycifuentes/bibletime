## Context

`apps/bibletime` (TanStack Start + React + `@workspace/ui`) is the shared codebase for both the web app and the `apps/desktop` Electron shell — the shell just loads the web app's dev server/build in a window, so anything that works for the web app works for desktop with no extra wiring. The `bible` module (`apps/bibletime/src/modules/bible/index.ts`) is currently an empty stub, and the "Bible" sidebar entry (`app-sidebar.tsx`) links to `#`.

The user has a source Bible export, `RVR1960_vid_149.json` (Reina-Valera 1960, 66 books, 1255 chapters), at the repo root. Its shape matches the `Version` type documented in the sibling `reading-json-files` project (`src/types.ts`), which also demonstrates how to walk `book → chapter → items[]` to render verse text (see its `src/index.ts`). Each chapter carries both a rendered `chapter_html` string and a structured `items` array (headings, labels, verses with `verse_numbers`/`lines`); the app only needs `items`.

Measured on the actual file: `chapter_html` accounts for 10.58MB of the 23.6MB source. Stripping it drops the JSON to 6.19MB (uncompressed) with zero loss of information the app renders.

## Goals / Non-Goals

**Goals:**
- Ship one bundled translation (RVR1960) that the app can browse fully offline.
- Follow this repo's screaming-architecture conventions (see `.claude/agents/frontend-architect.md`) for the `bible` module: per-entity folders, one-file-per-service, no cross-module imports.
- Keep the shipped data lean by deriving it from the source file at build time rather than shipping the 23.6MB raw export.
- Support book → chapter → verse browsing and typed reference lookup (e.g. "Juan 3:16").

**Non-Goals:**
- Multiple translations/languages, translation switching, or a translation picker UI.
- Remote/online Bible sources (explicitly phase 2 per the proposal).
- "Send to output" projection, favorites, or recents — later features that will consume this module's data but aren't built here.
- Full-text search across the whole Bible (only structured reference lookup, e.g. book+chapter+verse, is in scope).

## Decisions

### Data pipeline: preprocess once, commit the trimmed output
A small Node script (`apps/bibletime/scripts/build-bible-data.ts`, run manually via a `pnpm --filter web build:bible-data` script, not part of the normal build) reads the root-level `RVR1960_vid_149.json`, strips `chapter_html` from every chapter, and writes the result to `apps/bibletime/public/bible-data/rvr1960.json`. The trimmed file is committed to the repo (it's the actual shipped asset); the 23.6MB raw source stays at the repo root as the input artifact and is not imported by app code.
- **Alternative considered**: run the strip step in Vite at build time. Rejected — adds build complexity for a transform that only needs to run once (the source data doesn't change), and keeping the trimmed JSON committed lets the app run without regenerating it.
- **Alternative considered**: keep `chapter_html` and render it directly via `dangerouslySetInnerHTML`. Rejected — couples rendering to this one source's HTML/CSS class conventions, and the `items` array is the format `reading-json-files` demonstrates as the intended structured representation.

### Loading strategy: fetch the static asset once, cache in memory
`rvr1960.json` is served from `public/bible-data/` (a static asset, not a JS import), and loaded via a single `fetch('/bible-data/rvr1960.json')` the first time any bible data is needed, then cached in a module-level singleton for the session.
- **Alternative considered**: `import data from ".../rvr1960.json"` as a JS/ESM import. Rejected — Vite would inline all 6MB into a JS chunk parsed on every page load, even for routes that never touch the Bible; a runtime fetch of a static file is cheaper and cacheable by the browser's HTTP cache independent of app deploys.
- **Alternative considered**: split into one file per book, lazy-loaded per navigation. Deferred — real load-time impact of a single 6MB fetch hasn't been measured yet; revisit only if it's noticeably slow (see Open Questions).

### Module structure (screaming architecture)
```
modules/bible/
├── interfaces/index.ts     # Version/Book/Chapter/ChapterItem types (chapter_html omitted)
├── services/
│   ├── get-bible-data.ts   # fetch + in-memory cache of rvr1960.json
│   ├── get-book.ts         # find a book by USFM code
│   ├── get-chapter.ts      # find a chapter by USFM code
│   └── index.ts            # re-export only
├── actions/queries/
│   ├── use-get-books.ts
│   └── use-get-chapter.ts  # wraps the services in @tanstack/react-query (already a dependency)
├── lib/
│   └── parse-reference.ts  # "Juan 3:16" / "Jn 3:16" -> { bookUsfm, chapter, verse }
├── components/             # BookSearchList, ChapterNav, VersePickerList, OutputPreview
├── views/
│   └── bible-console-view.tsx  # the single four-column screen described below
└── index.ts                # exports the view (+ types), the module's public surface
```
No `store/` layer: the currently-selected book/chapter/verse lives in the route's search params, not client state — this keeps the selection shareable/bookmarkable via URL and needs no extra state library wiring. No `schemas/` layer: reference parsing is a plain string→struct function, not form validation.

### Routing: one route, no page transitions between selections
**Revised from the original three-route plan** (book-list page → chapter-list page → chapter-reader page): the user asked for a single screen — selecting a book must not navigate to "another screen," it should update in place. So there is exactly one route:

- `bible/index.tsx` — the four-column console, with `book`, `chapter`, and `verse` as optional search params (`validateSearch`), defaulting to Genesis 1 (first verse) when absent so the console never opens empty.

Selecting a book, a chapter, or a verse all do the same thing: `navigate({ to: "/bible", search: {...} })` updating only the search params, not the path — so React Router treats it as one continuous page (no route change, no component remount), matching "single screen" literally rather than just visually. This replaces the earlier `bible/$bookUsfm/index.tsx` and `bible/$bookUsfm/$chapterUsfm.tsx` routes, which are removed.

`app-sidebar.tsx`'s "Bible" entry changes from `url: "#"` to `url: "/bible"`.

### Reader page layout: four-column console
The single `/bible` screen is a four-column console modeled on the product README's "Control Panel & Output" concept (library on one side, current selection in the middle, live/next preview on the right):

1. **Books** — the book list, with a text filter above it. Typing filters the visible books by name (accent/case-insensitive substring match); typing a full reference (e.g. "Juan 3:16") instead resolves and updates all three search params at once, reusing `parse-reference` — one input serves both the "narrow the list" and "jump straight there" cases rather than shipping two separate inputs. Selecting a book updates the `book` search param (and clears `chapter`/`verse`, since they belonged to the previous book).
2. **Chapters** — the current book's chapter list (reuses the existing `ChapterNav`). Selecting a chapter updates the `chapter` search param (and clears `verse`).
3. **Verses** — every verse in the current chapter, each row showing its number and full text (this row list *is* the reading surface — "verse with description" means the text itself, not a truncated label). Clicking a verse selects it for column 4 by updating the `verse` search param.
4. **Preview** — a visual mockup of how the selected verse would look on the output screen: large centered type, no chrome, matching the README's "visually calm output" principle. **This is a preview only** — it does not send anything to a second window/display; live output projection is explicitly out of scope for this change (per the proposal) and stays a future capability that would consume this same selection state.

All four columns are always visible on the same screen; picking a book/chapter/verse only ever changes which one is highlighted and what the later columns show — there is no separate "book list page" or "chapter list page" to navigate to or from.

## Risks / Trade-offs

- **[Risk]** 6.19MB is still a large single fetch on a slow machine/first load → **Mitigation**: it's fetched once per session and cached by the HTTP cache thereafter; acceptable for a local-first desktop-leaning app. Revisit per-book splitting if this proves slow in practice.
- **[Risk]** Reference parsing ("Juan 3:16") needs to map localized book names/abbreviations to USFM codes, and RVR1960 book names are Spanish → **Mitigation**: build the name/abbreviation → USFM lookup directly from the bundled data's own `books[].name` field plus a small hardcoded common-abbreviation table, rather than a separate hardcoded book list that could drift from the data.
- **[Trade-off]** Committing a generated 6MB JSON file to git grows repo size going forward → accepted for now since it's a one-time, rarely-changing asset; not worth external storage/LFS for a single file at this size.

## Open Questions

- Does chapter-reader pagination/scroll need virtualization for very long chapters (e.g. Psalms), or is plain scroll acceptable for v1? Defer to implementation; only revisit if it's visibly janky.
- Should the reference search input live only on the chapter reader view, or also as a persistent, always-visible control (e.g. in `core` layout)? Keeping it scoped to the `bible` module's views for this change; promoting it to `core` is only warranted once a second module needs it.
