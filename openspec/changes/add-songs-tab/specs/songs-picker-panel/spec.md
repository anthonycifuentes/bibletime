## ADDED Requirements

### Requirement: The Songs tab presents a three-column list / lyrics / preview layout

The system SHALL render the Songs tab as three columns: a first column containing a search box and the song list plus the actions that create or import a song, a second column showing the selected song's sections as an ordered, selectable list, and a third column showing a live slide preview with a template selector and the add/present actions. The system SHALL NOT offer a slide-count splitting control in the Songs tab, because a song's sections already define its slides.

#### Scenario: Songs tab renders three columns

- **WHEN** a user activates the Songs tab
- **THEN** the search box and song list, the selected song's section list, and the preview with its actions are all visible at once

#### Scenario: Selecting a song populates the second column

- **WHEN** a user selects a song from the list
- **THEN** the second column shows that song's sections in order, each labelled, and no section is selected yet

#### Scenario: Selecting a section previews it

- **WHEN** a user selects a section in the second column
- **THEN** the third column renders that section's text in the slide preview using the currently selected template, and does not add anything to the Library

#### Scenario: No split-count control is offered

- **WHEN** a user looks for a way to split a section into several slides from the Songs tab
- **THEN** no split-count control is present, and the way to change the split is to edit the song's blank-line separations

#### Scenario: Empty song library

- **WHEN** a user activates the Songs tab with no songs stored
- **THEN** the list shows an empty state that points to creating a song or searching the web, rather than a blank column

### Requirement: A full-screen editor creates and edits songs from a title and one lyrics field

The system SHALL open a full-screen modal editor for creating a new song and for editing an existing one, containing a title field, an optional author field, and a single lyrics text area. The editor SHALL show a live count of the slides the current text would produce. The editor SHALL require a non-empty title and at least one section before it can be saved, and SHALL allow the user to dismiss it without saving.

#### Scenario: Creating a song from pasted lyrics

- **WHEN** a user opens the editor, enters a title, pastes lyrics containing blank-line separations, and saves
- **THEN** the song is stored with one section per block and appears in the song list

#### Scenario: Live slide count

- **WHEN** a user types or pastes into the lyrics field
- **THEN** the displayed slide count updates to reflect how many sections the current text would produce

#### Scenario: Saving is blocked without a title

- **WHEN** a user has entered lyrics but no title
- **THEN** saving is unavailable and the reason is indicated

#### Scenario: Saving is blocked with no lyrics

- **WHEN** a user has entered a title but the lyrics field is empty or whitespace only
- **THEN** saving is unavailable and the reason is indicated

#### Scenario: Editing an existing song

- **WHEN** a user opens an existing song in the editor
- **THEN** the title, author, and the song's lyric text reconstructed from its sections are pre-filled, and saving updates that same song rather than creating a new one

#### Scenario: Dismissing discards changes

- **WHEN** a user makes changes in the editor and dismisses it without saving
- **THEN** the stored song is unchanged

### Requirement: Adding a song to the Library creates a folder of that song's slides

The system SHALL provide an action that adds the selected song to the Library as a new folder named after the song, containing one slide per section in the song's order. When a Library folder is already open, the song's folder SHALL be created as a child of it, unless doing so would exceed the folder nesting limit, in which case it SHALL be created as a sibling. When no folder is open, the song's folder SHALL be created at the root. The folder and all of its slides SHALL be created in a single write.

#### Scenario: A song becomes a folder of slides

- **WHEN** a user selects a song with four sections and adds it to the Library
- **THEN** a new folder named after the song appears in the folder tree containing exactly four slides in the song's section order

#### Scenario: Added under the open folder

- **WHEN** a folder is open and the user adds a song to the Library
- **THEN** the song's folder is created as a child of the open folder

#### Scenario: Nesting limit reached

- **WHEN** the open folder is already at the maximum nesting depth and the user adds a song
- **THEN** the song's folder is created as a sibling of the open folder rather than being rejected or exceeding the limit

#### Scenario: Added with nothing open

- **WHEN** no folder is open and the user adds a song to the Library
- **THEN** the song's folder is created at the root of the active project

#### Scenario: Song slides behave like any other slide

- **WHEN** a song's folder has been created
- **THEN** each of its slides can be selected, reordered, removed, previewed, have a template applied, and be presented, exactly as a Bible passage slide can

### Requirement: A single section can be added or presented without adding the whole song

The system SHALL allow the user to add only the currently selected section to the currently open Library folder as one slide, and to present the currently selected section immediately. Both actions SHALL be unavailable, with the reason indicated, when they require an open folder and none is open.

