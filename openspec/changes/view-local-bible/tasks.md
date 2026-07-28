## 1. Data pipeline

- [x] 1.1 Write `apps/bibletime/scripts/build-bible-data.ts`: reads root-level `RVR1960_vid_149.json`, strips `chapter_html` from every chapter, writes `apps/bibletime/public/bible-data/rvr1960.json`
- [x] 1.2 Add a `build:bible-data` script to `apps/bibletime/package.json` that runs the script above
- [x] 1.3 Run the script and commit the generated `public/bible-data/rvr1960.json`

## 2. Module foundation

- [x] 2.1 Define `interfaces/index.ts` in `modules/bible`: `BibleVersion`, `Book`, `Chapter`, `ChapterItem` types matching the trimmed data shape (no `chapter_html`)
- [x] 2.2 Add `services/get-bible-data.ts`: fetches `/bible-data/rvr1960.json` once and caches the parsed result in a module-level singleton
- [x] 2.3 Add `services/get-book.ts` and `services/get-chapter.ts`: look up a book/chapter by USFM code from the cached data
- [x] 2.4 Add `services/index.ts` re-exporting the above
- [x] 2.5 Add `actions/queries/use-get-books.ts` and `actions/queries/use-get-chapter.ts` wrapping the services with `@tanstack/react-query` (also added `use-get-book.ts`, needed for the chapter-list screen and not originally listed)
- [x] 2.6 Add `lib/parse-reference.ts`: parses a typed reference string (e.g. "Juan 3:16") into a resolved book/chapter/verse using the bundled data's own book names/USFM codes plus a small common-abbreviation table; returns a clear "not found" result for unrecognized input

## 3. Components and views

- [x] 3.1 Add `components/book-list.tsx`: renders the bundled translation's books in canonical order, links to each book's chapter list
- [x] 3.2 Add `components/chapter-nav.tsx`: renders a book's chapter list, and prev/next controls using a chapter's `previous`/`next` fields
- [x] 3.3 Add `components/verse-list.tsx`: renders a chapter's `items` (headings, labels, verses with verse numbers) in order
- [x] 3.4 Add `components/reference-search-input.tsx`: text input wired to `parse-reference`, navigates on a resolved match, shows an inline message on an unresolved reference
- [x] 3.5 Split into `views/book-list-view.tsx`, `views/chapter-list-view.tsx`, `views/chapter-reader-view.tsx` (one per screen) rather than a single `bible-view.tsx`, since the module has 3 distinct screens
- [x] 3.6 Export the views/types the module needs to expose from `modules/bible/index.ts`
- [x] 3.7 (added) Add `core/providers/query-provider.tsx` (`AppQueryProvider`) and wire it into `routes/__root.tsx` — no `QueryClientProvider` existed anywhere in the app despite `@tanstack/react-query` being a dependency, so the new query hooks would have thrown at runtime without it

## 4. Routing and navigation

- [x] 4.1 Add `src/routes/bible/index.tsx` (book list route)
- [x] 4.2 Add `src/routes/bible/$bookUsfm/index.tsx` (chapter list route for a book)
- [x] 4.3 Add `src/routes/bible/$bookUsfm/$chapterUsfm.tsx` (chapter reader route, verse content + prev/next + reference search, `verse` search param via `validateSearch`)
- [x] 4.4 Update `modules/core/layout/app-sidebar.tsx`: change the "Bible" nav item's `url` from `"#"` to `"/bible"`

## 5. Verification (round 1, superseded by round 2 below)

- [x] 5.1 `pnpm --filter web typecheck` passes
- [x] 5.2 `pnpm --filter web lint` passes (one pre-existing error in `nav-main.tsx`, untouched by this change, remains — not introduced here)
- [x] 5.3 Manually verify in the browser (Playwright-driven): book list loads, chapter reader renders verses correctly, prev/next chapter navigation works, reference search resolves a valid reference and rejects an invalid one, sidebar "Bible" link navigates to the reader. Also caught and fixed a real bug in the process: `Button` rendered via `render={<Link .../>}` needs `nativeButton={false}` (Base UI otherwise logs a runaway console error) — fixed in `book-list.tsx` and `chapter-nav.tsx`.

## 6. Reader console redesign (four columns)

Mid-implementation change: the chapter-reader page (`bible/$bookUsfm/$chapterUsfm`) is redesigned from a single continuous reading pane into a four-column console — see `design.md`'s "Reader page layout" decision. The book-list and chapter-list pages/routes are unchanged.

