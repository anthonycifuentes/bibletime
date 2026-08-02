## ADDED Requirements

### Requirement: Folders expand and collapse independently
Each folder's expanded/collapsed state in the sidebar tree SHALL be tracked independently of every other folder's expanded/collapsed state.

#### Scenario: Expanding one folder does not affect others
- **WHEN** folder A is currently expanded and the user expands folder B (a sibling or unrelated folder)
- **THEN** folder A remains expanded and folder B also becomes expanded

#### Scenario: Collapsing one folder does not affect others
- **WHEN** folders A and B are both currently expanded and the user collapses folder A
- **THEN** folder A becomes collapsed and folder B remains expanded

#### Scenario: All folders can be expanded at once
- **WHEN** the user expands every folder in the tree one at a time
- **THEN** all of them remain expanded simultaneously

### Requirement: Expand/collapse is independent of which folder is open in the console
Toggling a folder's expanded state SHALL NOT change which folder is open in the console, and opening a folder in the console SHALL NOT collapse any other folder's independently-set expanded state.

#### Scenario: Collapsing the currently open folder does not close it
- **WHEN** folder A is open in the console and also expanded in the sidebar, and the user collapses folder A's row
- **THEN** folder A's row collapses (its children are hidden) but folder A remains the open folder in the console

#### Scenario: Opening a different folder does not collapse previously expanded folders
- **WHEN** folder A is expanded (and not necessarily open in the console) and the user opens folder B in the console
- **THEN** folder B becomes open in the console and is auto-expanded along with its ancestor chain, while folder A remains expanded

### Requirement: Opening a folder auto-reveals its position in the tree
Selecting a folder to open in the console SHALL auto-expand that folder and every ancestor folder on its path, in addition to whatever was already independently expanded.

#### Scenario: Opening a nested folder reveals its ancestor chain
- **WHEN** the user opens a subfolder nested two levels deep, and its ancestors were previously collapsed
- **THEN** the subfolder and both of its ancestor folders become expanded, showing the full path down to it
