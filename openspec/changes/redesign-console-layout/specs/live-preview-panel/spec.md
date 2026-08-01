## ADDED Requirements

### Requirement: Preview panel is always present and reflects the selected slide
The system SHALL keep a preview panel visible on the right-hand side of the console shell at all times, and SHALL render it using the most recently selected slide's content and assigned template.

#### Scenario: Preview panel present with no selection
- **WHEN** the console shell is open and no slide is selected
- **THEN** the preview panel is still visible in its fixed position, showing an empty/no-selection state rather than being hidden

#### Scenario: Preview updates on selection change
- **WHEN** a user selects a different single slide
- **THEN** the preview panel re-renders to show that slide's content with its assigned template

#### Scenario: Preview reflects a multi-slide selection
- **WHEN** a user has multiple slides selected
- **THEN** the preview panel shows the most recently selected slide of that selection, rather than an ambiguous or blank state

### Requirement: Preview panel sends the previewed slide to the live output window
The system SHALL allow the user to send the currently previewed slide to the existing `/present` output window using the existing broadcast mechanism, and the output window SHALL display exactly what the preview panel showed at the moment it was sent.

#### Scenario: Sending a slide updates the live output window
- **WHEN** a user sends the current preview to output while a `/present` window is open
- **THEN** the `/present` window updates to render that same slide with its assigned template

#### Scenario: No open output window does not block previewing
- **WHEN** no `/present` window is currently open
- **THEN** the preview panel still functions normally for browsing/selecting slides, and sending to output has no visible error
