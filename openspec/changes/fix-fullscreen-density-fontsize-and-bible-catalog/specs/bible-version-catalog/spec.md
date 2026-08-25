## Purpose

Describes how the list of Bible translations offered to the user is assembled from a remote catalog and a bundled copy, so the Bible tab works whether or not the remote catalog is reachable.

## ADDED Requirements

### Requirement: Remote catalog is preferred

The system SHALL attempt to load the remote translation catalog first, so translations added upstream appear without an app update.

#### Scenario: Remote catalog available

- **WHEN** the remote catalog responds successfully
- **THEN** the version list is built from the remote catalog

### Requirement: Bundled catalog is the fallback

The app SHALL ship a bundled catalog of known translations, and SHALL use it whenever the remote catalog cannot be loaded (HTTP error, network failure, timeout, or malformed response).

#### Scenario: Remote catalog returns 404

- **WHEN** the remote catalog request returns a non-success status
- **THEN** the version list is built from the bundled catalog and the user can browse, select and (where supported) download translations from it

#### Scenario: Offline

- **WHEN** the device has no network connection
- **THEN** the version list is built from the bundled catalog

#### Scenario: Slow remote catalog

- **WHEN** the remote catalog does not respond within a bounded time
- **THEN** the version list is built from the bundled catalog rather than left loading indefinitely

### Requirement: Local versions are always listed

The bundled translation and every downloaded translation SHALL appear in the version list and be selectable regardless of whether the remote or the bundled catalog was used.

#### Scenario: Bundled RVR1960 with the remote catalog down

- **WHEN** the remote catalog is unreachable
- **THEN** RVR1960 is listed with status "bundled" and can be read

#### Scenario: Downloaded version not in either catalog

- **WHEN** a translation was downloaded earlier and is absent from the catalog that loaded
- **THEN** it is still listed with status "downloaded" and can be read

### Requirement: Catalog failure is not a version-list failure

A failure to load the remote catalog SHALL NOT surface as an error state or an empty list in the Bible tab.

#### Scenario: Bible tab with catalog down

- **WHEN** the operator opens the Bible tab while the remote catalog is unreachable
- **THEN** the version selector shows the bundled catalog's translations and no error is shown for the catalog itself
