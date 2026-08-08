## ADDED Requirements

### Requirement: Native save location on desktop

On the desktop (Electron) build, saving a project to a file SHALL use the operating system's native save dialog so the user chooses the destination folder and filename. The web build SHALL keep its existing browser-download behavior unchanged.

#### Scenario: Saving a project that has no file yet

- **WHEN** the user triggers "Save" (or "Save as…") on a desktop project that has never been written to a file
- **THEN** a native save dialog opens, pre-filled with a filename derived from the project name and the `.bibletime-project.json` extension, defaulting to the user's documents location
- **AND** on confirmation the project bundle is written to the chosen path
- **AND** the project is bound to that path for subsequent saves

#### Scenario: User cancels the save dialog

- **WHEN** the user dismisses the native save dialog without choosing a destination
- **THEN** no file is written, the project's bound path is left unchanged, and no error is reported

#### Scenario: Web build is unaffected

- **WHEN** the same project is exported from the web build (no `window.bibletime` bridge present)
- **THEN** the browser downloads the bundle as a `.json` file exactly as it does today, with no native dialog involved

### Requirement: Save in place after the first save

A project that is bound to a file path SHALL be re-saved to that same path without reopening the save dialog. Choosing a different destination SHALL remain available as a separate explicit action.

#### Scenario: Second save of a bound project

- **WHEN** the user triggers "Save" on a project already bound to a path
- **THEN** the bundle is written to that path, overwriting it, with no dialog shown

#### Scenario: Save as… on a bound project

- **WHEN** the user triggers "Save as…" on a project already bound to a path
- **THEN** the native save dialog opens pre-filled with the current path
- **AND** on confirmation the bundle is written to the newly chosen path
- **AND** the project is rebound to the new path, leaving the previous file as it was

#### Scenario: Bound path is no longer writable

- **WHEN** a save-in-place is attempted and the bound path can no longer be written (the folder was deleted, an external drive was unmounted, or permissions were revoked)
- **THEN** the failure is reported to the user with the reason
- **AND** the user is offered the save dialog to pick a new destination
- **AND** the project's data in the app's own managed storage is left intact

### Requirement: Opening a project binds it to its source file

Opening a project file on desktop SHALL record the path it was opened from, so the opened project can be saved back to that file without a dialog.

#### Scenario: Open then save

- **WHEN** the user opens a project file from disk on desktop and then triggers "Save"
- **THEN** the bundle is written back to the file it was opened from, with no dialog shown

#### Scenario: Opened project remains a copy in managed storage

- **WHEN** a project file is opened
- **THEN** the project is created in the app's own managed storage with fresh ids, exactly as it is today
- **AND** subsequent edits do NOT write to the source file until the user explicitly saves

### Requirement: Save outcome is reported

The result of a save SHALL be visible to the user rather than silent.

#### Scenario: Successful save

- **WHEN** a project is written to disk successfully
- **THEN** the user sees a success confirmation identifying where it was saved

#### Scenario: Failed save

- **WHEN** the write fails for any reason
- **THEN** the user sees an error message describing the failure, and the app remains usable with the project unchanged in managed storage

### Requirement: The on-disk bundle format is unchanged

The bytes written by the desktop save path SHALL be identical to those the web build downloads for the same project, and SHALL keep the existing `ProjectFile` schema version.

#### Scenario: Cross-platform round trip

- **WHEN** a project is saved on desktop and the resulting file is opened in the web build (or the reverse)
- **THEN** it opens successfully with the same folders and slides

#### Scenario: Previously exported files still open

- **WHEN** a file exported before this change is opened on desktop
- **THEN** it opens successfully with no migration step

### Requirement: The desktop open and save paths are verified against a real build

The desktop file paths SHALL be exercised against a running Electron build, not only inferred from the shared renderer logic — closing the verification gap left open by `add-project-open-export`.

#### Scenario: End-to-end desktop round trip

- **WHEN** a tester runs the packaged or dev Electron build and performs open → edit → save → reopen
- **THEN** the reopened project reflects the edits made before saving
- **AND** the verification result is recorded in the change's tasks
