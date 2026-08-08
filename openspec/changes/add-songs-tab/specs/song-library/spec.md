## ADDED Requirements

### Requirement: Songs persist as one JSON file per song in a dedicated songs directory

The system SHALL persist each song as a single JSON file named by the song's id, in a dedicated `songs` directory under the desktop app's user-data location, separate from the projects/library data location. The system SHALL create that directory lazily on first write, and SHALL treat the directory listing as the song index without maintaining a separate index file.

#### Scenario: Saving a song writes one file

- **WHEN** a user saves a new song
- **THEN** exactly one JSON file named `<song-id>.json` is written into the songs directory, and no other file is created or modified

#### Scenario: Songs directory does not exist yet

- **WHEN** a user saves the first song and the songs directory has never been created
- **THEN** the directory is created and the save succeeds

#### Scenario: Deleting a song removes only its file

- **WHEN** a user deletes a song
- **THEN** only that song's JSON file is removed from the songs directory, and every other song remains listed and readable

#### Scenario: Unreadable file does not break the library

- **WHEN** the songs directory contains a file that is not valid song JSON
- **THEN** listing the song library skips that file and returns every valid song, rather than failing

### Requirement: The song library is shared across all projects

The system SHALL make every stored song available regardless of which project is active, and SHALL NOT scope songs to a project. Relocating the projects/library data directory SHALL NOT move or hide the song library.

#### Scenario: Songs are visible in every project

- **WHEN** a user saves a song while one project is active, then switches to a different project and opens the Songs tab
- **THEN** the same song is listed and usable

#### Scenario: Relocating the projects directory leaves songs in place

- **WHEN** a user changes where projects and their folders are stored
- **THEN** the song library is unaffected and every song is still listed

### Requirement: Songs are stored in a documented, versioned JSON schema

The system SHALL store each song in a JSON structure carrying an explicit `schemaVersion`, the song's identity and metadata, and its ordered sections. Each section SHALL carry its own label, its ordered lines, and a section type code drawn from the OpenLyrics vocabulary (`v` verse, `c` chorus, `p` pre-chorus, `b` bridge, `e` ending, `t` tag). Metadata fields SHALL include at minimum title, authors, copyright, CCLI number, musical key, and import source, and all metadata other than title SHALL be optional.

#### Scenario: A saved song file is self-describing

- **WHEN** a song is written to disk
- **THEN** its JSON contains `schemaVersion`, the song id, the title, and an ordered `sections` array in which each section has a label, a type code, and its lines

#### Scenario: Optional metadata is omitted rather than emptied

- **WHEN** a user saves a song without entering an author, copyright, CCLI number, or key
- **THEN** the song is stored and re-read successfully, and absent metadata does not appear as empty-string fields the UI would render as blank labels

#### Scenario: Unknown future fields survive a read

- **WHEN** a song file contains a field the current version does not recognize
- **THEN** the song still loads with every recognized field intact

### Requirement: The song library supports create, read, update, delete, and search

The system SHALL allow a user to create a song, list every stored song, open a stored song for editing, save changes back to the same song, and delete a song. Search SHALL filter the listed songs by title, author, and lyric text, and SHALL match case-insensitively and accent-insensitively.

#### Scenario: Editing a song updates it in place

- **WHEN** a user opens an existing song, changes its lyrics, and saves
- **THEN** the same song id is updated in place, no duplicate song is created, and the change is visible after restarting the app

#### Scenario: Searching by lyric text

- **WHEN** a user types a phrase that appears in a song's lyrics but not in its title into the Songs tab search box
- **THEN** that song appears in the filtered list

#### Scenario: Accent-insensitive search

- **WHEN** a user searches for `cancion` and a stored song is titled `Canción`
- **THEN** that song appears in the filtered list

#### Scenario: Search with no matches

- **WHEN** a user's search query matches no stored song
- **THEN** the list shows an explicit empty state and the search box retains the query so it can be corrected

### Requirement: Song storage degrades to browser storage outside the desktop shell

The system SHALL provide a browser-storage-backed song store for builds running without the desktop shell, exposing the same operations, so that authoring, editing, previewing, and adding songs remain available. The system SHALL report whether the active store can write, and SHALL surface a read-only state rather than failing silently when it cannot.

#### Scenario: Authoring works in the web build

- **WHEN** a user opens the Songs tab in a build with no desktop bridge available
- **THEN** they can create, edit, search, preview, and add songs, and those songs persist across reloads

#### Scenario: Read-only environment

- **WHEN** the active song store reports that it cannot write
- **THEN** the Songs tab presents its create/edit/delete affordances as unavailable rather than offering actions that would silently fail
