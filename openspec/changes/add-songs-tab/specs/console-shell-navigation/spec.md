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

#### Scenario: Media tab shows a placeholder browser
- **WHEN** the Media tab is active and that module has no real content yet
- **THEN** the tab shows a placeholder browser indicating no content is available yet, rather than an empty or broken panel

## ADDED Requirements

### Requirement: Switching away from the Songs tab preserves its browsing state
The system SHALL preserve the Songs tab's search query, selected song, and selected section when the user switches to another bottom-nav tab, and SHALL restore them when the user switches back — matching how the Library tab's open folder and the preview panel already survive a tab round-trip.

#### Scenario: Song selection survives a tab round-trip
- **WHEN** a user has a song and one of its sections selected in the Songs tab, switches to the Bible tab, then switches back
- **THEN** the same song and section are still selected and the search query is still in the search box
