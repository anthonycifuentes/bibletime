## ADDED Requirements

### Requirement: Template edits are held as a local draft until saved
The template editor SHALL hold the name and template fields as a local draft, separate from the last-saved persisted values, while editing a writable (non-bundled) template. No field change SHALL be written to storage until the user explicitly saves.

#### Scenario: Editing a control does not persist immediately
- **WHEN** a user changes any control in the template editor (background, typography, spacing, or the name field)
- **THEN** the change updates the local draft and the live preview immediately, but the persisted template in storage is unchanged until Save is clicked

### Requirement: Explicit Save action
The template editor SHALL show a "Save" action (top-right of the page) that is enabled only when the draft differs from the last-saved template, and that persists the entire draft (name and template together) to storage when clicked.

#### Scenario: Saving a dirty draft
- **WHEN** the draft differs from the last-saved template and the user clicks Save
- **THEN** the draft's name and template are persisted together, and Save becomes disabled again until another change is made

#### Scenario: Save is disabled with no pending changes
- **WHEN** the draft matches the last-saved template exactly
- **THEN** the Save action is disabled

### Requirement: Delete action with confirmation
The template editor SHALL show a "Delete" action (alongside Save, top-right of the page) for a template that has been explicitly saved at least once. Choosing Delete SHALL show a confirmation dialog before removing the template from storage; confirming navigates back to the template gallery.

#### Scenario: Deleting a template
- **WHEN** a user clicks Delete on a writable, previously-saved template and confirms the dialog
- **THEN** the template is removed from storage and the user is returned to the template gallery

#### Scenario: Canceling a delete
- **WHEN** a user clicks Delete but dismisses or cancels the confirmation dialog
- **THEN** the template is not removed and the editor remains open with the current draft intact

### Requirement: A never-saved template reads as discardable, not already saved
`/templates/new` creates a real storage record immediately (so there is always something to edit), but until the user explicitly clicks Save at least once, the editor SHALL treat that record as not yet saved from the user's point of view: the top-right action reads "Cancel" instead of "Delete", and it is always treated as having unsaved changes — even with zero edits — until the first Save.

#### Scenario: Opening a brand-new template
- **WHEN** a user creates a new template via "Nueva"/"New" and the editor opens
- **THEN** the top-right action reads "Cancel", not "Delete"

#### Scenario: Leaving a brand-new template with zero edits
- **WHEN** a user opens a brand-new template and immediately navigates away without making any changes
- **THEN** a confirmation prompt appears warning that the template hasn't been saved, and confirming removes the auto-created record from storage entirely rather than leaving an empty template behind

#### Scenario: Saving a brand-new template for the first time
- **WHEN** a user clicks Save on a brand-new template
- **THEN** the top-right action switches from "Cancel" to "Delete", and it stays "Delete" across a page reload

### Requirement: Reset acts on the draft, not the persisted template
"Restablecer plantilla" SHALL reset the local draft to the default template, not write through to storage — the reset only takes effect once Save is clicked, like any other draft change.

#### Scenario: Resetting then saving
- **WHEN** a user clicks "Restablecer plantilla" and then Save
- **THEN** the persisted template becomes the default template

#### Scenario: Resetting then navigating away without saving
- **WHEN** a user clicks "Restablecer plantilla" and then leaves the editor without saving
- **THEN** the persisted template is unchanged (subject to the unsaved-changes guard below)

### Requirement: Unsaved-changes guard on navigating away
When the draft differs from the last-saved template, or the template has never been explicitly saved at all, navigating away from the editor (in-app back navigation, or closing/reloading the page) SHALL prompt the user to confirm before discarding the unsaved draft.

#### Scenario: Navigating back with unsaved changes
- **WHEN** the draft is dirty and the user triggers in-app back navigation
- **THEN** a confirmation prompt appears before the navigation is allowed to proceed

#### Scenario: Navigating back with no unsaved changes
- **WHEN** the draft matches the last-saved template and the user navigates back
- **THEN** navigation proceeds immediately with no prompt

### Requirement: Read-only templates are unaffected
Bundled or otherwise non-writable templates SHALL continue to show no Save, Delete, or draft-editing affordance — only the existing read-only preview and "Duplicar para editar" action.

#### Scenario: Viewing a bundled template
- **WHEN** a user opens a bundled (read-only) template
- **THEN** no Save or Delete action is shown, and the template's read-only branch renders exactly as before this change
