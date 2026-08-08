## MODIFIED Requirements

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

#### Scenario: Songs tab shows the songs browser
- **WHEN** the Songs tab is active
- **THEN** the tab shows a three-column songs browser — song list with search, the selected song's sections, and a slide preview with its actions — rather than a placeholder

#### Scenario: Media tab shows the media browser
- **WHEN** the Media tab is active in the desktop app
- **THEN** the tab shows a three-column media browser — a file explorer over the registered media roots, a thumbnail grid of the selected directory's files, and a slide preview with its add actions — rather than a placeholder

#### Scenario: Media tab in the web build
- **WHEN** the Media tab is active in the browser build
- **THEN** the tab states that the media library requires the desktop app, rather than showing an empty or broken browser

#### Scenario: No tab shows a placeholder browser
- **WHEN** any of the five bottom-nav tabs is active in the desktop app
- **THEN** it shows its real browser, and no tab renders a "coming soon" placeholder

## ADDED Requirements

### Requirement: Switching away from the Media tab preserves its browsing state
The system SHALL preserve the Media tab's selected directory, file selection, and view settings — sort order, kind filter, name search, and thumbnail size — when the user switches to another bottom-nav tab, and SHALL restore them when the user switches back, matching how the Library tab's open folder and the Songs tab's selection already survive a tab round-trip.

#### Scenario: Directory and selection survive a tab round-trip
- **WHEN** a user has a directory open and files selected in the Media tab, switches to the Bible tab, then switches back
- **THEN** the same directory is open with the same files selected, and the preview column shows the same file

#### Scenario: View settings survive a tab round-trip
- **WHEN** a user has set a sort order, a kind filter, and a thumbnail size in the Media tab, switches tabs, then switches back
- **THEN** all three settings are still applied