#### Scenario: Adding one section

- **WHEN** a folder is open, a section is selected, and the user adds just that section
- **THEN** exactly one slide carrying that section's text is appended to the open folder and no new folder is created

#### Scenario: Presenting a section

- **WHEN** a section is selected and the user presents it
- **THEN** the presentation output shows that section rendered with the selected template

#### Scenario: Section actions with no folder open

- **WHEN** no folder is open
- **THEN** the add-single-section action is unavailable and a hint explains that a folder must be open

### Requirement: Song slides render only their lyrics

The system SHALL render a song slide's section text as the slide's body, using the template assigned to that slide, and SHALL NOT render the song's title or its section label anywhere on the slide. Slide identity in the console's own chrome is carried by a caption that never reaches the projected output. The system SHALL store the section's text on the slide when it is added, so the slide continues to render unchanged if the source song is later edited or deleted.

#### Scenario: A song slide shows its lyrics and nothing else

- **WHEN** a song slide is previewed or presented
- **THEN** it renders that section's lines as the slide body, with no song title, no section label, and no placeholder text

#### Scenario: Multi-line sections keep their line breaks

- **WHEN** a section containing several lines is rendered as a slide
- **THEN** each line appears on its own line rather than being collapsed into one run-on line

### Requirement: Section labels name the slide in the console and are user-editable

The system SHALL caption each song slide with its section's label — in the Songs tab's section list, in the slide console's card, and in the sidebar folder tree — so a song's slides can be told apart while a running order is built. The system SHALL allow the user to rename any section's label, and SHALL apply that label to slides added from that section afterwards. Renaming SHALL NOT alter the section's lyric text, and SHALL NOT relabel slides already added to a folder.

#### Scenario: Labels caption the slide everywhere in the console

- **WHEN** a song has been added to a Library folder
- **THEN** the sidebar tree entry, the slide console card, and the Songs tab's section list each show that section's label

#### Scenario: Renaming a label

- **WHEN** a user renames a section from "Verse 2" to "Pre-chorus"
- **THEN** the section list shows "Pre-chorus", the change persists across a restart, and the section's lyric text is unchanged

#### Scenario: Renamed labels apply to later adds

- **WHEN** a user renames a section and then adds the song to the Library
- **THEN** the created slide carries the new label as its caption

#### Scenario: Already-added slides keep their captured label

- **WHEN** a user renames a section after having added that song to a folder
- **THEN** the slides already in that folder keep the label they were created with

### Requirement: A song slide in a folder can be renamed from its context menu

The system SHALL offer a "Rename slide" action in the slide console's per-slide context menu for song slides, alongside the existing preview, present, and delete actions, and SHALL edit the label in place on the card. Committing SHALL update the card's caption and the sidebar tree's row. Renaming SHALL change only that folder item — not the section's lyric text, not the source song, and not any other folder holding the same song. The action SHALL NOT be offered for slide types whose caption is derived from their content rather than chosen.

#### Scenario: Renaming a slide from the context menu

- **WHEN** a user opens a song slide's context menu, chooses "Rename slide", types a new label, and confirms
- **THEN** the slide's card caption and its sidebar tree row both show the new label, and the change persists

#### Scenario: Renaming leaves content and source untouched

- **WHEN** a user renames a song slide in a folder
- **THEN** that slide's lyric text is unchanged, the source song in the repertoire keeps its own label, and no other folder using that song is affected

#### Scenario: Cancelling a rename

- **WHEN** a user starts renaming a slide and dismisses the editor without confirming
- **THEN** the slide keeps its previous label and nothing is written

#### Scenario: Only song slides can be renamed

- **WHEN** a user opens the context menu of a slide whose caption is derived from its content, such as a Bible passage captioned by its reference
- **THEN** no rename action is offered, and the menu's other actions are unchanged

#### Scenario: Editing the source song leaves existing slides alone

- **WHEN** a user edits a song's lyrics after having added it to the Library
- **THEN** the slides already in the Library folder continue to render their original text

#### Scenario: Deleting the source song leaves existing slides alone

- **WHEN** a user deletes a song from the song library after having added it to the Library
- **THEN** the slides already in the Library folder still render their text and can still be presented

### Requirement: The Songs tab is fully localized

The system SHALL provide every user-facing string introduced by the Songs tab, its editor, and its web search in each locale the application ships, and SHALL NOT render any hardcoded untranslated string.

#### Scenario: Songs tab in each supported locale

- **WHEN** a user switches the application language
- **THEN** every label, button, placeholder, empty state, hint, and inferred section label in the Songs tab and its dialogs is shown in the selected language
