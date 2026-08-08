## ADDED Requirements

### Requirement: Gradient section in the background card

The template editor's background card SHALL offer a gradient control alongside the existing solid color, image, video, and animated controls. The gradient generator SHALL expand inline within that card when the current background is a gradient, and SHALL be collapsed otherwise — the same in-place pattern the animated-background parameter controls already use. Switching to a gradient SHALL go through the editor's existing background setter, so any video media held by the previous background is released.

#### Scenario: Enabling a gradient background

- **WHEN** the user activates the gradient control while the background is a solid color
- **THEN** the background becomes a gradient seeded with the default spec and the generator expands inline below the control

#### Scenario: Generator hidden for non-gradient backgrounds

- **WHEN** the background is an image, video, or animated preset
- **THEN** the gradient generator is not rendered

#### Scenario: Switching away from a video background

- **WHEN** the background is a video and the user switches to a gradient
- **THEN** the video's stored media is released before the gradient is applied

### Requirement: Live gradient preview and stop track

The generator SHALL show a preview strip painted with the current gradient, and directly below it a horizontal track carrying one draggable handle per stop, positioned at that stop's percentage. Dragging a handle SHALL update that stop's position continuously. Clicking an empty part of the track SHALL insert a new stop at the clicked position, colored by interpolating the two surrounding stops. Each handle SHALL be selectable, and exactly one stop SHALL be selected at a time.

#### Scenario: Dragging a stop handle

- **WHEN** the user drags a stop handle along the track
- **THEN** that stop's position follows the pointer, clamped to 0–100, and the preview and slide update as it moves

#### Scenario: Inserting a stop by clicking the track

- **WHEN** the user clicks the track at 30% between stops at 0% and 50%
- **THEN** a new stop is inserted at 30% whose color is interpolated between those two stops, and it becomes the selected stop

#### Scenario: Selecting a stop

- **WHEN** the user clicks a stop handle
- **THEN** that stop becomes the selected stop and the color picker below shows its color

#### Scenario: Keyboard adjustment

- **WHEN** a stop handle has keyboard focus and the user presses the left or right arrow key
- **THEN** that stop's position moves by one percentage point in that direction, clamped to 0–100

### Requirement: Gradient kind and angle controls

The generator SHALL provide a segmented control to switch between `linear` and `radial`, and — for `linear` only — an angle control combining a draggable dial and a numeric field, both bound to the same value in degrees. The numeric field SHALL accept whole degrees and wrap values into the range 0–359.

#### Scenario: Switching to radial

- **WHEN** the user selects `radial`
- **THEN** the background serializes as a radial gradient and the angle controls are hidden or disabled

#### Scenario: Dragging the angle dial

- **WHEN** the user drags the angle dial
- **THEN** the angle updates continuously and the numeric field shows the same value

#### Scenario: Angle entered out of range

- **WHEN** the user types `450` into the angle field
- **THEN** the angle becomes `90`

#### Scenario: Stops survive a kind switch

- **WHEN** the user switches from linear to radial and back
- **THEN** the stop list and angle are unchanged

### Requirement: Preset gradient swatches

The generator SHALL show a row of preset gradient swatches. Choosing a preset SHALL replace the current gradient spec with that preset's spec, so the presets act as starting points that remain fully editable afterwards.

#### Scenario: Applying a preset

- **WHEN** the user clicks a preset swatch
- **THEN** the gradient spec is replaced by the preset's kind, angle, and stops, and every generator control reflects the new values

#### Scenario: Preset remains editable

- **WHEN** the user applies a preset and then drags one of its stops
- **THEN** the edit applies normally, with no reversion to the preset's original values

### Requirement: Per-stop rows

Below the color picker, the generator SHALL list one row per stop, ordered by position, each showing a color swatch, an editable hex field, an editable position field, and a remove action. The row of the selected stop SHALL be visually distinguished. Editing a row's hex or position SHALL update that stop. A hex field SHALL only commit a value that parses as a valid color, leaving the stop unchanged otherwise.

#### Scenario: Editing a stop's hex value

- **WHEN** the user types a valid hex color into a stop's hex field
- **THEN** that stop takes the new color and the preview updates

#### Scenario: Invalid hex is not committed

- **WHEN** the user types an unparseable value into a stop's hex field
- **THEN** the stop's color is unchanged

#### Scenario: Editing a stop's position

- **WHEN** the user types `40` into a stop's position field
- **THEN** that stop moves to 40% and the rows reorder if needed

#### Scenario: Removing a stop

- **WHEN** the user clicks the remove action on a stop row while three stops exist
- **THEN** that stop is removed, and if it was the selected stop, an adjacent stop becomes selected

### Requirement: Minimum of two stops

A gradient SHALL always have at least two stops. When exactly two stops remain, the remove action on each stop row SHALL be disabled.

#### Scenario: Remove disabled at two stops

- **WHEN** the gradient has exactly two stops
- **THEN** the remove action on both stop rows is disabled

### Requirement: Edits flow to the live preview

Every gradient edit SHALL write through the template editor's existing change handler, so the slide preview on the page reflects the change immediately and the page's unsaved-changes guard treats gradient edits like any other template edit.

#### Scenario: Preview updates while dragging

- **WHEN** the user drags a stop handle
- **THEN** the slide preview repaints continuously with the in-progress gradient

#### Scenario: Gradient edits mark the draft dirty

- **WHEN** the user changes any gradient property on a saved template
- **THEN** the page reports unsaved changes and the Save action becomes enabled

### Requirement: Localized strings

All user-facing text introduced by the gradient generator SHALL be resolved through the translation function and defined in the `en`, `es`, and `pt` dictionaries.

#### Scenario: Generator labels follow the active language

- **WHEN** the app language is English
- **THEN** every label, tooltip, and accessible name in the gradient generator renders in English
