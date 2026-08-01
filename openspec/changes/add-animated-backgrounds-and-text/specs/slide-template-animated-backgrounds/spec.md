## ADDED Requirements

### Requirement: Slide template backgrounds support an animated variant
A `SlideTemplate`'s background SHALL support a fifth variant, `animated`, stored as `{ type: "animated", presetId: string, params: Record<string, number | string> }`, in addition to the existing color, gradient, image, and video variants.

#### Scenario: Selecting an animated background preset
- **WHEN** a user picks an animated preset from the background section of the template editor
- **THEN** the template's background is set to `{ type: "animated", presetId: <chosen preset id>, params: <that preset's default parameters> }` and the preview renders that preset live

#### Scenario: Animated backgrounds render on both web and desktop
- **WHEN** the template editor loads under either the web or the desktop storage driver
- **THEN** every registered animated preset is selectable and renders identically, with no driver-specific gating

### Requirement: Animated background presets come from a registry with a generic control schema
Animated presets SHALL be defined in a registry, each entry declaring its own id, label, rendering component, and an ordered list of controls (each a number or color input with a key, label, and default value). The template editor SHALL render controls for the selected preset directly from that preset's control list, without preset-specific editor code.

#### Scenario: Adjusting a preset's parameter
- **WHEN** a user changes one of the selected animated preset's controls (e.g. a speed or color input)
- **THEN** the corresponding key in the template background's `params` updates, and the live preview reflects the new value without a full re-render of unrelated controls

#### Scenario: A new preset needs no editor changes
- **WHEN** a new entry is added to the animated background preset registry with its own control list
- **THEN** it becomes selectable and its controls render correctly without any changes to `TemplateEditor`

### Requirement: Unknown or removed animated preset ids fall back safely
Loading a saved template whose `animated` background references a `presetId` that is not in the current registry SHALL NOT crash or render blank; it SHALL fall back to the default background.

#### Scenario: Loading a template after a preset is removed
- **WHEN** a saved template's background is `{ type: "animated", presetId: <no longer registered> }`
- **THEN** the template loads normally and its background is normalized to the default background instead of erroring
