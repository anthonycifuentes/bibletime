## ADDED Requirements

### Requirement: The folder tree supports keyboard navigation
The Library sidebar's folder tree SHALL support keyboard navigation between visible rows using the arrow keys, and jumping to the first/last visible row via Home/End.

#### Scenario: Navigating rows with arrow keys
- **WHEN** a row in the folder tree has keyboard focus and the user presses the down or up arrow key
- **THEN** focus moves to the next or previous visible row

#### Scenario: Jumping to the first or last row
- **WHEN** a row in the folder tree has keyboard focus and the user presses Home or End
- **THEN** focus moves to the first or last visible row

### Requirement: The folder tree exposes ARIA tree semantics
The Library sidebar's folder tree SHALL expose standard ARIA tree roles and states (`tree`, `treeitem`, `aria-expanded`, `aria-selected`) so assistive technology can announce structure and state correctly.

#### Scenario: A screen reader inspects a folder row
- **WHEN** assistive technology inspects a row in the folder tree
- **THEN** it reports the row's role as a tree item, its expanded/collapsed state, and its selected state

### Requirement: Selecting a row opens its folder
Selecting a row in the folder tree — a folder or one of its slides — SHALL open that row's folder in the console, replacing whichever folder was previously open.

#### Scenario: Selecting a folder row
- **WHEN** the user selects a folder row in the tree
- **THEN** that folder becomes open in the console

#### Scenario: Selecting a slide row
- **WHEN** the user selects a slide row nested under a folder
- **THEN** that slide's folder becomes open in the console
