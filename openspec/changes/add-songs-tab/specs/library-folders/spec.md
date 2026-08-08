## MODIFIED Requirements

### Requirement: Unresolvable item types render as placeholders, not omissions
The system SHALL render a folder item whose content type has no data yet available (e.g. `media` before that module has real content) as a placeholder slide, and SHALL NOT silently exclude it from the folder's item list, selection, or ordering. `song` items are no longer covered by this requirement — a `song` item carries its own section text and renders that text as a real slide.

#### Scenario: Placeholder item is still selectable and orderable
- **WHEN** a folder contains a `media` item and the media module has no backing data yet
- **THEN** the item still appears in the slide console in its correct position, can be selected, reordered, and have a template applied, and renders a "not yet available" placeholder instead of real content

#### Scenario: Song items render real content, not a placeholder
- **WHEN** a folder contains a `song` item
- **THEN** it renders that section's lyric text as the slide body, with no "not yet available" placeholder, and with no title or label drawn on the slide itself

## ADDED Requirements

### Requirement: Song items carry their content, not a reference to be resolved
The system SHALL store a song slide's section text, section label, song title, and section position on the folder item itself at the time it is added, alongside the source song's id. Rendering a song slide SHALL NOT require reading the song library. Editing or deleting the source song SHALL NOT change or break folder items already created from it.

The stored section label is what names the item in the folder tree and the slide console — the song title is retained for provenance and export, not for display on the slide.

#### Scenario: A song slide renders without the song library
- **WHEN** a `song` item is rendered in the slide console, the preview panel, or the presentation output
- **THEN** its text comes from the item itself and no lookup against the song library is required

#### Scenario: Source song deleted
- **WHEN** a user deletes a song from the song library after adding it to a folder
- **THEN** the folder's `song` items still render their text, remain selectable and orderable, and can still be presented

#### Scenario: Exported project keeps its song slides intact
- **WHEN** a project containing `song` items is exported and opened on a machine whose song library does not contain that song
- **THEN** every `song` slide renders its original text
