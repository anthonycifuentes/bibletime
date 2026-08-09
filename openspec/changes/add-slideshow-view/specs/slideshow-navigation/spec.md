## ADDED Requirements

### Requirement: Advancing and going back move one slide

The slideshow SHALL provide next and previous actions that move the current slide by one position in deck order, available both as on-screen controls and as keystrokes.

#### Scenario: Advancing

- **WHEN** the user activates the next control or presses `→`, `↓`, `Space`, `PageDown`, or `Enter`
- **THEN** the following slide becomes current

#### Scenario: Going back

- **WHEN** the user activates the previous control or presses `←`, `↑`, `PageUp`, or `Backspace`
- **THEN** the preceding slide becomes current

#### Scenario: Clicking the current slide advances

- **WHEN** the user clicks the current-slide pane
- **THEN** the following slide becomes current

### Requirement: The deck does not wrap

Navigation SHALL stop at the ends of the deck rather than wrapping around, so a service cannot silently restart.

#### Scenario: Advancing past the last slide

- **WHEN** the last slide is current and the user advances
- **THEN** the last slide stays current, nothing is re-sent to the output, and the end of the deck is indicated

#### Scenario: Going back from the first slide

- **WHEN** the first slide is current and the user goes back
- **THEN** the first slide stays current and nothing is re-sent to the output

### Requirement: Jumping to the ends of the deck

The slideshow SHALL move directly to the first or last slide on request.

#### Scenario: Jump to first

- **WHEN** the user presses `Home`
- **THEN** the first slide becomes current

#### Scenario: Jump to last

- **WHEN** the user presses `End`
- **THEN** the last slide becomes current

### Requirement: Jumping to a slide by number

The slideshow SHALL let the user type a slide number and commit it to jump directly to that slide.

#### Scenario: Typing a number

- **WHEN** the user types `1` then `2`
- **THEN** the slideshow shows the pending jump target `12` without changing the current slide

#### Scenario: Committing the jump

- **WHEN** the user presses `Enter` with a pending number that is within the deck
- **THEN** that slide becomes current and the pending number is cleared

#### Scenario: Out-of-range number

- **WHEN** the user commits a number greater than the deck's total or equal to zero
- **THEN** the current slide does not change and the pending number is cleared

#### Scenario: The pending number expires

- **WHEN** the user types a digit and then types nothing for a short interval
- **THEN** the pending number is cleared and the current slide is unchanged

#### Scenario: Enter without a pending number advances

- **WHEN** the user presses `Enter` with no pending number
- **THEN** the following slide becomes current

### Requirement: Jumping from the filmstrip

The slideshow SHALL make any slide in the deck current when its filmstrip thumbnail is activated.

#### Scenario: Clicking a thumbnail

- **WHEN** the user clicks the 7th thumbnail
- **THEN** the 7th slide becomes current

#### Scenario: Clicking the current thumbnail

- **WHEN** the user clicks the thumbnail of the slide that is already current
- **THEN** that slide is re-sent to the output, restarting its media and entrance animation

### Requirement: Keyboard shortcuts do not fire from text entry

Slideshow keystrokes SHALL be ignored while the keyboard focus is in an editable field.

#### Scenario: Typing in a field

- **WHEN** the keyboard focus is inside a text input or editable region within the slideshow
- **THEN** keystrokes go to that field and do not advance, blank, or exit the slideshow

### Requirement: Changes to the folder never move the presentation on their own

When the deck changes while a slideshow is running, the system SHALL follow the current slide by identity and SHALL NOT send anything to the output without an explicit navigation action.

#### Scenario: Slides are reordered

- **WHEN** the folder's slides are reordered while the slideshow is running
- **THEN** the current slide stays current at its new position, the position readout and filmstrip update, and nothing is sent to the output

#### Scenario: A slide is added or removed elsewhere in the deck

- **WHEN** a slide before or after the current one is added or removed
- **THEN** the current slide is unchanged, the total updates, and nothing is sent to the output

#### Scenario: The current slide is removed

- **WHEN** the slide that is current is deleted from the folder
- **THEN** the nearest remaining slide becomes current in the view, the change is indicated to the operator, and the output continues to show the last slide that was sent until the operator navigates

#### Scenario: The deck becomes empty

- **WHEN** every slide is removed from the folder, or the folder itself is deleted, while the slideshow is running
- **THEN** the slideshow shows an empty state with an exit action, and the output continues to show the last slide that was sent

### Requirement: Every move sends the new current slide to the output

Each navigation action that changes the current slide SHALL send that slide to the presentation output.

#### Scenario: Advancing updates the output

- **WHEN** the user advances to the next slide
- **THEN** that slide's text, reference, version label, media, and resolved template are sent to the output window

#### Scenario: A jump updates the output

- **WHEN** the user jumps to a slide by number or by filmstrip click
- **THEN** that slide is sent to the output window
