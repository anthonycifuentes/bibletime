## Context

`VersionListPanel` (`apps/bibletime/src/modules/library/components/version-list-panel.tsx`) renders `BibleVersionSummary[]` as one flat, filterable list — each row shows `local_abbreviation` as the primary label and a status word (`bundled`/`downloaded`/`available`/`downloading`/`error`) underneath. `ChapterNav` (`apps/bibletime/src/modules/bible/components/chapter-nav.tsx`) renders a book's chapters as a grid of number buttons; `BiblePickerPanel` embeds it inside a fixed `88px` grid column with `chaptersClassName="grid-cols-1 ..."`, so each row is one `size-8` (32px) button inside an 88px-wide cell.

`BibleVersionCatalogEntry` already carries `lang_name` (display name, e.g. "Español") and `lang_key` (the catalog's own language code, distinct from the app's `Locale` type `"en" | "es" | "pt"` from `@/modules/core/i18n`). There is no existing mapping between the two.

## Goals / Non-Goals

**Goals:**
- Group the version list by language, with the app's current UI language pinned first.
- Make each language group collapsible, defaulting to only the selected version's group expanded.
- Keep the version list's existing search/filter, download, remove, retry, and "active" pill behavior intact.
- Make the chapter column exactly as wide as its buttons, no wasted trailing space.

**Non-Goals:**
- Not changing what languages/versions are available, how they're fetched, or `BibleVersionCatalogEntry`'s shape.
- Not changing `ChapterNav`'s per-item rendering (still just the chapter number) or its use elsewhere (e.g. any full-width contexts using the default `chaptersClassName`).
- Not persisting expand/collapse state across sessions or across re-mounts — it's local UI state, reset each time the panel mounts.

## Decisions

- **Grouping key vs. sort key**: Group rows by `lang_name` (the human-readable header text), but resolve "does this group match the current UI language" via a small fixed lookup, `LOCALE_TO_LANG_KEY: Record<Locale, string>` (`{ en: "eng", es: "spa", pt: "por" }`), compared against each version's `lang_key`. `lang_name` is what's displayed; `lang_key`/`Locale` is what's compared, since they use different code spaces and shouldn't be conflated.
- **Group order**: the group whose versions' `lang_key` matches `LOCALE_TO_LANG_KEY[locale]` sorts first; all other groups sort alphabetically by `lang_name` (`localeCompare`). If no group matches the current locale (e.g. UI in English but no English translation downloaded/listed), the list is simply all-alphabetical — no special empty slot.
- **Expand/collapse state**: `useState<Set<string>>` of expanded `lang_name` keys, initialized once (via `useState(() => ...)` lazy initializer) to a single-element set containing the language of `selectedVersionId ?? BUNDLED_VERSION_ID`. Toggling a header flips its membership in the set; this is independent of which version is selected — selecting a version never auto-expands or auto-collapses a group.
- **Search interacts with collapse**: when `query` is non-empty, every group that has at least one matching version renders expanded regardless of the collapse set (computed, not written back into state), so filtering never hides a match behind a collapsed header. Clearing the query restores whatever the manual collapse state was.
- **Row content**: within a group, each version row shows `local_title` as the primary line (the group header already carries the language, so the title is the more useful primary label than the abbreviation) and `local_abbreviation` + the existing status label together as a smaller, muted secondary line — same download/retry/remove buttons and "active" `Pill`, unchanged.
- **Chapter column width**: replace the parent grid's fixed `88px` track for the chapters column with `min-content`, so the column's rendered width always matches the intrinsic width of what `ChapterNav` renders (currently a single `size-8` button) instead of an arbitrary guessed pixel value that can drift out of sync if button sizing changes later. `chaptersClassName` stays a single-column grid; only the outer column track sizing in `BiblePickerPanel` changes.

## Risks / Trade-offs

- [Collapsing hides versions the user might scan for by scrolling rather than searching] → Only one group starts collapsed-away-from by default per mount (all but the active one); search remains the fast path to cross-language lookups, and any group is one click away.
- [`min-content` column sizing depends on `ChapterNav`'s rendered content staying a single small button; if a future change enlarges chapter buttons or adds a label, the column grows with it] → Acceptable: that's the intended behavior (column tracks its content), and `chaptersClassName` in this call site is untouched, so any such future change is a deliberate, visible edit to this same call site.
- [`lang_key` → `Locale` mapping is a hardcoded 3-entry table that only covers the app's 3 supported locales] → Low risk: `SUPPORTED_LOCALES` in `@/modules/core/i18n` is already a fixed 3-entry list (`en`/`es`/`pt`), so the mapping table's scope matches it exactly; adding a locale later means updating both in the same place.

## Open Questions

None — scope, ordering, and default expansion were confirmed directly with the user during proposal.
