## ADDED Requirements

### Requirement: A bound project's file is kept current without user action

The system SHALL write a project to the file it is bound to whenever that project's content changes, without requiring the user to invoke a save. Auto-save SHALL write the same complete bundle an explicit Save writes — the project and every folder belonging to it — and SHALL NOT write a partial or incremental representation. Auto-save SHALL apply only to projects bound to a file, and only where the platform provides a write-to-path capability.

#### Scenario: An edit reaches the file

- **WHEN** a user adds a slide to a folder in a bound project and stops making changes
- **THEN** the project's file is updated to include that slide, with no user action

#### Scenario: Every kind of content change counts

- **WHEN** a user adds, renames, reorders, or deletes a folder, adds, removes, reorders, or retemplates a slide, or renames the project
- **THEN** each of those changes causes the bound file to be brought up to date

#### Scenario: Auto-save writes the same bytes as Save

- **WHEN** a project is auto-saved and then explicitly saved with no change in between
- **THEN** the file contents produced are identical

#### Scenario: An unbound project is not auto-saved

- **WHEN** a project has never been saved to a file and the user changes it
- **THEN** no file is written and no dialog is opened

#### Scenario: Auto-save does not apply on the web build

- **WHEN** a user changes a project in a browser build
- **THEN** no file write is attempted, and the project persists to the app's managed storage as it does today

### Requirement: Rapid successive edits produce one write

The system SHALL delay an auto-save until changes have stopped for a short interval, and SHALL coalesce all changes made during that interval into a single write. A change arriving while a write is already in progress SHALL NOT start a second concurrent write to the same file.

#### Scenario: A burst of edits coalesces

- **WHEN** a user reorders ten slides in quick succession
- **THEN** the file is written once after the reordering stops, not once per slide

#### Scenario: Continuous editing keeps deferring the write

- **WHEN** a user makes a change every second for a minute
- **THEN** writes do not occur on every change, and the file is brought up to date once the user pauses

#### Scenario: A change during an in-flight write

- **WHEN** the project changes while an auto-save write is still in progress
- **THEN** the in-flight write is allowed to finish and the new change is written afterwards, with no overlapping writes to the same file

### Requirement: Opening or switching projects does not rewrite files

The system SHALL NOT auto-save a project merely because it was loaded, opened, made active, or re-read from storage. Only a change to the project's content SHALL cause an auto-save.

#### Scenario: Launching the app writes nothing

- **WHEN** the application starts with bound projects in managed storage
- **THEN** no project file is written until the user changes something

#### Scenario: Switching between projects writes nothing

- **WHEN** a user switches the active project back and forth without editing
- **THEN** no project file is written

### Requirement: A final save is attempted when the window closes

The system SHALL attempt to bring a bound project's file up to date when the application window is closing and changes are still pending, so the last edits before quitting are not left unwritten.

#### Scenario: Pending changes at close

- **WHEN** a user makes a change and immediately closes the application
- **THEN** the application attempts to write the pending change to the bound file before shutting down

#### Scenario: A missed close-time write is recoverable

- **WHEN** a close-time write does not complete
- **THEN** the change is still present in the application's managed storage, and reopening the project and saving writes it to the file

## ADDED Requirements

### Requirement: Creating a project asks where to save it

The system SHALL open the platform's native save dialog immediately after a project is created on desktop, seeded with a filename derived from the project's name, and SHALL bind the project to the chosen location. Dismissing the dialog SHALL still leave the project created and usable, bound to no file.

#### Scenario: Choosing a location at creation

- **WHEN** a user creates a project on desktop and chooses a location
- **THEN** the project is written to that location and is bound to it, so later saves and auto-saves need no dialog

#### Scenario: Dismissing the dialog keeps the project

- **WHEN** a user creates a project on desktop and dismisses the save dialog
- **THEN** the project still exists and is fully usable, and its status reports that it is not saved to a file

#### Scenario: A dismissed dialog does not discard the name

- **WHEN** a user types a project name, creates it, and dismisses the save dialog
- **THEN** the project retains the name that was typed

#### Scenario: Binding later

- **WHEN** a user explicitly saves a project that was created without a location
- **THEN** it becomes bound to the chosen file, and auto-save applies to it from then on

#### Scenario: Creation on the web build is unchanged

- **WHEN** a user creates a project in a browser build
- **THEN** no save dialog is opened and the project is created exactly as it is today
