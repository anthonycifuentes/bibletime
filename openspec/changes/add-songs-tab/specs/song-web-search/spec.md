## ADDED Requirements

### Requirement: Songs can be searched for and imported from an online lyrics provider

The system SHALL provide a search interface, reachable from the Songs tab, that queries an online lyrics provider by free-text query and lists the matching results with enough information to tell them apart — at minimum track title and artist, plus album and duration when the provider supplies them. Selecting a result SHALL fetch its lyrics.

#### Scenario: Searching returns identifiable results

- **WHEN** a user opens the web search and submits a query
- **THEN** matching results are listed, each showing at least its title and artist

#### Scenario: A query with no matches

- **WHEN** a query matches nothing at the provider
- **THEN** an explicit "no results" state is shown and the query remains editable

#### Scenario: A result with no usable lyrics

- **WHEN** a user selects a result whose plain lyrics are empty or unavailable
- **THEN** the user is told the lyrics could not be retrieved and the result is not importable, while other results remain selectable

### Requirement: Fetched lyrics are previewed before being imported

The system SHALL show the fetched lyric text, and the number of slides it would produce under the blank-line rule, before anything is written to the song library. Importing SHALL be an explicit, separate action from selecting a result.

#### Scenario: Preview precedes import

- **WHEN** a user selects a search result
- **THEN** the fetched lyrics and the resulting slide count are displayed, and nothing has yet been saved to the song library

#### Scenario: Dismissing after previewing saves nothing

- **WHEN** a user previews a result's lyrics and then closes the search without importing
- **THEN** no song is added to the library

### Requirement: An imported song is an ordinary editable local song

The system SHALL import a selected result by creating a normal song in the local library, with its title and author taken from the provider's metadata and its sections produced by the same lyric parsing rules used for typed or pasted lyrics. An imported song SHALL be editable, re-parseable, and deletable exactly like a manually created one, and SHALL open in the editor after import so the user can review and correct it before use.

#### Scenario: Import creates a normal song

- **WHEN** a user imports a search result
- **THEN** a song is created in the local library whose sections match what the blank-line rule produces from the fetched lyrics, and it appears in the Songs tab list

#### Scenario: Imported songs are editable

- **WHEN** a user opens an imported song in the editor
- **THEN** they can change its title, author, and lyrics and save, with the same behavior as a manually created song

#### Scenario: Import opens the editor for review

- **WHEN** an import completes
- **THEN** the newly created song is opened in the editor so the user can correct formatting before adding it to the Library

### Requirement: Imported songs record their provenance

The system SHALL record, on each imported song, which provider it came from and that provider's identifier for the track, and SHALL preserve those fields across edits and re-saves.

#### Scenario: Provenance is stored

- **WHEN** a song is imported from the online provider
- **THEN** its stored JSON records the provider name and the provider's track identifier

#### Scenario: Provenance survives editing

- **WHEN** a user edits and re-saves an imported song
- **THEN** the recorded provider and track identifier are unchanged

### Requirement: The search surface states the licensing responsibility

The system SHALL display, in the web search interface, a notice that fetched lyrics are third-party content and that public performance or projection of copyrighted lyrics generally requires an appropriate license, and SHALL provide a field on the song for recording a licence/CCLI number.

#### Scenario: Licensing notice is visible

- **WHEN** a user opens the web search
- **THEN** the licensing notice is visible without needing to scroll past the results

### Requirement: Web search failure never blocks song authoring

The system SHALL treat the online provider as optional: when a search request fails, times out, or is blocked by the platform, the system SHALL show a clear "search unavailable" state and SHALL leave creating, editing, previewing, and adding songs by hand fully available.

#### Scenario: Provider unreachable

- **WHEN** a search request fails or times out
- **THEN** an explicit "search unavailable" message is shown, the failure is not presented as "no results", and the search can be retried

#### Scenario: Request blocked by the platform

- **WHEN** the running platform prevents the request from being made at all
- **THEN** the web search reports itself as unavailable, and the Songs tab's create, edit, preview, and add actions all continue to work

#### Scenario: Authoring is never gated on the provider

- **WHEN** the online provider is unavailable
- **THEN** a user can still create a song by typing or pasting lyrics and add it to the Library
