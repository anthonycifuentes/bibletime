## ADDED Requirements

### Requirement: A slide can carry its own style on top of its template
A slide in a folder SHALL be able to hold its own style override — a partial set of style fields — layered over whichever template the slide points at. Only the fields the user actually changed SHALL be stored; every field not overridden SHALL continue to come from the slide's template. Setting an override SHALL NOT create, modify, or delete any saved template.

#### Scenario: Overriding one field
- **WHEN** the user changes only the font size of one slide and saves
- **THEN** that slide renders at the new font size while its font family, color, background, alignment, and spacing still come from its template, and the template library contains no new or changed template

#### Scenario: The template changes afterward
- **WHEN** a slide has an override for font size only, and the template it points at is later edited to a different font color
- **THEN** the slide renders with the template's new font color and its own overridden font size

#### Scenario: A slide with no override
- **WHEN** a slide has never had its style edited
- **THEN** it renders exactly as its template specifies, indistinguishable from today's behavior

### Requirement: The override applies to every surface that renders the slide
A slide's style override SHALL be applied wherever that slide is rendered: its card in the slide console grid, the console's preview panel, and the projected output window. The style sent to the output window SHALL be the merged result of the template and the override.

#### Scenario: Presenting an overridden slide
- **WHEN** the user sends a slide that has a style override to the output window
- **THEN** the output window renders the slide with the override applied

#### Scenario: Console surfaces agree with the output
- **WHEN** a slide has a style override
- **THEN** its card thumbnail and the preview panel show the same merged style the output window would render

### Requirement: "Editar estilo" is reachable from every place a slide is actioned
An **Editar estilo** action SHALL be available from the slide card's context menu, from a slide's context menu in the sidebar folder tree, and from the slide console's overflow ("three-dot") menu. The overflow-menu entry SHALL be disabled when no slide is selected. Choosing the action SHALL open the per-slide style editor for the targeted slide.

#### Scenario: From the slide card
- **WHEN** the user right-clicks a slide card and chooses "Editar estilo"
- **THEN** the per-slide style editor opens for that slide

#### Scenario: From the folder tree
- **WHEN** the user opens a tree slide's context menu and chooses "Editar estilo", and that slide belongs to a folder other than the one currently open
- **THEN** that slide's folder is opened in the console and the style editor opens for that slide

#### Scenario: From the overflow menu with nothing selected
- **WHEN** no slide is selected in the console
- **THEN** the overflow menu's "Editar estilo" entry is visible but disabled

### Requirement: The style editor shows the real slide and the full set of style controls
The per-slide style editor SHALL open as a dialog over the console containing a live preview of the slide's own content (its text, reference, or media — not sample text) alongside controls for background, font family, font size, text color, bold/italic/underline, text alignment, line height, and letter spacing. The controls SHALL reflect the slide's effective style — the merge of its template and any existing override — and every control SHALL be available regardless of which fields are currently overridden. Changes SHALL update the live preview immediately.

#### Scenario: Opening the editor for an already-overridden slide
- **WHEN** the user opens the style editor for a slide that already has an override
- **THEN** the controls show the slide's effective style, with the overridden values in place

#### Scenario: Live preview while editing
- **WHEN** the user changes the font family in the style editor
- **THEN** the dialog's preview re-renders the slide's own text in the new font before anything is saved

### Requirement: Saving is explicit; canceling discards
The per-slide style editor SHALL persist nothing until the user explicitly saves. Canceling or dismissing the dialog SHALL discard every unsaved change and leave the slide exactly as it was. Saving SHALL persist the override to the slide and close the dialog.

#### Scenario: Canceling after edits
- **WHEN** the user changes the font size and color and then cancels the dialog
- **THEN** the slide renders unchanged and nothing is written to storage

#### Scenario: Saving edits
- **WHEN** the user changes the font size and saves
- **THEN** the dialog closes and the slide's card, the preview panel, and any subsequent send-to-output use the new size

#### Scenario: Edits survive a reload
- **WHEN** the user saves a style override and then reloads the app
- **THEN** the slide still renders with the override applied

### Requirement: Reset returns the slide to its template's look
The per-slide style editor SHALL offer a reset action that clears the slide's override entirely, returning it to the look its template specifies. Reset SHALL NOT change which template the slide points at, and SHALL NOT modify the template itself.

#### Scenario: Clearing an override
- **WHEN** the user opens the style editor for a slide with several overridden fields and chooses reset, then saves
- **THEN** the slide renders exactly as its template specifies and carries no override

#### Scenario: Reset leaves the template alone
- **WHEN** the user resets a slide's override
- **THEN** the template the slide points at is unchanged, and every other slide using that template is unaffected

### Requirement: Editing the style of a multi-slide selection
When more than one slide is selected and the style editor is opened from the overflow menu, the editor SHALL seed its controls from the most recently selected slide's effective style, and saving SHALL write the same override to every selected slide. Because the write is a partial override, each selected slide SHALL keep its own template as the base for every field not overridden.

#### Scenario: Applying one override to several slides
- **WHEN** three slides are selected and the user changes the text color and saves
- **THEN** all three slides render with the new text color

#### Scenario: Selected slides on different templates
- **WHEN** two selected slides point at different templates and the user overrides only the font size
- **THEN** both render at the new font size while each keeps its own template's background and colors

### Requirement: An override outlives applying a different template
Applying a saved template to a slide that already has a style override SHALL change the slide's template without clearing the override; the override continues to layer over the newly applied template. Clearing an override SHALL only ever happen through the style editor's reset action.

#### Scenario: Applying a template over an existing override
- **WHEN** a slide has an overridden font size and the user applies a different template to it
- **THEN** the slide renders the new template's background and colors with its overridden font size still in effect

### Requirement: Overrides persist and travel with the project
A slide's style override SHALL be stored as part of the folder that contains the slide, so it is written by the same save path as the rest of the slide, included in project autosave, and carried inside an exported project file. Importing or opening a project file SHALL restore each slide's override.

#### Scenario: Export and re-import
- **WHEN** a project containing overridden slides is exported to a file and that file is opened again
- **THEN** each slide renders with its override intact

#### Scenario: Autosave picks up an override
- **WHEN** the user saves a style override in a project bound to a file
- **THEN** the change is treated as a project change and written to the bound file by autosave

### Requirement: An unrenderable override field falls back to the template
When a stored override contains a field this build cannot render — a font id that no longer exists, or a background that cannot be rendered — that field SHALL be ignored and the slide SHALL fall back to its template's value for it, while every other overridden field still applies. An out-of-range font size SHALL be clamped into the supported range.

#### Scenario: Override references a removed font
- **WHEN** a slide's override names a font family that this build no longer bundles, and also overrides the text color
- **THEN** the slide renders in its template's font family with its overridden text color, and nothing renders blank or unstyled

#### Scenario: Override holds an unrenderable background
- **WHEN** a slide's override holds an animated background whose preset no longer exists
- **THEN** the slide renders its template's background instead of a blank one
