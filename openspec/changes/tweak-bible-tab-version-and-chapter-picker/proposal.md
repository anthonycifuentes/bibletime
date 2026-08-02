## Why

The Bible tab's version column lists every translation as a flat list keyed by abbreviation, which gives no sense of language grouping and gets noisy once more than a couple of languages are downloaded. Separately, the chapter column stacks one chapter-number button per row inside a fixed-width column that's wider than the button itself, wasting horizontal space the Book and Verse columns could use instead.

## What Changes

- Group the version list by language: each language becomes a collapsible section with the language name as its header, and that language's versions listed underneath (title as primary text, abbreviation + status kept as smaller secondary text, same download/remove/retry actions and "active" pill as today).
- Order language sections with the app's current UI language (Settings > Language) first, then the remaining languages alphabetically.
- Sections are collapsible: the section containing the currently selected version starts expanded, all other sections start collapsed. Expanding/collapsing a section is independent of selecting a version inside it.
- Shrink the chapter column from a wide fixed-width single-column list to a column sized to the chapter-number button itself, removing the empty space to the right of each button.

## Capabilities

### New Capabilities
- `bible-version-language-groups`: Grouping the Bible tab's version list by language into collapsible sections — section ordering (UI language first, then alphabetical), which section starts expanded, and what's shown per version row within a section.
- `bible-chapter-picker-layout`: The Bible tab's chapter column sizing — a single column of chapter-number buttons sized to the button width, not a wide fixed column with unused trailing space.

### Modified Capabilities
(none — no existing `openspec/specs/` capabilities predate this change; both items above are new capabilities describing the `BiblePickerPanel`/`VersionListPanel`/`ChapterNav` components introduced in prior, still-unarchived changes)

## Impact

- `apps/bibletime/src/modules/library/components/version-list-panel.tsx`: restructure from a flat filtered list into grouped, collapsible sections; needs per-language grouping/sorting logic and per-section expand/collapse state.
- `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx`: chapter column's fixed grid width (`88px` in the five-column grid template) shrinks to fit the button.
- `apps/bibletime/src/modules/bible/components/chapter-nav.tsx`: `chaptersClassName` override passed from `BiblePickerPanel` changes; component itself likely unchanged (still renders one button per chapter).
- `apps/bibletime/src/modules/core/i18n`: may need new translation keys (e.g. group-empty state stays `bible.version.noneFound`, but section labels use existing language names — verify no new strings are needed beyond what `lang_name` already provides).
- No API or data-layer changes — `useGetBibleVersions` already returns `lang_name` per version; the app's current UI language is already available from the i18n module.
