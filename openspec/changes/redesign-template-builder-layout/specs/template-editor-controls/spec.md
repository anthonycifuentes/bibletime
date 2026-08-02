## ADDED Requirements

### Requirement: Single scrubber control for numeric properties
Every numeric property editable in the template editor — animated-background parameters (e.g. speed, scale, noise intensity, rotation), font size, line height, and letter spacing — SHALL use the `SliderComfortable` component (`variant="scrubber"`) from `@workspace/ui/components`, each instance configured with a label naming the property, an explicit `min`/`max` matching that property's valid range, and a `value`/`onChange` bound to the corresponding `SlideTemplate` field. No numeric property in the editor SHALL use the previous plus/minus `Stepper` control or a bare `Slider` with a manual readout once this change is complete.

#### Scenario: Adjusting an animated background parameter
- **WHEN** the active background is an animated preset exposing numeric controls (e.g. speed, scale, noise intensity, rotation)
- **THEN** each control renders as a labeled `SliderComfortable` scrubber bounded by that control's registered min/max, and moving it updates the background's params live

#### Scenario: Adjusting font size, line height, or letter spacing
- **WHEN** a user adjusts font size, line height, or letter spacing in the typography or spacing sections
- **THEN** the control is a labeled `SliderComfortable` scrubber (not the previous plus/minus stepper), bounded by that property's existing min/max, and the template updates live as it is moved

### Requirement: Unit-appropriate formatted value display
Each `SliderComfortable` instance in the template editor SHALL supply a `formatValue` that renders its current value with the unit appropriate to that property (e.g. `px` for font size, `em` for letter spacing, unitless with fixed decimals for line height and animated-background params), so the displayed value matches what the property previously showed via `Stepper`'s suffix or the manual readout span.

#### Scenario: Font size displays in pixels
- **WHEN** the font size scrubber renders its current value
- **THEN** the displayed value is formatted with a trailing `px`, matching the unit previously shown by the `Stepper` control it replaces

#### Scenario: Letter spacing displays in em units
- **WHEN** the letter spacing scrubber renders its current value
- **THEN** the displayed value is formatted with a trailing `em`, matching the unit previously shown by the `Stepper` control it replaces
