## ADDED Requirements

### Requirement: A slide can carry speaker notes

Every slide in a Library folder SHALL be able to hold an optional block of speaker notes, regardless of its content type.

#### Scenario: Notes on any slide type

- **WHEN** the user writes speaker notes on a Bible passage, song, note, or media slide
- **THEN** the notes are stored on that slide

#### Scenario: Notes are optional

- **WHEN** a slide has no speaker notes
- **THEN** it renders and presents exactly as it does today, with no empty notes affordance on the slide itself

### Requirement: Speaker notes are authored in the console

The system SHALL let the user write and edit a slide's speaker notes from the console, from both the slide grid and the preview panel.

#### Scenario: Writing notes from the slide grid

- **WHEN** the user chooses the notes action on a slide card and types notes
- **THEN** the notes are saved on that slide

#### Scenario: Writing notes from the preview panel

- **WHEN** the user chooses the notes action in the preview panel for the previewed slide and types notes
- **THEN** the notes are saved on that slide

#### Scenario: Editing existing notes

- **WHEN** the user opens the notes action on a slide that already has notes
- **THEN** the editor opens holding the existing notes, and saving replaces them

#### Scenario: Clearing notes

- **WHEN** the user empties a slide's notes and saves
- **THEN** the slide is left with no speaker notes

#### Scenario: A slide with notes is identifiable

- **WHEN** a slide has speaker notes
- **THEN** the console indicates that on the slide, so notes are discoverable without opening each one

### Requirement: Speaker notes are never projected

Speaker notes SHALL NOT appear on the presentation output, in the console's slide preview, on slide cards' rendered slide area, or in any exported slide image.

#### Scenario: Notes stay off the output

- **WHEN** a slide with speaker notes is sent to the output window
- **THEN** the output renders the slide's text, reference, and media only, with no notes

#### Scenario: Notes stay off the preview

- **WHEN** a slide with speaker notes is previewed in the console
- **THEN** the rendered slide shows no notes

### Requirement: The slideshow shows the current slide's notes

The slideshow SHALL display the current slide's speaker notes, updating as the current slide changes.

#### Scenario: Notes for the current slide

- **WHEN** a slide with speaker notes becomes current
- **THEN** the slideshow's notes pane shows that slide's notes

#### Scenario: No notes on this slide

- **WHEN** a slide without speaker notes becomes current
- **THEN** the notes pane shows an empty state rather than the previous slide's notes

#### Scenario: Line breaks are preserved

- **WHEN** the notes contain multiple lines
- **THEN** the notes pane preserves those line breaks

#### Scenario: Long notes are readable

- **WHEN** the notes are longer than the pane
- **THEN** the pane scrolls rather than truncating or overflowing the layout

### Requirement: Notes are read-only during a slideshow

The slideshow SHALL present notes for reading only, and SHALL NOT offer editing of them while presenting.

#### Scenario: No editing in the slideshow

- **WHEN** the user interacts with the notes pane during a slideshow
- **THEN** the notes cannot be changed from there, and no keystroke intended for navigation is captured by the pane

### Requirement: Notes display size is adjustable

The slideshow SHALL let the operator increase and decrease the size of the notes text, and SHALL remember that choice for future slideshows on the same machine.

#### Scenario: Increasing the size

- **WHEN** the operator activates the increase-size control
- **THEN** the notes text grows by one step, up to a maximum

#### Scenario: Decreasing the size

- **WHEN** the operator activates the decrease-size control
- **THEN** the notes text shrinks by one step, down to a minimum

#### Scenario: The choice is remembered

- **WHEN** the operator sets a notes size, exits, and starts another slideshow
- **THEN** the notes are shown at the size they chose

#### Scenario: The choice is an operator preference, not slide data

- **WHEN** a project whose slides carry notes is opened on another machine
- **THEN** the notes size is that machine's own setting, and the slides' stored data is unaffected

### Requirement: Notes persist with the slide

Speaker notes SHALL be saved and restored wherever a slide's other data is, and SHALL survive reordering, moving between folders, and reopening the app.

#### Scenario: Surviving a restart

- **WHEN** the user writes notes on a slide and reopens the app
- **THEN** the notes are still on that slide

#### Scenario: Surviving a project save

- **WHEN** a project containing slides with notes is saved and reopened
- **THEN** every slide's notes are intact

#### Scenario: Slides saved before notes existed

- **WHEN** a folder or project saved before speaker notes existed is loaded
- **THEN** it loads normally with its slides holding no notes
