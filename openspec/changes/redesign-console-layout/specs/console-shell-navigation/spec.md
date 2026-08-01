## ADDED Requirements

### Requirement: Fixed five-tab bottom navigation
The system SHALL present exactly five top-level navigation tabs — Library, Bible, Songs, Media, Templates — in a bottom navigation bar, and SHALL NOT present any other content module as a top-level tab.

#### Scenario: Bottom nav renders the fixed tab set
- **WHEN** the console shell mounts
- **THEN** the bottom navigation bar shows exactly the tabs Library, Bible, Songs, Media, Templates, in that order, and no other top-level tab is present

#### Scenario: Settings is not a bottom-nav tab
- **WHEN** a user looks for Settings in the bottom navigation bar
- **THEN** Settings is not listed there (it is reachable through a separate, non-tab affordance)

### Requirement: Persistent header bar independent of the active tab
The system SHALL render a full-width header region above the sidebar/slides/preview row, distinct from the bottom navigation bar, and SHALL keep its content the same regardless of which bottom-nav tab is active. The header SHALL be the entry point for Settings.

#### Scenario: Header is present regardless of active tab
- **WHEN** a user switches between any of the five bottom-nav tabs
- **THEN** the header region remains visible at the top of the shell with unchanged content

#### Scenario: Settings is reachable from the header
- **WHEN** a user wants to open Settings
- **THEN** they can do so from the header, not from the bottom navigation bar or a tab's sidebar

### Requirement: Sidebar content is contextual to the active tab
The system SHALL render the sidebar's content as a function of the currently active bottom-nav tab, replacing its contents when the active tab changes.

#### Scenario: Library tab shows the folder tree
- **WHEN** the Library tab is active
- **THEN** the sidebar shows the folder tree of the user's Library folders

#### Scenario: Bible tab shows the Bible picker
- **WHEN** the Bible tab is active
- **THEN** the sidebar shows the Bible book/chapter/verse picker instead of the folder tree

#### Scenario: Templates tab shows the template manager
- **WHEN** the Templates tab is active
- **THEN** the sidebar shows the existing template manager/list instead of the folder tree or Bible picker

#### Scenario: Songs and Media tabs show placeholder browsers
- **WHEN** the Songs tab or the Media tab is active and that module has no real content yet
- **THEN** the sidebar shows a placeholder browser for that tab indicating no content is available yet, rather than an empty or broken sidebar

### Requirement: Switching tabs preserves the open folder and preview
The system SHALL preserve the currently open Library folder, its slide selection, and the live preview panel's state when the user switches the active bottom-nav tab, and SHALL restore them when the user switches back to the Library tab.

#### Scenario: Open folder survives a tab round-trip
- **WHEN** a user has a folder open in the Library tab, switches to the Bible tab, then switches back to the Library tab
- **THEN** the same folder is still open with its previous slide list and selection intact

#### Scenario: Preview panel persists across tab switches
- **WHEN** a user has a slide selected and previewed, then switches to another bottom-nav tab
- **THEN** the preview panel continues showing the previously selected slide rather than clearing or remounting
