## ADDED Requirements

### Requirement: Projects tab shows explicit Create and Open actions
The Projects tab SHALL present two equally prominent buttons, "Create" and "Open", in place of the single icon-only add control.

#### Scenario: Both actions are visible
- **WHEN** the user views the Projects tab with write access
- **THEN** a "Create" button and an "Open" button are both shown in the tab's toolbar

### Requirement: A project can be exported to a single file
Each project SHALL offer an "Export" action that bundles the project's metadata and all of its folders (including their slides) into one downloadable JSON file.

#### Scenario: Exporting a project
- **WHEN** the user selects "Export" for a project that has one or more folders with slides
- **THEN** a single JSON file downloads containing the project's name and every one of its folders (with their nested subfolders and slides)

#### Scenario: Exporting an empty project
- **WHEN** the user selects "Export" for a project with no folders yet
- **THEN** a JSON file downloads containing the project's name and an empty folder list

### Requirement: Opening a project file creates a new project
Selecting "Open" and choosing a previously-exported project file SHALL create a brand-new project — with its own fresh identity, decoupled from the original file — populated with that file's folders and slides, and SHALL switch to it immediately.

#### Scenario: Opening a valid project file on desktop
- **WHEN** the user clicks "Open" on the desktop app and selects a valid, previously-exported project file via the native file dialog
- **THEN** a new project is created with that file's name and folder structure (including nested subfolders and slides), and it becomes the active project

#### Scenario: Opening a valid project file on web
- **WHEN** the user clicks "Open" on the web app and selects a valid, previously-exported project file via the browser's file picker
- **THEN** the same result occurs as on desktop: a new project is created from the file's contents and becomes active

#### Scenario: Canceling the open dialog does nothing
- **WHEN** the user clicks "Open" and then cancels the file dialog without selecting a file
- **THEN** no project is created and the currently active project is unchanged

#### Scenario: Opening an invalid or unrecognized file is rejected with a message
- **WHEN** the user selects a file that is not valid JSON, or does not match the project file schema, or has an unsupported schema version
- **THEN** no project is created, and the user sees an error message explaining the file could not be opened

#### Scenario: Reopening the same exported file twice creates two independent projects
- **WHEN** the user opens the same previously-exported project file twice
- **THEN** two separate new projects are created, each with their own folder and slide ids, neither affecting the other

### Requirement: Desktop Open uses a native file browser; web falls back to a file picker
On the desktop app, "Open" SHALL use the operating system's native file-open dialog, allowing selection of a project file from any location on disk. On the web app, "Open" SHALL use a standard browser file input, since a browser has no general filesystem access.

#### Scenario: Desktop Open is not limited to the app's managed project folder
- **WHEN** the user clicks "Open" on the desktop app
- **THEN** the native file dialog lets them navigate to any folder on their filesystem, not only the app's own managed project storage location
