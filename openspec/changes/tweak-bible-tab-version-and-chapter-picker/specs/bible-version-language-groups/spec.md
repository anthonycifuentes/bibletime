## ADDED Requirements

### Requirement: Versions are grouped by language
The Bible tab's version list SHALL group versions into sections keyed by language (`lang_name`), instead of a single flat list, while preserving the existing search/filter, download, retry, remove, and active-selection behavior scoped within each group.

#### Scenario: Versions render under their language's section
- **WHEN** the version list renders with versions in multiple languages
- **THEN** each distinct `lang_name` appears once as a section header, and every version with that `lang_name` is listed under it

#### Scenario: Filtering still matches by abbreviation, title, or language
- **WHEN** the user types a search query that matches a version's abbreviation, title, or language name
- **THEN** only sections containing at least one matching version render, and within those sections only the matching versions render

### Requirement: Language sections are ordered with the current UI language first
The section for the language matching the app's current UI language SHALL render first; all remaining sections SHALL be ordered alphabetically by `lang_name`.

#### Scenario: UI language matches an available version language
- **WHEN** the app's current UI language is Spanish and at least one listed version's language maps to Spanish
- **THEN** that Spanish section renders first, followed by all other language sections in alphabetical order by `lang_name`

#### Scenario: No version language matches the current UI language
- **WHEN** the app's current UI language has no corresponding version language among the listed versions
- **THEN** all sections render in alphabetical order by `lang_name`, with no special first position

### Requirement: Language sections are collapsible, defaulting to only the active section expanded
Each language section SHALL be independently collapsible. On initial render, only the section containing the currently selected version SHALL start expanded; every other section SHALL start collapsed. Toggling a section's expanded state SHALL NOT change which version is selected, and selecting a version SHALL NOT change any section's expanded state.

#### Scenario: Only the active version's language section starts expanded
- **WHEN** the version list first renders with a version already selected
- **THEN** the section containing that version's language starts expanded and all other sections start collapsed

#### Scenario: Toggling a section is independent of selection
- **WHEN** the user clicks a collapsed section's header
- **THEN** that section expands, the currently selected version is unchanged, and no other section's expanded state changes

### Requirement: An active search query expands matching sections regardless of collapse state
While a non-empty search query is active, any section containing at least one matching version SHALL render expanded, overriding its manual collapse state. Clearing the query SHALL restore each section's prior manual expand/collapse state.

#### Scenario: Searching reveals a match inside a collapsed section
- **WHEN** the user types a query that matches a version inside a currently collapsed section
- **THEN** that section renders expanded, showing the matching version, for as long as the query is active

#### Scenario: Clearing the query restores manual collapse state
- **WHEN** the user clears a search query after a collapsed section was shown expanded due to a match
- **THEN** that section returns to collapsed, as it was before the query was entered

### Requirement: Version rows show title as primary text with abbreviation and status as secondary text
Within a language section, each version row SHALL show the version's title (`local_title`) as its primary label, and the version's abbreviation (`local_abbreviation`) together with its status label as smaller, secondary text below or beside the title. Existing per-row actions (download, retry, remove) and the active-selection indicator SHALL remain unchanged.

#### Scenario: A version row displays title, abbreviation, and status
- **WHEN** a version row renders inside its language section
- **THEN** the row shows the version's title as the primary label and its abbreviation plus status as secondary text
