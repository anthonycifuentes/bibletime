## MODIFIED Requirements

### Requirement: Media roots are registered folders on disk
The system SHALL allow a user to register one or more folders on their filesystem as media roots, SHALL persist the registered roots across app restarts, and SHALL allow a root to be removed. Registering or removing a root SHALL NOT create, move, copy, or delete any file inside it.

In a build without filesystem access, a root SHALL be registered through the browser's own access mechanism — a granted directory where the browser supports one, or a set of individually added files otherwise — and SHALL persist across page reloads. The registration mechanism SHALL be the only difference: a root's identity, its removal semantics, and its guarantee never to touch the files inside it are the same in every build.

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

#### Scenario: Register a root in the browser build
- **WHEN** a user chooses "Add folder" in the browser build and grants access to a directory
- **THEN** that directory appears as a root, its contents are browsable, and it is still registered after reloading the page

#### Scenario: Removing a browser root reclaims only app storage
- **WHEN** a user removes a root in the browser build
- **THEN** the root disappears from the explorer, everything the app stored for it is discarded, and every file on the user's machine is unchanged

### Requirement: Explorer browses a root's directory tree
The system SHALL present each registered root as an expandable node whose children are its subdirectories, SHALL allow the user to select any directory in that tree, and SHALL show the selected directory's supported files in the file grid.

Where the build cannot enumerate directories, a root SHALL be presented as a single flat node with no children, listing its files directly. That case SHALL be presented as a property of the browser, not as an app error or an empty folder.

#### Scenario: Expand a root to see its subdirectories
- **WHEN** a user expands a registered root in the explorer
- **THEN** its immediate subdirectories are listed as child nodes, and directories containing no supported files are still listed (they may contain subdirectories that do)

#### Scenario: Select a directory
- **WHEN** a user selects a directory in the explorer
- **THEN** the file grid shows that directory's supported files, and does not include files from its subdirectories

#### Scenario: Root whose path no longer exists
- **WHEN** a registered root's directory has been deleted or is on an unmounted volume
- **THEN** the root is shown in an unavailable state with the option to remove or relocate it, and selecting it shows that state rather than an empty directory

#### Scenario: Flat root where directories cannot be enumerated
- **WHEN** a user selects a root in a browser that cannot enumerate directories
- **THEN** the root shows no child nodes, the grid lists the files the user added to it, and the explorer states that this browser cannot open an entire folder

### Requirement: Supported file types are an explicit allowlist
The system SHALL recognize a fixed set of file extensions as supported media — images, videos, and presentation documents — and SHALL exclude every other file from the grid. A file whose extension is recognized but which the current build cannot render SHALL be listed with an explicit note stating why rather than silently omitted or shown as if it worked. That note SHALL distinguish a file the app cannot decode at all from one that only the desktop build can open.

#### Scenario: Unsupported extension is hidden
- **WHEN** a directory contains a spreadsheet, an archive, and a text file alongside three photos
- **THEN** the grid shows only the three photos

#### Scenario: Recognized but unplayable video
- **WHEN** a directory contains a video in a recognized container the app cannot decode
- **THEN** the file is listed with a note stating it is not playable and suggesting conversion, and it cannot be added as a slide

#### Scenario: PowerPoint deck in the browser build
- **WHEN** a user browsing in the browser build opens a directory containing a `.pptx` file
- **THEN** the file is listed with a note stating that this format needs the desktop app and that exporting the deck as a PDF is the alternative, and it cannot be added as a slide

#### Scenario: The same deck in the desktop build
- **WHEN** the same `.pptx` file is browsed in the desktop build
- **THEN** it is listed as fully usable and carries no unsupported note

## ADDED Requirements

### Requirement: Media availability is reported per capability, not as one switch
The system SHALL determine independently whether the current build can browse directories, convert presentation documents, import from Google Slides, and reveal a file in the OS file manager, and SHALL show each affordance only where its capability is present. An unavailable capability SHALL NOT be shown as a disabled or failing control.

#### Scenario: Desktop-only affordances are absent in the browser
- **WHEN** a user opens the Media tab in the browser build
- **THEN** the Google Slides import and "Reveal in Finder/Explorer" actions are not shown, while browsing, previewing, and adding are fully available

#### Scenario: The tab itself is never gated
- **WHEN** a user opens the Media tab in any supported build
- **THEN** the tab renders its explorer, grid, and preview columns, rather than a message stating that the feature requires another build
