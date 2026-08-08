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

#### Scenario: Notes tab shows the notes panel
- **WHEN** the Notes tab is active
- **THEN** the tab shows this session's draft list beside a slide preview with its template selector and add/present actions, rather than a placeholder

#### Scenario: Media tab shows the media browser
- **WHEN** the Media tab is active in the desktop app
- **THEN** the tab shows a three-column media browser — a file explorer over the registered media roots, a thumbnail grid of the selected directory's files, and a slide preview with its add actions — rather than a placeholder

#### Scenario: Media tab in the web build
- **WHEN** the Media tab is active in the browser build
- **THEN** the tab states that the media library requires the desktop app, rather than showing an empty or broken browser

#### Scenario: No tab shows a placeholder browser
- **WHEN** any of the six bottom-nav tabs is active in the desktop app
- **THEN** it shows its real browser, and no tab renders a "coming soon" placeholder

## ADDED Requirements

### Requirement: The bottom-nav tab strip includes Notes between Songs and Media
The system SHALL present Notes as its own bottom-nav tab, ordered after Songs and before Media, so the tabs read Projects, Bible, Songs, Notes, Media, Templates. The Notes tab SHALL be available in every build, with no desktop-only restriction.

#### Scenario: Tab strip order

- **WHEN** a user looks at the bottom drawer's tab strip
- **THEN** an Notes tab appears between Songs and Media

#### Scenario: Available in the web build

- **WHEN** a user opens the application in the browser build and activates the Notes tab
- **THEN** the tab is fully functional, with no "requires the desktop app" state

#### Scenario: Notes is not the default tab

- **WHEN** the application starts
- **THEN** the previously default tab is still the one shown, and adding Notes does not change which tab opens first

### Requirement: Switching away from the Notes tab preserves its state
The system SHALL preserve the Notes tab's draft list and selected draft when the user switches to another bottom-nav tab or navigates away from the console, and SHALL restore them when the user returns — matching how the Library tab's open folder and the Songs tab's selection already survive a tab round-trip.

#### Scenario: Drafts and selection survive a tab round-trip

- **WHEN** a user has drafts written and one selected in the Notes tab, switches to the Songs tab, then switches back
- **THEN** the same drafts are listed in the same order with the same one still selected
