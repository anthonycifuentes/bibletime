## ADDED Requirements

### Requirement: A blank line separates slides; a single newline does not

The system SHALL split a song's lyric text into ordered sections at every run of one or more blank (whitespace-only) lines, and SHALL treat a single newline as a line break within the current section. Each resulting section SHALL become exactly one slide. Leading and trailing blank lines SHALL NOT produce empty sections.

#### Scenario: Two blocks become two slides

- **WHEN** a user enters two blocks of two lines each, separated by one blank line
- **THEN** the song has exactly two sections, the first containing the first two lines and the second containing the last two, each line preserved as its own line

#### Scenario: Single newlines stay inside one slide

- **WHEN** a user enters four consecutive lines with no blank line between any of them
- **THEN** the song has exactly one section containing all four lines

#### Scenario: Multiple consecutive blank lines separate once

- **WHEN** a user's lyrics contain three consecutive blank lines between two blocks
- **THEN** exactly two sections are produced and no empty section is created between them

#### Scenario: Surrounding blank lines are ignored

- **WHEN** pasted lyrics begin and end with blank lines
- **THEN** no empty leading or trailing section is produced

#### Scenario: Lyrics with no content

- **WHEN** the lyric text is empty or contains only whitespace
- **THEN** the song has zero sections and the editor reports that there is nothing to save rather than creating an empty slide

### Requirement: Section labels are inferred without requiring user tagging

The system SHALL assign each section a label automatically: sections SHALL be numbered as consecutive verses in order, and any section whose text repeats an earlier section's text SHALL be labelled as a chorus without consuming a verse number. Repetition SHALL be detected ignoring case, punctuation, and differences in whitespace. Inferred labels SHALL be editable by the user and SHALL be stored on the section rather than recomputed on every read.

#### Scenario: Verses are numbered in order

- **WHEN** a song's lyrics contain three distinct blocks
- **THEN** they are labelled as verse 1, verse 2, and verse 3 in order

#### Scenario: A repeated block is labelled as a chorus

- **WHEN** a song's blocks are A, B, A, C where the two A blocks have identical text
- **THEN** the first A is labelled verse 1, B is labelled verse 2, the second A is labelled as a chorus, and C is labelled verse 3

#### Scenario: Repetition detected despite punctuation differences

- **WHEN** two blocks differ only in trailing punctuation or capitalization
- **THEN** the later block is recognized as a repeat and labelled as a chorus

#### Scenario: Labels survive a re-open

- **WHEN** a user edits an inferred label, saves, and re-opens the song
- **THEN** the edited label is shown, not a freshly inferred one

### Requirement: Parsing and serialization round-trip losslessly

The system SHALL reconstruct the editor's lyric text from a stored song's sections by joining section bodies with a single blank line, such that re-parsing that text yields the same section boundaries and the same line content. Re-opening and re-saving a song without edits SHALL NOT change its sections.

#### Scenario: Re-opening a song shows what was written

- **WHEN** a user saves a song and immediately re-opens it in the editor
- **THEN** the textarea shows the same blocks in the same order, separated by blank lines, with the same lines inside each block

#### Scenario: Save without edits is a no-op on sections

- **WHEN** a user opens a stored song and saves it without changing anything
- **THEN** the song's stored sections are unchanged in count, order, and content

### Requirement: Auto-format breaks pasted paragraphs into slide-sized sections

The system SHALL provide an explicit auto-format action that rewrites the editor's lyric text in two passes: it SHALL break over-long lines at sentence terminators and then at clause boundaries into lyric-length lines, and it SHALL then insert a blank line after every Nth line within each block so the text becomes slide-sized sections. The action SHALL write its result into the editor's text where the user can see and further edit it, SHALL NOT run automatically on load, save, or paste, and SHALL NOT merge away blank lines the user already placed.

#### Scenario: A pasted paragraph becomes lines and slides

- **WHEN** a user pastes a single unbroken paragraph of lyrics and triggers auto-format
- **THEN** the editor's text is replaced with shorter lines broken at sentence and clause boundaries, grouped into blocks separated by blank lines

#### Scenario: Existing separations are preserved

- **WHEN** a user triggers auto-format on text that already contains blank-line separations
- **THEN** each existing block is grouped independently and no existing blank-line separation is removed

#### Scenario: Already-formatted lyrics are left essentially unchanged

- **WHEN** a user triggers auto-format on lyrics whose lines are already lyric-length and whose blocks are already at or under the grouping size
- **THEN** the text is unchanged

#### Scenario: Auto-format is undoable

- **WHEN** a user triggers auto-format and is unhappy with the result
- **THEN** the previous text can be restored through the editor's normal undo, because the action edits the text field rather than transforming at save time

#### Scenario: Auto-format never runs by itself

- **WHEN** a user pastes lyrics, saves a song, or opens an existing song for editing
- **THEN** the lyric text is not reformatted unless the user explicitly triggers the action
