## 1. Version list grouping

- [x] 1.1 Add a `LOCALE_TO_LANG_KEY: Record<Locale, string>` lookup (`{ en: "eng", es: "spa", pt: "por" }`) alongside `VersionListPanel`, used to match the current UI `locale` against a version's `lang_key`.
- [x] 1.2 Group `filteredVersions` by `lang_name` into an ordered array of `{ langName, versions }` sections: the section whose versions' `lang_key` matches `LOCALE_TO_LANG_KEY[locale]` first, remaining sections alphabetical by `lang_name` (`localeCompare`).
- [x] 1.3 Add `expandedLanguages: Set<string>` state, lazily initialized to the `lang_name` of the version matching `selectedVersionId ?? BUNDLED_VERSION_ID`; add a toggle handler that flips a `lang_name`'s membership without touching selection.
- [x] 1.4 Render each section as a header button (language name, toggles that section's entry in `expandedLanguages`) followed by its versions when expanded; when `query` is non-empty, force-render any section containing a match regardless of `expandedLanguages`.
- [x] 1.5 Update each version row to show `local_title` as the primary label and `local_abbreviation` + the existing status label as smaller secondary text, keeping the existing download/retry/remove buttons and active `Pill` unchanged.

## 2. Chapter column layout

- [x] 2.1 In `bible-picker-panel.tsx`, change the chapter column's grid track from the fixed `88px` to `min-content` in the five-column grid template.
- [x] 2.2 Verify the rendered chapter column has no visible empty space to the right of a chapter-number button, and that chapter numbers still display exactly as before (no label change needed in `ChapterNav`).

## 3. Verification

- [x] 3.1 Manually exercise the Bible tab: confirm language sections group correctly, the UI-language section starts first and expanded (others collapsed), collapsing/expanding doesn't change the selected version, and search reveals matches inside collapsed sections.
- [x] 3.2 Manually confirm the chapter column is now button-width with no trailing gap, across a book with single- and double-digit chapter counts.
- [x] 3.3 Run the project's lint/typecheck for the touched files (`apps/bibletime`).
