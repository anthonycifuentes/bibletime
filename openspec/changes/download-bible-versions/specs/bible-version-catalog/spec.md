## ADDED Requirements

### Requirement: List available Bible translations from the remote catalog
The system SHALL fetch the list of available Bible translations from the remote snapshots catalog and expose each entry's version identifier, abbreviation, title, and language, independent of whether that translation is bundled or downloaded locally.

#### Scenario: Opening the version list
- **WHEN** the user opens the Bible version list
- **THEN** the system displays every translation from the remote catalog, grouped by language

#### Scenario: Catalog fetch fails
- **WHEN** the remote catalog cannot be reached
- **THEN** the system shows an error state for the catalog list and still allows using whichever translation is already bundled or downloaded locally

### Requirement: Distinguish translation availability status
The system SHALL indicate, per translation in the version list, whether it is the always-available bundled translation, downloaded locally, available online only, currently downloading, or failed to download.

#### Scenario: Bundled translation
- **WHEN** the version list includes the translation shipped with the app
- **THEN** the system marks it as always available, with no download action needed

#### Scenario: Downloaded translation
- **WHEN** a translation has previously been downloaded and is present in local storage
- **THEN** the system marks it as downloaded and offers a way to remove it

#### Scenario: Catalog-only translation
- **WHEN** a translation exists in the remote catalog but has not been downloaded
- **THEN** the system marks it as available online only and offers a way to download it, where downloading is supported

### Requirement: Preview a catalog-only translation without downloading it
The system SHALL let the user select a translation that exists in the catalog but has not been downloaded, fetching its content over the network for that session without persisting it locally.

#### Scenario: Selecting a non-downloaded translation while online
- **WHEN** the user selects a translation that is available online only
- **THEN** the system fetches that translation's content over the network and displays it, without writing it to local storage

#### Scenario: Selecting a non-downloaded translation while offline
- **WHEN** the user selects a translation that is available online only, but there is no network connection
- **THEN** the system indicates that translation cannot be loaded right now, without affecting whichever translation was previously in view
