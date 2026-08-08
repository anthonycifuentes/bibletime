## ADDED Requirements

### Requirement: The Notes tab presents a draft list beside a preview with its actions

The system SHALL render the Notes tab as a draft-list column containing the list of this session's notes and the action that creates a new one, beside a preview column containing a template selector, a live slide preview of the selected draft, and the tab's add and present actions. The system SHALL NOT render a search box or a library browser in this tab, because notes are not stored.

#### Scenario: Notes tab renders its columns

- **WHEN** a user activates the Notes tab
- **THEN** the draft list with its "new note" action, and the preview with its template selector and actions, are all visible at once

#### Scenario: Selecting a draft previews it

- **WHEN** a user selects a draft in the list
- **THEN** the preview renders that draft's slide using the currently selected template, and nothing is added to the Library

#### Scenario: No draft selected

- **WHEN** the Notes tab is active and no draft is selected
- **THEN** the preview shows a hint to select or write an note, and the actions that require a selection are unavailable

#### Scenario: No library browser is offered

- **WHEN** a user looks for previously written notes from an earlier session
- **THEN** no search box or library list is present, consistent with notes not being stored

### Requirement: The tab selects a template for the notes it creates

The system SHALL default the Notes tab's template to the application's active template, SHALL allow the user to select a different template for this tab, and SHALL apply the selected template to the preview and to every slide added from the tab. Selecting a template here SHALL NOT change which template the Templates tab reports as active.

#### Scenario: Defaults to the active template

- **WHEN** a user activates the Notes tab without having chosen a template in it
- **THEN** the preview renders with the application's active template

#### Scenario: Selecting a template applies to added slides

- **WHEN** a user selects a different template in the Notes tab and adds an note
- **THEN** the created slide carries the selected template

#### Scenario: Selection is local to the tab

- **WHEN** a user selects a template in the Notes tab
- **THEN** the application's active template is unchanged

### Requirement: Add slide appends the selected note to the open folder

The system SHALL provide an action that adds the selected draft to the currently open Library folder as one `note` slide appended at the end. When no folder is open, the system SHALL create a folder at the start of the root list with that slide already in it, in a single write, and open it — matching how converting a Bible verse behaves with no folder open. The action SHALL be unavailable when no draft is selected.

#### Scenario: Appending to the open folder

- **WHEN** a folder is open, a draft is selected, and the user adds it as a slide
- **THEN** exactly one slide carrying that note's text is appended to the open folder, and no new folder is created

#### Scenario: Adding with nothing open

- **WHEN** no folder is open and the user adds the selected draft as a slide
- **THEN** a folder is created at the start of the root list containing that one slide, and it becomes the open folder

#### Scenario: Adding twice

- **WHEN** a user adds the same draft as a slide twice
- **THEN** two independent slides exist in the folder and the draft remains in the list, unchanged

#### Scenario: Add slide with nothing selected

- **WHEN** no draft is selected
- **THEN** the add-slide action is unavailable

### Requirement: Add as folder creates one folder holding every draft in the list

The system SHALL provide an action that creates a new Library folder containing one slide per draft in the list, in list order, in a single write, and then opens that folder. The folder SHALL be named after the sole draft when the list holds exactly one, and SHALL otherwise carry a localized default name. When a folder is open, the new folder SHALL be created as its child, unless doing so would exceed the folder nesting limit, in which case it SHALL be created as a sibling. When no folder is open, it SHALL be created at the root. The action SHALL be unavailable when the draft list is empty.

#### Scenario: The draft list becomes a folder of slides

- **WHEN** the list holds five drafts and the user adds them as a folder
- **THEN** a new folder appears containing exactly five slides in the list's order, and it becomes the open folder

#### Scenario: The whole list is added, not the selection

- **WHEN** one draft is selected and the user adds the drafts as a folder
- **THEN** every draft in the list is added, not only the selected one

#### Scenario: Single-draft folder takes that draft's name

- **WHEN** the list holds exactly one draft and the user adds it as a folder
- **THEN** the folder is named after that note

#### Scenario: Created under the open folder

- **WHEN** a folder is open and the user adds the drafts as a folder
- **THEN** the new folder is created as a child of the open folder

#### Scenario: Nesting limit reached

- **WHEN** the open folder is already at the maximum nesting depth and the user adds the drafts as a folder
- **THEN** the new folder is created as a sibling of the open folder rather than being rejected or exceeding the limit

#### Scenario: Created with nothing open

- **WHEN** no folder is open and the user adds the drafts as a folder
- **THEN** the new folder is created at the root of the active project

#### Scenario: The action states how many slides it will add

- **WHEN** the draft list holds more than one draft
- **THEN** the add-as-folder action indicates the number of slides it will create

#### Scenario: Add as folder with an empty list

- **WHEN** the draft list is empty
- **THEN** the add-as-folder action is unavailable

### Requirement: An note can be presented without being added anywhere

The system SHALL allow the user to send the selected draft directly to the presentation output using the tab's selected template, without adding it to any folder and without modifying the draft list. The action SHALL be unavailable when no draft is selected.

#### Scenario: Presenting a draft

- **WHEN** a draft is selected and the user presents it
- **THEN** the presentation output shows that note rendered with the tab's selected template

#### Scenario: Presenting files nothing

- **WHEN** a user presents a draft
- **THEN** no folder is created, no slide is added, and the draft list is unchanged

#### Scenario: Presenting works with no folder open

- **WHEN** no folder is open and a draft is selected
- **THEN** the present action is still available

### Requirement: The Notes tab is fully localized

The system SHALL provide every user-facing string introduced by the Notes tab and its editor — including the tab label, field placeholders, action labels, empty states, hints, and the default folder name — in each locale the application ships, and SHALL NOT render any hardcoded untranslated string.

#### Scenario: Notes tab in each supported locale

- **WHEN** a user switches the application language
- **THEN** every label, button, placeholder, empty state, and hint in the Notes tab and its editor is shown in the selected language

#### Scenario: Default folder name is localized

- **WHEN** a user adds the drafts as a folder in a non-default locale
- **THEN** the folder's default name is in the selected language
