## ADDED Requirements

### Requirement: Bulk actions are collapsed behind a single overflow toggle
The slide console header SHALL present its bulk actions through a collapsed-by-default overflow rail. While collapsed, the header SHALL show the open folder's name and a single three-dots (`…`) toggle, and no bulk-action control. Expanding the rail SHALL reveal exactly the bulk actions "Select all", "Clear selection", "Apply template", and "Remove", in that order, with the toggle changing to a close (`✕`) control.

#### Scenario: Header is quiet by default
- **WHEN** a folder is open and the user has not expanded the rail
- **THEN** the header shows the folder name and a single three-dots toggle, with no bulk-action buttons visible

#### Scenario: Expanding reveals all four bulk actions
- **WHEN** the user activates the three-dots toggle
- **THEN** "Select all", "Clear selection", "Apply template", and "Remove" appear as pills in that order, and the toggle becomes a close control

#### Scenario: Collapsing hides the bulk actions again
- **WHEN** the user activates the close control of an expanded rail
- **THEN** the four bulk-action pills are hidden and the header returns to folder name plus three-dots toggle

### Requirement: Bulk-action availability is shown as disabled pills of stable width
Every bulk action SHALL always be rendered in the expanded rail, in its fixed position, regardless of the current selection; unavailable actions SHALL be shown disabled rather than removed. "Select all" SHALL be disabled when the open folder has no items. "Clear selection", "Apply template", and "Remove" SHALL be disabled when no slide is selected. The expanded rail's set of pills SHALL NOT change as the selection changes.

#### Scenario: Empty selection disables the selection-dependent actions
- **WHEN** the rail is expanded and no slide is selected
- **THEN** "Clear selection", "Apply template", and "Remove" are rendered but visibly disabled, and clicking them does nothing

#### Scenario: Selecting a slide enables the selection-dependent actions
- **WHEN** the rail is expanded and the user selects at least one slide
- **THEN** "Clear selection", "Apply template", and "Remove" become enabled in place, without the rail's pills shifting position

#### Scenario: Empty folder disables select-all
- **WHEN** the rail is expanded while the open folder contains no items
- **THEN** "Select all" is rendered but visibly disabled

## MODIFIED Requirements

### Requirement: Slides are removed via a bulk selection-toolbar action
The system SHALL allow a user to remove the currently selected slide(s) from the open folder via a "Remove" action in the console header's overflow action rail. Individual slide cards SHALL NOT expose a per-card remove control.

#### Scenario: Remove one selected slide
- **WHEN** exactly one slide is selected and the user triggers "Remove" from the expanded rail
- **THEN** that slide is removed from the folder and no longer rendered

#### Scenario: Remove multiple selected slides
- **WHEN** several slides are selected and the user triggers "Remove" from the expanded rail
- **THEN** all selected slides are removed from the folder, and unselected slides remain unaffected

#### Scenario: Remove action unavailable with no selection
- **WHEN** no slide is currently selected
- **THEN** the "Remove" action is rendered as a disabled pill in the expanded rail and cannot be triggered
