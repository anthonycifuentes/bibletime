## MODIFIED Requirements

### Requirement: Native save location on desktop

On the desktop (Electron) build, saving a project to a file SHALL use the operating system's native save dialog so the user chooses the destination folder and filename. The same dialog SHALL be opened immediately after a project is created, so a new project is bound to a file from the start. Dismissing that dialog SHALL leave the project created and usable, bound to no file. The web build SHALL keep its existing browser-download behavior unchanged, and SHALL NOT open a dialog on creation.

#### Scenario: Saving a project that has no file yet

- **WHEN** the user triggers "Save" (or "Save as…") on a desktop project that has never been written to a file
- **THEN** a native save dialog opens, pre-filled with a filename derived from the project name and the `.bibletime-project.json` extension, defaulting to the user's documents location
- **AND** on confirmation the project bundle is written to the chosen path
- **AND** the project is bound to that path for subsequent saves

#### Scenario: Creating a project opens the save dialog

- **WHEN** the user creates a new project on the desktop build
- **THEN** the native save dialog opens pre-filled with a filename derived from the project's name
- **AND** on confirmation the bundle is written there and the project is bound to that path

#### Scenario: Dismissing the dialog at creation

- **WHEN** the user dismisses the save dialog opened by creating a project
- **THEN** the project still exists with the name that was entered, is fully usable, and is bound to no file
- **AND** no error is reported

#### Scenario: User cancels the save dialog

- **WHEN** the user dismisses the native save dialog without choosing a destination
- **THEN** no file is written, the project's bound path is left unchanged, and no error is reported

#### Scenario: Web build is unaffected

- **WHEN** the same project is exported from the web build (no `window.bibletime` bridge present)
- **THEN** the browser downloads the bundle as a `.json` file exactly as it does today, with no native dialog involved

#### Scenario: Web build creation is unaffected

- **WHEN** a project is created in the web build
- **THEN** no dialog is opened and the project is created exactly as it is today

### Requirement: Save in place after the first save

A project that is bound to a file path SHALL be re-saved to that same path without reopening the save dialog. Choosing a different destination SHALL remain available as a separate explicit action. A bound project SHALL additionally be re-saved to that path automatically when its content changes, without an explicit user action; the explicit save SHALL remain available and SHALL write the whole project on demand.

#### Scenario: Second save of a bound project

- **WHEN** the user triggers "Save" on a project already bound to a path
- **THEN** the bundle is written to that path, overwriting it, with no dialog shown

#### Scenario: Save as… on a bound project

- **WHEN** the user triggers "Save as…" on a project already bound to a path
- **THEN** the native save dialog opens pre-filled with the current path
- **AND** on confirmation the bundle is written to the newly chosen path
- **AND** the project is rebound to the new path, leaving the previous file as it was

#### Scenario: A bound project is written without an explicit save

- **WHEN** the user changes a bound project and makes no further changes
- **THEN** the bundle is written to the bound path with no dialog and no explicit save action

#### Scenario: Bound path is no longer writable

- **WHEN** a save-in-place is attempted and the bound path can no longer be written (the folder was deleted, an external drive was unmounted, or permissions were revoked)
- **THEN** the failure is reported to the user with the reason
- **AND** the user is offered the save dialog to pick a new destination
- **AND** the project's data in the app's own managed storage is left intact
