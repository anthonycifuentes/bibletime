## ADDED Requirements

### Requirement: Sending to output opens the output window
The system SHALL open the `/present` output window when the user sends a slide to output, if no such window is currently open.

#### Scenario: No output window open yet
- **WHEN** the user clicks "Send to output" and no `/present` window is currently open
- **THEN** the system opens a new `/present` window showing the sent slide

#### Scenario: Output window already open
- **WHEN** the user clicks "Send to output" and a `/present` window is already open
- **THEN** the system reuses (focuses) that same window instead of opening a duplicate, and updates it with the sent slide

### Requirement: Sending to output always delivers the current slide
The system SHALL ensure the output window displays the sent slide's text, reference, and template regardless of whether the window was already open or was just opened by this action.

#### Scenario: Slide content matches what was sent
- **WHEN** the user sends a slide to output
- **THEN** the `/present` window renders that exact slide's text, reference, and template, whether the window pre-existed or was just opened
