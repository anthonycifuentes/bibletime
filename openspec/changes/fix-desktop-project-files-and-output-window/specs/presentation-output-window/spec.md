## ADDED Requirements

### Requirement: The output window is movable

The presentation output window SHALL be movable by the user with the pointer, so it can be dragged onto a second display.

#### Scenario: Dragging the window

- **WHEN** the user presses and drags on the output window's title bar area or on the letterboxed area surrounding the slide
- **THEN** the window moves with the pointer

#### Scenario: No unreachable state

- **WHEN** the output window is opened on any supported platform
- **THEN** at least one pointer-draggable region is present, and the window is never created in a state where it cannot be moved

#### Scenario: Dragging does not present content

- **WHEN** the user drags on the area surrounding the slide
- **THEN** the slide content itself is unaffected — no text selection, no accidental activation of the live slide

### Requirement: The output window is resizable and maximizable

The presentation output window SHALL be resizable by its edges and maximizable, rather than fixed at its opening size.

#### Scenario: Resizing by the edge

- **WHEN** the user drags an edge or corner of the output window
- **THEN** the window resizes, and the slide re-letterboxes to the new size while keeping its configured aspect ratio

#### Scenario: Maximizing

- **WHEN** the user maximizes the output window (via its window controls or the platform's standard gesture)
- **THEN** the window fills the display it is on

### Requirement: The output window opens sized to its display

The output window SHALL open at a size derived from the display it appears on, rather than a fixed pixel size that ignores the display's resolution.

#### Scenario: Opening on a display smaller than the default

- **WHEN** the output window opens on a display whose work area is smaller than the previous fixed 1280×720 default
- **THEN** the window opens fully within that display's work area, with no part of it off-screen

#### Scenario: Opening on a large display

- **WHEN** the output window opens on a large second display
- **THEN** it opens at a proportionally large size on that display rather than a small fixed window

### Requirement: Fullscreen control from within the output window

The output window SHALL be able to enter and leave fullscreen without depending on application menus or window chrome that may be hidden.

#### Scenario: Entering fullscreen

- **WHEN** the user double-clicks the output window's background, or presses the fullscreen key (`F` or `F11`)
- **THEN** the window enters fullscreen on its current display, showing the slide with no chrome

#### Scenario: Leaving fullscreen

- **WHEN** the user presses `Esc` (or the fullscreen key again) while the output window is fullscreen
- **THEN** the window returns to its previous windowed position and size

#### Scenario: Fullscreen survives slide changes

- **WHEN** a new slide is sent to the output while it is fullscreen
- **THEN** the window stays fullscreen and simply updates its content

### Requirement: The output window remembers where it was placed

The output window's position, size, and display SHALL be persisted and restored, so a user who places it on a projector once does not repeat that on every launch.

#### Scenario: Reopening in the same session

- **WHEN** the user moves and resizes the output window, closes it, and sends another slide to the output
- **THEN** the window reopens at the position and size it last had

#### Scenario: Reopening after an app restart

- **WHEN** the user quits the app and later sends a slide to the output
- **THEN** the window opens at the position and size it last had, on the same display, provided that display is still connected

#### Scenario: The remembered display is gone

- **WHEN** the remembered position falls outside every currently connected display (the projector was unplugged)
- **THEN** the window opens on the primary display within its work area instead of off-screen

### Requirement: Reusing the existing output window

Sending a slide to the output while the output window is already open SHALL reuse that window rather than opening a second one, and SHALL NOT reset its position, size, or fullscreen state.

#### Scenario: Sending a second slide

- **WHEN** the output window is already open, moved to a second display and fullscreen, and the user sends a different slide
- **THEN** the same window updates its content in place, still fullscreen on the same display
- **AND** no additional output window is created
