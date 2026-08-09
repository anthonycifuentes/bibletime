## ADDED Requirements

### Requirement: Starting a slideshow opens the output and sends the first slide

Starting a slideshow SHALL open or focus the presentation output window and send the starting slide to it as part of the same action.

#### Scenario: No output window open

- **WHEN** the user starts a slideshow and no output window is open
- **THEN** an output window opens showing the slideshow's starting slide

#### Scenario: Output window already open

- **WHEN** the user starts a slideshow while an output window is already open
- **THEN** that same window is reused and updated with the starting slide, and no second window is created

#### Scenario: Opened within the user's action

- **WHEN** the user starts a slideshow in the web build
- **THEN** the output window is opened during the click that started it, so the browser does not block it as an unrequested popup

### Requirement: The slideshow is the only controller, not a second output

The slideshow SHALL drive the existing presentation output rather than presenting to the audience itself.

#### Scenario: One audience surface

- **WHEN** a slideshow is running
- **THEN** the output window is the only surface showing the slide without controller chrome, and the slideshow view is not offered as an audience display

#### Scenario: The output window needs no slideshow awareness

- **WHEN** a slide is sent from the slideshow
- **THEN** the output window renders it through the same live-slide channel that "Send to output" uses

### Requirement: The output can be blanked to black or white

The slideshow SHALL be able to blank the presentation output to a solid black or solid white field, and restore it, without changing which slide is current.

#### Scenario: Blanking to black

- **WHEN** the user presses `B` or activates the black control
- **THEN** the output window shows a solid black field, and the slideshow indicates that the output is blanked

#### Scenario: Blanking to white

- **WHEN** the user presses `W` or activates the white control
- **THEN** the output window shows a solid white field, and the slideshow indicates that the output is blanked

#### Scenario: Restoring

- **WHEN** the output is blanked and the user presses the same key or activates the same control again
- **THEN** the output shows the current slide again

#### Scenario: Switching between blank colors

- **WHEN** the output is blanked to black and the user requests white
- **THEN** the output shows a solid white field without passing through the slide

#### Scenario: Position is unaffected by blanking

- **WHEN** the output is blanked
- **THEN** the current slide is unchanged, the position readout is unchanged, and the filmstrip still marks the same slide

#### Scenario: Restoring does not restart media

- **WHEN** the current slide holds a playing video and the output is blanked and then restored
- **THEN** the video continues from where it reached rather than restarting, and the slide's entrance animation does not re-run

#### Scenario: The slideshow keeps showing the slide while blanked

- **WHEN** the output is blanked
- **THEN** the slideshow's current-slide pane still shows the slide, so the operator can see what will return

### Requirement: Navigating while blanked

Navigating while the output is blanked SHALL change the current slide without unblanking the output.

#### Scenario: Advancing while blanked

- **WHEN** the output is blanked and the user advances
- **THEN** the next slide becomes current in the slideshow, the output stays blanked, and restoring afterwards shows that new slide

### Requirement: Exiting the slideshow leaves the output showing its slide

Exiting SHALL NOT clear, blank, or close the presentation output.

#### Scenario: Exiting mid-service

- **WHEN** the user exits the slideshow
- **THEN** the output window stays open showing the last slide that was sent

#### Scenario: Exiting while blanked

- **WHEN** the user exits while the output is blanked
- **THEN** the output stays blanked, and the console offers a way to restore it

### Requirement: The output window can be reopened from the slideshow

The slideshow SHALL provide an action that opens or focuses the presentation output window at any time.

#### Scenario: The output was closed mid-service

- **WHEN** the operator closes the output window while the slideshow is running and then activates the reopen action
- **THEN** an output window opens showing the slide that is currently current

#### Scenario: The output was never opened

- **WHEN** the output window was blocked or never opened and the operator activates the reopen action
- **THEN** an output window opens showing the current slide

#### Scenario: The slideshow keeps working without an output

- **WHEN** no output window is open
- **THEN** the slideshow still navigates, updates its panes, and records the current slide, so reopening the output shows the right slide
