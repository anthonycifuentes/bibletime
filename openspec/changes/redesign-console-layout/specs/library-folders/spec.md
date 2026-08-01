## ADDED Requirements

### Requirement: Folder lifecycle management
The system SHALL allow a user to create, rename, and delete Library folders, and SHALL persist folders across app restarts.

#### Scenario: Create a folder
- **WHEN** a user creates a new folder from the Library tab
- **THEN** the folder appears in the folder tree, is empty, and is persisted so it still exists after restarting the app

#### Scenario: Rename a folder
- **WHEN** a user renames an existing folder
- **THEN** the folder tree reflects the new name immediately and the new name is persisted

#### Scenario: Delete a folder
- **WHEN** a user deletes a folder
- **THEN** the folder and all of its items are removed from the folder tree and from persisted storage, and if that folder was open in the slide console, the slide console shows an empty/no-folder-selected state

### Requirement: Folders group mixed-type items in order
The system SHALL allow a folder to contain an ordered list of items of different content types (at minimum: Bible passage, song, media), and SHALL preserve each item's position across reads.

#### Scenario: Add a Bible passage to a folder
- **WHEN** a user adds a verse or verse range from the Bible tab while a folder is open
- **THEN** a new `bible-passage` item is appended to the end of that folder's ordered item list

#### Scenario: Folder holds multiple content types
- **WHEN** a folder already contains a `bible-passage` item and a user adds a `song` or `media` item
- **THEN** the folder's item list contains both items, each retaining its own type-specific data, in the order they were added

### Requirement: Folder items can be reordered and removed
The system SHALL allow a user to move an item earlier or later within its folder's order, and to remove an item from a folder, without affecting other folders.

#### Scenario: Move an item up
- **WHEN** a user moves an item one position earlier in its folder
- **THEN** the item's new position is reflected in the folder's persisted order and in the slide console's rendering

#### Scenario: Remove an item from a folder
- **WHEN** a user removes an item from a folder
- **THEN** the item no longer appears in that folder's item list, and the underlying content it referenced (e.g. the Bible verse, the song, the media asset) is unaffected

### Requirement: Unresolvable item types render as placeholders, not omissions
The system SHALL render a folder item whose content type has no data yet available (e.g. `song`/`media` before those modules have real content) as a placeholder slide, and SHALL NOT silently exclude it from the folder's item list, selection, or ordering.

#### Scenario: Placeholder item is still selectable and orderable
- **WHEN** a folder contains a `song` item and the songs module has no backing data yet
- **THEN** the item still appears in the slide console in its correct position, can be selected, reordered, and have a template applied, and renders a "not yet available" placeholder instead of real content
