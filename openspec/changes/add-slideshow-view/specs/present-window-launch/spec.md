## ADDED Requirements

### Requirement: Starting a slideshow opens the output window

The system SHALL open the `/present` output window when the user starts a slideshow, if no such window is currently open, and SHALL reuse the existing one otherwise — the same window, by the same fixed window name, that "Send to output" uses.

#### Scenario: No output window open yet

- **WHEN** the user starts a slideshow and no `/present` window is currently open
- **THEN** the system opens a new `/present` window showing the slideshow's starting slide

#### Scenario: Output window already open

- **WHEN** the user starts a slideshow while a `/present` window is already open
- **THEN** the system reuses that same window, updating it with the starting slide, without creating a duplicate and without resetting its position, size, or fullscreen state

#### Scenario: Opened inside the user's gesture

- **WHEN** the user activates a start-slideshow action in the web build
- **THEN** the window is opened during that action, so the browser treats it as user-requested rather than as a blocked popup

### Requirement: The output window opens without browser chrome around it

In a browser, the output window SHALL be opened as a popup rather than a tab, so the projected surface is not framed by a tab strip, address bar, or bookmarks bar.

#### Scenario: Opening on web

- **WHEN** the output window is opened in the web build, from any entry point
- **THEN** it opens as a popup window with no tab strip, no address bar, and no toolbar

#### Scenario: Every entry point behaves the same

- **WHEN** the output window is opened by "Send to output", by starting a slideshow, from the Bible tab, or by the reopen action
- **THEN** all of them open the same kind of window, at the same window name

#### Scenario: Reuse is unaffected

- **WHEN** the output window is already open and placed on a projector, and the user sends another slide
- **THEN** that same window is reused, keeping its position, size, and fullscreen state — the opening size and position apply only when a window is actually created

#### Scenario: The desktop window is unchanged

- **WHEN** the output window is opened in the desktop build
- **THEN** it is the same chrome-less native window as before, at its own remembered bounds

### Requirement: The output window says how to remove the last of the chrome

Because a browser always keeps a small origin label on a popup that only fullscreen can hide, the output window SHALL tell the operator how to enter fullscreen, without that message being able to reach an audience.

#### Scenario: Windowed output shows the hint

- **WHEN** the output window is open and not fullscreen
- **THEN** it shows a brief hint naming the key that enters fullscreen

#### Scenario: The hint retires itself

- **WHEN** the hint has been visible for a few seconds
- **THEN** it disappears on its own, without the operator dismissing it

#### Scenario: Fullscreen hides the hint

- **WHEN** the output window enters fullscreen
- **THEN** the hint is not shown

#### Scenario: Leaving fullscreen brings it back

- **WHEN** the output window leaves fullscreen by any route, including `Esc` or the OS
- **THEN** the hint is shown again, and again retires on its own

#### Scenario: A blanked output never shows the hint

- **WHEN** the output is blanked
- **THEN** no hint is drawn over the blank, so a deliberately dark projector stays dark

#### Scenario: The hint does not intercept input

- **WHEN** the user double-clicks the output window while the hint is visible
- **THEN** the window enters fullscreen, exactly as if the hint were not there

### Requirement: The output window can be reopened while presenting

The system SHALL provide an action inside the slideshow that opens or focuses the `/present` window and shows the current slide, for the case where the operator closed it or it was never opened.

#### Scenario: Reopening after a close

- **WHEN** the operator closes the output window during a slideshow and activates the reopen action
- **THEN** a `/present` window opens showing the slide that is currently current

#### Scenario: Reopen is always available

- **WHEN** a slideshow is running
- **THEN** the reopen action is available regardless of whether the system can tell that a window is open
