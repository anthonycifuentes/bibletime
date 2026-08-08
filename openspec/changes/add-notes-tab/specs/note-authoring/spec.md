## ADDED Requirements

### Requirement: A full-screen editor creates an note from an optional heading and one body field

The system SHALL open a full-screen modal editor for creating a new note and for editing an existing draft, containing an optional heading field and a single body text area. The editor SHALL require non-empty body text before it can be saved, SHALL NOT require a heading, and SHALL allow the user to dismiss it without saving.

#### Scenario: Creating an note from a typed paragraph

- **WHEN** a user opens the editor, types a paragraph into the body field, and saves
- **THEN** a draft carrying that text is created and appears in the tab's draft list

#### Scenario: Heading is optional

- **WHEN** a user enters body text but leaves the heading field empty and saves
- **THEN** the draft is created and stores no heading

#### Scenario: Saving is blocked with no body text

- **WHEN** a user has entered a heading but the body field is empty or whitespace only
- **THEN** saving is unavailable and the reason is indicated

#### Scenario: Editing an existing draft

- **WHEN** a user opens an existing draft in the editor
- **THEN** its heading and body are pre-filled, and saving updates that same draft rather than creating a second one

#### Scenario: Dismissing discards changes

- **WHEN** a user makes changes in the editor and dismisses it without saving
- **THEN** the draft list is unchanged and any previously saved version of that draft is left exactly as it was

### Requirement: One note produces exactly one slide

The system SHALL treat an note's body as the text of exactly one slide, regardless of how many line breaks or blank lines it contains. The system SHALL NOT split an note into multiple slides, SHALL NOT offer a splitting or auto-format control in the note editor, and SHALL preserve the body's line breaks as typed when rendering the slide.

#### Scenario: Blank lines do not create slides

- **WHEN** a user writes an note whose body contains one or more blank lines and adds it to a folder
- **THEN** exactly one slide is created, and its text contains those blank lines

#### Scenario: No splitting control is offered

- **WHEN** a user looks for a way to split an note into several slides
- **THEN** no splitting or auto-format control is present, and writing a second note is the way to get a second slide

#### Scenario: Line breaks are preserved

- **WHEN** a user writes a three-line note with single line breaks between the lines
- **THEN** the resulting slide renders those three lines on separate lines rather than joined into a paragraph

#### Scenario: Long text is fitted, not rejected

- **WHEN** a user writes an note whose body is longer than the slide's text area comfortably holds
- **THEN** the text is scaled to fit by the same auto-fit behavior applied to a long Bible verse, and the note is neither rejected nor truncated

### Requirement: The editor previews the resulting slide live

The system SHALL render, alongside the editor's fields, a live preview of the slide the current heading and body would produce, using the template currently selected in the Notes tab. The preview SHALL update as the user types.

#### Scenario: Preview reflects typing

- **WHEN** a user types into the heading or body field
- **THEN** the preview updates to show the resulting slide

#### Scenario: Preview uses the selected template

- **WHEN** the user has selected a template in the Notes tab and then opens the editor
- **THEN** the preview renders using that template rather than a fixed default

#### Scenario: Preview matches what gets added

- **WHEN** a user saves a draft and adds it to a folder
- **THEN** the slide in the folder renders identically to what the editor previewed

### Requirement: The draft list holds the notes written this session

The system SHALL keep saved drafts in an ordered list in the Notes tab, in the order they were created, and SHALL allow the user to select a draft, edit it, and delete it individually. Drafts SHALL persist across bottom-tab switches and navigation away from the console and back. Drafts SHALL NOT be written to any storage and are lost when the application is reloaded or restarted.

#### Scenario: Drafts survive a tab round-trip

- **WHEN** a user creates two drafts, switches to the Bible tab, and switches back to the Notes tab
- **THEN** both drafts are still listed, in the same order, with the same draft still selected

#### Scenario: Drafts survive a route round-trip

- **WHEN** a user with drafts navigates to the template editor and returns to the console
- **THEN** the drafts are still listed

#### Scenario: Deleting a draft

- **WHEN** a user deletes a draft from the list
- **THEN** it is removed from the list and, if it was the selected draft, no draft is selected

#### Scenario: Deleting a draft leaves added slides alone

- **WHEN** a user deletes a draft that had already been added to a Library folder
- **THEN** the slide in that folder is unchanged and still renders its text

#### Scenario: Drafts do not survive a reload

- **WHEN** a user reloads or restarts the application with unadded drafts in the list
- **THEN** the draft list is empty

#### Scenario: The empty state names the limitation

- **WHEN** a user activates the Notes tab with no drafts
- **THEN** an empty state invites writing an note and states that notes are not saved between sessions, rather than showing a blank column
