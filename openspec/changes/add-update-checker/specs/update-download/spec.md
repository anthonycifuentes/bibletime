## ADDED Requirements

### Requirement: Installer asset selection

When an update is available, the app SHALL select the release asset matching the running platform and, on macOS, the running CPU architecture.

#### Scenario: macOS Apple Silicon

- **WHEN** the app runs on macOS with an `arm64` process architecture
- **THEN** the selected asset is the `arm64` `.dmg`

#### Scenario: macOS Intel

- **WHEN** the app runs on macOS with an `x64` process architecture
- **THEN** the selected asset is the `x64` `.dmg`

#### Scenario: Windows

- **WHEN** the app runs on Windows
- **THEN** the selected asset is the `.exe` installer

#### Scenario: Linux

- **WHEN** the app runs on Linux
- **THEN** the selected asset is the `.AppImage`

#### Scenario: No matching asset published

- **WHEN** the release contains no asset matching the current platform and architecture
- **THEN** the download action is not offered
- **AND** the panel offers opening the release page instead

### Requirement: Download with progress

The app SHALL download the selected asset into the operating system's Downloads directory and SHALL report progress to the renderer as it proceeds.

#### Scenario: User starts a download

- **WHEN** the user activates the download action
- **THEN** the asset begins downloading to the Downloads directory
- **AND** the UI shows downloaded bytes against total bytes

#### Scenario: Unknown content length

- **WHEN** the response provides no total size
- **THEN** the UI shows an indeterminate progress state rather than a wrong percentage

#### Scenario: Only one download at a time

- **WHEN** a download is already in progress
- **THEN** starting another is refused and the existing progress continues

### Requirement: Partial downloads never masquerade as complete

The download SHALL write to a temporary path and SHALL move the file to its final name only after the transfer completes successfully.

#### Scenario: App quits mid-download

- **WHEN** the app exits while a download is in flight
- **THEN** no file with the final installer name is left in the Downloads directory

#### Scenario: Transfer fails partway

- **WHEN** the connection drops before the transfer completes
- **THEN** the temporary file is removed
- **AND** the UI reports the failure and offers to retry

### Requirement: Cancellable download

The user SHALL be able to cancel an in-progress download, and cancelling SHALL leave no partial file behind.

#### Scenario: User cancels

- **WHEN** the user activates cancel during a download
- **THEN** the transfer stops
- **AND** the temporary file is deleted
- **AND** the UI returns to the "update available" state with the download action offered again

### Requirement: Completed download is revealed, not executed

On completion the app SHALL reveal the downloaded installer in the operating system's file manager and SHALL instruct the user to run it. The app SHALL NOT execute the installer or replace itself.

#### Scenario: Download completes

- **WHEN** the transfer finishes and the file is renamed into place
- **THEN** the installer is revealed in the file manager
- **AND** the UI shows a completed state naming the downloaded file and telling the user to open it to install

#### Scenario: Reveal after the panel is reopened

- **WHEN** the user returns to the updates panel after a completed download in the same session
- **THEN** the panel still offers to reveal the downloaded file

### Requirement: Filesystem writes stay inside the Downloads directory

The download SHALL derive its filename from the release asset name only, and SHALL reject any name that would resolve outside the Downloads directory.

#### Scenario: Asset name contains path separators

- **WHEN** a release asset name contains `/`, `\`, or `..`
- **THEN** the download is refused rather than writing outside the Downloads directory

### Requirement: Download source is constrained

The app SHALL only download from the asset URL reported by the GitHub Releases API for the BibleTime repository, over HTTPS.

#### Scenario: Non-HTTPS or foreign host

- **WHEN** an asset URL is not an HTTPS URL on a GitHub-owned host
- **THEN** the download is refused
