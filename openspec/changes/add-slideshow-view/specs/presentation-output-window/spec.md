## ADDED Requirements

### Requirement: The output window can be blanked

The presentation output window SHALL render a solid black or solid white field covering the slide when the live slide is marked as blanked, and SHALL return to the slide when that mark is removed.

#### Scenario: Rendering a blanked output

- **WHEN** the output window receives a live slide marked blanked to black
- **THEN** it renders a solid black field over the whole window, showing no slide content, no text, and no media

#### Scenario: Rendering a white blank

- **WHEN** the output window receives a live slide marked blanked to white
- **THEN** it renders a solid white field over the whole window

#### Scenario: Restoring the slide

- **WHEN** the output window receives the same live slide with the blank mark removed
- **THEN** it shows that slide again

#### Scenario: Blanking does not discard the slide

- **WHEN** the output is blanked
- **THEN** the current slide is still held by the window, so restoring it requires no new slide to be sent

#### Scenario: Blanking does not restart media

- **WHEN** a slide holding a playing video or an animated background is blanked and then restored
- **THEN** the video continues from where it reached, the animated background does not restart, and the slide's entrance animation does not re-run

#### Scenario: Blanking survives window changes

- **WHEN** the output window is moved, resized, or made fullscreen while blanked
- **THEN** it stays blanked

### Requirement: Media restarts only when the slide itself changes

The output window SHALL restart video playback and entrance animations when a different slide is sent or the same slide is deliberately re-sent, and SHALL NOT restart them for a change that leaves the slide identical.

#### Scenario: A new slide arrives

- **WHEN** a different slide is sent to the output
- **THEN** its media plays from the start and its entrance animation runs

#### Scenario: The same slide is re-sent

- **WHEN** the operator deliberately re-sends the slide that is already showing
- **THEN** its media restarts from zero and its entrance animation runs again

#### Scenario: Only the blank state changed

- **WHEN** the live slide changes in its blank state alone
- **THEN** the slide's media and animation are not restarted
