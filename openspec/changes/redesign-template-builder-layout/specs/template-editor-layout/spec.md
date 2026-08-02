## ADDED Requirements

### Requirement: Two-pane editor console
The template editor page SHALL render as two panes side by side when rendered at full page width: a left options rail containing the template name field and all `TemplateEditor` control sections, and a right pane containing the live `SlidePreview`. The right pane SHALL size the preview to fill the available space in that pane rather than a fixed centered column width.

#### Scenario: Editing a template on the full-width editor page
- **WHEN** a user opens `/templates/$templateId` for an editable (non-bundled, writable) template on a viewport wide enough for two panes
- **THEN** the options rail renders on the left and the live slide preview renders on the right, filling the remaining horizontal space, with no vertical scrolling required to see the preview

#### Scenario: Changing a control updates the visible preview without scrolling
- **WHEN** a user changes any control in the left options rail (background, typography, or spacing)
- **THEN** the right-pane preview reflects the change immediately and remains fully visible without the user having to scroll

### Requirement: Narrow-container fallback layout
When the template editor renders inside a container too narrow for a usable two-pane split, it SHALL fall back to a single stacked column — preview above controls — matching its layout prior to this change, using a container query rather than the browser viewport width to make this determination.

#### Scenario: Editing a template in a narrow window
- **WHEN** the template editor's container width is below the two-pane threshold (e.g. a narrow browser or Electron window)
- **THEN** the layout stacks the preview above the options controls in a single column instead of splitting into two panes

#### Scenario: Window is resized across the threshold
- **WHEN** the container the template editor renders in grows past the two-pane width threshold
- **THEN** the layout switches from the stacked column to the two-pane console, and back again if the container shrinks below the threshold
