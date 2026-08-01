## ADDED Requirements

### Requirement: Main container renders a folder's items as an ordered slide list
The system SHALL render the currently open Library folder's items, in their stored order, as a vertical list of slides in the main container.

#### Scenario: Open folder's items render in order
- **WHEN** a user opens a folder containing three items in a given order
- **THEN** the main container shows exactly those three slides, in that same order

#### Scenario: No folder open shows an empty state
- **WHEN** no Library folder is currently open
- **THEN** the main container shows an empty state instead of a stale or partial slide list

### Requirement: Single, multi, and select-all selection over slides
The system SHALL allow a user to select a single slide, select multiple slides individually, and select all slides in the open folder, and SHALL make the current selection visibly distinct from unselected slides.

#### Scenario: Select a single slide
- **WHEN** a user clicks one slide
- **THEN** only that slide is selected and visibly marked as selected

#### Scenario: Extend selection to multiple slides
- **WHEN** a user selects an additional slide using a multi-select gesture (e.g. modifier-click)
- **THEN** both slides are selected simultaneously and both are visibly marked as selected

#### Scenario: Select all slides in the folder
- **WHEN** a user triggers "select all" while a folder is open
- **THEN** every slide currently rendered in the main container becomes selected

### Requirement: Apply a template to the current selection
The system SHALL allow a user to apply a template to whichever slides are currently selected (one, several, or all), and SHALL only change the template assignment of selected slides.

#### Scenario: Apply template to one selected slide
- **WHEN** exactly one slide is selected and the user applies a template from the template picker
- **THEN** only that slide's assigned template changes; all other slides in the folder keep their previous template assignment

#### Scenario: Apply template to multiple selected slides
- **WHEN** several slides are selected and the user applies a template
- **THEN** every selected slide is reassigned to that template, and unselected slides are unaffected

#### Scenario: Apply template to all slides via select-all
- **WHEN** all slides in the folder are selected via "select all" and the user applies a template
- **THEN** every slide in the folder is reassigned to that template
