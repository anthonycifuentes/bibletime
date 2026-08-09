## ADDED Requirements

### Requirement: Automatic update check on launch

The desktop app SHALL check for a newer published release once per launch, after the main window has finished loading, without blocking startup.

#### Scenario: Check runs after the window is ready

- **WHEN** the desktop app finishes loading its renderer
- **THEN** an update check is started in the background
- **AND** the window is interactive before, during, and after the check

#### Scenario: Web build performs no check

- **WHEN** the app runs in a browser and the `window.bibletime` bridge is absent
- **THEN** no update check is attempted
- **AND** no update banner or update actions are shown

#### Scenario: Only one automatic check per launch

- **WHEN** the automatic launch check has already completed in this session
- **THEN** no further automatic check is started for the lifetime of the process

### Requirement: Manual update check

The Settings updates panel SHALL offer a manual check that runs on demand regardless of whether the launch check already ran.

#### Scenario: User checks manually

- **WHEN** the user activates "Check now"
- **THEN** a check is started immediately
- **AND** the control shows a checking state and is disabled until the check settles

### Requirement: Latest release discovery

The check SHALL query the GitHub Releases API for the newest published, non-prerelease release of the BibleTime repository, and SHALL identify it by the release's tag name with a leading `v` stripped.

#### Scenario: Newest release resolved

- **WHEN** the API returns the latest release with tag `v0.2.0`
- **THEN** the discovered available version is `0.2.0`

#### Scenario: Draft and prerelease releases ignored

- **WHEN** the newest release is a draft or is marked as a prerelease
- **THEN** it is not offered as an available update

#### Scenario: Request identifies the app

- **WHEN** the check issues its HTTP request
- **THEN** the request carries a `User-Agent` naming BibleTime and its version, matching the convention already used for outbound requests

### Requirement: Version comparison

The app SHALL compare the discovered version against the running version using semantic-version ordering, and SHALL report an update only when the discovered version is strictly greater.

#### Scenario: Newer version available

- **WHEN** the running version is `0.1.1` and the discovered version is `0.2.0`
- **THEN** the result is "update available" carrying the discovered version

#### Scenario: Same version installed

- **WHEN** the running version equals the discovered version
- **THEN** the result is "up to date"

#### Scenario: Running a newer build than published

- **WHEN** the running version is `0.2.0` and the discovered version is `0.1.1`
- **THEN** the result is "up to date"
- **AND** no downgrade is offered

#### Scenario: Numeric segments compared as numbers

- **WHEN** the running version is `0.9.0` and the discovered version is `0.10.0`
- **THEN** the result is "update available"

### Requirement: Checks fail silently

A failed check SHALL NOT interrupt the user, surface a dialog, or degrade any other part of the app. The failure SHALL be recorded so the Settings panel can report it, and SHALL be visible in the console for diagnosis.

#### Scenario: No network connection

- **WHEN** the check cannot reach the network
- **THEN** no banner and no dialog appear
- **AND** the Settings panel reports that the last check could not complete

#### Scenario: API rate limit reached

- **WHEN** the API responds with a rate-limit or other non-success status
- **THEN** the check resolves as failed rather than throwing into the renderer

#### Scenario: Malformed response

- **WHEN** the API response is not valid JSON or lacks a usable tag name
- **THEN** the check resolves as failed and the previously known state is left unchanged

### Requirement: Check state is persisted

The desktop app SHALL persist the timestamp of the last completed check, the last discovered version, and the version whose banner the user dismissed, in the app's user-data directory.

#### Scenario: Last-checked time survives restart

- **WHEN** a check completes and the app is later restarted
- **THEN** the Settings panel can show when the last check happened before the new check settles

#### Scenario: Corrupt or missing state file

- **WHEN** the persisted state file is absent or cannot be parsed
- **THEN** the app treats the state as empty and continues without error
