## ADDED Requirements

### Requirement: The project's save state is visible

The system SHALL show the active project's save state alongside its save controls, distinguishing at least: saved and up to date, a save in progress, changes not yet written, not bound to any file, and a failed save. When a project is bound to a file, the system SHALL show where that file is.

#### Scenario: Up to date

- **WHEN** a bound project has no pending changes and its last write succeeded
- **THEN** the status reports it as saved, and shows the bound file's location

#### Scenario: Changes pending

- **WHEN** a user changes a bound project and the write has not yet happened
- **THEN** the status reports unsaved changes

#### Scenario: Write in progress

- **WHEN** an auto-save or explicit save is writing
- **THEN** the status reports that a save is in progress

#### Scenario: Not bound to a file

- **WHEN** a project has never been saved to a file
- **THEN** the status reports that it is not saved to a file, rather than reporting it as saved or as an error

#### Scenario: State is not claimed from a previous session

- **WHEN** the application starts
- **THEN** a project's status reflects what this session has actually observed, and does not assert a save that this session has not verified

### Requirement: A failed save is surfaced, not retried silently

The system SHALL report a failed save with its reason and SHALL NOT retry it automatically on a timer. After a failure the manual save path SHALL remain available, and a subsequent change or an explicit save SHALL be allowed to attempt the write again.

#### Scenario: The bound file is gone

- **WHEN** the file a project is bound to has been deleted or its volume disconnected, and an auto-save is attempted
- **THEN** the status reports a failed save with the reason, and the application does not enter a repeating retry loop

#### Scenario: Recovering through an explicit save

- **WHEN** a project's auto-save has failed and the user invokes Save as… and chooses a reachable location
- **THEN** the project is written there, is rebound to it, and its status returns to saved

#### Scenario: Failure does not affect the app's own data

- **WHEN** a save to the bound file fails
- **THEN** the project and all of its folders and slides remain intact in the application's managed storage and continue to be editable

### Requirement: The manual save control remains available as a fallback

The system SHALL keep an explicit save control that writes the entire active project — the project and every folder in it — regardless of auto-save's state, so a user can force a write at any time.

#### Scenario: Forcing a save

- **WHEN** a user invokes the explicit save control on a bound project
- **THEN** the whole project is written to its bound file immediately, without waiting for the auto-save interval

#### Scenario: Manual save works when auto-save has failed

- **WHEN** auto-save has reported a failure and the user invokes the explicit save control
- **THEN** the write is attempted again and its result is reported
