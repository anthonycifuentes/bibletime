## ADDED Requirements

### Requirement: Media roots are registered folders on disk
The system SHALL allow a user to register one or more folders on their filesystem as media roots, SHALL persist the registered roots across app restarts, and SHALL allow a root to be removed. Registering or removing a root SHALL NOT create, move, copy, or delete any file inside it.

#### Scenario: Register a root with the native folder picker
- **WHEN** a user chooses "Add folder" in the media explorer and selects a directory in the native picker
- **THEN** that directory appears as a root in the explorer, its immediate contents are browsable, and it is still registered after restarting the app

#### Scenario: Register a root by dropping a folder onto the explorer
- **WHEN** a user drags a folder from the OS file manager and drops it onto the explorer column
- **THEN** that folder is registered as a root, exactly as if it had been chosen through the picker

#### Scenario: Remove a root without touching its files
- **WHEN** a user removes a registered root
- **THEN** the root and its subtree disappear from the explorer, and every file that was inside it still exists unchanged on disk

#### Scenario: Duplicate root is not registered twice
- **WHEN** a user registers a folder that is already a root
- **THEN** the explorer still shows exactly one entry for it and no duplicate is persisted

### Requirement: Explorer browses a root's directory tree
The system SHALL present each registered root as an expandable node whose children are its subdirectories, SHALL allow the user to select any directory in that tree, and SHALL show the selected directory's supported files in the file grid.

#### Scenario: Expand a root to see its subdirectories
- **WHEN** a user expands a registered root in the explorer
- **THEN** its immediate subdirectories are listed as child nodes, and directories containing no supported files are still listed (they may contain subdirectories that do)

#### Scenario: Select a directory
- **WHEN** a user selects a directory in the explorer
- **THEN** the file grid shows that directory's supported files, and does not include files from its subdirectories

#### Scenario: Root whose path no longer exists
- **WHEN** a registered root's directory has been deleted or is on an unmounted volume
- **THEN** the root is shown in an unavailable state with the option to remove or relocate it, and selecting it shows that state rather than an empty directory

### Requirement: All and Favorites views
The system SHALL provide an "All" view listing supported files across every registered root, and a "Favorites" view listing files the user has explicitly starred. Favorites SHALL persist across restarts and SHALL be shared across all projects.

#### Scenario: All view spans every root
- **WHEN** a user selects "All" with two roots registered
- **THEN** the file grid shows supported files from both roots, each tile identifying which root it came from

#### Scenario: Star and unstar a file
- **WHEN** a user stars a file in the grid
- **THEN** it appears in the Favorites view, remains there after restarting the app, and unstarring it removes it from that view without affecting the file on disk

#### Scenario: Favorites survive switching projects
- **WHEN** a user switches to a different project
- **THEN** the Favorites view lists the same files it did before the switch

### Requirement: Supported file types are an explicit allowlist
The system SHALL recognize a fixed set of file extensions as supported media — images, videos, and presentation documents — and SHALL exclude every other file from the grid. A file whose extension is recognized but whose codec or encoding the app cannot render SHALL be listed with an explicit unsupported note rather than silently omitted or shown as if it worked.

#### Scenario: Unsupported extension is hidden
- **WHEN** a directory contains a spreadsheet, an archive, and a text file alongside three photos
- **THEN** the grid shows only the three photos

#### Scenario: Recognized but unplayable video
- **WHEN** a directory contains a video in a recognized container the app cannot decode
- **THEN** the file is listed with a note stating it is not playable and suggesting conversion, and it cannot be added as a slide

### Requirement: Directory contents refresh on demand
The system SHALL re-read a directory's contents when the user navigates to it and when the user explicitly refreshes, and SHALL reflect files added, renamed, or deleted outside the app since the last read.

#### Scenario: File added outside the app appears after refresh
- **WHEN** a user copies a new photo into the currently selected directory using the OS file manager and then chooses Refresh
- **THEN** the new photo appears in the grid

#### Scenario: Deleted file disappears after refresh
- **WHEN** a file shown in the grid is deleted outside the app and the user refreshes
- **THEN** the file is no longer listed, and any existing slide referencing it renders the missing-media state
