## ADDED Requirements

### Requirement: Note items carry their content, not a reference to be resolved

The system SHALL store an note slide's body text, its optional heading, and a never-empty list label on the folder item itself at the time it is added. Rendering an note slide SHALL NOT require reading any draft, library, or external source. The system SHALL NOT store a reference to the draft an note slide was created from.

#### Scenario: An note slide renders from itself

- **WHEN** an `note` item is rendered in the slide console, the preview panel, or the presentation output
- **THEN** its text comes from the item itself and no lookup against any other source is required

#### Scenario: The source draft is gone

- **WHEN** a user deletes the draft, or reloads the application so all drafts are lost, after adding an note to a folder
- **THEN** the folder's `note` slide still renders its text, remains selectable and orderable, and can still be presented

#### Scenario: Editing the draft leaves the slide alone

- **WHEN** a user edits a draft after having added it to a folder
- **THEN** the slide already in the folder continues to render its original text

#### Scenario: Exported project keeps its note slides intact

- **WHEN** a project containing `note` items is exported and opened on another machine
- **THEN** every `note` slide renders its original text and heading

### Requirement: An note slide renders its body as text and its heading as the reference line

The system SHALL render an note slide's body as the slide's text and its heading, when present, as the slide's reference line, using the template assigned to that slide. When no heading is present, the system SHALL render the slide with no reference line rather than substituting the body, a placeholder, or an empty label.

#### Scenario: Note with a heading

- **WHEN** an note slide carrying a heading is previewed or presented
- **THEN** the body renders as the slide text and the heading renders as the reference line

#### Scenario: Note without a heading

- **WHEN** an note slide carrying no heading is previewed or presented
- **THEN** the body renders as the slide text and no reference line is shown

#### Scenario: Note slides are never placeholders

- **WHEN** an note slide is rendered anywhere in the application
- **THEN** it shows its own text, and never a "not yet available" placeholder

### Requirement: Note slides list under a never-empty label

The system SHALL derive an note item's list label at add-time from its heading, falling back to a truncated form of its body text when there is no heading, and SHALL guarantee the label is non-empty for any note that could be added. The folder tree and the slide console SHALL use that label to identify the slide.

#### Scenario: Heading becomes the label

- **WHEN** an note with a heading is added to a folder
- **THEN** the folder tree lists that slide under the heading

#### Scenario: Body becomes the label when there is no heading

- **WHEN** an note with no heading is added to a folder
- **THEN** the folder tree lists that slide under a truncated form of its body text, not under an empty or generic label

#### Scenario: The label is fixed at add-time

- **WHEN** the label-derivation rule changes in a later version of the application
- **THEN** slides already in a folder keep the labels they were added with

### Requirement: Note slides behave like every other slide

The system SHALL allow an `note` item to be selected, multi-selected, reordered, removed, dragged, assigned a template, previewed, and presented exactly as a `bible-passage` or `song` item can, with no note-specific restriction.

#### Scenario: Note slides participate in console operations

- **WHEN** a folder contains note slides mixed with Bible and song slides
- **THEN** every console operation — selection, drag reordering, bulk template application, removal, and presenting — works on the note slides identically to the others

#### Scenario: Note slides survive a folder round-trip

- **WHEN** a project containing note slides is saved, closed, and reopened
- **THEN** the note slides are present in their original order with their text, heading, label, and template intact