- [x] 6.1 Add `components/book-search-list.tsx`: filter input (narrows the book list by name, accent/case-insensitive) that also resolves a full typed reference via `parse-reference` and navigates directly; composes the existing `BookList` with the filtered set. Replaces plain `BookList` usage in `book-list-view.tsx` too (same column-1 experience there, filter still useful without the other 3 columns).
- [x] 6.2 Add `components/verse-picker-list.tsx`: renders every verse in the current chapter (number + full text) as a clickable row; selecting one sets the existing `verse` search param. Also render section headings/labels inline (this list is the reading surface, not just a picker).
- [x] 6.3 Add `components/output-preview.tsx`: visual-only mockup of the selected verse as it would appear on the output screen (large centered type, minimal chrome); defaults to the chapter's first verse when none is selected via the `verse` param. Does not wire to any real second window/display.
- [x] 6.4 Remove `components/verse-list.tsx` and `components/reference-search-input.tsx` — superseded by `verse-picker-list.tsx` (reading + picking combined) and `book-search-list.tsx` (filter input that also resolves full references) respectively.
- [x] 6.5 Rework `views/chapter-reader-view.tsx` into the four-column console: books+search | chapters | verse picker | preview, using `useGetBooks`, `useGetChapter` (for `book` + `chapter`), and the `verse` search param for the current selection.
- [x] 6.6 Update `modules/bible/index.ts` exports if the public surface changed (no new views/routes needed — same 3 routes as before; no change needed, exports were already correct).

## 7. Verification (round 2)

- [x] 7.1 `pnpm --filter web typecheck` passes
- [x] 7.2 `pnpm --filter web lint` passes (pre-existing `nav-main.tsx` error aside)
- [x] 7.3 Manually verify in the browser: all 4 columns render; filtering narrows the book list; a full reference typed in the same input jumps directly; clicking a verse updates the preview panel. Found and fixed a real layout bug in the process: `BookList`'s and `ChapterNav`'s internal grids used viewport-based breakpoints (`sm:`/`md:`/`lg:`) that assumed a full-width page — inside the narrow console columns they overflowed and overlapped badly. Fixed by adding `className`/`chaptersClassName` override props so the console can pass a fixed single/narrow-column layout while the (still separate at the time) full-width pages kept the responsive grid.

## 8. Single-screen consolidation

Second mid-implementation change: the user does not want separate pages at all — selecting a book must update in place, not navigate to "another screen." Consolidate the three routes (`bible/index.tsx`, `bible/$bookUsfm/index.tsx`, `bible/$bookUsfm/$chapterUsfm.tsx`) into one. See `design.md`'s "Routing: one route, no page transitions between selections".

- [x] 8.1 Rework `src/routes/bible/index.tsx` into the single route: `validateSearch` for optional `book`, `chapter`, `verse`, defaulting to Genesis 1 (first verse) when all are absent so the console never opens empty.
- [x] 8.2 Delete `src/routes/bible/$bookUsfm/index.tsx` and `src/routes/bible/$bookUsfm/$chapterUsfm.tsx` — no longer needed, everything renders from the one route. (Also removed the now-empty `$bookUsfm/` directory.)
- [x] 8.3 Merge `book-list-view.tsx` and `chapter-list-view.tsx` into the single console view (rename `chapter-reader-view.tsx` to something reflecting it's now the only view, e.g. `bible-console-view.tsx`) — delete the two superseded view files.
- [x] 8.4 Update every "navigate to a book/chapter/verse" call site (`BookSearchList`, `ChapterNav`, `VersePickerList`, `book-search-list`'s reference resolution) to `navigate({ to: "/bible", search: {...} })` instead of the old path-param routes — selecting a book sets `book` and clears `chapter`/`verse`; selecting a chapter sets `chapter` and clears `verse`; selecting a verse sets `verse` only. (`VersePickerList` was already callback-based (`onSelectVerse`) and needed no change; `BookList` and `ChapterNav` were converted from `Link`-rendered buttons to plain `onClick` callbacks (`onSelectBook`/`onSelectChapter`) owned by the view, since their navigation target is now dynamic search-param state rather than a declarative route — this also sidesteps the `nativeButton={false}` Base UI requirement entirely since these buttons no longer use `render`.)
- [x] 8.5 Update `modules/bible/index.ts` exports for the single view.
- [x] 8.6 Update `modules/core/layout/app-sidebar.tsx` if needed (already `/bible`, no change needed).

## 9. Verification (round 3)

- [x] 9.1 `pnpm --filter web typecheck` passes
- [x] 9.2 `pnpm --filter web lint` passes (pre-existing `nav-main.tsx` error aside, untouched)
- [x] 9.3 Manually verify in the browser (Playwright-driven): confirmed only `/` and `/bible` are ever visited across the whole flow (sidebar entry, filtering, selecting a book, selecting a chapter, selecting a verse, prev/next, and a full reference jump) — no other path is ever hit, satisfying "one screen, no page transitions" literally. Zero console errors throughout. Also fixed a small rough edge found in the process: after a successful reference jump (e.g. "Juan 3:16"), the filter input kept the typed text, which then filtered the book list down to empty since "Juan 3:16" doesn't match any book name — now the query clears on a resolved jump.
