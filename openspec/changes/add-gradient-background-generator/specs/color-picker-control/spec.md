## ADDED Requirements

### Requirement: Color picker composition

The shared UI package SHALL provide a controlled color picker component composed of a saturation/value square, a hue slider, an alpha slider, a hex text field, and four numeric fields for red, green, blue, and alpha. It SHALL take a color value and an change callback, holding no committed state of its own, and SHALL be built from the package's existing primitives and pointer events without adding a third-party dependency.

#### Scenario: Controlled value

- **WHEN** the parent passes a new color value
- **THEN** every sub-control repositions to match it

#### Scenario: Change callback on interaction

- **WHEN** the user interacts with any sub-control
- **THEN** the change callback fires with the resulting color

### Requirement: Saturation and value square

The square SHALL paint saturation on the horizontal axis and value on the vertical axis for the current hue, with a draggable thumb at the current color's position. Pressing or dragging anywhere in the square SHALL move the thumb there and update saturation and value together, clamped to the square's bounds. Dragging SHALL continue while the pointer is held even when it leaves the square.

#### Scenario: Clicking inside the square

- **WHEN** the user presses inside the square
- **THEN** the thumb jumps to that point and the color updates to the corresponding saturation and value

#### Scenario: Dragging beyond the square's edge

- **WHEN** the user drags past the square's boundary while holding the pointer
- **THEN** the thumb stays clamped to the nearest edge and continues tracking until the pointer is released

#### Scenario: Square reflects the current hue

- **WHEN** the hue changes
- **THEN** the square repaints for the new hue and the thumb keeps its saturation and value position

### Requirement: Hue and alpha sliders

The picker SHALL provide a horizontal hue slider spanning 0–360 degrees and a horizontal alpha slider spanning 0–100 percent. The alpha slider SHALL render over a checkerboard so translucency is visible, and its track SHALL be tinted with the current color.

#### Scenario: Dragging the hue slider

- **WHEN** the user drags the hue slider
- **THEN** the hue updates continuously and the saturation/value square repaints for the new hue

#### Scenario: Dragging the alpha slider

- **WHEN** the user drags the alpha slider to 50
- **THEN** the color's alpha becomes 50 percent

#### Scenario: Alpha track shows the current color

- **WHEN** the color changes
- **THEN** the alpha slider's track gradient is tinted with that color

### Requirement: Hex and numeric field synchronization

The hex field and the R/G/B/A fields SHALL reflect the current color and SHALL each be editable. A committed edit in one input SHALL update the color and, through it, every other control. The hex field SHALL accept 3-, 6-, and 8-digit hex with an optional leading `#`. The R, G, and B fields SHALL accept 0–255 and the A field 0–100, clamping out-of-range numbers.

#### Scenario: Typing a hex value

- **WHEN** the user types `#2A7B9B` into the hex field
- **THEN** the color becomes that value and the R, G, B fields read 42, 123, 155

#### Scenario: Eight-digit hex sets alpha

- **WHEN** the user types an eight-digit hex value into the hex field
- **THEN** the last pair sets the alpha channel

#### Scenario: Invalid hex is rejected

- **WHEN** the user types a value that is not valid hex and leaves the field
- **THEN** the color is unchanged and the field reverts to the current color's hex

#### Scenario: Out-of-range channel is clamped

- **WHEN** the user types `300` into the R field
- **THEN** the red channel becomes 255

#### Scenario: Partial typing does not thrash the color

- **WHEN** the user is mid-way through typing a hex value and it does not yet parse
- **THEN** the color is left unchanged until the value becomes valid

### Requirement: Accessibility

Each interactive sub-control SHALL be keyboard reachable and carry an accessible name. The hue and alpha sliders SHALL expose their current value to assistive technology and SHALL respond to arrow keys.

#### Scenario: Adjusting hue by keyboard

- **WHEN** the hue slider has focus and the user presses an arrow key
- **THEN** the hue changes by one step in that direction

#### Scenario: Controls are labeled

- **WHEN** the picker is inspected by assistive technology
- **THEN** the square, both sliders, and every text field report a descriptive name
