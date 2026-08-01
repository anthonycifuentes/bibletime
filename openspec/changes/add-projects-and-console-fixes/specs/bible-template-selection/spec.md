## ADDED Requirements

### Requirement: Bible tab preview offers a template selector
The system SHALL let the user choose a template from the existing template library directly in the Bible tab's preview column, before converting a verse into a slide.

#### Scenario: Selector defaults to the active template
- **WHEN** the Bible tab's preview column is shown and a verse is pending
- **THEN** the template selector is pre-set to the app's currently active template and the preview renders with it

#### Scenario: Choosing a different template updates the preview
- **WHEN** the user picks a different template from the selector
- **THEN** the pending verse's preview immediately re-renders using the newly selected template

#### Scenario: Selecting a template does not change the app-wide active template
- **WHEN** the user picks a different template in the Bible tab's selector
- **THEN** the Templates tab's active template is unaffected

### Requirement: Converting a verse applies the selected template immediately
The system SHALL create the new folder item with the selected template already assigned, so no separate "apply template" step is needed after conversion.

#### Scenario: Converted slide carries the selected template
- **WHEN** the user converts a pending verse to a slide with template "Bold Serif" selected
- **THEN** the resulting folder item is created with `templateId` set to "Bold Serif" and renders with it in the slide console and preview panel
