## ADDED Requirements

### Requirement: Folders can be nested up to 3 levels deep
A folder MAY have a parent folder within the same project. The resulting hierarchy SHALL be capped at 3 levels total (a root folder, its subfolders, and their subfolders) — a folder already at the deepest allowed level SHALL NOT be able to receive its own subfolder.

#### Scenario: Creating a subfolder under a root folder
- **WHEN** the user creates a subfolder under a root-level folder
- **THEN** the new folder is created with that folder as its parent, one level deeper

#### Scenario: Creating a subfolder at the deepest allowed level
- **WHEN** a folder is already at the deepest allowed level (2 levels below root)
- **THEN** the "New subfolder" action for that folder is disabled

### Requirement: Folders can be reordered via drag-and-drop
Dragging a folder row and dropping it near a sibling row SHALL reorder it within its current parent's set of children, without changing its parent.

#### Scenario: Reordering siblings
- **WHEN** the user drags a folder and drops it just above or below a sibling folder (same parent)
- **THEN** the dragged folder's position updates so it renders in the new order among its siblings, and its parent is unchanged

### Requirement: Folders can be reparented via drag-and-drop
Dragging a folder and dropping it onto another folder's row SHALL nest the dragged folder as a child of the target folder, unless doing so would exceed the 3-level depth cap or create a cycle (moving a folder into itself or one of its own descendants).

#### Scenario: Nesting a folder under another
- **WHEN** the user drags a root-level folder and drops it onto another root-level folder that is not already at the deepest allowed level
- **THEN** the dragged folder becomes a child of the target folder

#### Scenario: Drop would exceed the depth cap
- **WHEN** the user drags a folder and drops it onto a folder that is already at the deepest allowed level
- **THEN** the drop is rejected and the folder's parent/position remain unchanged

#### Scenario: Drop would create a cycle
- **WHEN** the user drags a folder and drops it onto one of its own subfolders (a descendant)
- **THEN** the drop is rejected and the folder's parent/position remain unchanged

### Requirement: Deleting a folder cascades to its subtree
Deleting a folder that has subfolders SHALL delete that folder, all of its subfolders (at every depth), and all of their slides — matching the existing no-confirmation delete behavior for a folder with no subfolders.

#### Scenario: Deleting a folder with subfolders
- **WHEN** the user deletes a folder that has one or more subfolders
- **THEN** that folder, all of its subfolders, and all of their slides are removed

### Requirement: Clicking an open folder closes it
Clicking a folder that is already open in the console SHALL close it. Clicking any other folder SHALL open it (whether or not that folder was already showing as expanded due to an open descendant).

#### Scenario: Toggling the currently open folder
- **WHEN** the user clicks a folder that is currently open in the console
- **THEN** the folder closes and no folder is open

#### Scenario: Clicking an expanded ancestor of the open folder
- **WHEN** the user clicks a folder that is showing expanded only because one of its subfolders is the currently open folder
- **THEN** that folder becomes the open folder (its own row and slides shown, replacing the previously open descendant)

### Requirement: Slides can be reordered and moved between folders via drag-and-drop
Dragging a slide row in the sidebar tree and dropping it near another slide SHALL move it to that position, in whichever folder the target slide belongs to (the same folder, for a plain reorder, or a different one, moving it there). Dropping a slide onto a folder's own row SHALL move it into that folder, appended after its existing slides.

#### Scenario: Reordering slides within a folder
- **WHEN** the user drags a slide and drops it just above or below another slide in the same folder
- **THEN** the dragged slide's position updates within that folder

#### Scenario: Moving a slide to a different folder via another slide
- **WHEN** the user drags a slide and drops it just above or below a slide belonging to a different folder
- **THEN** the dragged slide moves into that folder at the dropped position, and is removed from its original folder

#### Scenario: Moving a slide to a different folder via its row
- **WHEN** the user drags a slide and drops it onto a different folder's own row
- **THEN** the dragged slide moves into that folder, appended after its existing slides, and is removed from its original folder
