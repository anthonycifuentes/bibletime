## ADDED Requirements

### Requirement: Download a translation for offline use in the desktop app
The system SHALL let the user, in the desktop app, download a chosen translation's full content from the remote catalog and store it in a persistent local folder so it can be read without a network connection afterward.

#### Scenario: Starting a download
- **WHEN** the user chooses to download a translation that is available online only
- **THEN** the system fetches that translation's full content and shows the translation as downloading until it completes

#### Scenario: Download completes
- **WHEN** a translation's content has been fully fetched and written to the local downloads folder
- **THEN** the system marks that translation as downloaded and it becomes selectable without a network connection

#### Scenario: Download fails
- **WHEN** a translation's download cannot complete (network failure or write failure)
- **THEN** the system marks that translation as failed, leaves no partial file usable as if it were a complete download, and lets the user retry

#### Scenario: Download attempted in the plain web build
- **WHEN** the app is running without the desktop app's local storage bridge
- **THEN** the system does not offer a download action for catalog-only translations

### Requirement: Read a downloaded translation fully offline
The system SHALL load a previously-downloaded translation's content from the local downloads folder rather than the network whenever that translation is selected.

#### Scenario: Selecting a downloaded translation while offline
- **WHEN** the user selects a translation that has already been downloaded, with no network connection available
- **THEN** the system loads that translation's content from local storage and displays it exactly as when online

#### Scenario: Selecting a downloaded translation while online
- **WHEN** the user selects a translation that has already been downloaded, with a network connection available
- **THEN** the system loads that translation's content from local storage rather than re-fetching it from the network

### Requirement: Remove a downloaded translation
The system SHALL let the user delete a previously-downloaded translation from local storage, after which it reverts to available-online-only status.

#### Scenario: Removing a downloaded translation
- **WHEN** the user chooses to remove a downloaded translation
- **THEN** the system deletes that translation's local content and the translation's status reverts to available online only

#### Scenario: Removing the bundled translation
- **WHEN** the user views the translation shipped with the app
- **THEN** the system does not offer a remove action for it, since it is not a user-managed download

### Requirement: Track downloaded translations across app restarts
The system SHALL persist a record of which translations have been downloaded so that download status is accurate the next time the desktop app starts, without re-checking every file on disk.

#### Scenario: Reopening the app after downloading a translation
- **WHEN** the user restarts the desktop app after having downloaded a translation in a previous session
- **THEN** the system shows that translation as already downloaded without re-downloading it
