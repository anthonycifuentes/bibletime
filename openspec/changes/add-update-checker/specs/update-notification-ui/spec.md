## ADDED Requirements

### Requirement: Launch banner announces an available update

When a launch check finds a newer version, the app SHALL show a banner in the app shell naming the available version, with actions to open the updates panel and to dismiss.

#### Scenario: Update found on launch

- **WHEN** the launch check reports version `0.2.0` is available and the user is on `0.1.1`
- **THEN** a banner appears naming `0.2.0`
- **AND** it offers an action leading to the Settings updates panel

#### Scenario: No update found

- **WHEN** the launch check reports the app is up to date
- **THEN** no banner appears

#### Scenario: Check failed

- **WHEN** the launch check fails
- **THEN** no banner appears

### Requirement: Dismissal is remembered per version

Dismissing the banner SHALL suppress it for that version only. A later, higher version SHALL show the banner again.

#### Scenario: Dismissed version stays dismissed

- **WHEN** the user dismisses the banner for `0.2.0` and restarts the app while `0.2.0` is still the newest release
- **THEN** the banner does not reappear

#### Scenario: A newer version reappears

- **WHEN** the user has dismissed `0.2.0` and the newest release becomes `0.3.0`
- **THEN** the banner appears again naming `0.3.0`

#### Scenario: Dismissal does not hide the Settings panel

- **WHEN** the banner has been dismissed for the available version
- **THEN** the Settings updates panel still reports that version as available

### Requirement: Settings shows the current version

Settings SHALL display the version the user is running: the packaged app version inside the desktop shell, and the build-time version in the web build.

#### Scenario: Desktop

- **WHEN** Settings is opened inside the Electron shell
- **THEN** the version reported by the main process is displayed

#### Scenario: Web

- **WHEN** Settings is opened in a browser
- **THEN** the build-time version constant is displayed
- **AND** no update status, check action, or download action is shown

### Requirement: Settings updates panel reports check status

The desktop Settings updates panel SHALL show the outcome of the most recent check — up to date, update available, check failed, or checking — along with when the last successful check completed.

#### Scenario: Up to date

- **WHEN** the last check found no newer version
- **THEN** the panel states the app is up to date and shows the last-checked time

#### Scenario: Update available

- **WHEN** the last check found a newer version
- **THEN** the panel names that version and offers a download action and a link to the release notes

#### Scenario: Check failed

- **WHEN** the last check failed
- **THEN** the panel states that the check could not complete and offers to retry
- **AND** it still shows the current version

#### Scenario: Check in flight

- **WHEN** a check is running
- **THEN** the panel shows a checking state and the check action is disabled

### Requirement: Download state is visible in the panel

The updates panel SHALL reflect the download lifecycle: idle, downloading with progress, completed, cancelled, or failed.

#### Scenario: Downloading

- **WHEN** a download is in progress
- **THEN** the panel shows progress and offers cancel in place of the download action

#### Scenario: Completed

- **WHEN** the download completes
- **THEN** the panel names the downloaded file, tells the user to open it to finish installing, and offers to reveal it in the file manager

#### Scenario: Failed

- **WHEN** the download fails
- **THEN** the panel reports the failure and offers to retry

### Requirement: Update UI is fully localized

All strings introduced by the banner and the updates panel SHALL be provided through the existing translation dictionaries for every supported locale.

#### Scenario: Locale switched

- **WHEN** the user switches the app language to Spanish or Portuguese
- **THEN** every banner and updates-panel string appears in that language with no untranslated keys
