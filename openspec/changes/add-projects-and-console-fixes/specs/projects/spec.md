## ADDED Requirements

### Requirement: Project creation requires a name
The system SHALL require a non-empty name when a user creates a new project, and SHALL persist the project as a distinct entity from a folder.

#### Scenario: Creating a project with a name
- **WHEN** a user chooses to create a new project and enters a name
- **THEN** the system creates a `Project` record with that name and makes it the active project

#### Scenario: Rejecting an empty project name
- **WHEN** a user attempts to create a project without entering a name
- **THEN** the system does not create the project and the create action remains available

### Requirement: Folders are created under the active project
The system SHALL scope folder listing and creation to whichever project is currently active, and every folder SHALL belong to exactly one project.

#### Scenario: Creating a folder while a project is active
- **WHEN** a user creates a folder while a project is active
- **THEN** the new folder is associated with the active project and appears in that project's folder list

#### Scenario: Folders from other projects are not shown
- **WHEN** a project is active
- **THEN** only folders belonging to that project appear in the sidebar's folder tree

#### Scenario: No project active yet
- **WHEN** no project has been created yet
- **THEN** the system prevents folder creation and prompts the user to create a project first

### Requirement: Active project name replaces the static "Library" header
The system SHALL display the active project's name in the console sidebar's section header, in place of a static "Library" label.

#### Scenario: Sidebar header shows the project name
- **WHEN** a project named "Sunday Service" is active
- **THEN** the sidebar's folder-tree section header displays "Sunday Service" instead of "Library"

#### Scenario: Switching the active project updates the header
- **WHEN** the user switches the active project to a different one
- **THEN** the sidebar header immediately updates to the newly active project's name and its folder list

### Requirement: Existing folders migrate into a default project
The system SHALL, on first load after this change, assign any folder that predates the `Project` entity to an automatically created default project, without data loss.

#### Scenario: Orphan folders get a default project
- **WHEN** the app loads and finds folders with no associated project
- **THEN** the system creates one default project and associates every such folder with it

#### Scenario: Migration runs only once
- **WHEN** the app loads again after the migration has already run
- **THEN** the system does not create a second default project or re-migrate already-associated folders
