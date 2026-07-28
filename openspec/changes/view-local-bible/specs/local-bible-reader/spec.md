## ADDED Requirements

### Requirement: Browse books, chapters, and verses on one screen
The system SHALL let the user browse the bundled Bible translation by book, then chapter, then verse, entirely within a single screen — selecting a book or chapter updates that screen in place and never navigates to a different page.

#### Scenario: Opening the Bible screen
- **WHEN** the user navigates to the Bible section
- **THEN** the system displays the full list of books from the bundled translation (in canonical order), the chapter list for a default book, and that book's first chapter, all on one screen

#### Scenario: Selecting a book
- **WHEN** the user selects a book from the book list
- **THEN** the system updates the chapter list and verse content to that book's first chapter, without navigating away from the current screen

#### Scenario: No network available
- **WHEN** the user browses books, chapters, or verses while offline
- **THEN** browsing succeeds identically to being online, because the data is served from the local bundle

#### Scenario: Filtering the book list
- **WHEN** the user types a partial book name into the book list's filter input
- **THEN** the system narrows the visible list to books whose name matches, case- and accent-insensitively

### Requirement: Read and pick verses in a chapter
The system SHALL render a chapter's verses (each with its number and full text) alongside the book and chapter lists on the same screen, so the user can read the chapter and pick a verse without any page navigation.

#### Scenario: Reading a chapter
- **WHEN** the user opens a specific chapter of a book
- **THEN** the system displays that chapter's verses in order, each with its verse number and full text, along with any section headings present in the chapter

#### Scenario: Selecting a verse
- **WHEN** the user clicks a verse while reading a chapter
- **THEN** the system marks that verse as selected and updates the output preview to show it, without navigating away from the current screen

#### Scenario: Navigating between adjacent chapters
- **WHEN** the user is reading a chapter that has a next or previous chapter
- **THEN** the system provides controls to move to the next or previous chapter in place, without navigating to a different screen

#### Scenario: Switching books or chapters from the reader
- **WHEN** the user is viewing the Bible screen
- **THEN** the book list and chapter list remain visible alongside the verses at all times, so the user can jump to a different book or chapter without ever leaving the screen

### Requirement: Preview how a verse will be displayed
The system SHALL show a visual preview of the selected verse styled as it would appear on the output/projection screen (large, centered, minimal chrome). This is a preview only — it does not send the verse to any second window or display.

#### Scenario: Previewing a selected verse
- **WHEN** the user selects a verse in the chapter reader
- **THEN** the system displays that verse's reference and text in the preview panel, styled distinctly from the operator's own UI chrome

#### Scenario: No verse selected yet
- **WHEN** the user opens a chapter without having selected a specific verse
- **THEN** the system shows a sensible default in the preview panel (e.g. the chapter's first verse) rather than an empty panel

### Requirement: Jump to a typed reference
The system SHALL let the user type a Bible reference (book name or common abbreviation, chapter, and optionally verse) and navigate directly to the matching location.

#### Scenario: Reference with book, chapter, and verse
- **WHEN** the user enters a reference like "Juan 3:16"
- **THEN** the system navigates to John chapter 3 with verse 16 in view

#### Scenario: Reference with book and chapter only
- **WHEN** the user enters a reference like "Salmos 23"
- **THEN** the system navigates to Psalms chapter 23

#### Scenario: Unrecognized reference
- **WHEN** the user enters text that does not match any book name or abbreviation in the bundled translation
- **THEN** the system indicates the reference could not be resolved and does not navigate away from the current view

### Requirement: Bible navigation entry point
The system SHALL provide a working entry point into the Bible reader from the app's primary navigation.

#### Scenario: Opening the Bible reader from the sidebar
- **WHEN** the user clicks the "Bible" item in the sidebar navigation
- **THEN** the system navigates to the Bible screen
