## ADDED Requirements

### Requirement: The open folder can be started as a slideshow

The slide console SHALL offer a start-slideshow action for the open folder, presenting that folder's slides in order.

#### Scenario: Starting from the console

- **WHEN** a folder with slides is open and the user activates the start-slideshow action
- **THEN** the slideshow opens on that folder's slides

#### Scenario: Disabled with nothing to present

- **WHEN** the open folder has no slides, or no folder is open
- **THEN** the start-slideshow action is disabled

#### Scenario: Starting from the folder tree

- **WHEN** the user chooses the start-slideshow action on a folder in the sidebar tree
- **THEN** that folder is opened and its slides are presented as a slideshow

#### Scenario: Starting from the preview panel

- **WHEN** the user activates the start-slideshow action in the preview panel
- **THEN** the slideshow opens on the previewed slide within the open folder's deck

### Requirement: A slide's speaker notes can be edited from the console

The slide console SHALL offer an action on a slide for writing and editing that slide's speaker notes.

#### Scenario: Opening the notes editor

- **WHEN** the user chooses the notes action on a slide card
- **THEN** an editor opens holding that slide's current notes, and saving stores them on the slide

#### Scenario: Slides with notes are marked

- **WHEN** a slide has speaker notes
- **THEN** its card indicates that, without rendering the notes onto the slide itself
